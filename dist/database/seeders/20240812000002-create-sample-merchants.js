'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.bulkInsert('merchants', [
            // 出货商家
            {
                name: '金币小店',
                type: 'seller',
                price: '0.95元/G',
                trade_method: '录像-邮寄',
                stock_or_demand: '500-5000G',
                speed: '24小时内发货',
                guarantee: '担保交易，7天无条件退款',
                payment_qr: null,
                transfer_game_id: null,
                is_current_seller: true,
                status: 'online',
                sort_order: 1,
                created_at: new Date(),
                updated_at: new Date()
            },
            // 收货商家
            {
                name: '信誉收购',
                type: 'buyer',
                price: '0.90元/G',
                trade_method: '即时-当面',
                stock_or_demand: '1000-10000G',
                speed: '保证：24小时',
                guarantee: '押金 > 10000',
                payment_qr: null,
                transfer_game_id: 'buyer001',
                is_current_seller: false,
                status: 'online',
                sort_order: 2,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                name: '快速回收',
                type: 'buyer',
                price: '0.88元/G',
                trade_method: '录像-交易',
                stock_or_demand: '500-8000G',
                speed: '保证：12小时',
                guarantee: '担保',
                payment_qr: null,
                transfer_game_id: 'buyer002',
                is_current_seller: false,
                status: 'online',
                sort_order: 3,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                name: '专业收购',
                type: 'buyer',
                price: '0.92元/G',
                trade_method: '即时-当面',
                stock_or_demand: '2000-15000G',
                speed: '保证：6小时',
                guarantee: '押金 > 20000',
                payment_qr: null,
                transfer_game_id: 'buyer003',
                is_current_seller: false,
                status: 'online',
                sort_order: 4,
                created_at: new Date(),
                updated_at: new Date()
            }
        ], {
            updateOnDuplicate: ['name', 'price', 'stock_or_demand', 'speed', 'guarantee', 'updated_at']
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('merchants', null, {});
    }
};
