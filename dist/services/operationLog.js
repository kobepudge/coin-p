"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationLogService = void 0;
const models_1 = require("@/models");
const logger_1 = require("@/utils/logger");
/**
 * 操作日志服务
 */
class OperationLogService {
    /**
     * 记录操作日志 (别名)
     */
    static async log(data) {
        return this.createLog(data);
    }
    /**
     * 记录操作日志
     */
    static async createLog(data) {
        try {
            const log = await models_1.OperationLog.create(data);
            logger_1.logger.info('操作日志记录成功:', {
                logId: log.id,
                adminId: data.admin_id,
                action: data.action,
                targetType: data.target_type,
                targetId: data.target_id
            });
            return log;
        }
        catch (error) {
            logger_1.logger.error('操作日志记录失败:', {
                error: error.message,
                data
            });
            throw error;
        }
    }
    /**
     * 获取操作日志列表
     */
    static async getLogs(options) {
        try {
            const { adminId, action, targetType, startDate, endDate, page = 1, limit = 20 } = options;
            const where = {};
            if (adminId)
                where.admin_id = adminId;
            if (action)
                where.action = action;
            if (targetType)
                where.target_type = targetType;
            if (startDate || endDate) {
                where.created_at = {};
                if (startDate)
                    where.created_at.gte = startDate;
                if (endDate)
                    where.created_at.lte = endDate;
            }
            const { rows: logs, count } = await models_1.OperationLog.findAndCountAll({
                where,
                include: [{
                        association: 'admin',
                        attributes: ['username', 'real_name']
                    }],
                order: [['created_at', 'DESC']],
                limit,
                offset: (page - 1) * limit
            });
            return {
                logs,
                pagination: {
                    page,
                    limit,
                    total: count,
                    pages: Math.ceil(count / limit)
                }
            };
        }
        catch (error) {
            logger_1.logger.error('获取操作日志失败:', error.message);
            throw error;
        }
    }
    /**
     * 删除过期日志
     */
    static async cleanupOldLogs(daysToKeep = 90) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            const deletedCount = await models_1.OperationLog.destroy({
                where: {
                    created_at: {
                        lt: cutoffDate
                    }
                }
            });
            logger_1.logger.info('清理过期操作日志:', {
                cutoffDate,
                deletedCount
            });
            return deletedCount;
        }
        catch (error) {
            logger_1.logger.error('清理操作日志失败:', error.message);
            throw error;
        }
    }
}
exports.OperationLogService = OperationLogService;
exports.default = OperationLogService;
