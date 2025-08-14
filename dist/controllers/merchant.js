"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentSeller = exports.getPublicMerchants = exports.getMerchantStats = exports.updateMerchantOrder = exports.setCurrentSeller = exports.batchUpdateStatus = exports.deleteMerchant = exports.updateMerchant = exports.createMerchant = exports.getMerchantById = exports.getMerchants = exports.updateOrderValidation = exports.batchUpdateStatusValidation = exports.updateMerchantValidation = exports.createMerchantValidation = void 0;
const express_validator_1 = require("express-validator");
const merchant_1 = require("@/services/merchant");
const error_1 = require("@/middlewares/error");
const constants_1 = require("@/constants");
// 创建商家验证规则
exports.createMerchantValidation = [
    (0, express_validator_1.body)('name')
        .trim()
        .notEmpty()
        .withMessage('商家名称不能为空')
        .isLength({ min: 1, max: 100 })
        .withMessage('商家名称长度应在1-100字符之间'),
    (0, express_validator_1.body)('type')
        .isIn(['seller', 'buyer'])
        .withMessage('商家类型必须是seller或buyer'),
    (0, express_validator_1.body)('price')
        .trim()
        .notEmpty()
        .withMessage('价格不能为空')
        .isLength({ max: 50 })
        .withMessage('价格长度不能超过50字符'),
    (0, express_validator_1.body)('trade_method')
        .trim()
        .notEmpty()
        .withMessage('交易方式不能为空')
        .isLength({ max: 100 })
        .withMessage('交易方式长度不能超过100字符'),
    (0, express_validator_1.body)('stock_or_demand')
        .trim()
        .notEmpty()
        .withMessage('库存量或需求量不能为空')
        .isLength({ max: 100 })
        .withMessage('库存量或需求量长度不能超过100字符'),
    (0, express_validator_1.body)('speed')
        .trim()
        .notEmpty()
        .withMessage('发货/结算速度不能为空')
        .isLength({ max: 100 })
        .withMessage('速度说明长度不能超过100字符'),
    (0, express_validator_1.body)('guarantee')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('服务保障说明长度不能超过200字符'),
    (0, express_validator_1.body)('payment_qr')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('收款二维码URL长度不能超过500字符'),
    (0, express_validator_1.body)('transfer_game_id')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('中转游戏ID长度不能超过100字符'),
    (0, express_validator_1.body)('status')
        .optional()
        .isIn(['online', 'offline'])
        .withMessage('状态必须是online或offline'),
    (0, express_validator_1.body)('sort_order')
        .optional()
        .isInt({ min: 0 })
        .withMessage('排序权重必须是非负整数')
];
// 更新商家验证规则
exports.updateMerchantValidation = [
    (0, express_validator_1.param)('id')
        .isInt({ min: 1 })
        .withMessage('商家ID必须是正整数'),
    (0, express_validator_1.body)('name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('商家名称不能为空')
        .isLength({ min: 1, max: 100 })
        .withMessage('商家名称长度应在1-100字符之间'),
    (0, express_validator_1.body)('type')
        .optional()
        .isIn(['seller', 'buyer'])
        .withMessage('商家类型必须是seller或buyer'),
    (0, express_validator_1.body)('price')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('价格不能为空')
        .isLength({ max: 50 })
        .withMessage('价格长度不能超过50字符'),
    (0, express_validator_1.body)('trade_method')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('交易方式不能为空')
        .isLength({ max: 100 })
        .withMessage('交易方式长度不能超过100字符'),
    (0, express_validator_1.body)('stock_or_demand')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('库存量或需求量不能为空')
        .isLength({ max: 100 })
        .withMessage('库存量或需求量长度不能超过100字符'),
    (0, express_validator_1.body)('speed')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('发货/结算速度不能为空')
        .isLength({ max: 100 })
        .withMessage('速度说明长度不能超过100字符'),
    (0, express_validator_1.body)('guarantee')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('服务保障说明长度不能超过200字符'),
    (0, express_validator_1.body)('payment_qr')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('收款二维码URL长度不能超过500字符'),
    (0, express_validator_1.body)('transfer_game_id')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('中转游戏ID长度不能超过100字符'),
    (0, express_validator_1.body)('status')
        .optional()
        .isIn(['online', 'offline'])
        .withMessage('状态必须是online或offline'),
    (0, express_validator_1.body)('sort_order')
        .optional()
        .isInt({ min: 0 })
        .withMessage('排序权重必须是非负整数')
];
// 批量状态更新验证规则
exports.batchUpdateStatusValidation = [
    (0, express_validator_1.body)('ids')
        .isArray({ min: 1 })
        .withMessage('商家ID列表不能为空'),
    (0, express_validator_1.body)('ids.*')
        .isInt({ min: 1 })
        .withMessage('商家ID必须是正整数'),
    (0, express_validator_1.body)('status')
        .isIn(['online', 'offline'])
        .withMessage('状态必须是online或offline')
];
// 排序更新验证规则
exports.updateOrderValidation = [
    (0, express_validator_1.body)('orders')
        .isArray({ min: 1 })
        .withMessage('排序数据不能为空'),
    (0, express_validator_1.body)('orders.*.id')
        .isInt({ min: 1 })
        .withMessage('商家ID必须是正整数'),
    (0, express_validator_1.body)('orders.*.sort_order')
        .isInt({ min: 0 })
        .withMessage('排序权重必须是非负整数')
];
/**
 * 获取商家列表
 */
exports.getMerchants = (0, error_1.asyncHandler)(async (req, res) => {
    const { type, status, page, limit, search } = req.query;
    const result = await merchant_1.MerchantService.getMerchants({
        type: type,
        status: status,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        search: search
    });
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '获取商家列表成功',
        data: result
    });
});
/**
 * 获取商家详情
 */
