"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
const order_1 = require("@/services/order");
const logger_1 = require("@/utils/logger");
// 定时任务管理器
class SchedulerService {
    /**
     * 启动所有定时任务
     */
    static startAll() {
        if (this.isRunning) {
            logger_1.logger.info('定时任务已在运行中');
            return;
        }
        this.startExpiredOrdersCleaner();
        this.isRunning = true;
        logger_1.logger.info('所有定时任务已启动');
    }
    /**
     * 停止所有定时任务
     */
    static stopAll() {
        this.intervals.forEach((interval, name) => {
            clearInterval(interval);
            logger_1.logger.info(`定时任务 ${name} 已停止`);
        });
        this.intervals.clear();
        this.isRunning = false;
        logger_1.logger.info('所有定时任务已停止');
    }
    /**
     * 启动过期订单清理任务
     * 每小时执行一次
     */
    static startExpiredOrdersCleaner() {
        const taskName = 'expiredOrdersCleaner';
        // 立即执行一次
        this.executeExpiredOrdersCleaner();
        // 每小时执行一次 (3600000ms = 1小时)
        const interval = setInterval(async () => {
            await this.executeExpiredOrdersCleaner();
        }, 3600000);
        this.intervals.set(taskName, interval);
        logger_1.logger.info(`定时任务 ${taskName} 已启动 (每小时执行一次)`);
    }
    /**
     * 执行过期订单清理
     */
    static async executeExpiredOrdersCleaner() {
        try {
            logger_1.logger.info('开始执行过期订单清理任务...');
            const canceledCount = await order_1.OrderService.cancelExpiredOrders();
            if (canceledCount > 0) {
                logger_1.logger.info(`过期订单清理完成，取消了 ${canceledCount} 个订单`);
            }
            else {
                logger_1.logger.info('过期订单清理完成，无需取消的订单');
            }
        }
        catch (error) {
            logger_1.logger.error('过期订单清理任务执行失败:', error);
        }
    }
    /**
     * 停止单个任务
     */
    static stopTask(taskName) {
        const interval = this.intervals.get(taskName);
        if (interval) {
            clearInterval(interval);
            this.intervals.delete(taskName);
            logger_1.logger.info(`定时任务 ${taskName} 已停止`);
        }
        else {
            logger_1.logger.warn(`定时任务 ${taskName} 不存在`);
        }
    }
    /**
     * 获取任务运行状态
     */
    static isTaskRunning(taskName) {
        return this.intervals.has(taskName);
    }
    /**
     * 获取所有任务状态
     */
    static getAllTasksStatus() {
        const status = {};
        this.intervals.forEach((_, name) => {
            status[name] = true;
        });
        return status;
    }
    /**
     * 手动执行过期订单清理
     */
    static async manualCleanExpiredOrders() {
        try {
            logger_1.logger.info('手动执行过期订单清理...');
            const canceledCount = await order_1.OrderService.cancelExpiredOrders();
            logger_1.logger.info(`手动清理完成，取消了 ${canceledCount} 个过期订单`);
            return canceledCount;
        }
        catch (error) {
            logger_1.logger.error('手动清理过期订单失败:', error);
            throw error;
        }
    }
}
exports.SchedulerService = SchedulerService;
SchedulerService.intervals = new Map();
SchedulerService.isRunning = false;
