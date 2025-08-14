import { Request, Response } from 'express'
import { body, param, query } from 'express-validator'
import { OrderService } from '@/services/order'
import { asyncHandler } from '@/middlewares/error'
import { HTTP_STATUS } from '@/constants'
import type { OrderStatus } from '@/types'

// 创建订单验证规则
export const createOrderValidation = [
  body('merchant_id')
    .isInt({ min: 1 })
    .withMessage('商家ID必须是正整数'),

  body('player_game_id')
    .trim()
    .notEmpty()
    .withMessage('玩家游戏ID不能为空')
    .isLength({ min: 1, max: 100 })
    .withMessage('玩家游戏ID长度应在1-100字符之间'),

  body('payment_qr_url')
    .trim()
    .notEmpty()
    .withMessage('收款二维码URL不能为空')
    .isLength({ max: 500 })
    .withMessage('收款二维码URL长度不能超过500字符')
]

// 更新订单状态验证规则
export const updateOrderStatusValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('订单ID必须是正整数'),

  body('status')
    .isIn(['pending', 'completed', 'failed', 'rejected'])
    .withMessage('状态必须是pending、completed、failed或rejected之一'),

  body('admin_note')
    .trim()
    .notEmpty()
    .withMessage('管理员备注不能为空')
    .isLength({ max: 1000 })
    .withMessage('管理员备注长度不能超过1000字符')
]

// 批量更新状态验证规则
export const batchUpdateStatusValidation = [
  body('ids')
    .isArray({ min: 1 })
    .withMessage('订单ID列表不能为空'),

  body('ids.*')
    .isInt({ min: 1 })
    .withMessage('订单ID必须是正整数'),

  body('status')
    .isIn(['pending', 'completed', 'failed', 'rejected'])
    .withMessage('状态必须是pending、completed、failed或rejected之一'),

  body('admin_note')
    .trim()
    .notEmpty()
    .withMessage('管理员备注不能为空')
    .isLength({ max: 1000 })
    .withMessage('管理员备注长度不能超过1000字符')
]

/**
 * 获取订单列表
 */
export const getOrders = asyncHandler(async (req: Request, res: Response) => {
  const { 
    status, 
    merchant_id, 
    page, 
    limit, 
    search, 
    start_date, 
    end_date 
  } = req.query

  const result = await OrderService.getOrders({
    status: status as OrderStatus | undefined,
    merchant_id: merchant_id ? parseInt(merchant_id as string) : undefined,
    page: page ? parseInt(page as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
    search: search as string | undefined,
    start_date: start_date as string | undefined,
    end_date: end_date as string | undefined
  })

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '获取订单列表成功',
    data: result
  })
})

/**
 * 获取订单详情
 */
export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id)
  const order = await OrderService.getOrderById(id)

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '获取订单详情成功',
    data: order
  })
})

/**
 * 创建订单（公开接口，用户提交）
 */
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const orderData = {
    merchant_id: req.body.merchant_id,
    player_game_id: req.body.player_game_id,
    payment_qr_url: req.body.payment_qr_url
  }

  const order = await OrderService.createOrder(orderData)

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: '订单提交成功，请等待管理员处理',
    data: order
  })
})

/**
 * 更新订单状态
 */
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id)
  const { status, admin_note } = req.body

  const operatorId = req.admin!.id
  const ipAddress = req.ip || req.connection?.remoteAddress
  const userAgent = req.get('User-Agent')

  const order = await OrderService.updateOrderStatus(
    id,
    status,
    admin_note,
    operatorId,
    ipAddress,
    userAgent
  )

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '更新订单状态成功',
    data: order
  })
})

/**
 * 批量更新订单状态
 */
export const batchUpdateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { ids, status, admin_note } = req.body

  const operatorId = req.admin!.id
  const ipAddress = req.ip || req.connection?.remoteAddress
  const userAgent = req.get('User-Agent')

  await OrderService.batchUpdateStatus(
    ids,
    status,
    admin_note,
    operatorId,
    ipAddress,
    userAgent
  )

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '批量更新订单状态成功',
    data: null
  })
})

/**
 * 删除订单
 */
export const deleteOrder = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id)

  const operatorId = req.admin!.id
  const ipAddress = req.ip || req.connection?.remoteAddress
  const userAgent = req.get('User-Agent')

  await OrderService.deleteOrder(
    id,
    operatorId,
    ipAddress,
    userAgent
  )

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '删除订单成功',
    data: null
  })
})

/**
 * 获取订单统计信息
 */
export const getOrderStats = asyncHandler(async (req: Request, res: Response) => {
  const { start_date, end_date, merchant_id } = req.query

  const stats = await OrderService.getOrderStats({
    start_date: start_date as string | undefined,
    end_date: end_date as string | undefined,
    merchant_id: merchant_id ? parseInt(merchant_id as string) : undefined
  })

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '获取订单统计成功',
    data: stats
  })
})

/**
 * 获取待处理订单数量
 */
export const getPendingOrdersCount = asyncHandler(async (req: Request, res: Response) => {
  const count = await OrderService.getPendingOrdersCount()

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '获取待处理订单数量成功',
    data: { count }
  })
})

/**
 * 获取最近订单列表
 */
export const getRecentOrders = asyncHandler(async (req: Request, res: Response) => {
  const { limit } = req.query
  const orders = await OrderService.getRecentOrders(
    limit ? parseInt(limit as string) : undefined
  )

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '获取最近订单成功',
    data: orders
  })
})

/**
 * 取消过期订单（定时任务接口）
 */
export const cancelExpiredOrders = asyncHandler(async (req: Request, res: Response) => {
  const canceledCount = await OrderService.cancelExpiredOrders()

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: `已取消 ${canceledCount} 个过期订单`,
    data: { canceled_count: canceledCount }
  })
})