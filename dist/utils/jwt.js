"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTUtils = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const redis_1 = require("@/config/redis");
const logger_1 = require("@/utils/logger");
// JWT工具类
class JWTUtils {
    /**
     * 生成访问令牌
     */
    static generateAccessToken(admin) {
        const payload = {
            id: admin.id,
            username: admin.username,
            role: admin.role,
            permissions: admin.permissions
        };
        return jwt.sign(payload, this.JWT_SECRET, {
            expiresIn: this.JWT_EXPIRES_IN,
            issuer: 'coin-trading-api',
            audience: 'coin-trading-frontend'
        });
    }
    /**
     * 生成刷新令牌
     */
    static generateRefreshToken(adminId) {
        const payload = { id: adminId, type: 'refresh' };
        return jwt.sign(payload, this.JWT_SECRET, {
            expiresIn: this.JWT_REFRESH_EXPIRES_IN
        });
    }
    /**
     * 验证访问令牌
     */
    static async verifyAccessToken(token) {
        try {
            // 检查token是否在黑名单中
            const isBlacklisted = await this.isTokenBlacklisted(token);
            if (isBlacklisted) {
                throw new Error('Token已被撤销');
            }
            // 验证token
            const payload = jwt.verify(token, this.JWT_SECRET, {
                issuer: 'coin-trading-api',
                audience: 'coin-trading-frontend'
            });
            return payload;
        }
        catch (error) {
            logger_1.logger.error('JWT验证失败:', error);
            if (error.name === 'TokenExpiredError') {
                throw new Error('访问令牌已过期');
            }
            else if (error.name === 'JsonWebTokenError') {
                throw new Error('无效的访问令牌');
            }
            else {
                throw new Error(error.message || 'Token验证失败');
            }
        }
    }
    /**
     * 验证刷新令牌
     */
    static async verifyRefreshToken(token) {
        try {
            // 检查token是否存在于Redis中
            const storedToken = await redis_1.redisUtils.get(`${this.REFRESH_TOKEN_PREFIX}${token}`);
            if (!storedToken) {
                throw new Error('刷新令牌不存在或已过期');
            }
            // 验证token
            const payload = jwt.verify(token, this.JWT_SECRET);
            if (payload.type !== 'refresh') {
                throw new Error('无效的刷新令牌类型');
            }
            return { id: payload.id };
        }
        catch (error) {
            logger_1.logger.error('刷新令牌验证失败:', error);
            if (error.name === 'TokenExpiredError') {
                throw new Error('刷新令牌已过期');
            }
            else if (error.name === 'JsonWebTokenError') {
                throw new Error('无效的刷新令牌');
            }
            else {
                throw new Error(error.message || '刷新令牌验证失败');
            }
        }
    }
    /**
     * 存储刷新令牌
     */
    static async storeRefreshToken(token, adminId) {
        try {
            const ttl = this.getTokenTTL(this.JWT_REFRESH_EXPIRES_IN);
            await redis_1.redisUtils.set(`${this.REFRESH_TOKEN_PREFIX}${token}`, adminId, ttl);
        }
        catch (error) {
            logger_1.logger.error('存储刷新令牌失败:', error);
        }
    }
    /**
     * 将token加入黑名单
     */
    static async blacklistToken(token) {
        try {
            const payload = jwt.decode(token);
            if (payload && payload.exp) {
                // 计算剩余有效期
                const now = Math.floor(Date.now() / 1000);
                const ttl = payload.exp - now;
                if (ttl > 0) {
                    await redis_1.redisUtils.set(`${this.TOKEN_BLACKLIST_PREFIX}${token}`, 'blacklisted', ttl);
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Token加入黑名单失败:', error);
        }
    }
    /**
     * 检查token是否在黑名单中
     */
    static async isTokenBlacklisted(token) {
        try {
            return await redis_1.redisUtils.exists(`${this.TOKEN_BLACKLIST_PREFIX}${token}`);
        }
        catch (error) {
            logger_1.logger.error('检查Token黑名单状态失败:', error);
            return false;
        }
    }
    /**
     * 删除刷新令牌
     */
    static async removeRefreshToken(token) {
        try {
            await redis_1.redisUtils.del(`${this.REFRESH_TOKEN_PREFIX}${token}`);
        }
        catch (error) {
            logger_1.logger.error('删除刷新令牌失败:', error);
        }
    }
    /**
     * 清除用户所有刷新令牌
     */
    static async clearUserRefreshTokens(adminId) {
        try {
            const pattern = `${this.REFRESH_TOKEN_PREFIX}*`;
            const keys = await redis_1.redisUtils.keys(pattern);
            for (const key of keys) {
                const storedAdminId = await redis_1.redisUtils.get(key);
                if (storedAdminId === adminId) {
                    await redis_1.redisUtils.del(key);
                }
            }
        }
        catch (error) {
            logger_1.logger.error('清除用户刷新令牌失败:', error);
        }
    }
    /**
     * 解码token（不验证签名）
     */
    static decodeToken(token) {
        try {
            return jwt.decode(token);
        }
        catch (error) {
            logger_1.logger.error('Token解码失败:', error);
            return null;
        }
    }
    /**
     * 获取token剩余有效期（秒）
     */
    static getTokenRemainingTime(token) {
        try {
            const payload = jwt.decode(token);
            if (payload && payload.exp) {
                const now = Math.floor(Date.now() / 1000);
                return Math.max(0, payload.exp - now);
            }
            return 0;
        }
        catch (error) {
            logger_1.logger.error('获取Token剩余时间失败:', error);
            return 0;
        }
    }
    /**
     * 将时间字符串转换为秒数
     */
    static getTokenTTL(expiresIn) {
        const match = expiresIn.match(/^(\d+)([smhd])$/);
        if (!match)
            return 7 * 24 * 60 * 60; // 默认7天
        const value = parseInt(match[1]);
        const unit = match[2];
        switch (unit) {
            case 's': return value;
            case 'm': return value * 60;
            case 'h': return value * 60 * 60;
            case 'd': return value * 24 * 60 * 60;
            default: return value;
        }
    }
}
exports.JWTUtils = JWTUtils;
JWTUtils.JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
JWTUtils.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
JWTUtils.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
// Token前缀
JWTUtils.TOKEN_BLACKLIST_PREFIX = 'blacklist:token:';
JWTUtils.REFRESH_TOKEN_PREFIX = 'refresh:token:';
