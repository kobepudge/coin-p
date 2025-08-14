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
const validation_1 = require("@/middlewares/validation");
const auth_1 = require("@/middlewares/auth");
const authController = __importStar(require("@/controllers/auth"));
const router = (0, express_1.Router)();
// 管理员登录
router.post('/login', (0, validation_1.validate)(authController.loginValidation), authController.login);
// 管理员登出
router.post('/logout', auth_1.authenticate, authController.logout);
// 刷新访问令牌
router.post('/refresh', authController.refreshToken);
// 验证token状态
router.get('/verify', auth_1.authenticate, authController.verifyToken);
// 获取当前用户信息
router.get('/profile', auth_1.authenticate, authController.getProfile);
// 更新个人信息
router.put('/profile', auth_1.authenticate, (0, validation_1.validate)(authController.updateProfileValidation), authController.updateProfile);
// 修改密码
router.post('/change-password', auth_1.authenticate, (0, validation_1.validate)(authController.changePasswordValidation), authController.changePassword);
exports.default = router;
