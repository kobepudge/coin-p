import { Router } from 'express'
import { uploadImage, uploadPaymentQr, deleteFile, uploadMiddleware, getOssEnvironmentInfo } from '@/controllers/upload'
import { authenticateToken } from '@/middlewares/auth'
import { OSSUtils, ossClient, OSS_ENV_PREFIX } from '@/config/oss'
import { logger } from '@/utils/logger'

const router = Router()

// 上传图片 (需要认证)
router.post('/image', authenticateToken, uploadMiddleware.single('image'), uploadImage)

// 上传支付二维码 (公开接口，用于用户提交订单时上传收款码)
router.post('/payment-qr', uploadMiddleware.single('qr'), uploadPaymentQr)

// 删除文件 (需要认证)
router.delete('/:filename', authenticateToken, deleteFile)

// 获取OSS环境信息 (需要认证)
router.get('/environment-info', authenticateToken, getOssEnvironmentInfo)

// [DEBUG v1.0.0] OSS调试测试接口 - 临时调试用，后续需要删除
router.get('/oss-debug', async (req, res) => {
  try {
    const debugInfo = {
      version: 'v1.0.0-debug',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      ossConfig: {
        accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID ?
          `${process.env.ALIYUN_ACCESS_KEY_ID.substring(0, 8)}...` : '未设置',
        accessKeyIdLength: process.env.ALIYUN_ACCESS_KEY_ID?.length || 0,
        accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET ? '已设置' : '未设置',
        accessKeySecretLength: process.env.ALIYUN_ACCESS_KEY_SECRET?.length || 0,
        bucket: process.env.ALIYUN_OSS_BUCKET,
        region: process.env.ALIYUN_OSS_REGION,
        envPrefix: OSS_ENV_PREFIX
      },
      ossClientStatus: ossClient ? '已创建' : '未创建'
    }

    // 尝试简单的OSS操作
    if (ossClient) {
      try {
        // 测试获取bucket信息
        const bucketInfo = await ossClient.getBucketInfo(process.env.ALIYUN_OSS_BUCKET!)
        debugInfo.bucketTest = {
          success: true,
          bucketName: bucketInfo.bucket?.name,
          bucketRegion: bucketInfo.bucket?.region,
          bucketLocation: bucketInfo.bucket?.location
        }
      } catch (error: any) {
        debugInfo.bucketTest = {
          success: false,
          error: {
            message: error.message,
            code: error.code,
            status: error.status,
            requestId: error.requestId
          }
        }
      }

      try {
        // 测试列出文件
        const listResult = await ossClient.list({
          prefix: `${OSS_ENV_PREFIX}/`,
          'max-keys': 5
        })
        debugInfo.listTest = {
          success: true,
          fileCount: listResult.objects?.length || 0,
          files: listResult.objects?.slice(0, 3).map(obj => ({
            name: obj.name,
            size: obj.size,
            lastModified: obj.lastModified
          })) || []
        }
      } catch (error: any) {
        debugInfo.listTest = {
          success: false,
          error: {
            message: error.message,
            code: error.code,
            status: error.status
          }
        }
      }
    }

    logger.info('[DEBUG] OSS调试信息查询:', debugInfo)

    res.json({
      success: true,
      data: debugInfo
    })
  } catch (error: any) {
    logger.error('[DEBUG] OSS调试接口错误:', {
      version: 'v1.0.0-debug',
      error: {
        message: error.message,
        stack: error.stack
      }
    })

    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router