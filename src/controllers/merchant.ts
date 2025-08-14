import { Request, Response } from 'express'
import { body, param, query } from 'express-validator'
import { MerchantService } from '@/services/merchant'
import { asyncHandler } from '@/middlewares/error'
import { HTTP_STATUS } from '@/constants'

// 创建商家验证规则
export const createMerchantValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('商家名称不能为空')
    .isLength({ min: 1, max: 100 })
    .withMessage('商家名称长度应在1-100字符之间'),

  body('type')
    .isIn(['seller', 'buyer'])
    .withMessage('商家类型必须是seller或buyer'),

  body('price')
    .trim()
    .notEmpty()
    .withMessage('价格不能为空')
    .isLength({ max: 50 })
    .withMessage('价格长度不能超过50字符'),

  body('trade_method')
    .trim()
    .notEmpty()
    .withMessage('交易方式不能为空')
    .isLength({ max: 100 })
    .withMessage('交易方式长度不能超过100字符'),

  body('stock_or_demand')
    .trim()
    .notEmpty()
    .withMessage('库存量或需求量不能为空')
    .isLength({ max: 100 })
    .withMessage('库存量或需求量长度不能超过100字符'),

  body('speed')
    .trim()
    .notEmpty()
    .withMessage('发货/结算速度不能为空')
    .isLength({ max: 100 })
    .withMessage('速度说明长度不能超过100字符'),

  body('guarantee')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('服务保障说明长度不能超过200字符'),

  body('payment_qr')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('收款二维码URL长度不能超过500字符'),

  body('transfer_game_id')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('中转游戏ID长度不能超过100字符'),

  body('status')
    .optional()
    .isIn(['online', 'offline'])
    .withMessage('状态必须是online或offline'),

  body('sort_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('排序权重必须是非负整数')
]

// 更新商家验证规则
export const updateMerchantValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('商家ID必须是正整数'),

  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('商家名称不能为空')
    .isLength({ min: 1, max: 100 })
    .withMessage('商家名称长度应在1-100字符之间'),

  body('type')
    .optional()
    .isIn(['seller', 'buyer'])
    .withMessage('商家类型必须是seller或buyer'),

  body('price')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('价格不能为空')
    .isLength({ max: 50 })
    .withMessage('价格长度不能超过50字符'),

  body('trade_method')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('交易方式不能为空')
    .isLength({ max: 100 })
    .withMessage('交易方式长度不能超过100字符'),

  body('stock_or_demand')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('库存量或需求量不能为空')
    .isLength({ max: 100 })
    .withMessage('库存量或需求量长度不能超过100字符'),

  body('speed')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('发货/结算速度不能为空')
    .isLength({ max: 100 })
    .withMessage('速度说明长度不能超过100字符'),

  body('guarantee')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('服务保障说明长度不能超过200字符'),

  body('payment_qr')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('收款二维码URL长度不能超过500字符'),

  body('transfer_game_id')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('中转游戏ID长度不能超过100字符'),

  body('status')
    .optional()
    .isIn(['online', 'offline'])
    .withMessage('状态必须是online或offline'),

  body('sort_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('排序权重必须是非负整数')
]

// 批量状态更新验证规则
export const batchUpdateStatusValidation = [
  body('ids')
    .isArray({ min: 1 })
    .withMessage('商家ID列表不能为空'),

  body('ids.*')
    .isInt({ min: 1 })
    .withMessage('商家ID必须是正整数'),

  body('status')
    .isIn(['online', 'offline'])
    .withMessage('状态必须是online或offline')
]

// 排序更新验证规则
export const updateOrderValidation = [
  body('orders')
    .isArray({ min: 1 })
    .withMessage('排序数据不能为空'),

  body('orders.*.id')
    .isInt({ min: 1 })
    .withMessage('商家ID必须是正整数'),

  body('orders.*.sort_order')
    .isInt({ min: 0 })
    .withMessage('排序权重必须是非负整数')
]

/**
 * 获取商家列表
 */
export const getMerchants = asyncHandler(async (req: Request, res: Response) => {
  const { type, status, page, limit, search } = req.query

  const result = await MerchantService.getMerchants({
    type: type as 'seller' | 'buyer' | undefined,
    status: status as 'online' | 'offline' | undefined,
    page: page ? parseInt(page as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
    search: search as string | undefined
  })

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '获取商家列表成功',
    data: result
  })
})

