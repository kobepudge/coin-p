import OSS from 'ali-oss'
import { logger } from '../utils/logger'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

// OSS配置接口
interface OSSConfig {
  accessKeyId: string
  accessKeySecret: string
  bucket: string
  region: string
  timeout: number
  secure: boolean
  cname?: boolean
  endpoint?: string
}

// 环境配置
const isProduction = process.env.NODE_ENV === 'production'
const isStaging = process.env.NODE_ENV === 'staging'
const isDevelopment = process.env.NODE_ENV === 'development'

// OSS环境前缀配置
export const OSS_ENV_PREFIX = isProduction ? 'prod' : 'dev'

// 环境信息
export const ENVIRONMENT_INFO = {
  name: process.env.ENVIRONMENT_NAME || 
        (isProduction ? '生产环境' : isStaging ? '测试环境' : '开发环境'),
  type: process.env.NODE_ENV || 'development',
  prefix: OSS_ENV_PREFIX
}

// OSS配置
const ossConfig: OSSConfig = {
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
  bucket: process.env.ALIYUN_OSS_BUCKET || '',
  region: process.env.ALIYUN_OSS_REGION || '',
  timeout: 60000, // 60秒
  secure: true,   // 使用HTTPS
}

// 验证必要的OSS配置
const isOSSConfigured = ossConfig.accessKeyId && ossConfig.accessKeySecret

// [DEBUG v1.0.0] 详细的OSS配置调试日志 - 临时调试用，后续需要删除
logger.info('[DEBUG] OSS配置详情:', {
  version: 'v1.0.0-debug',
  accessKeyId: ossConfig.accessKeyId ? `${ossConfig.accessKeyId.substring(0, 8)}...` : '未设置',
  accessKeyIdLength: ossConfig.accessKeyId?.length || 0,
  accessKeySecret: ossConfig.accessKeySecret ? '已设置' : '未设置',
  accessKeySecretLength: ossConfig.accessKeySecret?.length || 0,
  bucket: ossConfig.bucket || '未设置',
  region: ossConfig.region || '未设置',
  timeout: ossConfig.timeout,
  secure: ossConfig.secure,
  isConfigured: isOSSConfigured,
  envPrefix: OSS_ENV_PREFIX,
  nodeEnv: process.env.NODE_ENV
})

if (!isOSSConfigured) {
  logger.warn('OSS配置缺失: AccessKey ID 或 AccessKey Secret 未设置，部分功能可能无法正常使用')
  logger.warn(`当前配置: AccessKeyId=${ossConfig.accessKeyId ? '已设置' : '未设置'}, AccessKeySecret=${ossConfig.accessKeySecret ? '已设置' : '未设置'}`)
} else {
  logger.info(`OSS配置已加载: Bucket=${ossConfig.bucket}, Region=${ossConfig.region}`)
}

// 创建OSS客户端 (仅在配置完整时创建)
export const ossClient = isOSSConfigured ? new OSS(ossConfig) : null

// [DEBUG v1.0.0] OSS连接测试 - 临时调试用，后续需要删除
if (isOSSConfigured && ossClient) {
  // 异步测试OSS连接，不阻塞启动
  setTimeout(async () => {
    try {
      logger.info('[DEBUG] 开始测试OSS连接...')
      const bucketInfo = await ossClient.getBucketInfo(ossConfig.bucket)
      logger.info('[DEBUG] OSS连接测试成功:', {
        version: 'v1.0.0-debug',
        bucketName: bucketInfo.bucket?.name,
        bucketRegion: bucketInfo.bucket?.region,
        bucketLocation: bucketInfo.bucket?.location,
        bucketCreationDate: bucketInfo.bucket?.creationDate
      })
    } catch (error: any) {
      logger.error('[DEBUG] OSS连接测试失败:', {
        version: 'v1.0.0-debug',
        error: {
          message: error.message,
          code: error.code,
          status: error.status,
          statusCode: error.statusCode,
          requestId: error.requestId,
          hostId: error.hostId,
          name: error.name
        }
      })
    }
  }, 2000) // 延迟2秒测试，确保服务启动完成
}

