"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedMerchants = void 0;
const Merchant_1 = require("@/models/Merchant");
const logger_1 = require("@/utils/logger");
const seedMerchants = async () => {
    try {
        // 检查是否已有商家数据
        const existingCount = await Merchant_1.MerchantModel.count();
        if (existingCount > 0) {
            logger_1.logger.info('商家数据已存在，跳过种子数据创建');
            return;
        }
        // 创建示例商家数据
        const merchants = [
            // 出货商家
            {
                name: '金币速递',
                type: 'seller',
                price: '0.85/万金',
                trade_method: '游戏内直接交易',
                stock_or_demand: '库存充足 500万+',
                speed: '5-15分钟到账',
                guarantee: '7*24小时在线客服，支持退换',
                payment_qr: null,
                transfer_game_id: null,
                is_current_seller: true, // 设为当前出货商家
                status: 'online',
                sort_order: 100
            },
            {
                name: '极速金币',
                type: 'seller',
                price: '0.88/万金',
                trade_method: '邮件发送',
                stock_or_demand: '库存300万+',
                speed: '10-30分钟到账',
                guarantee: '品质保证，假一赔十',
                payment_qr: null,
                transfer_game_id: null,
                is_current_seller: false,
                status: 'online',
                sort_order: 90
            },
            {
                name: '稳定金币',
                type: 'seller',
                price: '0.90/万金',
                trade_method: '拍卖行交易',
                stock_or_demand: '库存200万+',
                speed: '15-30分钟到账',
                guarantee: '老店经营，信誉保证',
                payment_qr: null,
                transfer_game_id: null,
                is_current_seller: false,
                status: 'online',
                sort_order: 80
            },
            // 收货商家
            {
                name: '高价回收',
                type: 'buyer',
                price: '0.75/万金',
                trade_method: '游戏内直接收购',
                stock_or_demand: '大量收购 1000万+',
                speed: '当面验货，当场结算',
                guarantee: '价格公道，信誉第一',
                payment_qr: 'https://example.com/qr1.jpg',
                transfer_game_id: 'GameID123456',
                is_current_seller: false,
                status: 'online',
                sort_order: 70
            },
            {
                name: '诚信回收',
                type: 'buyer',
                price: '0.72/万金',
                trade_method: '邮件交易',
                stock_or_demand: '长期收购 500万+',
                speed: '确认后1小时内付款',
                guarantee: '微信/支付宝秒到账',
                payment_qr: 'https://example.com/qr2.jpg',
                transfer_game_id: 'GameID789012',
                is_current_seller: false,
                status: 'online',
                sort_order: 60
            },
            {
                name: '专业回收',
                type: 'buyer',
                price: '0.78/万金',
                trade_method: '中转账号交易',
                stock_or_demand: '每日收购 200万+',
                speed: '24小时内完成交易',
                guarantee: '专业团队，安全可靠',
                payment_qr: 'https://example.com/qr3.jpg',
                transfer_game_id: 'GameID345678',
                is_current_seller: false,
                status: 'online',
                sort_order: 50
            }
        ];
        // 批量创建商家
        await Merchant_1.MerchantModel.bulkCreate(merchants);
        logger_1.logger.info(`成功创建 ${merchants.length} 个示例商家`);
        // 统计信息
        const stats = {
            total: merchants.length,
            sellers: merchants.filter(m => m.type === 'seller').length,
            buyers: merchants.filter(m => m.type === 'buyer').length
        };
        logger_1.logger.info('商家统计:', stats);
    }
    catch (error) {
        logger_1.logger.error('创建商家种子数据失败:', error);
        throw error;
    }
};
exports.seedMerchants = seedMerchants;