/**
 * 获取商家详情
 */
export const getMerchantById = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id)
  const merchant = await MerchantService.getMerchantById(id)

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '获取商家详情成功',
    data: merchant
  })
})

/**
 * 创建商家
 */
export const createMerchant = asyncHandler(async (req: Request, res: Response) => {
  const merchantData = {
    name: req.body.name,
    type: req.body.type,
    price: req.body.price,
    trade_method: req.body.trade_method,
    stock_or_demand: req.body.stock_or_demand,
    speed: req.body.speed,
    guarantee: req.body.guarantee,
    payment_qr: req.body.payment_qr,
    transfer_game_id: req.body.transfer_game_id,
    status: req.body.status || 'online',
    sort_order: req.body.sort_order || 0,
    is_current_seller: false // 默认不设为当前商家
  }

  const operatorId = req.admin!.id
  const ipAddress = req.ip || req.connection?.remoteAddress
  const userAgent = req.get('User-Agent')

  const merchant = await MerchantService.createMerchant(
    merchantData,
    operatorId,
    ipAddress,
    userAgent
  )

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: '创建商家成功',
    data: merchant
  })
})

/**
 * 更新商家信息
 */
export const updateMerchant = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id)
  const updateData = req.body

  const operatorId = req.admin!.id
  const ipAddress = req.ip || req.connection?.remoteAddress
  const userAgent = req.get('User-Agent')

  const merchant = await MerchantService.updateMerchant(
    id,
    updateData,
    operatorId,
    ipAddress,
    userAgent
  )

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '更新商家信息成功',
    data: merchant
  })
})

/**
 * 删除商家
 */
export const deleteMerchant = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id)
  const operatorId = req.admin!.id
  const ipAddress = req.ip || req.connection?.remoteAddress
  const userAgent = req.get('User-Agent')

  await MerchantService.deleteMerchant(
    id,
    operatorId,
    ipAddress,
    userAgent
  )

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '删除商家成功',
    data: null
  })
})

/**
 * 批量更新商家状态
 */
export const batchUpdateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { ids, status } = req.body
  const operatorId = req.admin!.id
  const ipAddress = req.ip || req.connection?.remoteAddress
  const userAgent = req.get('User-Agent')

  await MerchantService.batchUpdateStatus(
    ids,
    status,
    operatorId,
    ipAddress,
    userAgent
  )

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '批量更新商家状态成功',
    data: null
  })
})

/**
 * 设置当前出货商家
 */
export const setCurrentSeller = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id)
  const operatorId = req.admin!.id
  const ipAddress = req.ip || req.connection?.remoteAddress
  const userAgent = req.get('User-Agent')

  await MerchantService.setCurrentSeller(
    id,
    operatorId,
    ipAddress,
    userAgent
  )

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '设置当前出货商家成功',
    data: null
  })
})

/**
 * 更新商家排序
 */
export const updateMerchantOrder = asyncHandler(async (req: Request, res: Response) => {
  const { orders } = req.body
  const operatorId = req.admin!.id
  const ipAddress = req.ip || req.connection?.remoteAddress
  const userAgent = req.get('User-Agent')

  await MerchantService.updateMerchantOrder(
    orders,
    operatorId,
    ipAddress,
    userAgent
  )

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '更新商家排序成功',
    data: null
  })
})

/**
 * 获取商家统计信息
 */
export const getMerchantStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await MerchantService.getActiveMerchantStats()

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '获取商家统计成功',
    data: stats
  })
})

// 公开接口：获取前端商家列表
export const getPublicMerchants = asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.params
  
  if (!['seller', 'buyer'].includes(type)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: '商家类型必须是seller或buyer',
      data: null
    })
  }

  const merchants = await MerchantService.getPublicMerchants(type as 'seller' | 'buyer')

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '获取商家列表成功',
    data: merchants
  })
})

// 公开接口：获取当前出货商家
export const getCurrentSeller = asyncHandler(async (req: Request, res: Response) => {
  const merchant = await MerchantService.getCurrentSeller()

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '获取当前出货商家成功',
    data: merchant
  })
})