// OSS工具类
export class OSSUtils {
  /**
   * 获取环境特定的文件路径
   * @param originalPath 原始文件路径
   * @returns 带环境前缀的文件路径
   */
  public static getEnvironmentPath(originalPath: string): string {
    // 移除开头的斜杠（如果有）
    const cleanPath = originalPath.startsWith('/') ? originalPath.slice(1) : originalPath
    
    // 添加环境前缀
    return `${OSS_ENV_PREFIX}/${cleanPath}`
  }

  /**
   * 上传文件到OSS
   * @param filePath OSS文件路径（不包含环境前缀）
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
      // [DEBUG v1.0.0] 上传开始日志 - 临时调试用，后续需要删除
      logger.info('[DEBUG] 开始OSS文件上传:', {
        version: 'v1.0.0-debug',
        filePath,
        fileSize: fileBuffer.length,
        contentType: options.contentType,
        environment: OSS_ENV_PREFIX,
        hasMetadata: !!options.metadata && Object.keys(options.metadata).length > 0
      })

      if (!ossClient) {
        logger.error('[DEBUG] OSS客户端未初始化')
        return {
          success: false,
          error: 'OSS未配置，无法上传文件'
        }
      }

      // 获取环境特定路径
      const environmentPath = this.getEnvironmentPath(filePath)

      // [DEBUG v1.0.0] 上传参数日志 - 临时调试用，后续需要删除
      logger.info('[DEBUG] OSS上传参数:', {
        version: 'v1.0.0-debug',
        originalPath: filePath,
        environmentPath,
        bufferSize: fileBuffer.length,
        headers: {
          'Content-Type': options.contentType || 'application/octet-stream',
          ...options.metadata
        }
      })

      // 上传文件
      const result = await ossClient.put(environmentPath, fileBuffer, {
        headers: {
          'Content-Type': options.contentType || 'application/octet-stream',
          ...options.metadata
        }
      })

      logger.info('OSS文件上传成功:', {
        originalPath: filePath,
        environmentPath,
        url: result.url,
        environment: OSS_ENV_PREFIX
      })

      return {
        success: true,
        url: result.url,
        filePath: environmentPath
      }
    } catch (error: any) {
      // [DEBUG v1.0.0] 详细错误日志 - 临时调试用，后续需要删除
      logger.error('[DEBUG] OSS文件上传失败:', {
        version: 'v1.0.0-debug',
        service: 'coin-trading-api',
        filePath,
        environmentPath: this.getEnvironmentPath(filePath),
        fileSize: fileBuffer.length,
        contentType: options.contentType,
        environment: OSS_ENV_PREFIX,
        error: {
          message: error.message,
          code: error.code,
          status: error.status,
          statusCode: error.statusCode,
          name: error.name,
          requestId: error.requestId,
          hostId: error.hostId,
          headers: error.headers,
          params: error.params,
          stack: error.stack
        },
        ossConfig: {
          bucket: process.env.ALIYUN_OSS_BUCKET,
          region: process.env.ALIYUN_OSS_REGION,
          accessKeyIdSet: !!process.env.ALIYUN_ACCESS_KEY_ID,
          accessKeySecretSet: !!process.env.ALIYUN_ACCESS_KEY_SECRET
        }
      })

      // 保持原有的简洁错误日志
      logger.error('OSS文件上传失败:', {
        filePath,
        error: error.message,
        environment: OSS_ENV_PREFIX
      })

      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 删除OSS文件
   * @param filePath OSS文件路径（不包含环境前缀）
   * @returns 删除结果
   */
  public static async deleteFile(filePath: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      if (!ossClient) {
        return {
          success: false,
          error: 'OSS未配置，无法删除文件'
        }
      }

      // 获取环境特定路径
      const environmentPath = this.getEnvironmentPath(filePath)

      // 删除文件
      await ossClient.delete(environmentPath)

      logger.info('OSS文件删除成功:', {
        originalPath: filePath,
        environmentPath,
        environment: OSS_ENV_PREFIX
      })

      return { success: true }
    } catch (error: any) {
      logger.error('OSS文件删除失败:', {
        filePath,
        error: error.message,
        environment: OSS_ENV_PREFIX
      })

      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 获取文件访问URL
   * @param filePath OSS文件路径（不包含环境前缀）
   * @param expireTime 过期时间（秒），默认1小时
   * @returns 签名URL
   */
  public static async getSignedUrl(
    filePath: string,
    expireTime: number = 3600
  ): Promise<string> {
    try {
      if (!ossClient) {
        logger.warn('OSS未配置，无法生成签名URL:', { filePath })
        return ''
      }

      // 获取环境特定路径
      const environmentPath = this.getEnvironmentPath(filePath)

      // 生成签名URL - 使用正确的API
      const url = ossClient.signatureUrl(environmentPath, {
        expires: expireTime,
        method: 'GET'
      })

      logger.debug('生成OSS签名URL:', {
        originalPath: filePath,
        environmentPath,
        url,
        environment: OSS_ENV_PREFIX
      })

      return url
    } catch (error: any) {
      logger.error('生成OSS签名URL失败:', {
        filePath,
        error: error.message,
        environment: OSS_ENV_PREFIX
      })
      throw error
    }
  }

  /**
   * 检查文件是否存在
   * @param filePath OSS文件路径（不包含环境前缀）
   * @returns 文件是否存在
   */
  public static async fileExists(filePath: string): Promise<boolean> {
    try {
      if (!ossClient) {
        logger.warn('OSS未配置，无法检查文件存在性:', { filePath })
        return false
      }

      // 获取环境特定路径
      const environmentPath = this.getEnvironmentPath(filePath)

      // 检查文件头信息
      await ossClient.head(environmentPath)
      return true
    } catch (error: any) {
      if (error.code === 'NoSuchKey') {
        return false
      }
      logger.error('检查OSS文件存在性失败:', {
        filePath,
        error: error.message,
        environment: OSS_ENV_PREFIX
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
      if (!ossClient) {
        return {
          success: false,
          error: 'OSS未配置，无法列出文件'
        }
      }

      // 获取环境特定路径
      const environmentPrefix = this.getEnvironmentPath(prefix)

      // 列出文件
      const result = await ossClient.list({
        prefix: environmentPrefix,
        'max-keys': maxKeys
      }, {})

      const files = (result.objects || []).map(obj => ({
        name: obj.name || '',
        url: `https://${ossConfig.bucket}.${ossConfig.region}.aliyuncs.com/${obj.name}`,
        size: obj.size || 0,
        lastModified: new Date(obj.lastModified || Date.now())
      }))

      logger.info('OSS文件列表获取成功:', {
        prefix,
        environmentPrefix,
        fileCount: files.length,
        environment: OSS_ENV_PREFIX
      })

      return {
        success: true,
        files
      }
    } catch (error: any) {
      logger.error('OSS文件列表获取失败:', {
        prefix,
        error: error.message,
        environment: OSS_ENV_PREFIX
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
      environment: OSS_ENV_PREFIX,
      environmentName: ENVIRONMENT_INFO.name,
      environmentType: ENVIRONMENT_INFO.type,
      isProduction,
      isStaging,
      isDevelopment,
      bucket: ossConfig.bucket,
      region: ossConfig.region,
      databasePrefix: process.env.DATABASE_PREFIX || 'dev'
    }
  }
}

// 导出OSS配置
export default {
  ossClient,
  OSSUtils,
  OSS_ENV_PREFIX
}