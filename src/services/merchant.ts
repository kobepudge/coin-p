import { MerchantModel } from '@/models/Merchant'
import { AppError } from '@/middlewares/error'
import { HTTP_STATUS } from '@/constants'
import { OperationLogService } from '@/services/operationLog'
import type { Merchant } from '@/types'
import { Op } from 'sequelize'

export class MerchantService {
  /**
   * 获取商家列表
   */
  static async getMerchants(options: {
    type?: 'seller' | 'buyer'
    status?: 'online' | 'offline'
    page?: number
    limit?: number
    search?: string
  } = {}): Promise<{
    merchants: Merchant[]
    total: number
    page: number
    limit: number
  }> {
    const { type, status, page = 1, limit = 20, search } = options
    
    const where: any = {}
    
    // 筛选条件
    if (type) {
      where.type = type
    }
    
    if (status) {
      where.status = status
    }
    
    // 搜索
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { trade_method: { [Op.like]: `%${search}%` } },
        { guarantee: { [Op.like]: `%${search}%` } }
      ]
    }
    
    const offset = (page - 1) * limit
    
    const { rows: merchants, count: total } = await MerchantModel.findAndCountAll({
      where,
      order: [
        ['is_current_seller', 'DESC'], // 当前出货商家优先
        ['sort_order', 'DESC'],        // 按权重排序
        ['created_at', 'DESC']         // 最新创建的优先
      ],
      limit,
      offset
    })
    
    return {
      merchants: merchants.map(m => m.toSafeJSON()),
      total,
      page,
      limit
    }
  }

  /**
   * 获取商家详情
   */
  static async getMerchantById(id: number): Promise<Merchant> {
    const merchant = await MerchantModel.findByPk(id)
    
    if (!merchant) {
      throw new AppError('商家不存在', HTTP_STATUS.NOT_FOUND)
    }
    
    return merchant.toSafeJSON()
  }

  /**
   * 创建商家
   */
  static async createMerchant(
    merchantData: Omit<Merchant, 'id' | 'created_at' | 'updated_at'>,
    operatorId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Merchant> {
    // 检查商家名称是否重复
    const existingMerchant = await MerchantModel.findOne({
      where: { name: merchantData.name }
    })
    
    if (existingMerchant) {
      throw new AppError('商家名称已存在', HTTP_STATUS.BAD_REQUEST)
    }
    
    const merchant = await MerchantModel.create(merchantData)
    
    // 记录操作日志
    await OperationLogService.log({
      admin_id: operatorId,
      action: 'merchant_create',
      target_type: 'merchant',
      target_id: merchant.id,
      details: `创建商家: ${merchant.name}`,
      ip_address: ipAddress,
      user_agent: userAgent
    })
    
    return merchant.toSafeJSON()
  }

  /**
   * 更新商家信息
   */
  static async updateMerchant(
    id: number,
    updateData: Partial<Merchant>,
    operatorId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Merchant> {
    const merchant = await MerchantModel.findByPk(id)
    
    if (!merchant) {
      throw new AppError('商家不存在', HTTP_STATUS.NOT_FOUND)
    }
    
    // 如果更新商家名称，检查是否重复
    if (updateData.name && updateData.name !== merchant.name) {
      const existingMerchant = await MerchantModel.findOne({
        where: { 
          name: updateData.name,
          id: { [Op.ne]: id }
        }
      })
      
      if (existingMerchant) {
        throw new AppError('商家名称已存在', HTTP_STATUS.BAD_REQUEST)
      }
    }
    
    const oldData = { ...merchant.toJSON() }
    await merchant.update(updateData)
    
    // 记录操作日志
    await OperationLogService.log({
      admin_id: operatorId,
      action: 'merchant_update',
      target_type: 'merchant',
      target_id: id,
      details: `更新商家: ${merchant.name}`,
      old_data: oldData,
      new_data: merchant.toJSON(),
      ip_address: ipAddress,
      user_agent: userAgent
    })
    
    return merchant.toSafeJSON()
  }

  /**
   * 删除商家
   */
  static async deleteMerchant(
    id: number,
    operatorId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const merchant = await MerchantModel.findByPk(id)
    
    if (!merchant) {
      throw new AppError('商家不存在', HTTP_STATUS.NOT_FOUND)
    }
    
    // 检查是否有关联的未完成订单
    // TODO: 添加订单检查逻辑
    
    const merchantData = { ...merchant.toJSON() }
    await merchant.destroy()
    
    // 记录操作日志
    await OperationLogService.log({
      admin_id: operatorId,
      action: 'merchant_delete',
      target_type: 'merchant',
      target_id: id,
      details: `删除商家: ${merchantData.name}`,
      old_data: merchantData,
      ip_address: ipAddress,
      user_agent: userAgent
    })
  }

  /**
   * 批量更新商家状态
   */
  static async batchUpdateStatus(
    ids: number[],
    status: 'online' | 'offline',
    operatorId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const merchants = await MerchantModel.findAll({
      where: { id: { [Op.in]: ids } }
    })
    
    if (merchants.length !== ids.length) {
      throw new AppError('部分商家不存在', HTTP_STATUS.BAD_REQUEST)
    }
    
    await MerchantModel.update(
      { status },
      { where: { id: { [Op.in]: ids } } }
    )
    
    // 记录操作日志
    await OperationLogService.log({
      admin_id: operatorId,
      action: 'merchant_batch_update_status',
      target_type: 'merchant',
      target_id: ids.join(','),
      details: `批量更新商家状态为: ${status}，影响 ${ids.length} 个商家`,
      new_data: { status, merchant_ids: ids },
      ip_address: ipAddress,
      user_agent: userAgent
    })
  }

  /**
   * 设置当前出货商家
   */
  static async setCurrentSeller(
    id: number,
    operatorId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const merchant = await MerchantModel.findByPk(id)
    
    if (!merchant) {
      throw new AppError('商家不存在', HTTP_STATUS.NOT_FOUND)
    }
    
    if (merchant.type !== 'seller') {
      throw new AppError('只有出货商家可以设置为当前商家', HTTP_STATUS.BAD_REQUEST)
    }
    
    if (!merchant.isOnline()) {
      throw new AppError('只有在线商家可以设置为当前商家', HTTP_STATUS.BAD_REQUEST)
    }
    
    await merchant.setAsCurrent()
    
    // 记录操作日志
    await OperationLogService.log({
      admin_id: operatorId,
      action: 'merchant_set_current',
      target_type: 'merchant',
      target_id: id,
      details: `设置商家 ${merchant.name} 为当前出货商家`,
      ip_address: ipAddress,
      user_agent: userAgent
    })
  }

  /**
   * 更新商家排序
   */
  static async updateMerchantOrder(
    orders: { id: number; sort_order: number }[],
    operatorId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const ids = orders.map(o => o.id)
    const merchants = await MerchantModel.findAll({
      where: { id: { [Op.in]: ids } }
    })
    
    if (merchants.length !== ids.length) {
      throw new AppError('部分商家不存在', HTTP_STATUS.BAD_REQUEST)
    }
    
    // 批量更新排序
    for (const order of orders) {
      await MerchantModel.update(
        { sort_order: order.sort_order },
        { where: { id: order.id } }
      )
    }
    
    // 记录操作日志
    await OperationLogService.log({
      admin_id: operatorId,
      action: 'merchant_update_order',
      target_type: 'merchant',
      target_id: ids.join(','),
      details: `更新商家排序，影响 ${orders.length} 个商家`,
      new_data: { orders },
      ip_address: ipAddress,
      user_agent: userAgent
    })
  }

  /**
   * 获取活跃商家统计
   */
  static async getActiveMerchantStats(): Promise<{
    total: number
    sellers: number
    buyers: number
    online: number
    offline: number
  }> {
    const [
      total,
      sellers,
      buyers,
      online,
      offline
    ] = await Promise.all([
      MerchantModel.count(),
      MerchantModel.count({ where: { type: 'seller' } }),
      MerchantModel.count({ where: { type: 'buyer' } }),
      MerchantModel.count({ where: { status: 'online' } }),
      MerchantModel.count({ where: { status: 'offline' } })
    ])
    
    return {
      total,
      sellers,
      buyers,
      online,
      offline
    }
  }

  /**
   * 获取前端显示的商家列表（公开接口）
   */
  static async getPublicMerchants(type: 'seller' | 'buyer'): Promise<Merchant[]> {
    const merchants = await MerchantModel.findAll({
      where: {
        type,
        status: 'online'
      },
      order: [
        ['is_current_seller', 'DESC'],
        ['sort_order', 'DESC'],
        ['created_at', 'DESC']
      ]
    })
    
    return merchants.map(m => m.toSafeJSON())
  }

  /**
   * 获取当前出货商家
   */
  static async getCurrentSeller(): Promise<Merchant | null> {
    const merchant = await MerchantModel.findOne({
      where: {
        type: 'seller',
        status: 'online',
        is_current_seller: true
      }
    })
    
    return merchant ? merchant.toSafeJSON() : null
  }
}