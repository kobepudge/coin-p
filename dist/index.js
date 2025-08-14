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
// 必须在所有其他导入之前注册路径别名
require("module-alias/register");
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = __importDefault(require("./app"));
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const logger_1 = require("./utils/logger");
// import { seedMerchants } from './seeds/merchants'
// import { seedOrders } from './seeds/orders'
const scheduler_1 = require("./utils/scheduler");
// 加载环境变量
dotenv_1.default.config();
const PORT = process.env.PORT || 3000;
// 启动服务器
async function startServer() {
    try {
        // 先启动HTTP服务器
        const server = app_1.default.listen(PORT, () => {
            logger_1.logger.info(`🚀 服务器启动成功`);
            logger_1.logger.info(`📡 API地址: http://localhost:${PORT}`);
            logger_1.logger.info(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
            logger_1.logger.info(`📊 健康检查: http://localhost:${PORT}/api/health`);
        });
        // 异步初始化数据库和Redis（不阻塞服务器启动）
        setTimeout(() => {
            initializeServices();
        }, 1000);
        async function initializeServices() {
            // 连接数据库
            try {
                logger_1.logger.info('正在连接数据库...');
                logger_1.logger.info(`数据库连接信息: host=${process.env.DB_HOST}, port=${process.env.DB_PORT}, database=${process.env.DB_NAME}`);
                await (0, database_1.testConnection)();
                logger_1.logger.info('✅ 数据库连接成功');
                // 同步数据库模型
                logger_1.logger.info('正在同步数据库模型...');
                await (0, database_1.syncDatabase)();
                logger_1.logger.info('✅ 数据库模型同步完成');
                // 初始化种子数据
                if (process.env.NODE_ENV === 'development') {
                    // await seedMerchants()
                    // await seedOrders()
                }
            }
            catch (error) {
                logger_1.logger.error('❌ 数据库初始化失败，但服务器继续运行:', error);
                logger_1.logger.error('数据库错误详情:', {
                    host: process.env.DB_HOST,
                    port: process.env.DB_PORT,
                    database: process.env.DB_NAME,
                    user: process.env.DB_USER,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
            // 连接Redis
            try {
                logger_1.logger.info('正在连接Redis...');
                logger_1.logger.info(`Redis连接信息: host=${process.env.REDIS_HOST}, port=${process.env.REDIS_PORT}`);
                await (0, redis_1.connectRedis)();
                logger_1.logger.info('✅ Redis连接成功');
            }
            catch (error) {
                logger_1.logger.warn('❌ Redis连接失败，某些功能可能受影响:', error);
                logger_1.logger.warn('Redis错误详情:', {
                    host: process.env.REDIS_HOST,
                    port: process.env.REDIS_PORT,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
            // 启动定时任务
            try {
                scheduler_1.SchedulerService.startAll();
                logger_1.logger.info('✅ 定时任务启动完成');
            }
            catch (error) {
                logger_1.logger.warn('❌ 定时任务启动失败:', error);
            }
        }
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
                    const { sequelize } = await Promise.resolve().then(() => __importStar(require('./config/database')));
                    await sequelize.close();
                    logger_1.logger.info('数据库连接已关闭');
                    // 停止定时任务
                    scheduler_1.SchedulerService.stopAll();
                    // 关闭Redis连接
                    const { redisClient } = await Promise.resolve().then(() => __importStar(require('./config/redis')));
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
