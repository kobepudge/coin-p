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



export default router