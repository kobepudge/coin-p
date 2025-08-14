"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationLogModel = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("@/config/database");
// 操作日志模型类
class OperationLogModel extends sequelize_1.Model {
    // 静态方法：记录操作日志
    static async logOperation(adminId, action, targetType, targetId, details, ipAddress, userAgent) {
        return this.create({
            admin_id: adminId,
            action,
            target_type: targetType,
            target_id: targetId,
            details,
            ip_address: ipAddress,
            user_agent: userAgent
        });
    }
    // 实例方法
    getActionDescription() {
        const actionMap = {
            'login': '登录系统',
            'logout': '退出系统',
            'create_merchant': '创建商家',
            'update_merchant': '更新商家',
            'delete_merchant': '删除商家',
            'create_order': '创建订单',
            'update_order': '更新订单',
            'process_order': '处理订单',
            'create_admin': '创建管理员',
            'update_admin': '更新管理员',
            'delete_admin': '删除管理员',
            'change_password': '修改密码'
        };
        return actionMap[this.action] || this.action;
    }
    getTargetDescription() {
        const typeMap = {
            'merchant': '商家',
            'order': '订单',
            'admin': '管理员'
        };
        return typeMap[this.target_type] || this.target_type;
    }
}
exports.OperationLogModel = OperationLogModel;
// 定义模型
OperationLogModel.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '日志ID'
    },
    admin_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        comment: '管理员ID',
        references: {
            model: 'admins',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    action: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        comment: '操作动作',
        validate: {
            len: [1, 100]
        }
    },
    target_type: {
        type: sequelize_1.DataTypes.ENUM('merchant', 'order', 'admin'),
        allowNull: false,
        comment: '目标类型'
    },
    target_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        comment: '目标ID'
    },
    details: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
        comment: '操作详情'
    },
    ip_address: {
        type: sequelize_1.DataTypes.STRING(45),
        allowNull: true,
        comment: 'IP地址',
        validate: {
            len: [0, 45]
        }
    },
    user_agent: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
        comment: '用户代理'
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
        comment: '创建时间'
    }
}, {
    sequelize: database_1.sequelize,
    modelName: 'OperationLog',
    tableName: 'operation_logs',
    timestamps: false, // 只需要created_at
    underscored: true,
    paranoid: false,
    indexes: [
        {
            fields: ['admin_id']
        },
        {
            fields: ['action']
        },
        {
            fields: ['target_type']
        },
        {
            fields: ['created_at']
        }
    ]
});
