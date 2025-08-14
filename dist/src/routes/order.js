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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("@/middlewares/auth");
const validation_1 = require("@/middlewares/validation");
const orderController = __importStar(require("@/controllers/order"));
const router = (0, express_1.Router)();
// 管理员订单管理路由 (需要认证和权限)
router.use(auth_1.authenticate);
// 获取订单列表
router.get('/', (0, auth_1.requirePermission)('order_manage'), orderController.getOrders);
// 获取订单统计信息
router.get('/stats', (0, auth_1.requirePermission)('order_manage'), orderController.getOrderStats);
// 获取待处理订单数量
router.get('/pending-count', (0, auth_1.requirePermission)('order_manage'), orderController.getPendingOrdersCount);
// 获取最近订单列表
router.get('/recent', (0, auth_1.requirePermission)('order_manage'), orderController.getRecentOrders);
// 取消过期订单（定时任务）
router.post('/cancel-expired', (0, auth_1.requirePermission)('order_manage'), orderController.cancelExpiredOrders);
// 获取订单详情
router.get('/:id', (0, auth_1.requirePermission)('order_manage'), orderController.getOrderById);
// 更新订单状态
router.put('/:id/status', (0, auth_1.requirePermission)('order_manage'), (0, validation_1.validate)(orderController.updateOrderStatusValidation), orderController.updateOrderStatus);
// 删除订单
router.delete('/:id', (0, auth_1.requirePermission)('order_manage'), orderController.deleteOrder);
// 批量更新订单状态
router.post('/batch-status', (0, auth_1.requirePermission)('order_manage'), (0, validation_1.validate)(orderController.batchUpdateStatusValidation), orderController.batchUpdateStatus);
exports.default = router;
