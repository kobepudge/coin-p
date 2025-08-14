"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelExpiredOrders = exports.getRecentOrders = exports.getPendingOrdersCount = exports.getOrderStats = exports.deleteOrder = exports.batchUpdateStatus = exports.updateOrderStatus = exports.createOrder = exports.getOrderById = exports.getOrders = exports.batchUpdateStatusValidation = exports.updateOrderStatusValidation = exports.createOrderValidation = void 0;
const express_validator_1 = require("express-validator");
const order_1 = require("@/services/order");
const error_1 = require("@/middlewares/error");
const constants_1 = require("@/constants");
// 创建订单验证规则
exports.createOrderValidation = [
    (0, express_validator_1.body)('merchant_id')
        .isInt({ min: 1 })
        .withMessage('商家ID必须是正整数'),
    (0, express_validator_1.body)('player_game_id')
        .trim()
        .notEmpty()
        .withMessage('玩家游戏ID不能为空')
        .isLength({ min: 1, max: 100 })
        .withMessage('玩家游戏ID长度应在1-100字符之间'),
    (0, express_validator_1.body)('payment_qr_url')
        .trim()
        .notEmpty()
        .withMessage('收款二维码URL不能为空')
        .isLength({ max: 500 })
        .withMessage('收款二维码URL长度不能超过500字符')
];
// 更新订单状态验证规则
exports.updateOrderStatusValidation = [
    (0, express_validator_1.param)('id')
        .isInt({ min: 1 })
        .withMessage('订单ID必须是正整数'),
    (0, express_validator_1.body)('status')
        .isIn(['pending', 'completed', 'failed', 'rejected'])
        .withMessage('状态必须是pending、completed、failed或rejected之一'),
    (0, express_validator_1.body)('admin_note')
        .trim()
        .notEmpty()
        .withMessage('管理员备注不能为空')
        .isLength({ max: 1000 })
        .withMessage('管理员备注长度不能超过1000字符')
];
// 批量更新状态验证规则
exports.batchUpdateStatusValidation = [
    (0, express_validator_1.body)('ids')
        .isArray({ min: 1 })
        .withMessage('订单ID列表不能为空'),
    (0, express_validator_1.body)('ids.*')
        .isInt({ min: 1 })
        .withMessage('订单ID必须是正整数'),
    (0, express_validator_1.body)('status')
        .isIn(['pending', 'completed', 'failed', 'rejected'])
        .withMessage('状态必须是pending、completed、failed或rejected之一'),
    (0, express_validator_1.body)('admin_note')
        .trim()
        .notEmpty()
        .withMessage('管理员备注不能为空')
        .isLength({ max: 1000 })
        .withMessage('管理员备注长度不能超过1000字符')
];
/**
 * 获取订单列表
 */
exports.getOrders = (0, error_1.asyncHandler)(async (req, res) => {
    const { status, merchant_id, page, limit, search, start_date, end_date } = req.query;
    const result = await order_1.OrderService.getOrders({
        status: status,
        merchant_id: merchant_id ? parseInt(merchant_id) : undefined,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        search: search,
        start_date: start_date,
        end_date: end_date
    });
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '获取订单列表成功',
        data: result
    });
});
/**
 * 获取订单详情
 */
exports.getOrderById = (0, error_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const order = await order_1.OrderService.getOrderById(id);
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '获取订单详情成功',
        data: order
    });
});
/**
 * 创建订单（公开接口，用户提交）
 */
exports.createOrder = (0, error_1.asyncHandler)(async (req, res) => {
    const orderData = {
        merchant_id: req.body.merchant_id,
        player_game_id: req.body.player_game_id,
        payment_qr_url: req.body.payment_qr_url
    };
    const order = await order_1.OrderService.createOrder(orderData);
    res.status(constants_1.HTTP_STATUS.CREATED).json({
        success: true,
        message: '订单提交成功，请等待管理员处理',
        data: order
    });
});
/**
 * 更新订单状态
 */
exports.updateOrderStatus = (0, error_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const { status, admin_note } = req.body;
    const operatorId = req.admin.id;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('User-Agent');
    const order = await order_1.OrderService.updateOrderStatus(id, status, admin_note, operatorId, ipAddress, userAgent);
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '更新订单状态成功',
        data: order
    });
});
/**
 * 批量更新订单状态
 */
exports.batchUpdateStatus = (0, error_1.asyncHandler)(async (req, res) => {
    const { ids, status, admin_note } = req.body;
    const operatorId = req.admin.id;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('User-Agent');
    await order_1.OrderService.batchUpdateStatus(ids, status, admin_note, operatorId, ipAddress, userAgent);
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '批量更新订单状态成功',
        data: null
    });
});
/**
 * 删除订单
 */
exports.deleteOrder = (0, error_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const operatorId = req.admin.id;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('User-Agent');
    await order_1.OrderService.deleteOrder(id, operatorId, ipAddress, userAgent);
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '删除订单成功',
        data: null
    });
});
/**
 * 获取订单统计信息
 */
exports.getOrderStats = (0, error_1.asyncHandler)(async (req, res) => {
    const { start_date, end_date, merchant_id } = req.query;
    const stats = await order_1.OrderService.getOrderStats({
        start_date: start_date,
        end_date: end_date,
        merchant_id: merchant_id ? parseInt(merchant_id) : undefined
    });
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '获取订单统计成功',
        data: stats
    });
});
/**
 * 获取待处理订单数量
 */
exports.getPendingOrdersCount = (0, error_1.asyncHandler)(async (req, res) => {
    const count = await order_1.OrderService.getPendingOrdersCount();
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '获取待处理订单数量成功',
        data: { count }
    });
});
/**
 * 获取最近订单列表
 */
exports.getRecentOrders = (0, error_1.asyncHandler)(async (req, res) => {
    const { limit } = req.query;
    const orders = await order_1.OrderService.getRecentOrders(limit ? parseInt(limit) : undefined);
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '获取最近订单成功',
        data: orders
    });
});
/**
 * 取消过期订单（定时任务接口）
 */
exports.cancelExpiredOrders = (0, error_1.asyncHandler)(async (req, res) => {
    const canceledCount = await order_1.OrderService.cancelExpiredOrders();
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: `已取消 ${canceledCount} 个过期订单`,
        data: { canceled_count: canceledCount }
    });
});
