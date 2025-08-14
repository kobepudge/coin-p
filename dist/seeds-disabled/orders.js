"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedOrders = void 0;
const Order_1 = require("@/models/Order");
const Merchant_1 = require("@/models/Merchant");
const logger_1 = require("@/utils/logger");
const seedOrders = async () => {
    try {
        // 检查是否已有订单数据
        const existingCount = await Order_1.OrderModel.count();
        if (existingCount > 0) {
            logger_1.logger.info('订单数据已存在，跳过种子数据创建');
            return;
        }
        // 获取商家数据
        const merchants = await Merchant_1.MerchantModel.findAll();
        if (merchants.length === 0) {
            logger_1.logger.info('没有商家数据，跳过订单种子数据创建');
            return;
        }
        // 创建示例订单数据
        const orders = [
            // 待处理订单
            {
                merchant_id: merchants[0].id, // 第一个商家
                player_game_id: 'Player001',
                payment_qr_url: 'https://example.com/qr/payment001.jpg',
                status: 'pending',
                admin_note: null,
                created_at: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2小时前
            },
            {
                merchant_id: merchants[1] ? merchants[1].id : merchants[0].id,
                player_game_id: 'Player002',
                payment_qr_url: 'https://example.com/qr/payment002.jpg',
                status: 'pending',
                admin_note: null,
                created_at: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1小时前
            },
            {
                merchant_id: merchants[0].id,
                player_game_id: 'Player003',
                payment_qr_url: 'https://example.com/qr/payment003.jpg',
                status: 'pending',
                admin_note: null,
                created_at: new Date(Date.now() - 30 * 60 * 1000) // 30分钟前
            },
            // 已完成订单
            {
                merchant_id: merchants[0].id,
                player_game_id: 'Player004',
                payment_qr_url: 'https://example.com/qr/payment004.jpg',
                status: 'completed',
                admin_note: '交易完成，金币已发送',
                created_at: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1天前
            },
            {
                merchant_id: merchants[2] ? merchants[2].id : merchants[0].id,
                player_game_id: 'Player005',
                payment_qr_url: 'https://example.com/qr/payment005.jpg',
                status: 'completed',
                admin_note: '收币完成，款项已到账',
                created_at: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12小时前
            },
            {
                merchant_id: merchants[1] ? merchants[1].id : merchants[0].id,
                player_game_id: 'Player006',
                payment_qr_url: 'https://example.com/qr/payment006.jpg',
                status: 'completed',
                admin_note: '交易顺利完成',
                created_at: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6小时前
            },
            // 失败订单
            {
                merchant_id: merchants[0].id,
                player_game_id: 'Player007',
                payment_qr_url: 'https://example.com/qr/payment007.jpg',
                status: 'failed',
                admin_note: '游戏ID不存在，交易失败',
                created_at: new Date(Date.now() - 48 * 60 * 60 * 1000) // 2天前
            },
            {
                merchant_id: merchants[1] ? merchants[1].id : merchants[0].id,
                player_game_id: 'Player008',
                payment_qr_url: 'https://example.com/qr/payment008.jpg',
                status: 'failed',
                admin_note: '支付信息有误，无法完成交易',
                created_at: new Date(Date.now() - 36 * 60 * 60 * 1000) // 1.5天前
            },
            // 被拒绝订单
            {
                merchant_id: merchants[2] ? merchants[2].id : merchants[0].id,
                player_game_id: 'Player009',
                payment_qr_url: 'https://example.com/qr/payment009.jpg',
                status: 'rejected',
                admin_note: '违反交易规则，订单已拒绝',
                created_at: new Date(Date.now() - 72 * 60 * 60 * 1000) // 3天前
            },
            // 今天的订单
            {
                merchant_id: merchants[0].id,
                player_game_id: 'Player010',
                payment_qr_url: 'https://example.com/qr/payment010.jpg',
                status: 'completed',
                admin_note: '今日交易完成',
                created_at: new Date() // 刚刚
            }
        ];
        // 批量创建订单
        await Order_1.OrderModel.bulkCreate(orders);
        logger_1.logger.info(`成功创建 ${orders.length} 个示例订单`);
        // 统计信息
        const stats = {
            total: orders.length,
            pending: orders.filter(o => o.status === 'pending').length,
            completed: orders.filter(o => o.status === 'completed').length,
            failed: orders.filter(o => o.status === 'failed').length,
            rejected: orders.filter(o => o.status === 'rejected').length
        };
        logger_1.logger.info('订单统计:', stats);
    }
    catch (error) {
        logger_1.logger.error('创建订单种子数据失败:', error);
        throw error;
    }
};
exports.seedOrders = seedOrders;
