"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const models_1 = require("@/models");
const jwt_1 = require("@/utils/jwt");
const crypto_1 = require("@/utils/crypto");
const error_1 = require("@/middlewares/error");
const redis_1 = require("@/config/redis");
const logger_1 = require("@/utils/logger");
// 认证服务类
class AuthService {
    /**
     * 管理员登录
     */
    static async login(credentials, ipAddress, userAgent) {
        const { username, password } = credentials;
        // 查找管理员
        const admin = await models_1.Admin.findOne({
            where: { username: username.toLowerCase() }
        });
        if (!admin) {
            // 记录登录失败尝试
            await this.recordFailedLoginAttempt(username, ipAddress);
            throw new error_1.AuthenticationError('用户名或密码错误');
        }
        // 检查账号状态
        if (admin.status === 'inactive') {
            throw new error_1.AuthenticationError('账号已被禁用，请联系系统管理员');
        }
        // 检查登录失败次数
        await this.checkFailedLoginAttempts(username, ipAddress);
        // 验证密码
        const isPasswordValid = await crypto_1.CryptoUtils.verifyPassword(password, admin.password);
        if (!isPasswordValid) {
            await this.recordFailedLoginAttempt(username, ipAddress);
            throw new error_1.AuthenticationError('用户名或密码错误');
        }
        // 清除登录失败记录
        await this.clearFailedLoginAttempts(username, ipAddress);
        // 生成访问令牌和刷新令牌
        const accessToken = jwt_1.JWTUtils.generateAccessToken(admin);
        const refreshToken = jwt_1.JWTUtils.generateRefreshToken(admin.id);
        // 存储刷新令牌
        await jwt_1.JWTUtils.storeRefreshToken(refreshToken, admin.id);
        // 更新最后登录时间
        await admin.update({
            last_login_at: new Date()
        });
        // 记录登录日志
        await models_1.OperationLog.logOperation(admin.id, 'login', 'admin', admin.id, { login_method: 'password' }, ipAddress, userAgent);
        logger_1.logger.info('管理员登录成功:', {
            adminId: admin.id,
            username: admin.username,
            ipAddress,
            userAgent
        });
        return {
            token: accessToken,
            refreshToken,
            admin: admin.toSafeJSON(),
            expires_in: 7 * 24 * 60 * 60 // 7天（秒）
        };
    }
    /**
     * 管理员登出
     */
    static async logout(adminId, token, refreshToken, ipAddress, userAgent) {
        try {
            // 将访问令牌加入黑名单
            await jwt_1.JWTUtils.blacklistToken(token);
            // 删除刷新令牌
            if (refreshToken) {
                await jwt_1.JWTUtils.removeRefreshToken(refreshToken);
            }
            // 记录登出日志
            await models_1.OperationLog.logOperation(adminId, 'logout', 'admin', adminId, { logout_method: 'manual' }, ipAddress, userAgent);
            logger_1.logger.info('管理员登出成功:', {
                adminId,
                ipAddress,
                userAgent
            });
        }
        catch (error) {
            logger_1.logger.error('登出处理失败:', error);
            // 即使出错也不抛出异常，确保用户能正常登出
        }
    }
    /**
     * 刷新访问令牌
     */
    static async refreshToken(refreshToken) {
        // 验证刷新令牌
        const payload = await jwt_1.JWTUtils.verifyRefreshToken(refreshToken);
        // 获取管理员信息
        const admin = await models_1.Admin.findByPk(payload.id, {
            attributes: { exclude: ['password'] }
        });
        if (!admin) {
            await jwt_1.JWTUtils.removeRefreshToken(refreshToken);
            throw new error_1.AuthenticationError('用户不存在');
        }
        if (admin.status === 'inactive') {
            await jwt_1.JWTUtils.removeRefreshToken(refreshToken);
            throw new error_1.AuthenticationError('账号已被禁用');
        }
        // 生成新的访问令牌
        const newAccessToken = jwt_1.JWTUtils.generateAccessToken(admin);
        return {
            token: newAccessToken,
            admin: admin.toSafeJSON(),
            expires_in: 7 * 24 * 60 * 60
        };
    }
    /**
     * 获取管理员信息
     */
    static async getProfile(adminId) {
        const admin = await models_1.Admin.findByPk(adminId, {
            attributes: { exclude: ['password'] },
            include: [
                {
                    model: models_1.Admin,
                    as: 'parent',
                    attributes: ['id', 'username', 'real_name']
                }
            ]
        });
        if (!admin) {
            throw new error_1.NotFoundError('管理员');
        }
        return admin.toSafeJSON();
    }
    /**
     * 更新个人信息
     */
    static async updateProfile(adminId, profileData, operatorId, ipAddress, userAgent) {
        const admin = await models_1.Admin.findByPk(adminId);
        if (!admin) {
            throw new error_1.NotFoundError('管理员');
        }
        // 检查邮箱是否已存在
        if (profileData.email && profileData.email !== admin.email) {
            const existingAdmin = await models_1.Admin.findOne({
                where: {
                    email: profileData.email,
                    id: { [models_1.Admin.sequelize.Op.ne]: adminId }
                }
            });
            if (existingAdmin) {
                throw new error_1.ConflictError('邮箱已被使用');
            }
        }
        const oldData = {
            real_name: admin.real_name,
            email: admin.email
        };
        // 更新信息
        await admin.update(profileData);
        // 记录操作日志
        await models_1.OperationLog.logOperation(operatorId, 'update_profile', 'admin', adminId, {
            old_data: oldData,
            new_data: profileData,
            is_self: operatorId === adminId
        }, ipAddress, userAgent);
        logger_1.logger.info('管理员信息更新:', {
            adminId,
            operatorId,
            updatedFields: Object.keys(profileData),
            ipAddress
        });
        return admin.toSafeJSON();
    }
    /**
     * 修改密码
     */
    static async changePassword(adminId, oldPassword, newPassword, ipAddress, userAgent) {
        const admin = await models_1.Admin.findByPk(adminId);
        if (!admin) {
            throw new error_1.NotFoundError('管理员');
        }
        // 验证旧密码
        const isOldPasswordValid = await crypto_1.CryptoUtils.verifyPassword(oldPassword, admin.password);
        if (!isOldPasswordValid) {
            throw new error_1.AuthenticationError('原密码错误');
        }
        // 验证新密码强度
        const passwordStrength = crypto_1.CryptoUtils.validatePasswordStrength(newPassword);
        if (!passwordStrength.isValid) {
            throw new error_1.ValidationError({ password: passwordStrength.feedback }, '密码强度不足');
        }
        // 检查是否与旧密码相同
        const isSamePassword = await crypto_1.CryptoUtils.verifyPassword(newPassword, admin.password);
        if (isSamePassword) {
            throw new error_1.ValidationError({ password: ['新密码不能与原密码相同'] }, '密码设置无效');
        }
        // 加密新密码
        const hashedPassword = await crypto_1.CryptoUtils.hashPassword(newPassword);
        // 更新密码
        await admin.update({ password: hashedPassword });
        // 清除所有刷新令牌（强制重新登录）
        await jwt_1.JWTUtils.clearUserRefreshTokens(adminId);
        // 记录操作日志
        await models_1.OperationLog.logOperation(adminId, 'change_password', 'admin', adminId, {
            password_strength: passwordStrength.score,
            forced_logout: true
        }, ipAddress, userAgent);
        logger_1.logger.info('管理员密码修改成功:', {
            adminId,
            ipAddress,
            passwordStrength: passwordStrength.score
        });
    }
    /**
     * 记录登录失败尝试
     */
    static async recordFailedLoginAttempt(username, ipAddress) {
        try {
            const key = `login_failed:${username}:${ipAddress || 'unknown'}`;
            const current = await redis_1.redisUtils.get(key) || 0;
            await redis_1.redisUtils.set(key, parseInt(current) + 1, 15 * 60); // 15分钟过期
        }
        catch (error) {
            logger_1.logger.error('记录登录失败次数失败:', error);
        }
    }
    /**
     * 检查登录失败次数
     */
    static async checkFailedLoginAttempts(username, ipAddress) {
        try {
            const key = `login_failed:${username}:${ipAddress || 'unknown'}`;
            const failedCount = await redis_1.redisUtils.get(key) || 0;
            if (failedCount >= 5) {
                throw new error_1.AuthenticationError('登录失败次数过多，请15分钟后再试');
            }
        }
        catch (error) {
            if (error instanceof error_1.AuthenticationError) {
                throw error;
            }
            logger_1.logger.error('检查登录失败次数失败:', error);
        }
    }
    /**
     * 清除登录失败记录
     */
    static async clearFailedLoginAttempts(username, ipAddress) {
        try {
            const key = `login_failed:${username}:${ipAddress || 'unknown'}`;
            await redis_1.redisUtils.del(key);
        }
        catch (error) {
            logger_1.logger.error('清除登录失败记录失败:', error);
        }
    }
}
exports.AuthService = AuthService;
