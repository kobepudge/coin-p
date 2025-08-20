import { OrderModel } from '@/models/Order'
import { MerchantModel } from '@/models/Merchant'
import { AppError } from '@/middlewares/error'
import { HTTP_STATUS } from '@/constants'
import { OperationLogService } from '@/services/operationLog'
import { logger } from '@/utils/logger'
import type { Order, OrderStatus } from '@/types'
import { Op } from 'sequelize'

export class OrderService {
  /**
   * 获取订单列表
   */
  static async getOrders(options: {
    status?: OrderStatus
    merchant_id?: number
    page?: number
    limit?: number
    search?: string
    start_date?: string
    end_date?: string
  } = {}): Promise<{
    orders: Order[]
    total: number
    page: number
    limit: number
  }> {
    const { status, merchant_id, page = 1, limit = 20, search, start_date, end_date } = options
    
    const where: any = {}
    
    // 状态筛选
    if (status) {
      where.status = status
    }
    
    // 商家筛选
    if (merchant_id) {
      where.merchant_id = merchant_id
    }
    
    // 搜索条件
    if (search) {
      where[Op.or] = [
        { player_game_id: { [Op.like]: `%${search}%` } },
        { admin_note: { [Op.like]: `%${search}%` } }
      ]
    }
    
    // 日期范围筛选
    if (start_date || end_date) {
      where.created_at = {}
      if (start_date) {
        where.created_at[Op.gte] = new Date(start_date)
      }
      if (end_date) {
        const endDate = new Date(end_date)
        endDate.setHours(23, 59, 59, 999)
        where.created_at[Op.lte] = endDate
      }
    }
    
    const offset = (page - 1) * limit
    
    const { rows: orders, count: total } = await OrderModel.findAndCountAll({
      where,
      include: [
        {
          model: MerchantModel,
          as: 'merchant',
          attributes: ['id', 'name', 'type', 'status']
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    })
    
    return {
      orders: orders.map(o => o.toSafeJSON()),
      total,
      page,
      limit
    }
  }

  /**
   * 获取订单详情
   */
  static async getOrderById(id: number): Promise<Order> {
    const order = await OrderModel.findByPk(id, {
      include: [
        {
          model: MerchantModel,
          as: 'merchant',
          attributes: ['id', 'name', 'type', 'status', 'trade_method', 'price']
        }
      ]
    })
    
    if (!order) {
      throw new AppError('订单不存在', HTTP_STATUS.NOT_FOUND)
    }
    
    return order.toSafeJSON()
  }

  /**
   * 创建订单（用户提交）
   */
  static async createOrder(
    orderData: {
      merchant_id: number
      player_game_id: string
      payment_qr_url: string
      transfer_screenshot_url?: string
    }
  ): Promise<Order> {
    try {
      // 记录订单创建请求
      logger.info('创建订单请求', {
        merchant_id: orderData.merchant_id,
        player_game_id: orderData.player_game_id,
        payment_qr_url: orderData.payment_qr_url ? '已提供' : '未提供'
      })

      // 验证商家是否存在且在线
      const merchant = await MerchantModel.findByPk(orderData.merchant_id)

      if (!merchant) {
        logger.warn('商家不存在', { merchant_id: orderData.merchant_id })
        throw new AppError('商家不存在', HTTP_STATUS.NOT_FOUND)
      }

      if (!merchant.isActive()) {
        logger.warn('商家不可用', {
          merchant_id: orderData.merchant_id,
          merchant_status: merchant.status
        })
        throw new AppError('商家当前不可用', HTTP_STATUS.BAD_REQUEST)
      }

      // 检查是否有重复的游戏ID订单（防止重复提交）
      logger.info('检查重复订单', {
        merchant_id: orderData.merchant_id,
        player_game_id: orderData.player_game_id
      })

      const existingOrder = await OrderModel.findOne({
        where: {
          merchant_id: orderData.merchant_id,
          player_game_id: orderData.player_game_id,
          status: 'pending'
        }
      })

      if (existingOrder) {
        logger.warn('发现重复订单', {
          existing_order_id: existingOrder.id,
          merchant_id: orderData.merchant_id,
          player_game_id: orderData.player_game_id
        })
        throw new AppError('您已有相同游戏ID的待处理订单', HTTP_STATUS.BAD_REQUEST)
      }

      // 创建订单
      const order = await OrderModel.create({
        merchant_id: orderData.merchant_id,
        player_game_id: orderData.player_game_id,
        payment_qr_url: orderData.payment_qr_url,
        transfer_screenshot_url: orderData.transfer_screenshot_url,
        status: 'pending'
      })

      logger.info('订单创建成功', {
        order_id: order.id,
        merchant_id: orderData.merchant_id,
        player_game_id: orderData.player_game_id
      })

      return order.toSafeJSON()
    } catch (error) {
      // 如果是已知的 AppError，直接重新抛出
      if (error instanceof AppError) {
        throw error
      }

      // 记录未知错误
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined

      logger.error('创建订单时发生未知错误', {
        error: errorMessage,
        stack: errorStack,
        orderData
      })

      // 抛出通用错误
      throw new AppError('订单创建失败，请稍后重试', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * 更新订单状态（管理员操作）
   */
  static async updateOrderStatus(
    id: number,
    status: OrderStatus,
    adminNote: string,
    operatorId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Order> {
    const order = await OrderModel.findByPk(id, {
      include: [
        {
          model: MerchantModel,
          as: 'merchant',
          attributes: ['name']
        }
      ]
    })
    
    if (!order) {
      throw new AppError('订单不存在', HTTP_STATUS.NOT_FOUND)
    }
    
    if (!order.canProcess() && status !== order.status) {
      throw new AppError('订单当前状态不允许修改', HTTP_STATUS.BAD_REQUEST)
    }
    
    const oldStatus = order.status
    const oldData = { ...order.toJSON() }
    
    // 更新订单状态
    order.status = status
    order.admin_note = adminNote
    await order.save()
    
    // 记录操作日志
    await OperationLogService.log({
      admin_id: operatorId,
      action: 'order_status_update',
      target_type: 'order',
      target_id: id,
      details: `更新订单状态: ${oldStatus} -> ${status}`,
      old_data: oldData,
      new_data: order.toJSON(),
      ip_address: ipAddress,
      user_agent: userAgent
    })
    
    return order.toSafeJSON()
  }

  /**
   * 批量更新订单状态 (旧版本，保持向后兼容)
   */
  static async batchUpdateStatus(
    ids: number[],
    status: OrderStatus,
    adminNote: string,
    operatorId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const orders = await OrderModel.findAll({
      where: { id: { [Op.in]: ids } }
    })
    
    if (orders.length !== ids.length) {
      throw new AppError('部分订单不存在', HTTP_STATUS.BAD_REQUEST)
    }
    
    // 检查所有订单是否可以处理
    const cannotProcessOrders = orders.filter(order => !order.canProcess())
    if (cannotProcessOrders.length > 0) {
      throw new AppError(`有 ${cannotProcessOrders.length} 个订单当前状态不允许修改`, HTTP_STATUS.BAD_REQUEST)
    }
    
    // 批量更新
    await OrderModel.update(
      { status, admin_note: adminNote },
      { where: { id: { [Op.in]: ids } } }
    )
    
    // 记录操作日志
    await OperationLogService.log({
      admin_id: operatorId,
      action: 'order_batch_update_status',
      target_type: 'order',
      target_id: ids.join(','),
      details: `批量更新 ${ids.length} 个订单状态为: ${status}`,
      new_data: { status, admin_note: adminNote, order_ids: ids },
      ip_address: ipAddress,
      user_agent: userAgent
    })
  }

  /**
   * 删除订单（软删除或硬删除）
   */
  static async deleteOrder(
    id: number,
    operatorId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const order = await OrderModel.findByPk(id)
    
    if (!order) {
      throw new AppError('订单不存在', HTTP_STATUS.NOT_FOUND)
    }
    
    // 只允许删除非待处理状态的订单
    if (order.isPending()) {
      throw new AppError('待处理订单不允许删除', HTTP_STATUS.BAD_REQUEST)
    }
    
    const orderData = { ...order.toJSON() }
    await order.destroy()
    
    // 记录操作日志
    await OperationLogService.log({
      admin_id: operatorId,
      action: 'order_delete',
      target_type: 'order',
      target_id: id,
      details: `删除订单: ${orderData.player_game_id}`,
      old_data: orderData,
      ip_address: ipAddress,
      user_agent: userAgent
    })
  }

  /**
   * 获取订单统计信息
   */
  static async getOrderStats(options: {
    start_date?: string
    end_date?: string
    merchant_id?: number
  } = {}): Promise<{
    total: number
    pending: number
    completed: number
    failed: number
    rejected: number
    today_orders: number
    today_completed: number
  }> {
    const { start_date, end_date, merchant_id } = options
    
    const where: any = {}
    
    if (merchant_id) {
      where.merchant_id = merchant_id
    }
    
    // 日期范围筛选
    if (start_date || end_date) {
      where.created_at = {}
      if (start_date) {
        where.created_at[Op.gte] = new Date(start_date)
      }
      if (end_date) {
        const endDate = new Date(end_date)
        endDate.setHours(23, 59, 59, 999)
        where.created_at[Op.lte] = endDate
      }
    }
    
    // 今天的日期范围
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const todayWhere = {
      ...where,
      created_at: {
        [Op.gte]: today,
        [Op.lt]: tomorrow
      }
    }
    
    const [
      total,
      pending,
      completed,
      failed,
      rejected,
      todayOrders,
      todayCompleted
    ] = await Promise.all([
      OrderModel.count({ where }),
      OrderModel.count({ where: { ...where, status: 'pending' } }),
      OrderModel.count({ where: { ...where, status: 'completed' } }),
      OrderModel.count({ where: { ...where, status: 'failed' } }),
      OrderModel.count({ where: { ...where, status: 'rejected' } }),
      OrderModel.count({ where: todayWhere }),
      OrderModel.count({ where: { ...todayWhere, status: 'completed' } })
    ])
    
    return {
      total,
      pending,
      completed,
      failed,
      rejected,
      today_orders: todayOrders,
      today_completed: todayCompleted
    }
  }

  /**
   * 获取待处理订单数量
   */
  static async getPendingOrdersCount(): Promise<number> {
    return await OrderModel.count({
      where: { status: 'pending' }
    })
  }

  /**
   * 获取最近订单列表（用于Dashboard）
   */
  static async getRecentOrders(limit: number = 10): Promise<Order[]> {
    const orders = await OrderModel.findAll({
      include: [
        {
          model: MerchantModel,
          as: 'merchant',
          attributes: ['id', 'name', 'type']
        }
      ],
      order: [['created_at', 'DESC']],
      limit
    })
    
    return orders.map(o => o.toSafeJSON())
  }

  /**
   * 批量更新订单状态
   */
  static async batchUpdateOrderStatus(
    orderIds: number[],
    status: OrderStatus,
    adminNote: string,
    operatorId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ updated: number }> {
    if (orderIds.length === 0) {
      throw new AppError('请选择要更新的订单', HTTP_STATUS.BAD_REQUEST)
    }

    // 获取要更新的订单
    const orders = await OrderModel.findAll({
      where: {
        id: { [Op.in]: orderIds }
      },
      include: [
        {
          model: MerchantModel,
          as: 'merchant',
          attributes: ['name']
        }
      ]
    })

    if (orders.length === 0) {
      throw new AppError('未找到指定的订单', HTTP_STATUS.NOT_FOUND)
    }

    // 检查订单是否可以更新
    for (const order of orders) {
      if (!order.canProcess() && status !== order.status) {
        throw new AppError(`订单 #${order.id} 当前状态不允许修改`, HTTP_STATUS.BAD_REQUEST)
      }
    }

    // 记录旧数据
    const oldDataList = orders.map(order => ({
      id: order.id,
      oldStatus: order.status,
      oldData: { ...order.toJSON() }
    }))

    // 批量更新
    const [updatedCount] = await OrderModel.update(
      {
        status,
        admin_note: adminNote
      },
      {
        where: {
          id: { [Op.in]: orderIds }
        }
      }
    )

    // 批量记录操作日志
    const logPromises = oldDataList.map(({ id, oldStatus, oldData }) =>
      OperationLogService.log({
        admin_id: operatorId,
        action: 'order_batch_status_update',
        target_type: 'order',
        target_id: id,
        details: `批量更新订单状态: ${oldStatus} -> ${status}`,
        old_data: oldData,
        new_data: { status, admin_note: adminNote },
        ip_address: ipAddress,
        user_agent: userAgent
      })
    )

    await Promise.all(logPromises)

    return { updated: updatedCount }
  }

  /**
   * 自动取消过期订单
   */
  static async cancelExpiredOrders(): Promise<number> {
    // 24小时前的时间
    const expiredTime = new Date()
    expiredTime.setHours(expiredTime.getHours() - 24)
    
    const expiredOrders = await OrderModel.findAll({
      where: {
        status: 'pending',
        created_at: {
          [Op.lt]: expiredTime
        }
      }
    })
    
    if (expiredOrders.length === 0) {
      return 0
    }
    
    // 批量更新为失败状态
    await OrderModel.update(
      { 
        status: 'failed',
        admin_note: '订单超时自动取消'
      },
      {
        where: {
          id: { [Op.in]: expiredOrders.map(o => o.id) }
        }
      }
    )
    
    return expiredOrders.length
  }
}