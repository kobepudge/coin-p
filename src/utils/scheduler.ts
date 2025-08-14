import { OrderService } from '@/services/order'
import { logger } from '@/utils/logger'

// 定时任务管理器
export class SchedulerService {
  private static intervals: Map<string, NodeJS.Timeout> = new Map()
  private static isRunning = false

  /**
   * 启动所有定时任务
   */
  static startAll() {
    if (this.isRunning) {
      logger.info('定时任务已在运行中')
      return
    }

    this.startExpiredOrdersCleaner()
    this.isRunning = true
    logger.info('所有定时任务已启动')
  }

  /**
   * 停止所有定时任务
   */
  static stopAll() {
    this.intervals.forEach((interval, name) => {
      clearInterval(interval)
      logger.info(`定时任务 ${name} 已停止`)
    })
    this.intervals.clear()
    this.isRunning = false
    logger.info('所有定时任务已停止')
  }

  /**
   * 启动过期订单清理任务
   * 每小时执行一次
   */
  private static startExpiredOrdersCleaner() {
    const taskName = 'expiredOrdersCleaner'
    
    // 立即执行一次
    this.executeExpiredOrdersCleaner()
    
    // 每小时执行一次 (3600000ms = 1小时)
    const interval = setInterval(async () => {
      await this.executeExpiredOrdersCleaner()
    }, 3600000)

    this.intervals.set(taskName, interval)
    logger.info(`定时任务 ${taskName} 已启动 (每小时执行一次)`)
  }

  /**
   * 执行过期订单清理
   */
  private static async executeExpiredOrdersCleaner() {
    try {
      logger.info('开始执行过期订单清理任务...')
      const canceledCount = await OrderService.cancelExpiredOrders()
      if (canceledCount > 0) {
        logger.info(`过期订单清理完成，取消了 ${canceledCount} 个订单`)
      } else {
        logger.info('过期订单清理完成，无需取消的订单')
      }
    } catch (error) {
      logger.error('过期订单清理任务执行失败:', error)
    }
  }

  /**
   * 停止单个任务
   */
  static stopTask(taskName: string) {
    const interval = this.intervals.get(taskName)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(taskName)
      logger.info(`定时任务 ${taskName} 已停止`)
    } else {
      logger.warn(`定时任务 ${taskName} 不存在`)
    }
  }

  /**
   * 获取任务运行状态
   */
  static isTaskRunning(taskName: string): boolean {
    return this.intervals.has(taskName)
  }

  /**
   * 获取所有任务状态
   */
  static getAllTasksStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {}
    this.intervals.forEach((_, name) => {
      status[name] = true
    })
    return status
  }

  /**
   * 手动执行过期订单清理
   */
  static async manualCleanExpiredOrders(): Promise<number> {
    try {
      logger.info('手动执行过期订单清理...')
      const canceledCount = await OrderService.cancelExpiredOrders()
      logger.info(`手动清理完成，取消了 ${canceledCount} 个过期订单`)
      return canceledCount
    } catch (error) {
      logger.error('手动清理过期订单失败:', error)
      throw error
    }
  }
}