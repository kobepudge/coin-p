import { Request, Response } from 'express'
import multer from 'multer'
import sharp from 'sharp'
import path from 'path'
import { logger } from '@/utils/logger'
import { OSSUtils } from '@/config/oss'

// 配置multer存储
const storage = multer.memoryStorage()

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB限制
  },
  fileFilter: (req, file, cb) => {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('只允许上传图片文件'))
    }
  }
})

// OSS环境信息日志函数
const logEnvironmentInfo = () => {
  const envInfo = OSSUtils.getEnvironmentInfo()
  logger.info('OSS环境配置:', envInfo)
  return envInfo
}

// 生成文件名
const generateFilename = (originalName: string): string => {
  const ext = path.extname(originalName)
  const name = path.basename(originalName, ext)
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `${name}_${timestamp}_${random}${ext}`
}

// 上传图片通用处理
export const uploadImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      })
    }

    // 生成文件名
    const filename = generateFilename(req.file.originalname)
    const ossPath = `images/${filename.replace('.jpeg', '.jpg').replace('.png', '.jpg')}`

    // 使用sharp处理图片（压缩和格式转换）
    const processedImageBuffer = await sharp(req.file.buffer)
      .resize(800, 800, { // 最大800x800，保持比例
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 }) // 转为JPEG格式，85%质量
      .toBuffer()

    // 上传到OSS
    const uploadResult = await OSSUtils.uploadFile(
      ossPath,
      processedImageBuffer,
      {
        contentType: 'image/jpeg'
      }
    )

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: '文件上传失败: ' + uploadResult.error
      })
    }

    logger.info('文件上传成功:', {
      originalName: req.file.originalname,
      filename,
      ossPath: uploadResult.filePath,
      size: req.file.size,
      url: uploadResult.url,
      environment: OSSUtils.getEnvironmentInfo().environment
    })

    res.json({
      success: true,
      data: {
        filename,
        original_name: req.file.originalname,
        size: processedImageBuffer.length,
        mime_type: 'image/jpeg',
        url: uploadResult.url,
        oss_path: uploadResult.filePath
      }
    })
  } catch (error: any) {
    // [DEBUG v1.0.0] 详细的controller错误日志 - 临时调试用，后续需要删除
    logger.error('[DEBUG] 文件上传失败:', {
      version: 'v1.0.0-debug',
      service: 'coin-trading-api',
      originalName: req.file?.originalname,
      fileSize: req.file?.size,
      mimetype: req.file?.mimetype,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      requestInfo: {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    })

    // 保持原有的简洁错误日志
    logger.error('文件上传失败:', error)
    res.status(500).json({
      success: false,
      message: '文件上传失败'
    })
  }
}

// 上传支付二维码
export const uploadPaymentQr = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的二维码图片'
      })
    }

    // 生成文件名
    const filename = generateFilename(req.file.originalname)
    const ossPath = `qr/${filename.replace('.jpeg', '.png').replace('.jpg', '.png')}`

    // 处理二维码图片（不压缩，保持清晰度）
    const processedImageBuffer = await sharp(req.file.buffer)
      .resize(500, 500, { // 固定500x500尺寸
        fit: 'inside',
        withoutEnlargement: true
      })
      .png({ quality: 100 }) // 转为PNG格式，保持最高质量
      .toBuffer()

    // 上传到OSS
    const uploadResult = await OSSUtils.uploadFile(
      ossPath,
      processedImageBuffer,
      {
        contentType: 'image/png'
      }
    )

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: '二维码上传失败: ' + uploadResult.error
      })
    }

    logger.info('支付二维码上传成功:', {
      originalName: req.file.originalname,
      filename,
      ossPath: uploadResult.filePath,
      size: req.file.size,
      url: uploadResult.url,
      environment: OSSUtils.getEnvironmentInfo().environment
    })

    res.json({
      success: true,
      data: {
        filename,
        original_name: req.file.originalname,
        size: processedImageBuffer.length,
        mime_type: 'image/png',
        url: uploadResult.url,
        oss_path: uploadResult.filePath
      }
    })
  } catch (error: any) {
    // [DEBUG v1.0.0] 详细的controller错误日志 - 临时调试用，后续需要删除
    logger.error('[DEBUG] 支付二维码上传失败:', {
      version: 'v1.0.0-debug',
      service: 'coin-trading-api',
      originalName: req.file?.originalname,
      fileSize: req.file?.size,
      mimetype: req.file?.mimetype,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      requestInfo: {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    })

    // 保持原有的简洁错误日志
    logger.error('支付二维码上传失败:', error)
    res.status(500).json({
      success: false,
      message: '支付二维码上传失败'
    })
  }
}

