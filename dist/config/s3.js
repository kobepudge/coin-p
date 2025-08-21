"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Utils = exports.s3Client = exports.ENVIRONMENT_INFO = exports.S3_ENV_PREFIX = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const logger_1 = require("../utils/logger");
const dotenv_1 = __importDefault(require("dotenv"));
// 加载环境变量
dotenv_1.default.config();
// 环境配置
const isProduction = process.env.NODE_ENV === 'production';
const isStaging = process.env.NODE_ENV === 'staging';
const isDevelopment = process.env.NODE_ENV === 'development';
// S3环境前缀配置
exports.S3_ENV_PREFIX = isProduction ? 'prod' : 'dev';
// 环境信息
exports.ENVIRONMENT_INFO = {
    name: process.env.ENVIRONMENT_NAME ||
        (isProduction ? '生产环境' : isStaging ? '测试环境' : '开发环境'),
    type: process.env.NODE_ENV || 'development',
    prefix: exports.S3_ENV_PREFIX
};
// S3配置
const s3Config = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    bucket: process.env.AWS_S3_BUCKET || '',
    region: process.env.AWS_S3_REGION || 'us-east-1',
    uploadEndpoint: process.env.AWS_S3_UPLOAD_ENDPOINT, // 用于上传的S3端点
    accessDomain: process.env.AWS_S3_ACCESS_DOMAIN // 用于生成访问URL的域名
};
// 验证必要的S3配置
const isS3Configured = s3Config.accessKeyId && s3Config.secretAccessKey && s3Config.bucket;
if (!isS3Configured) {
    logger_1.logger.warn('S3配置缺失: AccessKey ID、SecretAccessKey 或 Bucket 未设置，部分功能可能无法正常使用');
    logger_1.logger.warn(`当前配置: AccessKeyId=${s3Config.accessKeyId ? '已设置' : '未设置'}, SecretAccessKey=${s3Config.secretAccessKey ? '已设置' : '未设置'}, Bucket=${s3Config.bucket || '未设置'}`);
}
else {
    logger_1.logger.info(`S3配置已加载: Bucket=${s3Config.bucket}, Region=${s3Config.region}`);
}
// 创建S3客户端 (仅在配置完整时创建)
exports.s3Client = isS3Configured ? new client_s3_1.S3Client({
    region: s3Config.region,
    credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey
    },
    ...(s3Config.uploadEndpoint && { endpoint: s3Config.uploadEndpoint })
}) : null;
// S3工具类
class S3Utils {
    /**
     * 获取环境特定的文件路径
     * @param originalPath 原始文件路径
     * @returns 带环境前缀的文件路径
     */
    static getEnvironmentPath(originalPath) {
        // 移除开头的斜杠（如果有）
        const cleanPath = originalPath.startsWith('/') ? originalPath.slice(1) : originalPath;
        // 添加环境前缀
        return `${exports.S3_ENV_PREFIX}/${cleanPath}`;
    }
    /**
     * 上传文件到S3
     * @param filePath S3文件路径（不包含环境前缀）
     * @param fileBuffer 文件缓冲区
     * @param options 上传选项
     * @returns 上传结果
     */
    static async uploadFile(filePath, fileBuffer, options = {}) {
        try {
            if (!exports.s3Client) {
                return {
                    success: false,
                    error: 'S3未配置，无法上传文件'
                };
            }
            // 获取环境特定路径
            const environmentPath = this.getEnvironmentPath(filePath);
            // 上传文件
            const command = new client_s3_1.PutObjectCommand({
                Bucket: s3Config.bucket,
                Key: environmentPath,
                Body: fileBuffer,
                ContentType: options.contentType || 'application/octet-stream',
                Metadata: options.metadata
            });
            await exports.s3Client.send(command);
            // 生成文件访问URL
            const url = s3Config.accessDomain
                ? `${s3Config.accessDomain}/${environmentPath}`
                : `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${environmentPath}`;
            logger_1.logger.info('S3文件上传成功:', {
                originalPath: filePath,
                environmentPath,
                url,
                size: fileBuffer.length,
                contentType: options.contentType,
                environment: exports.S3_ENV_PREFIX
            });
            return {
                success: true,
                url,
                filePath: environmentPath
            };
        }
        catch (error) {
            logger_1.logger.error('S3文件上传失败:', {
                filePath,
                error: error.message,
                environment: exports.S3_ENV_PREFIX
            });
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * 删除S3文件
     * @param filePath S3文件路径（不包含环境前缀）
     * @returns 删除结果
     */
    static async deleteFile(filePath) {
        try {
            if (!exports.s3Client) {
                return {
                    success: false,
                    error: 'S3未配置，无法删除文件'
                };
            }
            // 获取环境特定路径
            const environmentPath = this.getEnvironmentPath(filePath);
            // 删除文件
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: s3Config.bucket,
                Key: environmentPath
            });
            await exports.s3Client.send(command);
            logger_1.logger.info('S3文件删除成功:', {
                originalPath: filePath,
                environmentPath,
                environment: exports.S3_ENV_PREFIX
            });
            return {
                success: true
            };
        }
        catch (error) {
            logger_1.logger.error('S3文件删除失败:', {
                filePath,
                error: error.message,
                environment: exports.S3_ENV_PREFIX
            });
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * 检查文件是否存在
     * @param filePath S3文件路径（不包含环境前缀）
     * @returns 文件是否存在
     */
    static async fileExists(filePath) {
        try {
            if (!exports.s3Client) {
                return false;
            }
            // 获取环境特定路径
            const environmentPath = this.getEnvironmentPath(filePath);
            // 检查文件是否存在
            const command = new client_s3_1.GetObjectCommand({
                Bucket: s3Config.bucket,
                Key: environmentPath
            });
            await exports.s3Client.send(command);
            return true;
        }
        catch (error) {
            // 如果是NoSuchKey错误，说明文件不存在
            if (error.name === 'NoSuchKey') {
                return false;
            }
            // 其他错误也认为文件不存在
            logger_1.logger.warn('检查S3文件存在性时发生错误:', {
                filePath,
                error: error.message
            });
            return false;
        }
    }
    /**
     * 获取文件访问URL（签名URL）
     * @param filePath S3文件路径（不包含环境前缀）
     * @param expireTime 过期时间（秒），默认1小时
     * @returns 签名URL
     */
    static async getSignedUrl(filePath, expireTime = 3600) {
        try {
            if (!exports.s3Client) {
                logger_1.logger.warn('S3未配置，无法生成签名URL:', { filePath });
                return '';
            }
            // 获取环境特定路径
            const environmentPath = this.getEnvironmentPath(filePath);
            // 生成签名URL
            const command = new client_s3_1.GetObjectCommand({
                Bucket: s3Config.bucket,
                Key: environmentPath
            });
            const url = await (0, s3_request_presigner_1.getSignedUrl)(exports.s3Client, command, { expiresIn: expireTime });
            logger_1.logger.debug('生成S3签名URL:', {
                originalPath: filePath,
                environmentPath,
                url,
                environment: exports.S3_ENV_PREFIX
            });
            return url;
        }
        catch (error) {
            logger_1.logger.error('生成S3签名URL失败:', {
                filePath,
                error: error.message,
                environment: exports.S3_ENV_PREFIX
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
            if (!exports.s3Client) {
                return {
                    success: false,
                    error: 'S3未配置，无法列出文件'
                };
            }
            // 获取环境特定路径
            const environmentPrefix = this.getEnvironmentPath(prefix);
            // 列出文件
            const command = new client_s3_1.ListObjectsV2Command({
                Bucket: s3Config.bucket,
                Prefix: environmentPrefix,
                MaxKeys: maxKeys
            });
            const result = await exports.s3Client.send(command);
            const files = (result.Contents || []).map(obj => ({
                name: obj.Key || '',
                url: s3Config.accessDomain
                    ? `${s3Config.accessDomain}/${obj.Key}`
                    : `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${obj.Key}`,
                size: obj.Size || 0,
                lastModified: obj.LastModified || new Date()
            }));
            logger_1.logger.info('S3文件列表获取成功:', {
                prefix,
                environmentPrefix,
                fileCount: files.length,
                environment: exports.S3_ENV_PREFIX
            });
            return {
                success: true,
                files
            };
        }
        catch (error) {
            logger_1.logger.error('S3文件列表获取失败:', {
                prefix,
                error: error.message,
                environment: exports.S3_ENV_PREFIX
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
            environment: exports.S3_ENV_PREFIX,
            environmentName: exports.ENVIRONMENT_INFO.name,
            environmentType: exports.ENVIRONMENT_INFO.type,
            isProduction,
            isStaging,
            isDevelopment,
            bucket: s3Config.bucket,
            region: s3Config.region,
            uploadEndpoint: s3Config.uploadEndpoint,
            accessDomain: s3Config.accessDomain,
            databasePrefix: process.env.DATABASE_PREFIX || 'dev'
        };
    }
}
exports.S3Utils = S3Utils;
// 导出S3配置
exports.default = {
    s3Client: exports.s3Client,
    S3Utils,
    S3_ENV_PREFIX: exports.S3_ENV_PREFIX
};
