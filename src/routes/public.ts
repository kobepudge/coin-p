import { Router } from 'express'
import { validate } from '@/middlewares/validation'
import * as merchantController from '@/controllers/merchant'
import * as orderController from '@/controllers/order'

const router = Router()

// 公开接口：获取商家列表（前端用户可以访问）
router.get(
  '/merchants/:type',
  merchantController.getPublicMerchants
)

// 公开接口：获取当前出货商家
router.get(
  '/current-seller',
  merchantController.getCurrentSeller
)

// 公开接口：创建订单（用户提交订单）
router.post(
  '/orders',
  validate(orderController.createOrderValidation),
  orderController.createOrder
)

export default router