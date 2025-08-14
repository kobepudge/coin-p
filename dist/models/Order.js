"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderModel = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("@/config/database");
// 订单模型类
class OrderModel extends sequelize_1.Model {
    // 实例方法
    isPending() {
        return this.status === 'pending';
    }
    isCompleted() {
        return this.status === 'completed';
    }
    isFailed() {
        return this.status === 'failed';
    }
    isRejected() {
        return this.status === 'rejected';
    }
    canProcess() {
        return this.status === 'pending';
    }
    async markAsCompleted(note) {
        this.status = 'completed';
        if (note)
            this.admin_note = note;
        await this.save();
    }
    async markAsFailed(note) {
        this.status = 'failed';
        if (note)
            this.admin_note = note;
        await this.save();
    }
    async markAsRejected(note) {
        this.status = 'rejected';
        if (note)
            this.admin_note = note;
        await this.save();
    }
    // 获取状态中文描述
    getStatusText() {
        const statusMap = {
            pending: '待处理',
            processing: '处理中',
            completed: '已完成',
            failed: '失败',
            cancelled: '已取消',
            rejected: '已拒绝'
        };
        return statusMap[this.status] || this.status;
    }
    // 检查是否可以取消
    canCancel() {
        return this.status === 'pending';
    }
    // 安全的JSON序列化
    toSafeJSON() {
        return this.toJSON();
    }
}
exports.OrderModel = OrderModel;
// 定义模型
OrderModel.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '订单ID'
    },
    merchant_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        comment: '关联商家ID',
        references: {
            model: 'merchants',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    player_game_id: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        comment: '玩家游戏ID',
        validate: {
            len: [1, 100]
        }
    },
    payment_qr_url: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: false,
        comment: '玩家收款二维码URL',
        validate: {
            len: [1, 500]
        }
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
        comment: '订单状态'
    },
    admin_note: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
        comment: '管理员备注'
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
        comment: '创建时间'
    },
    updated_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
        comment: '更新时间'
    }
}, {
    sequelize: database_1.sequelize,
    modelName: 'Order',
    tableName: 'orders',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
        {
            fields: ['merchant_id']
        },
        {
            fields: ['status']
        },
        {
            fields: ['created_at']
        },
        {
            fields: ['player_game_id']
        }
    ]
});
// Model exported as default export only
