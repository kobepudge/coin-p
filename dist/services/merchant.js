"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantService = void 0;
const Merchant_1 = require("@/models/Merchant");
const error_1 = require("@/middlewares/error");
const constants_1 = require("@/constants");
const operationLog_1 = require("@/services/operationLog");
const sequelize_1 = require("sequelize");
class MerchantService {
    /**
     * 获取商家列表
     */
    static async getMerchants(options = {}) {
        const { type, status, page = 1, limit = 20, search } = options;
        const where = {};
        // 筛选条件
        if (type) {
            where.type = type;
        }
        if (status) {
            where.status = status;
        }
        // 搜索
        if (search) {
            where[sequelize_1.Op.or] = [
                { name: { [sequelize_1.Op.like]: `%${search}%` } },
                { trade_method: { [sequelize_1.Op.like]: `%${search}%` } },
                { guarantee: { [sequelize_1.Op.like]: `%${search}%` } }
            ];
        }
        const offset = (page - 1) * limit;
        const { rows: merchants, count: total } = await Merchant_1.MerchantModel.findAndCountAll({
            where,
            order: [
                ['is_current_seller', 'DESC'], // 当前出货商家优先
                ['sort_order', 'DESC'], // 按权重排序
                ['created_at', 'DESC'] // 最新创建的优先
            ],
            limit,
            offset
        });
        return {
            merchants: merchants.map(m => m.toSafeJSON()),
            total,
            page,
            limit
        };
    }
    /**
     * 获取商家详情
     */
    static async getMerchantById(id) {
        const merchant = await Merchant_1.MerchantModel.findByPk(id);
        if (!merchant) {
            throw new error_1.AppError('商家不存在', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        return merchant.toSafeJSON();
    }
    /**
     * 创建商家
     */
    static async createMerchant(merchantData, operatorId, ipAddress, userAgent) {
        // 检查商家名称是否重复
        const existingMerchant = await Merchant_1.MerchantModel.findOne({
            where: { name: merchantData.name }
        });
        if (existingMerchant) {
            throw new error_1.AppError('商家名称已存在', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const merchant = await Merchant_1.MerchantModel.create(merchantData);
        // 记录操作日志
        await operationLog_1.OperationLogService.log({
            admin_id: operatorId,
            action: 'merchant_create',
            target_type: 'merchant',
            target_id: merchant.id,
            details: `创建商家: ${merchant.name}`,
            ip_address: ipAddress,
            user_agent: userAgent
        });
        return merchant.toSafeJSON();
    }
    /**
     * 更新商家信息
     */
    static async updateMerchant(id, updateData, operatorId, ipAddress, userAgent) {
        const merchant = await Merchant_1.MerchantModel.findByPk(id);
        if (!merchant) {
            throw new error_1.AppError('商家不存在', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        // 如果更新商家名称，检查是否重复
        if (updateData.name && updateData.name !== merchant.name) {
            const existingMerchant = await Merchant_1.MerchantModel.findOne({
                where: {
                    name: updateData.name,
                    id: { [sequelize_1.Op.ne]: id }
                }
            });
            if (existingMerchant) {
                throw new error_1.AppError('商家名称已存在', constants_1.HTTP_STATUS.BAD_REQUEST);
            }
        }
        const oldData = { ...merchant.toJSON() };
        await merchant.update(updateData);
        // 记录操作日志
        await operationLog_1.OperationLogService.log({
            admin_id: operatorId,
            action: 'merchant_update',
            target_type: 'merchant',
            target_id: id,
            details: `更新商家: ${merchant.name}`,
            old_data: oldData,
            new_data: merchant.toJSON(),
            ip_address: ipAddress,
            user_agent: userAgent
        });
        return merchant.toSafeJSON();
    }
    /**
     * 删除商家
     */
    static async deleteMerchant(id, operatorId, ipAddress, userAgent) {
        const merchant = await Merchant_1.MerchantModel.findByPk(id);
        if (!merchant) {
            throw new error_1.AppError('商家不存在', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        // 检查是否有关联的未完成订单
        // TODO: 添加订单检查逻辑
        const merchantData = { ...merchant.toJSON() };
        await merchant.destroy();
        // 记录操作日志
        await operationLog_1.OperationLogService.log({
            admin_id: operatorId,
            action: 'merchant_delete',
            target_type: 'merchant',
            target_id: id,
            details: `删除商家: ${merchantData.name}`,
            old_data: merchantData,
            ip_address: ipAddress,
            user_agent: userAgent
        });
    }
    /**
     * 批量更新商家状态
     */
    static async batchUpdateStatus(ids, status, operatorId, ipAddress, userAgent) {
        const merchants = await Merchant_1.MerchantModel.findAll({
            where: { id: { [sequelize_1.Op.in]: ids } }
        });
        if (merchants.length !== ids.length) {
            throw new error_1.AppError('部分商家不存在', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        await Merchant_1.MerchantModel.update({ status }, { where: { id: { [sequelize_1.Op.in]: ids } } });
        // 记录操作日志
        await operationLog_1.OperationLogService.log({
            admin_id: operatorId,
            action: 'merchant_batch_update_status',
            target_type: 'merchant',
            target_id: ids.join(','),
            details: `批量更新商家状态为: ${status}，影响 ${ids.length} 个商家`,
            new_data: { status, merchant_ids: ids },
            ip_address: ipAddress,
            user_agent: userAgent
        });
    }
    /**
     * 设置当前出货商家
     */
    static async setCurrentSeller(id, operatorId, ipAddress, userAgent) {
        const merchant = await Merchant_1.MerchantModel.findByPk(id);
        if (!merchant) {
            throw new error_1.AppError('商家不存在', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        if (merchant.type !== 'seller') {
            throw new error_1.AppError('只有出货商家可以设置为当前商家', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        if (!merchant.isOnline()) {
            throw new error_1.AppError('只有在线商家可以设置为当前商家', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        await merchant.setAsCurrent();
        // 记录操作日志
        await operationLog_1.OperationLogService.log({
            admin_id: operatorId,
            action: 'merchant_set_current',
            target_type: 'merchant',
            target_id: id,
            details: `设置商家 ${merchant.name} 为当前出货商家`,
            ip_address: ipAddress,
            user_agent: userAgent
        });
    }
    /**
     * 更新商家排序
     */
    static async updateMerchantOrder(orders, operatorId, ipAddress, userAgent) {
        const ids = orders.map(o => o.id);
        const merchants = await Merchant_1.MerchantModel.findAll({
            where: { id: { [sequelize_1.Op.in]: ids } }
        });
        if (merchants.length !== ids.length) {
            throw new error_1.AppError('部分商家不存在', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // 批量更新排序
        for (const order of orders) {
            await Merchant_1.MerchantModel.update({ sort_order: order.sort_order }, { where: { id: order.id } });
        }
        // 记录操作日志
        await operationLog_1.OperationLogService.log({
            admin_id: operatorId,
            action: 'merchant_update_order',
            target_type: 'merchant',
            target_id: ids.join(','),
            details: `更新商家排序，影响 ${orders.length} 个商家`,
            new_data: { orders },
            ip_address: ipAddress,
            user_agent: userAgent
        });
    }
    /**
     * 获取活跃商家统计
     */
    static async getActiveMerchantStats() {
        const [total, sellers, buyers, online, offline] = await Promise.all([
            Merchant_1.MerchantModel.count(),
            Merchant_1.MerchantModel.count({ where: { type: 'seller' } }),
            Merchant_1.MerchantModel.count({ where: { type: 'buyer' } }),
            Merchant_1.MerchantModel.count({ where: { status: 'online' } }),
            Merchant_1.MerchantModel.count({ where: { status: 'offline' } })
        ]);
        return {
            total,
            sellers,
            buyers,
            online,
            offline
        };
    }
    /**
     * 获取前端显示的商家列表（公开接口）
     */
    static async getPublicMerchants(type) {
        const merchants = await Merchant_1.MerchantModel.findAll({
            where: {
                type,
                status: 'online'
            },
            order: [
                ['is_current_seller', 'DESC'],
                ['sort_order', 'DESC'],
                ['created_at', 'DESC']
            ]
        });
        return merchants.map(m => m.toSafeJSON());
    }
    /**
     * 获取当前出货商家
     */
    static async getCurrentSeller() {
        const merchant = await Merchant_1.MerchantModel.findOne({
            where: {
                type: 'seller',
                status: 'online',
                is_current_seller: true
            }
        });
        return merchant ? merchant.toSafeJSON() : null;
    }
}
exports.MerchantService = MerchantService;
