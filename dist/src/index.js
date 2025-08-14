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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = __importDefault(require("@/app"));
const database_1 = require("@/config/database");
const redis_1 = require("@/config/redis");
const logger_1 = require("@/utils/logger");
const merchants_1 = require("@/seeds/merchants");
const orders_1 = require("@/seeds/orders");
const scheduler_1 = require("@/utils/scheduler");
// 加载环境变量
dotenv_1.default.config();
const PORT = process.env.PORT || 3000;
// 启动服务器
async function startServer() {
    try {
        // 测试数据库连接
        await (0, database_1.testConnection)();
        // 同步数据库模型
        await (0, database_1.syncDatabase)();
        // 初始化种子数据
        if (process.env.NODE_ENV === 'development') {
            await (0, merchants_1.seedMerchants)();
            await (0, orders_1.seedOrders)();
        }
        // 连接Redis
        try {
            await (0, redis_1.connectRedis)();
        }
        catch (error) {
            logger_1.logger.warn('Redis连接失败，某些功能可能受影响:', error);
        }
        // 启动定时任务
        scheduler_1.SchedulerService.startAll();
        // 启动HTTP服务器
        const server = app_1.default.listen(PORT, () => {
            logger_1.logger.info(`🚀 服务器启动成功`);
            logger_1.logger.info(`📡 API地址: http://localhost:${PORT}`);
            logger_1.logger.info(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
            logger_1.logger.info(`📊 健康检查: http://localhost:${PORT}/health`);
        });
        // 优雅关闭处理
        const gracefulShutdown = (signal) => {
            logger_1.logger.info(`收到${signal}信号，开始优雅关闭服务器...`);
            server.close(async (err) => {
                if (err) {
                    logger_1.logger.error('服务器关闭时出错:', err);
                    process.exit(1);
                }
                try {
                    // 关闭数据库连接
                    const { sequelize } = await Promise.resolve().then(() => __importStar(require('@/config/database')));
                    await sequelize.close();
                    logger_1.logger.info('数据库连接已关闭');
                    // 停止定时任务
                    scheduler_1.SchedulerService.stopAll();
                    // 关闭Redis连接
                    const { redisClient } = await Promise.resolve().then(() => __importStar(require('@/config/redis')));
                    if (redisClient.isOpen) {
                        await redisClient.quit();
                        logger_1.logger.info('Redis连接已关闭');
                    }
                    logger_1.logger.info('服务器优雅关闭完成');
                    process.exit(0);
                }
                catch (error) {
                    logger_1.logger.error('关闭服务时出错:', error);
                    process.exit(1);
                }
            });
        };
        // 监听退出信号
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        // 监听未捕获的异常
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('未捕获的异常:', error);
            process.exit(1);
        });
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.logger.error('未处理的Promise拒绝:', { reason, promise });
            process.exit(1);
        });
    }
    catch (error) {
        logger_1.logger.error('服务器启动失败:', error);
        process.exit(1);
    }
}
// 启动应用
startServer();
