'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('merchants', 'alipay_account', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: '支付宝账号'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('merchants', 'alipay_account');
  }
};
