"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_1 = require("@/controllers/upload");
const auth_1 = require("@/middleware/auth");
const router = (0, express_1.Router)();
// 上传图片 (需要认证)
router.post('/image', auth_1.authenticateToken, upload_1.uploadMiddleware.single('image'), upload_1.uploadImage);
// 上传支付二维码 (公开接口，用于用户提交订单时上传收款码)
router.post('/payment-qr', upload_1.uploadMiddleware.single('qr'), upload_1.uploadPaymentQr);
// 删除文件 (需要认证)
router.delete('/:filename', auth_1.authenticateToken, upload_1.deleteFile);
exports.default = router;
