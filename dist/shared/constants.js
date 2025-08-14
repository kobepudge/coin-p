"use strict";
// 共享常量定义
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSION_DESCRIPTIONS = exports.STATUS_TEXT = exports.REGEX_PATTERNS = exports.ERROR_CODES = exports.HTTP_STATUS = exports.JWT_CONFIG = exports.FILE_UPLOAD = exports.PAGINATION = exports.SUPER_ADMIN_PERMISSIONS = exports.DEFAULT_PERMISSIONS = exports.PERMISSIONS = exports.LOG_TARGET_TYPES = exports.ORDER_STATUS = exports.MERCHANT_STATUS = exports.MERCHANT_TYPES = exports.ADMIN_STATUS = exports.ADMIN_ROLES = void 0;
// 管理员角色
exports.ADMIN_ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin'
};
// 管理员状态
exports.ADMIN_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive'
};
// 商家类型
exports.MERCHANT_TYPES = {
    SELLER: 'seller', // 出货商家
    BUYER: 'buyer' // 收货商家
};
// 商家状态
exports.MERCHANT_STATUS = {
    ONLINE: 'online',
    OFFLINE: 'offline'
};
// 订单状态
exports.ORDER_STATUS = {
    PENDING: 'pending', // 待处理
    COMPLETED: 'completed', // 已完成
    FAILED: 'failed', // 处理失败
    REJECTED: 'rejected' // 已驳回
};
// 操作日志目标类型
exports.LOG_TARGET_TYPES = {
    MERCHANT: 'merchant',
    ORDER: 'order',
    ADMIN: 'admin'
};
// 权限列表
exports.PERMISSIONS = {
    MERCHANT_MANAGE: 'merchant_manage',
    ORDER_MANAGE: 'order_manage',
    ADMIN_MANAGE: 'admin_manage',
    SYSTEM_CONFIG: 'system_config'
};
// 默认权限配置
exports.DEFAULT_PERMISSIONS = {
    [exports.PERMISSIONS.MERCHANT_MANAGE]: false,
    [exports.PERMISSIONS.ORDER_MANAGE]: false,
    [exports.PERMISSIONS.ADMIN_MANAGE]: false,
    [exports.PERMISSIONS.SYSTEM_CONFIG]: false
};
// 超级管理员权限配置
exports.SUPER_ADMIN_PERMISSIONS = {
    [exports.PERMISSIONS.MERCHANT_MANAGE]: true,
    [exports.PERMISSIONS.ORDER_MANAGE]: true,
    [exports.PERMISSIONS.ADMIN_MANAGE]: true,
    [exports.PERMISSIONS.SYSTEM_CONFIG]: true
};
// 分页默认配置
exports.PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
};
// 文件上传限制
exports.FILE_UPLOAD = {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif']
};
// JWT配置
exports.JWT_CONFIG = {
    EXPIRES_IN: '7d',
    REFRESH_EXPIRES_IN: '30d'
};
// 状态码
exports.HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500
};
// 错误代码
exports.ERROR_CODES = {
    // 认证相关
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_INVALID: 'TOKEN_INVALID',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    // 用户相关
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    USERNAME_EXISTS: 'USERNAME_EXISTS',
    EMAIL_EXISTS: 'EMAIL_EXISTS',
    // 商家相关
    MERCHANT_NOT_FOUND: 'MERCHANT_NOT_FOUND',
    MERCHANT_NAME_EXISTS: 'MERCHANT_NAME_EXISTS',
    ONLY_ONE_CURRENT_SELLER: 'ONLY_ONE_CURRENT_SELLER',
    // 订单相关
    ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
    INVALID_ORDER_STATUS: 'INVALID_ORDER_STATUS',
    // 文件相关
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    FILE_TYPE_NOT_ALLOWED: 'FILE_TYPE_NOT_ALLOWED',
    FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
    // 验证相关
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    REQUIRED_FIELD: 'REQUIRED_FIELD',
    INVALID_FORMAT: 'INVALID_FORMAT',
    // 服务器相关
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR'
};
// 正则表达式
exports.REGEX_PATTERNS = {
    USERNAME: /^[a-zA-Z0-9_]{3,30}$/,
    PASSWORD: /^.{6,50}$/,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^1[3-9]\d{9}$/,
    GAME_ID: /^[a-zA-Z0-9_]{1,50}$/
};
// 状态文本映射
exports.STATUS_TEXT = {
    // 管理员状态
    [exports.ADMIN_STATUS.ACTIVE]: '启用',
    [exports.ADMIN_STATUS.INACTIVE]: '禁用',
    // 商家状态
    [exports.MERCHANT_STATUS.ONLINE]: '上线',
    [exports.MERCHANT_STATUS.OFFLINE]: '下线',
    // 订单状态
    [exports.ORDER_STATUS.PENDING]: '待处理',
    [exports.ORDER_STATUS.COMPLETED]: '已完成',
    [exports.ORDER_STATUS.FAILED]: '处理失败',
    [exports.ORDER_STATUS.REJECTED]: '已驳回',
    // 商家类型
    [exports.MERCHANT_TYPES.SELLER]: '出货商家',
    [exports.MERCHANT_TYPES.BUYER]: '收货商家',
    // 管理员角色
    [exports.ADMIN_ROLES.SUPER_ADMIN]: '超级管理员',
    [exports.ADMIN_ROLES.ADMIN]: '普通管理员'
};
// 权限描述
exports.PERMISSION_DESCRIPTIONS = {
    [exports.PERMISSIONS.MERCHANT_MANAGE]: '商家管理',
    [exports.PERMISSIONS.ORDER_MANAGE]: '订单管理',
    [exports.PERMISSIONS.ADMIN_MANAGE]: '管理员管理',
    [exports.PERMISSIONS.SYSTEM_CONFIG]: '系统配置'
};