// 删除文件
export const deleteFile = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params
    const { type } = req.query // 'images' 或 'qr'
    
    if (!filename || !type) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      })
    }

    if (!['images', 'qr'].includes(type as string)) {
      return res.status(400).json({
        success: false,
        message: '无效的文件类型'
      })
    }

    // 构建OSS文件路径
    const ossPath = `${type}/${filename}`
    
    // 先检查文件是否存在
    const fileExists = await OSSUtils.fileExists(ossPath)
    if (!fileExists) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      })
    }

    // 删除OSS文件
    const deleteResult = await OSSUtils.deleteFile(ossPath)
    
    if (!deleteResult.success) {
      return res.status(500).json({
        success: false,
        message: '文件删除失败: ' + deleteResult.error
      })
    }

    logger.info('文件删除成功:', { 
      filename, 
      type, 
      ossPath: OSSUtils.getEnvironmentPath(ossPath),
      environment: OSSUtils.getEnvironmentInfo().environment
    })
    
    res.json({
      success: true,
      message: '文件删除成功'
    })
  } catch (error: any) {
    // [DEBUG v1.0.0] 详细的controller错误日志 - 临时调试用，后续需要删除
    logger.error('[DEBUG] 文件删除失败:', {
      version: 'v1.0.0-debug',
      service: 'coin-trading-api',
      filename: req.params.filename,
      type: req.params.type,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      requestInfo: {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    })

    // 保持原有的简洁错误日志
    logger.error('文件删除失败:', error)
    res.status(500).json({
      success: false,
      message: '文件删除失败'
    })
  }
}

// 获取OSS环境信息
export const getOssEnvironmentInfo = async (req: Request, res: Response) => {
  try {
    const envInfo = OSSUtils.getEnvironmentInfo()
    
    res.json({
      success: true,
      data: envInfo
    })
  } catch (error) {
    logger.error('获取OSS环境信息失败:', error)
    res.status(500).json({
      success: false,
      message: '获取环境信息失败'
    })
  }
}

// 上传转账截图
export const uploadTransferScreenshot = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的转账截图'
      })
    }

    // [DEBUG v1.0.0] 详细的controller日志 - 临时调试用，后续需要删除
    logger.info('[DEBUG] 转账截图上传开始:', {
      version: 'v1.0.0-debug',
      service: 'coin-trading-api',
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimetype: req.file.mimetype,
      requestInfo: {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    })

    // 记录OSS环境信息
    const envInfo = logEnvironmentInfo()

    // 压缩图片
    const compressedBuffer = await sharp(req.file.buffer)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 85,
        progressive: true
      })
      .toBuffer()

    // 生成文件名
    const filename = generateFilename(req.file.originalname)
    const ossPath = `transfer-screenshots/${filename}`

    // 上传到OSS
    const result = await OSSUtils.uploadFile(ossPath, compressedBuffer, {
      contentType: 'image/jpeg'
    })

    // [DEBUG v1.0.0] 详细的上传结果日志 - 临时调试用，后续需要删除
    logger.info('[DEBUG] 转账截图上传成功:', {
      version: 'v1.0.0-debug',
      service: 'coin-trading-api',
      originalName: req.file.originalname,
      filename: filename,
      ossPath: ossPath,
      url: result.url,
      size: compressedBuffer.length,
      environment: envInfo
    })

    res.json({
      success: true,
      message: '转账截图上传成功',
      data: {
        filename: filename,
        url: result.url,
        size: compressedBuffer.length
      }
    })

  } catch (error: any) {
    // [DEBUG v1.0.0] 详细的controller错误日志 - 临时调试用，后续需要删除
    logger.error('[DEBUG] 转账截图上传失败:', {
      version: 'v1.0.0-debug',
      service: 'coin-trading-api',
      originalName: req.file?.originalname,
      fileSize: req.file?.size,
      mimetype: req.file?.mimetype,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      requestInfo: {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    })

    // 保持原有的简洁错误日志
    logger.error('转账截图上传失败:', error)
    res.status(500).json({
      success: false,
      message: '转账截图上传失败'
    })
  }
}

// 导出multer中间件
export const uploadMiddleware = {
  single: upload.single.bind(upload),
  array: upload.array.bind(upload),
  fields: upload.fields.bind(upload)
}