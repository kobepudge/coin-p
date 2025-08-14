"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncModels = exports.sequelize = exports.setupAssociations = exports.OperationLog = exports.Order = exports.Merchant = exports.Admin = void 0;
const database_1 = require("../config/database");
Object.defineProperty(exports, "sequelize", { enumerable: true, get: function () { return database_1.sequelize; } });
const Admin_1 = require("./Admin");
Object.defineProperty(exports, "Admin", { enumerable: true, get: function () { return Admin_1.AdminModel; } });
const Merchant_1 = require("./Merchant");
Object.defineProperty(exports, "Merchant", { enumerable: true, get: function () { return Merchant_1.MerchantModel; } });
const Order_1 = require("./Order");
Object.defineProperty(exports, "Order", { enumerable: true, get: function () { return Order_1.OrderModel; } });
const OperationLog_1 = require("./OperationLog");
Object.defineProperty(exports, "OperationLog", { enumerable: true, get: function () { return OperationLog_1.OperationLogModel; } });
// 建立模型关联
const setupAssociations = () => {
    // 管理员关联
    Admin_1.AdminModel.hasMany(Admin_1.AdminModel, {
        foreignKey: 'parent_id',
        as: 'children'
    });
    Admin_1.AdminModel.belongsTo(Admin_1.AdminModel, {
        foreignKey: 'parent_id',
        as: 'parent'
    });
    // 订单关联商家
    Order_1.OrderModel.belongsTo(Merchant_1.MerchantModel, {
        foreignKey: 'merchant_id',
        as: 'merchant'
    });
    Merchant_1.MerchantModel.hasMany(Order_1.OrderModel, {
        foreignKey: 'merchant_id',
        as: 'orders'
    });
    // 操作日志关联管理员
    OperationLog_1.OperationLogModel.belongsTo(Admin_1.AdminModel, {
        foreignKey: 'admin_id',
        as: 'admin'
    });
    Admin_1.AdminModel.hasMany(OperationLog_1.OperationLogModel, {
        foreignKey: 'admin_id',
        as: 'operationLogs'
    });
};
exports.setupAssociations = setupAssociations;
// 初始化模型关联
(0, exports.setupAssociations)();
// 同步数据库
const syncModels = async () => {
    await database_1.sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
};
exports.syncModels = syncModels;
