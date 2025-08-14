"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitByUser = exports.requireSelfOrSuperior = exports.requireSuperAdmin = exports.requireRole = exports.authorize = exports.optionalAuthenticate = exports.authenticate = void 0;
const jwt_1 = require("@/utils/jwt");
const models_1 = require("@/models");
const error_1 = require("@/middlewares/error");
const logger_1 = require("@/utils/logger");
/**
 * 认证中间件 - 验证JWT token
 */
const authenticate = async (req, res, next) => {
    try {
        // 从请求头获取token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new error_1.AuthenticationError('缺少访问令牌');
        }
        const token = authHeader.substring(7); // 移除 'Bearer ' 前缀
        req.token = token;
        // 验证token
        const payload = await jwt_1.JWTUtils.verifyAccessToken(token);
        // 从数据库获取最新的用户信息
        const admin = await models_1.Admin.findByPk(payload.id, {
            attributes: { exclude: ['password'] }
        });
        if (!admin) {
            throw new error_1.AuthenticationError('用户不存在');
        }
        if (admin.status === 'inactive') {
            throw new error_1.AuthenticationError('用户账号已被禁用');
        }
        // 将用户信息添加到请求对象
        req.admin = {
            id: admin.id,
            username: admin.username,
            role: admin.role,
            permissions: admin.permissions,
            real_name: admin.real_name,
            email: admin.email || undefined
        };
        next();
    }
    catch (error) {
        logger_1.logger.error('认证中间件错误:', {
            message: error.message,
            url: req.originalUrl,
            method: req.method,
            ip: req.ip
        });
        next(new error_1.AuthenticationError(error.message));
    }
};
exports.authenticate = authenticate;
/**
 * 可选认证中间件 - token存在时验证，不存在时继续
 */
const optionalAuthenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(); // 没有token时直接继续
        }
        // 有token时进行验证
        await (0, exports.authenticate)(req, res, next);
    }
    catch (error) {
        // 可选认证失败时也继续执行
        next();
    }
};
exports.optionalAuthenticate = optionalAuthenticate;
/**
 * 权限验证中间件工厂函数
 */
const authorize = (...requiredPermissions) => {
    return (req, res, next) => {
        if (!req.admin) {
            return next(new error_1.AuthenticationError('请先登录'));
        }
        // 超级管理员拥有所有权限
        if (req.admin.role === 'super_admin') {
            return next();
        }
        // 检查所需权限
        const hasPermission = requiredPermissions.every(permission => req.admin.permissions[permission] === true);
        if (!hasPermission) {
            logger_1.logger.warn('权限验证失败:', {
                adminId: req.admin.id,
                username: req.admin.username,
                requiredPermissions,
                userPermissions: req.admin.permissions,
                url: req.originalUrl,
                method: req.method
            });
            return next(new error_1.AuthorizationError('权限不足，无法执行此操作'));
        }
        next();
    };
};
exports.authorize = authorize;
/**
 * 角色验证中间件
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.admin) {
            return next(new error_1.AuthenticationError('请先登录'));
        }
        if (!allowedRoles.includes(req.admin.role)) {
            logger_1.logger.warn('角色验证失败:', {
                adminId: req.admin.id,
                username: req.admin.username,
                userRole: req.admin.role,
                allowedRoles,
                url: req.originalUrl,
                method: req.method
            });
            return next(new error_1.AuthorizationError(`需要以下角色之一: ${allowedRoles.join(', ')}`));
        }
        next();
    };
};
exports.requireRole = requireRole;
/**
 * 超级管理员验证中间件
 */
exports.requireSuperAdmin = (0, exports.requireRole)('super_admin');
/**
 * 自己或上级权限验证中间件
 * 用于个人信息修改等场景，允许用户修改自己的信息或上级修改下级信息
 */
const requireSelfOrSuperior = async (req, res, next) => {
    try {
        if (!req.admin) {
            return next(new error_1.AuthenticationError('请先登录'));
        }
        const targetUserId = parseInt(req.params.id || req.body.id);
        // 修改自己的信息
        if (targetUserId === req.admin.id) {
            return next();
        }
        // 超级管理员可以修改任何人的信息
        if (req.admin.role === 'super_admin') {
            return next();
        }
        // 检查是否有admin_manage权限
        if (req.admin.permissions.admin_manage) {
            // 验证目标用户是否是自己创建的下级
            const targetAdmin = await models_1.Admin.findByPk(targetUserId);
            if (targetAdmin && targetAdmin.parent_id === req.admin.id) {
                return next();
            }
        }
        return next(new error_1.AuthorizationError('只能修改自己或下级的信息'));
    }
    catch (error) {
        next(error);
    }
};
exports.requireSelfOrSuperior = requireSelfOrSuperior;
/**
 * 限制访问速率中间件（基于用户）
 */
const rateLimitByUser = (maxRequests = 100, windowMs = 15 * 60 * 1000 // 15分钟
) => {
    const requestCounts = new Map();
    return (req, res, next) => {
        if (!req.admin) {
            return next();
        }
        const now = Date.now();
        const userId = req.admin.id;
        const windowStart = now - windowMs;
        // 清理过期记录
        for (const [id, data] of requestCounts.entries()) {
            if (data.resetTime < now) {
                requestCounts.delete(id);
            }
        }
        // 获取或创建用户请求记录
        let userRecord = requestCounts.get(userId);
        if (!userRecord || userRecord.resetTime < now) {
            userRecord = { count: 0, resetTime: now + windowMs };
            requestCounts.set(userId, userRecord);
        }
        userRecord.count++;
        if (userRecord.count > maxRequests) {
            logger_1.logger.warn('用户请求频率超限:', {
                adminId: req.admin.id,
                username: req.admin.username,
                requestCount: userRecord.count,
                maxRequests,
                url: req.originalUrl,
                method: req.method
            });
            return res.status(429).json({
                success: false,
                message: '请求过于频繁，请稍后再试',
                retryAfter: Math.ceil((userRecord.resetTime - now) / 1000)
            });
        }
        next();
    };
};
exports.rateLimitByUser = rateLimitByUser;
