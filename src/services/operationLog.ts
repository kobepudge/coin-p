import { OperationLog } from '@/models'
import { logger } from '@/utils/logger'
// 导入正确的类型定义
import type { OperationLogCreationAttributes } from '@/types'

/**
 * 操作日志服务
 */
export class OperationLogService {
  /**
   * 记录操作日志 (别名)
   */
  static async log(data: OperationLogCreationAttributes): Promise<OperationLog> {
    return this.createLog(data)
  }

  /**
   * 记录操作日志
   */
  static async createLog(data: OperationLogCreationAttributes): Promise<OperationLog> {
    try {
      const log = await OperationLog.create(data as any)
      
      logger.info('操作日志记录成功:', {
        logId: log.id,
        adminId: data.admin_id,
        action: data.action,
        targetType: data.target_type,
        targetId: data.target_id
      })
      
      return log
    } catch (error: any) {
      logger.error('操作日志记录失败:', {
        error: error.message,
        data
      })
      throw error
    }
  }

  /**
   * 获取操作日志列表
   */
  static async getLogs(options: {
    adminId?: number
    action?: string
    targetType?: string
    startDate?: Date
    endDate?: Date
    page?: number
    limit?: number
  }) {
    try {
      const {
        adminId,
        action,
        targetType,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = options

      const where: any = {}
      
      if (adminId) where.admin_id = adminId
      if (action) where.action = action
      if (targetType) where.target_type = targetType
      
      if (startDate || endDate) {
        where.created_at = {}
        if (startDate) where.created_at.gte = startDate
        if (endDate) where.created_at.lte = endDate
      }

      const { rows: logs, count } = await OperationLog.findAndCountAll({
        where,
        include: [{
          association: 'admin',
          attributes: ['username', 'real_name']
        }],
        order: [['created_at', 'DESC']],
        limit,
        offset: (page - 1) * limit
      })

      return {
        logs,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    } catch (error: any) {
      logger.error('获取操作日志失败:', error.message)
      throw error
    }
  }

  /**
   * 删除过期日志
   */
  static async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      const deletedCount = await OperationLog.destroy({
        where: {
          created_at: {
            lt: cutoffDate
          }
        }
      })

      logger.info('清理过期操作日志:', {
        cutoffDate,
        deletedCount
      })

      return deletedCount
    } catch (error: any) {
      logger.error('清理操作日志失败:', error.message)
      throw error
    }
  }
}

export default OperationLogService