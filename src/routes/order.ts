import { Router } from 'express'
import { authenticate, requirePermission } from '@/middlewares/auth'
import { validate } from '@/middlewares/validation'
import * as orderController from '@/controllers/order'

const router = Router()

// 管理员订单管理路由 (需要认证和权限)
router.use(authenticate)

// 获取订单列表
router.get(
  '/',
  requirePermission('order_manage'),
  orderController.getOrders
)

// 获取订单统计信息
router.get(
  '/stats',
  requirePermission('order_manage'),
  orderController.getOrderStats
)

// 获取待处理订单数量
router.get(
  '/pending-count',
  requirePermission('order_manage'),
  orderController.getPendingOrdersCount
)

// 获取最近订单列表
router.get(
  '/recent',
  requirePermission('order_manage'),
  orderController.getRecentOrders
)

// 取消过期订单（定时任务）
router.post(
  '/cancel-expired',
  requirePermission('order_manage'),
  orderController.cancelExpiredOrders
)

// 获取订单详情
router.get(
  '/:id',
  requirePermission('order_manage'),
  orderController.getOrderById
)

// 更新订单状态
router.put(
  '/:id/status',
  requirePermission('order_manage'),
  validate(orderController.updateOrderStatusValidation),
  orderController.updateOrderStatus
)

// 删除订单
router.delete(
  '/:id',
  requirePermission('order_manage'),
  orderController.deleteOrder
)

// 批量更新订单状态
router.post(
  '/batch-status',
  requirePermission('order_manage'),
  validate(orderController.batchUpdateStatusValidation),
  orderController.batchUpdateStatus
)

export default router