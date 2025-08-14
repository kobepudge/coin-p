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
const merchantController = __importStar(require("@/controllers/merchant"));
const router = (0, express_1.Router)();
// 管理员商家管理路由 (需要认证和权限)
router.use(auth_1.authenticate);
// 获取商家列表
router.get('/', (0, auth_1.requirePermission)('merchant_manage'), merchantController.getMerchants);
// 获取商家统计信息
router.get('/stats', (0, auth_1.requirePermission)('merchant_manage'), merchantController.getMerchantStats);
// 获取商家详情
router.get('/:id', (0, auth_1.requirePermission)('merchant_manage'), merchantController.getMerchantById);
// 创建商家
router.post('/', (0, auth_1.requirePermission)('merchant_manage'), (0, validation_1.validate)(merchantController.createMerchantValidation), merchantController.createMerchant);
// 更新商家信息
router.put('/:id', (0, auth_1.requirePermission)('merchant_manage'), (0, validation_1.validate)(merchantController.updateMerchantValidation), merchantController.updateMerchant);
// 删除商家
router.delete('/:id', (0, auth_1.requirePermission)('merchant_manage'), merchantController.deleteMerchant);
// 批量更新商家状态
router.post('/batch-status', (0, auth_1.requirePermission)('merchant_manage'), (0, validation_1.validate)(merchantController.batchUpdateStatusValidation), merchantController.batchUpdateStatus);
// 设置当前出货商家
router.post('/:id/set-current', (0, auth_1.requirePermission)('merchant_manage'), merchantController.setCurrentSeller);
// 更新商家排序
router.post('/update-order', (0, auth_1.requirePermission)('merchant_manage'), (0, validation_1.validate)(merchantController.updateOrderValidation), merchantController.updateMerchantOrder);
exports.default = router;
