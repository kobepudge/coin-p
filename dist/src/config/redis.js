"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisUtils = exports.connectRedis = exports.redisClient = void 0;
const redis_1 = require("redis");
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("@/utils/logger");
// 加载环境变量
dotenv_1.default.config();
// Redis配置
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0')
};
// 创建Redis客户端
exports.redisClient = (0, redis_1.createClient)({
    url: `redis://${redisConfig.password ? `:${redisConfig.password}@` : ''}${redisConfig.host}:${redisConfig.port}/${redisConfig.db}`
});
// Redis连接事件
exports.redisClient.on('connect', () => {
    logger_1.logger.info('Redis连接成功');
});
exports.redisClient.on('error', (error) => {
    logger_1.logger.error('Redis连接错误:', error);
});
exports.redisClient.on('ready', () => {
    logger_1.logger.info('Redis准备就绪');
});
exports.redisClient.on('end', () => {
    logger_1.logger.info('Redis连接断开');
});
// 连接Redis
const connectRedis = async () => {
    try {
        await exports.redisClient.connect();
    }
    catch (error) {
        logger_1.logger.error('Redis连接失败:', error);
        throw error;
    }
};
exports.connectRedis = connectRedis;
// Redis工具函数
exports.redisUtils = {
    // 设置缓存
    set: async (key, value, ttl) => {
        try {
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            if (ttl) {
                await exports.redisClient.setEx(key, ttl, stringValue);
            }
            else {
                await exports.redisClient.set(key, stringValue);
            }
        }
        catch (error) {
            logger_1.logger.error('Redis设置缓存失败:', error);
            throw error;
        }
    },
    // 获取缓存
    get: async (key) => {
        try {
            const value = await exports.redisClient.get(key);
            if (!value)
                return null;
            try {
                return JSON.parse(value);
            }
            catch {
                return value;
            }
        }
        catch (error) {
            logger_1.logger.error('Redis获取缓存失败:', error);
            return null;
        }
    },
    // 删除缓存
    del: async (key) => {
        try {
            await exports.redisClient.del(key);
        }
        catch (error) {
            logger_1.logger.error('Redis删除缓存失败:', error);
            throw error;
        }
    },
    // 检查key是否存在
    exists: async (key) => {
        try {
            const result = await exports.redisClient.exists(key);
            return result === 1;
        }
        catch (error) {
            logger_1.logger.error('Redis检查key存在性失败:', error);
            return false;
        }
    },
    // 设置过期时间
    expire: async (key, seconds) => {
        try {
            await exports.redisClient.expire(key, seconds);
        }
        catch (error) {
            logger_1.logger.error('Redis设置过期时间失败:', error);
            throw error;
        }
    },
    // 获取所有匹配的key
    keys: async (pattern) => {
        try {
            return await exports.redisClient.keys(pattern);
        }
        catch (error) {
            logger_1.logger.error('Redis获取keys失败:', error);
            return [];
        }
    }
};
