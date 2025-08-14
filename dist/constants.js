"use strict";
// 简化的常量定义，避免复杂的shared模块依赖
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTP_STATUS = exports.STATUS_TEXT = exports.ADMIN_ROLE = exports.MERCHANT_TYPE = exports.MERCHANT_STATUS = exports.ORDER_STATUS = void 0;
exports.ORDER_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};
exports.MERCHANT_STATUS = {
    ONLINE: 'online',
    OFFLINE: 'offline'
};
exports.MERCHANT_TYPE = {
    SELLER: 'seller',
    BUYER: 'buyer'
};
exports.ADMIN_ROLE = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    OPERATOR: 'operator'
};
exports.STATUS_TEXT = {
    [exports.ORDER_STATUS.PENDING]: '待处理',
    [exports.ORDER_STATUS.PROCESSING]: '处理中',
    [exports.ORDER_STATUS.COMPLETED]: '已完成',
    [exports.ORDER_STATUS.FAILED]: '失败',
    [exports.ORDER_STATUS.CANCELLED]: '已取消'
};
exports.HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
    INTERNAL_ERROR: 500 // Alias for compatibility
};
