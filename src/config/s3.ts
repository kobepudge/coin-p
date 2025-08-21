import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { logger } from '../utils/logger'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

// S3配置接口
interface S3Config {
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  region: string
  endpoint?: string
}

// 环境配置
const isProduction = process.env.NODE_ENV === 'production'
const isStaging = process.env.NODE_ENV === 'staging'
const isDevelopment = process.env.NODE_ENV === 'development'

// S3环境前缀配置
export const S3_ENV_PREFIX = isProduction ? 'prod' : 'dev'

// 环境信息
export const ENVIRONMENT_INFO = {
  name: process.env.ENVIRONMENT_NAME || 
        (isProduction ? '生产环境' : isStaging ? '测试环境' : '开发环境'),
  type: process.env.NODE_ENV || 'development',
  prefix: S3_ENV_PREFIX
}

// S3配置
const s3Config: S3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  bucket: process.env.AWS_S3_BUCKET || '',
  region: process.env.AWS_S3_REGION || 'us-east-1',
  endpoint: process.env.AWS_S3_ENDPOINT // 可选的自定义端点
}

// 验证必要的S3配置
const isS3Configured = s3Config.accessKeyId && s3Config.secretAccessKey && s3Config.bucket

if (!isS3Configured) {
  logger.warn('S3配置缺失: AccessKey ID、SecretAccessKey 或 Bucket 未设置，部分功能可能无法正常使用')
  logger.warn(`当前配置: AccessKeyId=${s3Config.accessKeyId ? '已设置' : '未设置'}, SecretAccessKey=${s3Config.secretAccessKey ? '已设置' : '未设置'}, Bucket=${s3Config.bucket || '未设置'}`)
} else {
  logger.info(`S3配置已加载: Bucket=${s3Config.bucket}, Region=${s3Config.region}`)
}

// 创建S3客户端 (仅在配置完整时创建)
export const s3Client = isS3Configured ? new S3Client({
  region: s3Config.region,
  credentials: {
    accessKeyId: s3Config.accessKeyId,
    secretAccessKey: s3Config.secretAccessKey
  },
  ...(s3Config.endpoint && { endpoint: s3Config.endpoint })
}) : null

// S3工具类
export class S3Utils {
  /**
   * 获取环境特定的文件路径
   * @param originalPath 原始文件路径
   * @returns 带环境前缀的文件路径
   */
  public static getEnvironmentPath(originalPath: string): string {
    // 移除开头的斜杠（如果有）
    const cleanPath = originalPath.startsWith('/') ? originalPath.slice(1) : originalPath
    
    // 添加环境前缀
    return `${S3_ENV_PREFIX}/${cleanPath}`
  }

