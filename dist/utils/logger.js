"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logOperation = exports.logError = exports.requestLogger = exports.httpLogFormat = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// 确保日志目录存在
const logDir = process.env.LOG_DIR || 'logs';
if (!fs_1.default.existsSync(logDir)) {
    fs_1.default.mkdirSync(logDir, { recursive: true });
}
// 日志格式
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
// 安全的JSON序列化函数，处理循环引用
const safeStringify = (obj, space) => {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return '[Circular Reference]';
            }
            seen.add(value);
        }
        return value;
    }, space);
};
// 控制台输出格式
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let logMessage = `${timestamp} [${level}]: ${message}`;
    // 添加错误堆栈
    if (stack) {
        logMessage += `\n${stack}`;
    }
    // 添加额外元数据，使用安全的JSON序列化
    if (Object.keys(meta).length > 0) {
        try {
            logMessage += `\n${safeStringify(meta, 2)}`;
        }
        catch (error) {
            logMessage += `\n[Error serializing meta data: ${error}]`;
        }
    }
    return logMessage;
}));
// 创建logger实例
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'coin-trading-api' },
    transports: [
        // 错误日志文件
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // 组合日志文件
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 10
        })
    ]
});
// 开发环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
    exports.logger.add(new winston_1.default.transports.Console({
        format: consoleFormat
    }));
}
// HTTP请求日志格式
const httpLogFormat = (tokens, req, res) => {
    const logData = {
        method: tokens.method(req, res),
        url: tokens.url(req, res),
        status: tokens.status(req, res),
        responseTime: tokens['response-time'](req, res) + 'ms',
        contentLength: tokens.res(req, res, 'content-length'),
        userAgent: tokens['user-agent'](req, res),
        ip: req.ip || req.connection?.remoteAddress
    };
    return JSON.stringify(logData);
};
exports.httpLogFormat = httpLogFormat;
// 记录请求日志的中间件
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.originalUrl || req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent') || '',
            contentLength: res.get('content-length') || 0
        };
        if (res.statusCode >= 400) {
            exports.logger.warn('HTTP Request', logData);
        }
        else {
            exports.logger.info('HTTP Request', logData);
        }
    });
    next();
};
exports.requestLogger = requestLogger;
// 错误日志记录函数
const logError = (error, context) => {
    exports.logger.error('Application Error', {
        message: error.message,
        stack: error.stack,
        context: context || {}
    });
};
exports.logError = logError;
// 操作日志记录函数
const logOperation = (operation, adminId, details) => {
    exports.logger.info('Admin Operation', {
        operation,
        adminId,
        details: details || {},
        timestamp: new Date().toISOString()
    });
};
exports.logOperation = logOperation;
