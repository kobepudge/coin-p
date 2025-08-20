"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantModel = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("@/config/database");
// 商家模型类
class MerchantModel extends sequelize_1.Model {
    // 实例方法
    isSeller() {
        return this.type === 'seller';
    }
    isBuyer() {
        return this.type === 'buyer';
    }
    isOnline() {
        return this.status === 'online';
    }
    isCurrentSeller() {
        return this.is_current_seller === true;
    }
    isActive() {
        return this.status === 'online';
    }
    // 更新排序权重
    async updateSortOrder(newOrder) {
        this.sort_order = newOrder;
        await this.save();
    }
    // 设置为当前出货商家
    async setAsCurrent() {
        if (this.type === 'seller') {
            this.is_current_seller = true;
            await this.save();
        }
    }
    // 安全的JSON序列化
    toSafeJSON() {
        return this.toJSON();
    }
}
exports.MerchantModel = MerchantModel;
// 定义模型
MerchantModel.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '商家ID'
    },
    name: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        comment: '商家名称',
        validate: {
            len: [1, 100]
        }
    },
    type: {
        type: sequelize_1.DataTypes.ENUM('seller', 'buyer'),
        allowNull: false,
        comment: '商家类型：seller出货/buyer收货'
    },
    price: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        comment: '价格',
        validate: {
            len: [1, 50]
        }
    },
    trade_method: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        comment: '交易方式',
        validate: {
            len: [1, 100]
        }
    },
    stock_or_demand: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        comment: '库存量或需求量',
        validate: {
            len: [1, 100]
        }
    },
    speed: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        comment: '发货速度或结算速度',
        validate: {
            len: [1, 100]
        }
    },
    guarantee: {
        type: sequelize_1.DataTypes.STRING(200),
        allowNull: true,
        comment: '服务保障',
        validate: {
            len: [0, 200]
        }
    },
    alipay_account: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true,
        comment: '支付宝账号',
        validate: {
            len: [0, 100]
        }
    },
    payment_qr: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: true,
        comment: '收款二维码URL',
        validate: {
            len: [0, 500]
        }
    },
    transfer_game_id: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true,
        comment: '中转游戏ID（收货商家专用）',
        validate: {
            len: [0, 100]
        }
    },
    is_current_seller: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否当前展示的出货商家'
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('online', 'offline'),
        allowNull: false,
        defaultValue: 'online',
        comment: '上线状态'
    },
    sort_order: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '排序权重'
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
    modelName: 'Merchant',
    tableName: 'merchants',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
        {
            fields: ['type']
        },
        {
            fields: ['status']
        },
        {
            fields: ['sort_order']
        },
        {
            fields: ['is_current_seller']
        }
    ],
    hooks: {
        // 确保只有一个出货商家被设为当前展示
        beforeSave: async (merchant, options) => {
            if (merchant.type === 'seller' && merchant.is_current_seller) {
                await MerchantModel.update({ is_current_seller: false }, {
                    where: {
                        type: 'seller',
                        id: { [sequelize_1.Op.ne]: merchant.id }
                    },
                    transaction: options.transaction
                });
            }
        }
    }
});
// Model exported as default export only
