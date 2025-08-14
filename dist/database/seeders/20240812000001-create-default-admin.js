'use strict';
const bcrypt = require('bcrypt');
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 创建默认超级管理员
        const hashedPassword = await bcrypt.hash('admin123', 12);
        await queryInterface.bulkInsert('admins', [
            {
                username: 'admin',
                password: hashedPassword,
                real_name: '超级管理员',
                role: 'super_admin',
                permissions: JSON.stringify({
                    merchant_manage: true,
                    order_manage: true,
                    admin_manage: true,
                    system_config: true
                }),
                status: 'active',
                created_at: new Date(),
                updated_at: new Date()
            }
        ], {
            updateOnDuplicate: ['real_name', 'role', 'permissions', 'updated_at']
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('admins', {
            username: 'admin'
        }, {});
    }
};
