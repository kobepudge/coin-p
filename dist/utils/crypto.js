"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoUtils = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const logger_1 = require("@/utils/logger");
// 加密工具类
class CryptoUtils {
    /**
     * 哈希密码
     */
    static async hashPassword(password) {
        try {
            return await bcrypt_1.default.hash(password, this.SALT_ROUNDS);
        }
        catch (error) {
            logger_1.logger.error('密码哈希失败:', error);
            throw new Error('密码加密失败');
        }
    }
    /**
     * 验证密码
     */
    static async verifyPassword(password, hashedPassword) {
        try {
            return await bcrypt_1.default.compare(password, hashedPassword);
        }
        catch (error) {
            logger_1.logger.error('密码验证失败:', error);
            throw new Error('密码验证失败');
        }
    }
    /**
     * 生成随机字符串
     */
    static generateRandomString(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    /**
     * 生成数字验证码
     */
    static generateNumericCode(length = 6) {
        const chars = '0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    /**
     * 验证密码强度
     */
    static validatePasswordStrength(password) {
        const feedback = [];
        let score = 0;
        // 长度检查
        if (password.length >= 8) {
            score += 1;
        }
        else {
            feedback.push('密码长度至少8位');
        }
        // 包含小写字母
        if (/[a-z]/.test(password)) {
            score += 1;
        }
        else {
            feedback.push('需包含小写字母');
        }
        // 包含大写字母
        if (/[A-Z]/.test(password)) {
            score += 1;
        }
        else {
            feedback.push('建议包含大写字母');
        }
        // 包含数字
        if (/\d/.test(password)) {
            score += 1;
        }
        else {
            feedback.push('需包含数字');
        }
        // 包含特殊字符
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            score += 1;
        }
        else {
            feedback.push('建议包含特殊字符');
        }
        // 避免常见模式
        const commonPatterns = [
            /123456/,
            /password/i,
            /qwerty/i,
            /abc123/i,
            /admin/i
        ];
        const hasCommonPattern = commonPatterns.some(pattern => pattern.test(password));
        if (hasCommonPattern) {
            score -= 1;
            feedback.push('避免使用常见密码模式');
        }
        return {
            isValid: score >= 3,
            score,
            feedback
        };
    }
    /**
     * 生成安全的临时密码
     */
    static generateSecureTemporaryPassword() {
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*';
        let password = '';
        // 确保包含各种类型的字符
        password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
        password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
        password += numbers.charAt(Math.floor(Math.random() * numbers.length));
        password += symbols.charAt(Math.floor(Math.random() * symbols.length));
        // 填充剩余位数
        const allChars = lowercase + uppercase + numbers + symbols;
        for (let i = password.length; i < 12; i++) {
            password += allChars.charAt(Math.floor(Math.random() * allChars.length));
        }
        // 打乱字符顺序
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }
}
exports.CryptoUtils = CryptoUtils;
CryptoUtils.SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');