  /**
   * 上传文件到S3
   * @param filePath S3文件路径（不包含环境前缀）
   * @param fileBuffer 文件缓冲区
   * @param options 上传选项
   * @returns 上传结果
   */
  public static async uploadFile(
    filePath: string,
    fileBuffer: Buffer,
    options: {
      contentType?: string
      metadata?: Record<string, string>
    } = {}
  ): Promise<{
    success: boolean
    url?: string
    error?: string
    filePath?: string
  }> {
    try {
      if (!s3Client) {
        return {
          success: false,
          error: 'S3未配置，无法上传文件'
        }
      }

      // 获取环境特定路径
      const environmentPath = this.getEnvironmentPath(filePath)

      // 上传文件
      const command = new PutObjectCommand({
        Bucket: s3Config.bucket,
        Key: environmentPath,
        Body: fileBuffer,
        ContentType: options.contentType || 'application/octet-stream',
        Metadata: options.metadata
      })

      await s3Client.send(command)

      // 生成文件访问URL
      const url = s3Config.endpoint 
        ? `${s3Config.endpoint}/${s3Config.bucket}/${environmentPath}`
        : `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${environmentPath}`

      logger.info('S3文件上传成功:', {
        originalPath: filePath,
        environmentPath,
        url,
        size: fileBuffer.length,
        contentType: options.contentType,
        environment: S3_ENV_PREFIX
      })

      return {
        success: true,
        url,
        filePath: environmentPath
      }
    } catch (error: any) {
      logger.error('S3文件上传失败:', {
        filePath,
        error: error.message,
        environment: S3_ENV_PREFIX
      })

      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 删除S3文件
   * @param filePath S3文件路径（不包含环境前缀）
   * @returns 删除结果
   */
  public static async deleteFile(filePath: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      if (!s3Client) {
        return {
          success: false,
          error: 'S3未配置，无法删除文件'
        }
      }

      // 获取环境特定路径
      const environmentPath = this.getEnvironmentPath(filePath)

      // 删除文件
      const command = new DeleteObjectCommand({
        Bucket: s3Config.bucket,
        Key: environmentPath
      })

      await s3Client.send(command)

      logger.info('S3文件删除成功:', {
        originalPath: filePath,
        environmentPath,
        environment: S3_ENV_PREFIX
      })

      return {
        success: true
      }
    } catch (error: any) {
      logger.error('S3文件删除失败:', {
        filePath,
        error: error.message,
        environment: S3_ENV_PREFIX
      })

      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 检查文件是否存在
   * @param filePath S3文件路径（不包含环境前缀）
   * @returns 文件是否存在
   */
  public static async fileExists(filePath: string): Promise<boolean> {
    try {
      if (!s3Client) {
        return false
      }

      // 获取环境特定路径
      const environmentPath = this.getEnvironmentPath(filePath)

      // 检查文件是否存在
      const command = new GetObjectCommand({
        Bucket: s3Config.bucket,
        Key: environmentPath
      })

      await s3Client.send(command)
      return true
    } catch (error: any) {
      // 如果是NoSuchKey错误，说明文件不存在
      if (error.name === 'NoSuchKey') {
        return false
      }
      // 其他错误也认为文件不存在
      logger.warn('检查S3文件存在性时发生错误:', {
        filePath,
        error: error.message
      })
      return false
    }
  }

  /**
   * 获取文件访问URL（签名URL）
   * @param filePath S3文件路径（不包含环境前缀）
   * @param expireTime 过期时间（秒），默认1小时
   * @returns 签名URL
   */
  public static async getSignedUrl(
    filePath: string,
    expireTime: number = 3600
  ): Promise<string> {
    try {
      if (!s3Client) {
        logger.warn('S3未配置，无法生成签名URL:', { filePath })
        return ''
      }

      // 获取环境特定路径
      const environmentPath = this.getEnvironmentPath(filePath)

      // 生成签名URL
      const command = new GetObjectCommand({
        Bucket: s3Config.bucket,
        Key: environmentPath
      })

      const url = await getSignedUrl(s3Client, command, { expiresIn: expireTime })

      logger.debug('生成S3签名URL:', {
        originalPath: filePath,
        environmentPath,
        url,
        environment: S3_ENV_PREFIX
      })

      return url
    } catch (error: any) {
      logger.error('生成S3签名URL失败:', {
        filePath,
        error: error.message,
        environment: S3_ENV_PREFIX
      })
      throw error
    }
  }

  /**
   * 列出指定目录下的文件
   * @param prefix 文件前缀（目录路径）
   * @param maxKeys 最大返回数量
   * @returns 文件列表
   */
  public static async listFiles(
    prefix: string = '',
    maxKeys: number = 100
  ): Promise<{
    success: boolean
    files?: Array<{
      name: string
      url: string
      size: number
      lastModified: Date
    }>
    error?: string
  }> {
    try {
      if (!s3Client) {
        return {
          success: false,
          error: 'S3未配置，无法列出文件'
        }
      }

      // 获取环境特定路径
      const environmentPrefix = this.getEnvironmentPath(prefix)

      // 列出文件
      const command = new ListObjectsV2Command({
        Bucket: s3Config.bucket,
        Prefix: environmentPrefix,
        MaxKeys: maxKeys
      })

      const result = await s3Client.send(command)

      const files = (result.Contents || []).map(obj => ({
        name: obj.Key || '',
        url: s3Config.endpoint 
          ? `${s3Config.endpoint}/${s3Config.bucket}/${obj.Key}`
          : `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${obj.Key}`,
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date()
      }))

      logger.info('S3文件列表获取成功:', {
        prefix,
        environmentPrefix,
        fileCount: files.length,
        environment: S3_ENV_PREFIX
      })

      return {
        success: true,
        files
      }
    } catch (error: any) {
      logger.error('S3文件列表获取失败:', {
        prefix,
        error: error.message,
        environment: S3_ENV_PREFIX
      })

      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 获取当前环境信息
   * @returns 环境信息
   */
  public static getEnvironmentInfo() {
    return {
      environment: S3_ENV_PREFIX,
      environmentName: ENVIRONMENT_INFO.name,
      environmentType: ENVIRONMENT_INFO.type,
      isProduction,
      isStaging,
      isDevelopment,
      bucket: s3Config.bucket,
      region: s3Config.region,
      endpoint: s3Config.endpoint,
      databasePrefix: process.env.DATABASE_PREFIX || 'dev'
    }
  }
}

// 导出S3配置
export default {
  s3Client,
  S3Utils,
  S3_ENV_PREFIX
}
