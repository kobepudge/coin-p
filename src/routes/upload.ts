import { Router } from 'express'
import { uploadImage, uploadPaymentQr, uploadTransferScreenshot, deleteFile, uploadMiddleware, getS3EnvironmentInfo } from '@/controllers/upload'
import { authenticateToken } from '@/middlewares/auth'
import { S3Utils, s3Client, S3_ENV_PREFIX } from '@/config/s3'
import { logger } from '@/utils/logger'

const router = Router()

// 上传图片 (需要认证)
router.post('/image', authenticateToken, uploadMiddleware.single('image'), uploadImage)

// 上传支付二维码 (公开接口，用于用户提交订单时上传收款码)
router.post('/payment-qr', uploadMiddleware.single('qr'), uploadPaymentQr)

// 上传转账截图 (公开接口，用于用户提交订单时上传转账截图)
router.post('/transfer-screenshot', uploadMiddleware.single('screenshot'), uploadTransferScreenshot)

// 删除文件 (需要认证)
router.delete('/:filename', authenticateToken, deleteFile)

// 获取S3环境信息 (需要认证)
router.get('/environment-info', authenticateToken, getS3EnvironmentInfo)



export default router