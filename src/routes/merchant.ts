import { Router } from 'express'
import { authenticate, requirePermission } from '@/middlewares/auth'
import { validate } from '@/middlewares/validation'
import * as merchantController from '@/controllers/merchant'

const router = Router()

// 管理员商家管理路由 (需要认证和权限)
router.use(authenticate)

// 获取商家列表
router.get(
  '/',
  requirePermission('merchant_manage'),
  merchantController.getMerchants
)

// 获取商家统计信息
router.get(
  '/stats',
  requirePermission('merchant_manage'),
  merchantController.getMerchantStats
)

// 获取商家详情
router.get(
  '/:id',
  requirePermission('merchant_manage'),
  merchantController.getMerchantById
)

// 创建商家
router.post(
  '/',
  requirePermission('merchant_manage'),
  validate(merchantController.createMerchantValidation),
  merchantController.createMerchant
)

// 更新商家信息
router.put(
  '/:id',
  requirePermission('merchant_manage'),
  validate(merchantController.updateMerchantValidation),
  merchantController.updateMerchant
)

// 删除商家
router.delete(
  '/:id',
  requirePermission('merchant_manage'),
  merchantController.deleteMerchant
)

// 批量更新商家状态
router.post(
  '/batch-status',
  requirePermission('merchant_manage'),
  validate(merchantController.batchUpdateStatusValidation),
  merchantController.batchUpdateStatus
)

// 设置当前出货商家
router.post(
  '/:id/set-current',
  requirePermission('merchant_manage'),
  merchantController.setCurrentSeller
)

// 更新商家排序
router.post(
  '/update-order',
  requirePermission('merchant_manage'),
  validate(merchantController.updateOrderValidation),
  merchantController.updateMerchantOrder
)

export default router