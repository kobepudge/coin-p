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
exports.syncDatabase = exports.testConnection = exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("../utils/logger");
// 加载环境变量
dotenv_1.default.config();
// 数据库配置
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME || 'coin_trading',
    username: process.env.DB_USER || 'coin_user',
    password: process.env.DB_PASSWORD || 'coin_pass_2024',
    dialect: 'mysql',
    timezone: '+08:00',
    logging: process.env.NODE_ENV === 'development' ? logger_1.logger.info.bind(logger_1.logger) : false,
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    define: {
        timestamps: true,
        underscored: true,
        underscoredAll: true,
        paranoid: false
    }
};
// 创建Sequelize实例
exports.sequelize = new sequelize_1.Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    timezone: dbConfig.timezone,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    define: dbConfig.define
});
// 测试数据库连接
const testConnection = async () => {
    try {
        await exports.sequelize.authenticate();
        logger_1.logger.info('数据库连接成功');
    }
    catch (error) {
        logger_1.logger.error('数据库连接失败:', error);
        throw error;
    }
};
exports.testConnection = testConnection;
// 同步数据库模型
const syncDatabase = async () => {
    try {
        // 导入模型以确保它们被注册
        await Promise.resolve().then(() => __importStar(require('../models')));
        await exports.sequelize.sync({ force: false });
        logger_1.logger.info('数据库模型同步成功');
    }
    catch (error) {
        logger_1.logger.error('数据库模型同步失败:', error);
        throw error;
    }
};
exports.syncDatabase = syncDatabase;
// Sequelize CLI配置
exports.default = {
    development: {
        ...dbConfig,
        logging: console.log
    },
    test: {
        ...dbConfig,
        database: `${dbConfig.database}_test`,
        logging: false
    },
    production: {
        ...dbConfig,
        logging: false
    }
};
