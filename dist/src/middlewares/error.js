"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorHandler = exports.notFoundHandler = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
const sequelize_1 = require("sequelize");
const logger_1 = require("@/utils/logger");
const constants_1 = require("@shared/constants");
// 应用错误类
class AppError extends Error {
    constructor(message, statusCode = constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, code) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
// 验证错误类
class ValidationError extends AppError {
    constructor(errors, message = '数据验证失败') {
        super(message, constants_1.HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR');
        this.errors = errors;
    }
}
exports.ValidationError = ValidationError;
// 认证错误类
class AuthenticationError extends AppError {
    constructor(message = '认证失败') {
        super(message, constants_1.HTTP_STATUS.UNAUTHORIZED, 'AUTHENTICATION_ERROR');
    }
}
exports.AuthenticationError = AuthenticationError;
// 授权错误类
class AuthorizationError extends AppError {
    constructor(message = '权限不足') {
        super(message, constants_1.HTTP_STATUS.FORBIDDEN, 'AUTHORIZATION_ERROR');
    }
}
exports.AuthorizationError = AuthorizationError;
// 资源未找到错误类
class NotFoundError extends AppError {
    constructor(resource = '资源') {
        super(`${resource}不存在`, constants_1.HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
// 冲突错误类
class ConflictError extends AppError {
    constructor(message) {
        super(message, constants_1.HTTP_STATUS.CONFLICT, 'CONFLICT');
    }
}
exports.ConflictError = ConflictError;
// 404处理中间件
const notFoundHandler = (req, res, next) => {
    const error = new NotFoundError(`路径 ${req.originalUrl}`);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
// 全局错误处理中间件
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    // 记录错误日志
    logger_1.logger.error('API Error:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.body,
        params: req.params,
        query: req.query
    });
    // Sequelize验证错误
    if (err instanceof sequelize_1.ValidationError) {
        const errors = {};
        err.errors.forEach((validationError) => {
            const field = validationError.path || 'unknown';
            if (!errors[field]) {
                errors[field] = [];
            }
            errors[field].push(validationError.message);
        });
        error = new ValidationError(errors);
    }
    // Sequelize唯一约束错误
    if (err.name === 'SequelizeUniqueConstraintError') {
        const message = '数据已存在，请检查唯一字段';
        error = new ConflictError(message);
    }
    // Sequelize外键约束错误
    if (err.name === 'SequelizeForeignKeyConstraintError') {
        const message = '关联数据不存在或已被删除';
        error = new AppError(message, constants_1.HTTP_STATUS.BAD_REQUEST);
    }
    // JWT错误
    if (err.name === 'JsonWebTokenError') {
        error = new AuthenticationError('无效的访问令牌');
    }
    if (err.name === 'TokenExpiredError') {
        error = new AuthenticationError('访问令牌已过期');
    }
    // Multer文件上传错误
    if (err.name === 'MulterError') {
        const multerErr = err;
        if (multerErr.code === 'LIMIT_FILE_SIZE') {
            error = new AppError('文件大小超出限制', constants_1.HTTP_STATUS.BAD_REQUEST, 'FILE_TOO_LARGE');
        }
        else if (multerErr.code === 'LIMIT_UNEXPECTED_FILE') {
            error = new AppError('不支持的文件类型', constants_1.HTTP_STATUS.BAD_REQUEST, 'FILE_TYPE_NOT_ALLOWED');
        }
        else {
            error = new AppError('文件上传失败', constants_1.HTTP_STATUS.BAD_REQUEST, 'FILE_UPLOAD_FAILED');
        }
    }
    // 设置默认错误
    if (!(error instanceof AppError)) {
        error = new AppError(process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message, constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
    // 构建错误响应
    const response = {
        success: false,
        message: error.message,
        code: error.code
    };
    // 验证错误包含详细信息
    if (error instanceof ValidationError) {
        response.errors = error.errors;
    }
    // 开发环境包含错误堆栈
    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }
    res.status(error.statusCode).json(response);
};
exports.errorHandler = errorHandler;
// 异步错误捕获包装器
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
