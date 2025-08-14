"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const Order_1 = require("@/models/Order");
const Merchant_1 = require("@/models/Merchant");
const error_1 = require("@/middlewares/error");
const constants_1 = require("@shared/constants");
const operationLog_1 = require("@/services/operationLog");
const sequelize_1 = require("sequelize");
class OrderService {
    /**
     * 获取订单列表
     */
    static async getOrders(options = {}) {
        const { status, merchant_id, page = 1, limit = 20, search, start_date, end_date } = options;
        const where = {};
        // 状态筛选
        if (status) {
            where.status = status;
        }
        // 商家筛选
        if (merchant_id) {
            where.merchant_id = merchant_id;
        }
        // 搜索条件
        if (search) {
            where[sequelize_1.Op.or] = [
                { player_game_id: { [sequelize_1.Op.like]: `%${search}%` } },
                { admin_note: { [sequelize_1.Op.like]: `%${search}%` } }
            ];
        }
        // 日期范围筛选
        if (start_date || end_date) {
            where.created_at = {};
            if (start_date) {
                where.created_at[sequelize_1.Op.gte] = new Date(start_date);
            }
            if (end_date) {
                const endDate = new Date(end_date);
                endDate.setHours(23, 59, 59, 999);
                where.created_at[sequelize_1.Op.lte] = endDate;
            }
        }
        const offset = (page - 1) * limit;
        const { rows: orders, count: total } = await Order_1.OrderModel.findAndCountAll({
            where,
            include: [
                {
                    model: Merchant_1.MerchantModel,
                    as: 'merchant',
                    attributes: ['id', 'name', 'type', 'status']
                }
            ],
            order: [['created_at', 'DESC']],
            limit,
            offset
        });
        return {
            orders: orders.map(o => o.toSafeJSON()),
            total,
            page,
            limit
        };
    }
    /**
     * 获取订单详情
     */
    static async getOrderById(id) {
        const order = await Order_1.OrderModel.findByPk(id, {
            include: [
                {
                    model: Merchant_1.MerchantModel,
                    as: 'merchant',
                    attributes: ['id', 'name', 'type', 'status', 'trade_method', 'price']
                }
            ]
        });
        if (!order) {
            throw new error_1.AppError('订单不存在', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        return order.toSafeJSON();
    }
    /**
     * 创建订单（用户提交）
     */
    static async createOrder(orderData) {
        // 验证商家是否存在且在线
        const merchant = await Merchant_1.MerchantModel.findByPk(orderData.merchant_id);
        if (!merchant) {
            throw new error_1.AppError('商家不存在', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        if (!merchant.isActive()) {
            throw new error_1.AppError('商家当前不可用', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // 检查是否有重复的游戏ID订单（防止重复提交）
        const existingOrder = await Order_1.OrderModel.findOne({
            where: {
                merchant_id: orderData.merchant_id,
                player_game_id: orderData.player_game_id,
                status: 'pending'
            }
        });
        if (existingOrder) {
            throw new error_1.AppError('您已有相同游戏ID的待处理订单', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const order = await Order_1.OrderModel.create({
            merchant_id: orderData.merchant_id,
            player_game_id: orderData.player_game_id,
            payment_qr_url: orderData.payment_qr_url,
            status: 'pending'
        });
        return order.toSafeJSON();
    }
    /**
     * 更新订单状态（管理员操作）
     */
    static async updateOrderStatus(id, status, adminNote, operatorId, ipAddress, userAgent) {
        const order = await Order_1.OrderModel.findByPk(id, {
            include: [
                {
                    model: Merchant_1.MerchantModel,
                    as: 'merchant',
                    attributes: ['name']
                }
            ]
        });
        if (!order) {
            throw new error_1.AppError('订单不存在', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        if (!order.canProcess() && status !== order.status) {
            throw new error_1.AppError('订单当前状态不允许修改', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const oldStatus = order.status;
        const oldData = { ...order.toJSON() };
        // 更新订单状态
        order.status = status;
        order.admin_note = adminNote;
        await order.save();
        // 记录操作日志
        await operationLog_1.OperationLogService.log({
            admin_id: operatorId,
            action: 'order_status_update',
            resource_type: 'order',
            resource_id: id.toString(),
            details: `更新订单状态: ${oldStatus} -> ${status}`,
            old_data: oldData,
            new_data: order.toJSON(),
            ip_address: ipAddress,
            user_agent: userAgent
        });
        return order.toSafeJSON();
    }
    /**
     * 批量更新订单状态 (旧版本，保持向后兼容)
     */
    static async batchUpdateStatus(ids, status, adminNote, operatorId, ipAddress, userAgent) {
        const orders = await Order_1.OrderModel.findAll({
            where: { id: { [sequelize_1.Op.in]: ids } }
        });
        if (orders.length !== ids.length) {
            throw new error_1.AppError('部分订单不存在', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // 检查所有订单是否可以处理
        const cannotProcessOrders = orders.filter(order => !order.canProcess());
        if (cannotProcessOrders.length > 0) {
            throw new error_1.AppError(`有 ${cannotProcessOrders.length} 个订单当前状态不允许修改`, constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // 批量更新
        await Order_1.OrderModel.update({ status, admin_note: adminNote }, { where: { id: { [sequelize_1.Op.in]: ids } } });
        // 记录操作日志
        await operationLog_1.OperationLogService.log({
            admin_id: operatorId,
            action: 'order_batch_update_status',
            resource_type: 'order',
            resource_id: ids.join(','),
            details: `批量更新 ${ids.length} 个订单状态为: ${status}`,
            new_data: { status, admin_note: adminNote, order_ids: ids },
            ip_address: ipAddress,
            user_agent: userAgent
        });
    }
    /**
     * 删除订单（软删除或硬删除）
     */
    static async deleteOrder(id, operatorId, ipAddress, userAgent) {
        const order = await Order_1.OrderModel.findByPk(id);
        if (!order) {
            throw new error_1.AppError('订单不存在', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        // 只允许删除非待处理状态的订单
        if (order.isPending()) {
            throw new error_1.AppError('待处理订单不允许删除', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const orderData = { ...order.toJSON() };
        await order.destroy();
        // 记录操作日志
        await operationLog_1.OperationLogService.log({
            admin_id: operatorId,
            action: 'order_delete',
            resource_type: 'order',
            resource_id: id.toString(),
            details: `删除订单: ${orderData.player_game_id}`,
            old_data: orderData,
            ip_address: ipAddress,
            user_agent: userAgent
        });
    }
    /**
     * 获取订单统计信息
     */
    static async getOrderStats(options = {}) {
        const { start_date, end_date, merchant_id } = options;
        const where = {};
        if (merchant_id) {
            where.merchant_id = merchant_id;
        }
        // 日期范围筛选
        if (start_date || end_date) {
            where.created_at = {};
            if (start_date) {
                where.created_at[sequelize_1.Op.gte] = new Date(start_date);
            }
            if (end_date) {
                const endDate = new Date(end_date);
                endDate.setHours(23, 59, 59, 999);
                where.created_at[sequelize_1.Op.lte] = endDate;
            }
        }
        // 今天的日期范围
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const todayWhere = {
            ...where,
            created_at: {
                [sequelize_1.Op.gte]: today,
                [sequelize_1.Op.lt]: tomorrow
            }
        };
        const [total, pending, completed, failed, rejected, todayOrders, todayCompleted] = await Promise.all([
            Order_1.OrderModel.count({ where }),
            Order_1.OrderModel.count({ where: { ...where, status: 'pending' } }),
            Order_1.OrderModel.count({ where: { ...where, status: 'completed' } }),
            Order_1.OrderModel.count({ where: { ...where, status: 'failed' } }),
            Order_1.OrderModel.count({ where: { ...where, status: 'rejected' } }),
            Order_1.OrderModel.count({ where: todayWhere }),
            Order_1.OrderModel.count({ where: { ...todayWhere, status: 'completed' } })
        ]);
        return {
            total,
            pending,
            completed,
            failed,
            rejected,
            today_orders: todayOrders,
            today_completed: todayCompleted
        };
    }
    /**
     * 获取待处理订单数量
     */
    static async getPendingOrdersCount() {
        return await Order_1.OrderModel.count({
            where: { status: 'pending' }
        });
    }
    /**
     * 获取最近订单列表（用于Dashboard）
     */
    static async getRecentOrders(limit = 10) {
        const orders = await Order_1.OrderModel.findAll({
            include: [
                {
                    model: Merchant_1.MerchantModel,
                    as: 'merchant',
                    attributes: ['id', 'name', 'type']
                }
            ],
            order: [['created_at', 'DESC']],
            limit
        });
        return orders.map(o => o.toSafeJSON());
    }
    /**
     * 批量更新订单状态
     */
    static async batchUpdateOrderStatus(orderIds, status, adminNote, operatorId, ipAddress, userAgent) {
        if (orderIds.length === 0) {
            throw new error_1.AppError('请选择要更新的订单', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // 获取要更新的订单
        const orders = await Order_1.OrderModel.findAll({
            where: {
                id: { [sequelize_1.Op.in]: orderIds }
            },
            include: [
                {
                    model: Merchant_1.MerchantModel,
                    as: 'merchant',
                    attributes: ['name']
                }
            ]
        });
        if (orders.length === 0) {
            throw new error_1.AppError('未找到指定的订单', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        // 检查订单是否可以更新
        for (const order of orders) {
            if (!order.canProcess() && status !== order.status) {
                throw new error_1.AppError(`订单 #${order.id} 当前状态不允许修改`, constants_1.HTTP_STATUS.BAD_REQUEST);
            }
        }
        // 记录旧数据
        const oldDataList = orders.map(order => ({
            id: order.id,
            oldStatus: order.status,
            oldData: { ...order.toJSON() }
        }));
        // 批量更新
        const [updatedCount] = await Order_1.OrderModel.update({
            status,
            admin_note: adminNote
        }, {
            where: {
                id: { [sequelize_1.Op.in]: orderIds }
            }
        });
        // 批量记录操作日志
        const logPromises = oldDataList.map(({ id, oldStatus, oldData }) => operationLog_1.OperationLogService.log({
            admin_id: operatorId,
            action: 'order_batch_status_update',
            resource_type: 'order',
            resource_id: id.toString(),
            details: `批量更新订单状态: ${oldStatus} -> ${status}`,
            old_data: oldData,
            new_data: { status, admin_note: adminNote },
            ip_address: ipAddress,
            user_agent: userAgent
        }));
        await Promise.all(logPromises);
        return { updated: updatedCount };
    }
    /**
     * 自动取消过期订单
     */
    static async cancelExpiredOrders() {
        // 24小时前的时间
        const expiredTime = new Date();
        expiredTime.setHours(expiredTime.getHours() - 24);
        const expiredOrders = await Order_1.OrderModel.findAll({
            where: {
                status: 'pending',
                created_at: {
                    [sequelize_1.Op.lt]: expiredTime
                }
            }
        });
        if (expiredOrders.length === 0) {
            return 0;
        }
        // 批量更新为失败状态
        await Order_1.OrderModel.update({
            status: 'failed',
            admin_note: '订单超时自动取消'
        }, {
            where: {
                id: { [sequelize_1.Op.in]: expiredOrders.map(o => o.id) }
            }
        });
        return expiredOrders.length;
    }
}
exports.OrderService = OrderService;
