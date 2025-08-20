import { Router } from 'express'
import authRoutes from './auth'
import merchantRoutes from './merchant'
import orderRoutes from './order'
import publicRoutes from './public'
import uploadRoutes from './upload'
// import adminRoutes from './admins'

const router = Router()

// API文档或根路径
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: '游戏金币交易平台 API',
    version: process.env.API_VERSION || 'v1',
    endpoints: [
      'GET /api/health - 健康检查',
      'POST /auth/login - 管理员登录',
      'POST /auth/logout - 管理员登出',
      'GET /auth/profile - 获取当前用户信息',
      'PUT /auth/profile - 更新用户信息',
      'POST /auth/change-password - 修改密码',
      'GET /merchants - 获取商家列表',
      'POST /merchants - 创建商家',
      'GET /public/merchants/:type - 获取公开商家列表',
      'GET /public/current-seller - 获取当前出货商家',
      'GET /orders - 获取订单列表',
      'PUT /orders/:id/status - 更新订单状态',
      'POST /public/orders - 提交订单',
      'POST /upload/image - 上传图片 (需要认证)',
      'POST /upload/payment-qr - 上传支付二维码',
      'POST /upload/transfer-screenshot - 上传转账截图',
      'DELETE /upload/:filename - 删除文件 (需要认证)',
      // 'GET /admins - 获取管理员列表 (仅超级管理员)',
      // 'POST /admins - 创建管理员 (仅超级管理员)'
    ],
    timestamp: new Date().toISOString()
  })
})

// 认证路由
router.use('/auth', authRoutes)

// 商家管理路由 (需要管理员权限)
router.use('/merchants', merchantRoutes)

// 订单管理路由 (需要管理员权限)
router.use('/orders', orderRoutes)

// 文件上传路由
router.use('/upload', uploadRoutes)

// 公开路由 (无需认证)
router.use('/public', publicRoutes)

// 管理员路由 (待实现)
// router.use('/admins', adminRoutes)

export default router