"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OSSUtils = exports.ossClient = exports.ENVIRONMENT_INFO = exports.OSS_ENV_PREFIX = void 0;
const ali_oss_1 = __importDefault(require("ali-oss"));
const logger_1 = require("../utils/logger");
const dotenv_1 = __importDefault(require("dotenv"));
// 加载环境变量
dotenv_1.default.config();
// 环境配置
const isProduction = process.env.NODE_ENV === 'production';
const isStaging = process.env.NODE_ENV === 'staging';
const isDevelopment = process.env.NODE_ENV === 'development';
// OSS环境前缀配置
exports.OSS_ENV_PREFIX = isProduction ? 'prod' : 'dev';
// 环境信息
exports.ENVIRONMENT_INFO = {
    name: process.env.ENVIRONMENT_NAME ||
        (isProduction ? '生产环境' : isStaging ? '测试环境' : '开发环境'),
    type: process.env.NODE_ENV || 'development',
    prefix: exports.OSS_ENV_PREFIX
};
// OSS配置
const ossConfig = {
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
    bucket: process.env.ALIYUN_OSS_BUCKET || 'cximags',
    region: process.env.ALIYUN_OSS_REGION || 'oss-cn-shenzhen',
    timeout: 60000, // 60秒
    secure: true, // 使用HTTPS
};
// 验证必要的OSS配置
const isOSSConfigured = ossConfig.accessKeyId && ossConfig.accessKeySecret;
if (!isOSSConfigured) {
    logger_1.logger.warn('OSS配置缺失: AccessKey ID 或 AccessKey Secret 未设置，部分功能可能无法正常使用');
}
// 创建OSS客户端 (仅在配置完整时创建)
exports.ossClient = isOSSConfigured ? new ali_oss_1.default(ossConfig) : null;
// OSS工具类
class OSSUtils {
    /**
     * 获取环境特定的文件路径
     * @param originalPath 原始文件路径
     * @returns 带环境前缀的文件路径
     */
    static getEnvironmentPath(originalPath) {
        // 移除开头的斜杠（如果有）
        const cleanPath = originalPath.startsWith('/') ? originalPath.slice(1) : originalPath;
        // 添加环境前缀
        return `${exports.OSS_ENV_PREFIX}/${cleanPath}`;
    }
    /**
     * 上传文件到OSS
     * @param filePath OSS文件路径（不包含环境前缀）
     * @param fileBuffer 文件缓冲区
     * @param options 上传选项
     * @returns 上传结果
     */
    static async uploadFile(filePath, fileBuffer, options = {}) {
        try {
            if (!exports.ossClient) {
                return {
                    success: false,
                    error: 'OSS未配置，无法上传文件'
                };
            }
            // 获取环境特定路径
            const environmentPath = this.getEnvironmentPath(filePath);
            // 上传文件
            const result = await exports.ossClient.put(environmentPath, fileBuffer, {
                headers: {
                    'Content-Type': options.contentType || 'application/octet-stream',
                    ...options.metadata
                }
            });
            logger_1.logger.info('OSS文件上传成功:', {
                originalPath: filePath,
                environmentPath,
                url: result.url,
                environment: exports.OSS_ENV_PREFIX
            });
            return {
                success: true,
                url: result.url,
                filePath: environmentPath
            };
        }
        catch (error) {
            logger_1.logger.error('OSS文件上传失败:', {
                filePath,
                error: error.message,
                environment: exports.OSS_ENV_PREFIX
            });
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * 删除OSS文件
     * @param filePath OSS文件路径（不包含环境前缀）
     * @returns 删除结果
     */
    static async deleteFile(filePath) {
        try {
            if (!exports.ossClient) {
                return {
                    success: false,
                    error: 'OSS未配置，无法删除文件'
                };
            }
            // 获取环境特定路径
            const environmentPath = this.getEnvironmentPath(filePath);
            // 删除文件
            await exports.ossClient.delete(environmentPath);
            logger_1.logger.info('OSS文件删除成功:', {
                originalPath: filePath,
                environmentPath,
                environment: exports.OSS_ENV_PREFIX
            });
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error('OSS文件删除失败:', {
                filePath,
                error: error.message,
                environment: exports.OSS_ENV_PREFIX
            });
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * 获取文件访问URL
     * @param filePath OSS文件路径（不包含环境前缀）
     * @param expireTime 过期时间（秒），默认1小时
     * @returns 签名URL
     */
    static async getSignedUrl(filePath, expireTime = 3600) {
        try {
            if (!exports.ossClient) {
                logger_1.logger.warn('OSS未配置，无法生成签名URL:', { filePath });
                return '';
            }
            // 获取环境特定路径
            const environmentPath = this.getEnvironmentPath(filePath);
            // 生成签名URL - 使用正确的API
            const url = exports.ossClient.signatureUrl(environmentPath, {
                expires: expireTime,
                method: 'GET'
            });
            logger_1.logger.debug('生成OSS签名URL:', {
                originalPath: filePath,
                environmentPath,
                url,
                environment: exports.OSS_ENV_PREFIX
            });
            return url;
        }
        catch (error) {
            logger_1.logger.error('生成OSS签名URL失败:', {
                filePath,
                error: error.message,
                environment: exports.OSS_ENV_PREFIX
            });
            throw error;
        }
    }
    /**
     * 检查文件是否存在
     * @param filePath OSS文件路径（不包含环境前缀）
     * @returns 文件是否存在
     */
    static async fileExists(filePath) {
        try {
            if (!exports.ossClient) {
                logger_1.logger.warn('OSS未配置，无法检查文件存在性:', { filePath });
                return false;
            }
            // 获取环境特定路径
            const environmentPath = this.getEnvironmentPath(filePath);
            // 检查文件头信息
            await exports.ossClient.head(environmentPath);
            return true;
        }
        catch (error) {
            if (error.code === 'NoSuchKey') {
                return false;
            }
            logger_1.logger.error('检查OSS文件存在性失败:', {
                filePath,
                error: error.message,
                environment: exports.OSS_ENV_PREFIX
            });
            throw error;
        }
    }
    /**
     * 列出指定目录下的文件
     * @param prefix 文件前缀（目录路径）
     * @param maxKeys 最大返回数量
     * @returns 文件列表
     */
    static async listFiles(prefix = '', maxKeys = 100) {
        try {
            if (!exports.ossClient) {
                return {
                    success: false,
                    error: 'OSS未配置，无法列出文件'
                };
            }
            // 获取环境特定路径
            const environmentPrefix = this.getEnvironmentPath(prefix);
            // 列出文件
            const result = await exports.ossClient.list({
                prefix: environmentPrefix,
                'max-keys': maxKeys
            }, {});
            const files = (result.objects || []).map(obj => ({
                name: obj.name || '',
                url: `https://${ossConfig.bucket}.${ossConfig.region}.aliyuncs.com/${obj.name}`,
                size: obj.size || 0,
                lastModified: new Date(obj.lastModified || Date.now())
            }));
            logger_1.logger.info('OSS文件列表获取成功:', {
                prefix,
                environmentPrefix,
                fileCount: files.length,
                environment: exports.OSS_ENV_PREFIX
            });
            return {
                success: true,
                files
            };
        }
        catch (error) {
            logger_1.logger.error('OSS文件列表获取失败:', {
                prefix,
                error: error.message,
                environment: exports.OSS_ENV_PREFIX
            });
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * 获取当前环境信息
     * @returns 环境信息
     */
    static getEnvironmentInfo() {
        return {
            environment: exports.OSS_ENV_PREFIX,
            environmentName: exports.ENVIRONMENT_INFO.name,
            environmentType: exports.ENVIRONMENT_INFO.type,
            isProduction,
            isStaging,
            isDevelopment,
            bucket: ossConfig.bucket,
            region: ossConfig.region,
            databasePrefix: process.env.DATABASE_PREFIX || 'dev'
        };
    }
}
exports.OSSUtils = OSSUtils;
// 导出OSS配置
exports.default = {
    ossClient: exports.ossClient,
    OSSUtils,
    OSS_ENV_PREFIX: exports.OSS_ENV_PREFIX
};
