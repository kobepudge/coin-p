"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.changePassword = exports.updateProfile = exports.getProfile = exports.refreshToken = exports.logout = exports.login = exports.updateProfileValidation = exports.changePasswordValidation = exports.loginValidation = void 0;
const express_validator_1 = require("express-validator");
const auth_1 = require("@/services/auth");
const error_1 = require("@/middlewares/error");
const constants_1 = require("@/constants");
// 登录验证规则
exports.loginValidation = [
    (0, express_validator_1.body)('username')
        .trim()
        .notEmpty()
        .withMessage('用户名不能为空')
        .isLength({ min: 3, max: 50 })
        .withMessage('用户名长度应在3-50位之间')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('用户名只能包含字母、数字和下划线'),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('密码不能为空')
        .isLength({ min: 6, max: 50 })
        .withMessage('密码长度应在6-50位之间')
];
// 修改密码验证规则
exports.changePasswordValidation = [
    (0, express_validator_1.body)('old_password')
        .notEmpty()
        .withMessage('原密码不能为空'),
    (0, express_validator_1.body)('new_password')
        .notEmpty()
        .withMessage('新密码不能为空')
        .isLength({ min: 6, max: 50 })
        .withMessage('新密码长度应在6-50位之间')
        .custom((value, { req }) => {
        if (value === req.body.old_password) {
            throw new Error('新密码不能与原密码相同');
        }
        return true;
    })
];
// 更新个人信息验证规则
exports.updateProfileValidation = [
    (0, express_validator_1.body)('real_name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('真实姓名不能为空')
        .isLength({ min: 1, max: 100 })
        .withMessage('真实姓名长度应在1-100位之间'),
    (0, express_validator_1.body)('email')
        .optional()
        .isEmail()
        .withMessage('邮箱格式不正确')
        .normalizeEmail()
];
/**
 * 管理员登录
 */
exports.login = (0, error_1.asyncHandler)(async (req, res) => {
    const credentials = {
        username: req.body.username,
        password: req.body.password
    };
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('User-Agent');
    const result = await auth_1.AuthService.login(credentials, ipAddress, userAgent);
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '登录成功',
        data: result
    });
});
/**
 * 管理员登出
 */
exports.logout = (0, error_1.asyncHandler)(async (req, res) => {
    const adminId = req.admin.id;
    const token = req.token;
    const refreshToken = req.body.refresh_token;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('User-Agent');
    await auth_1.AuthService.logout(adminId, token, refreshToken, ipAddress, userAgent);
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '登出成功',
        data: null
    });
});
/**
 * 刷新访问令牌
 */
exports.refreshToken = (0, error_1.asyncHandler)(async (req, res) => {
    const { refresh_token } = req.body;
    if (!refresh_token) {
        return res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: '缺少刷新令牌',
            data: null
        });
    }
    const result = await auth_1.AuthService.refreshToken(refresh_token);
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '令牌刷新成功',
        data: result
    });
});
/**
 * 获取当前用户信息
 */
exports.getProfile = (0, error_1.asyncHandler)(async (req, res) => {
    const adminId = req.admin.id;
    const profile = await auth_1.AuthService.getProfile(adminId);
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '获取用户信息成功',
        data: profile
    });
});
/**
 * 更新个人信息
 */
exports.updateProfile = (0, error_1.asyncHandler)(async (req, res) => {
    const adminId = req.admin.id;
    const operatorId = req.admin.id;
    const profileData = {
        real_name: req.body.real_name,
        email: req.body.email
    };
    // 过滤掉未定义的字段
    const updateData = Object.fromEntries(Object.entries(profileData).filter(([_, value]) => value !== undefined));
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('User-Agent');
    const result = await auth_1.AuthService.updateProfile(adminId, updateData, operatorId, ipAddress, userAgent);
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '个人信息更新成功',
        data: result
    });
});
/**
 * 修改密码
 */
exports.changePassword = (0, error_1.asyncHandler)(async (req, res) => {
    const adminId = req.admin.id;
    const { old_password, new_password } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('User-Agent');
    await auth_1.AuthService.changePassword(adminId, old_password, new_password, ipAddress, userAgent);
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '密码修改成功，请重新登录',
        data: null
    });
});
/**
 * 验证token状态
 */
exports.verifyToken = (0, error_1.asyncHandler)(async (req, res) => {
    // 如果能到达这里，说明token是有效的（通过了认证中间件）
    res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message: '令牌有效',
        data: {
            admin: {
                id: req.admin.id,
                username: req.admin.username,
                role: req.admin.role,
                permissions: req.admin.permissions,
                real_name: req.admin.real_name,
                email: req.admin.email
            }
        }
    });
});