exports.getMerchantById = (0, error_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const merchant = await merchant_1.MerchantService.getMerchantById(id);
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '获取商家详情成功',
        data: merchant
    });
});
/**
 * 创建商家
 */
exports.createMerchant = (0, error_1.asyncHandler)(async (req, res) => {
    const merchantData = {
        name: req.body.name,
        type: req.body.type,
        price: req.body.price,
        trade_method: req.body.trade_method,
        stock_or_demand: req.body.stock_or_demand,
        speed: req.body.speed,
        guarantee: req.body.guarantee,
        payment_qr: req.body.payment_qr,
        transfer_game_id: req.body.transfer_game_id,
        status: req.body.status || 'online',
        sort_order: req.body.sort_order || 0,
        is_current_seller: false // 默认不设为当前商家
    };
    const operatorId = req.admin.id;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('User-Agent');
    const merchant = await merchant_1.MerchantService.createMerchant(merchantData, operatorId, ipAddress, userAgent);
    res.status(constants_1.HTTP_STATUS.CREATED).json({
        success: true,
        message: '创建商家成功',
        data: merchant
    });
});
/**
 * 更新商家信息
 */
exports.updateMerchant = (0, error_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const updateData = req.body;
    const operatorId = req.admin.id;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('User-Agent');
    const merchant = await merchant_1.MerchantService.updateMerchant(id, updateData, operatorId, ipAddress, userAgent);
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '更新商家信息成功',
        data: merchant
    });
});
/**
 * 删除商家
 */
exports.deleteMerchant = (0, error_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const operatorId = req.admin.id;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('User-Agent');
    await merchant_1.MerchantService.deleteMerchant(id, operatorId, ipAddress, userAgent);
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '删除商家成功',
        data: null
    });
});
/**
 * 批量更新商家状态
 */
exports.batchUpdateStatus = (0, error_1.asyncHandler)(async (req, res) => {
    const { ids, status } = req.body;
    const operatorId = req.admin.id;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('User-Agent');
    await merchant_1.MerchantService.batchUpdateStatus(ids, status, operatorId, ipAddress, userAgent);
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '批量更新商家状态成功',
        data: null
    });
});
/**
 * 设置当前出货商家
 */
exports.setCurrentSeller = (0, error_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const operatorId = req.admin.id;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('User-Agent');
    await merchant_1.MerchantService.setCurrentSeller(id, operatorId, ipAddress, userAgent);
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '设置当前出货商家成功',
        data: null
    });
});
/**
 * 更新商家排序
 */
exports.updateMerchantOrder = (0, error_1.asyncHandler)(async (req, res) => {
    const { orders } = req.body;
    const operatorId = req.admin.id;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('User-Agent');
    await merchant_1.MerchantService.updateMerchantOrder(orders, operatorId, ipAddress, userAgent);
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '更新商家排序成功',
        data: null
    });
});
/**
 * 获取商家统计信息
 */
exports.getMerchantStats = (0, error_1.asyncHandler)(async (req, res) => {
    const stats = await merchant_1.MerchantService.getActiveMerchantStats();
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '获取商家统计成功',
        data: stats
    });
});
// 公开接口：获取前端商家列表
exports.getPublicMerchants = (0, error_1.asyncHandler)(async (req, res) => {
    const { type } = req.params;
    if (!['seller', 'buyer'].includes(type)) {
        return res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: '商家类型必须是seller或buyer',
            data: null
        });
    }
    const merchants = await merchant_1.MerchantService.getPublicMerchants(type);
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '获取商家列表成功',
        data: merchants
    });
});
// 公开接口：获取当前出货商家
exports.getCurrentSeller = (0, error_1.asyncHandler)(async (req, res) => {
    const merchant = await merchant_1.MerchantService.getCurrentSeller();
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '获取当前出货商家成功',
        data: merchant
    });
});
