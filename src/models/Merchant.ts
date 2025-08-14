import { DataTypes, Model, Optional, Op } from 'sequelize'
import { sequelize } from '@/config/database'
import type { Merchant } from '@/types'

// 创建时的可选字段
interface MerchantCreationAttributes extends Optional<Merchant, 'id' | 'created_at' | 'updated_at' | 'is_current_seller' | 'sort_order'> {}

// 商家模型类
export class MerchantModel extends Model<Merchant, MerchantCreationAttributes> implements Merchant {
  public id!: number
  public name!: string
  public type!: 'seller' | 'buyer'
  public price!: string
  public trade_method!: string
  public stock_or_demand!: string
  public speed!: string
  public guarantee?: string
  public payment_qr?: string
  public transfer_game_id?: string
  public is_current_seller!: boolean
  public status!: 'online' | 'offline'
  public sort_order!: number
  public created_at!: Date
  public updated_at!: Date

  // 关联模型
  public orders?: any[]

  // 实例方法
  public isSeller(): boolean {
    return this.type === 'seller'
  }

  public isBuyer(): boolean {
    return this.type === 'buyer'
  }

  public isOnline(): boolean {
    return this.status === 'online'
  }

  public isCurrentSeller(): boolean {
    return this.is_current_seller === true
  }

  public isActive(): boolean {
    return this.status === 'online'
  }

  // 更新排序权重
  public async updateSortOrder(newOrder: number): Promise<void> {
    this.sort_order = newOrder
    await this.save()
  }

  // 设置为当前出货商家
  public async setAsCurrent(): Promise<void> {
    if (this.type === 'seller') {
      this.is_current_seller = true
      await this.save()
    }
  }

  // 安全的JSON序列化
  public toSafeJSON(): Omit<Merchant, never> {
    return this.toJSON()
  }
}

// 定义模型
MerchantModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: '商家ID'
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '商家名称',
      validate: {
        len: [1, 100]
      }
    },
    type: {
      type: DataTypes.ENUM('seller', 'buyer'),
      allowNull: false,
      comment: '商家类型：seller出货/buyer收货'
    },
    price: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '价格',
      validate: {
        len: [1, 50]
      }
    },
    trade_method: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '交易方式',
      validate: {
        len: [1, 100]
      }
    },
    stock_or_demand: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '库存量或需求量',
      validate: {
        len: [1, 100]
      }
    },
    speed: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '发货速度或结算速度',
      validate: {
        len: [1, 100]
      }
    },
    guarantee: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '服务保障',
      validate: {
        len: [0, 200]
      }
    },
    payment_qr: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '收款二维码URL',
      validate: {
        len: [0, 500]
      }
    },
    transfer_game_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '中转游戏ID（收货商家专用）',
      validate: {
        len: [0, 100]
      }
    },
    is_current_seller: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否当前展示的出货商家'
    },
    status: {
      type: DataTypes.ENUM('online', 'offline'),
      allowNull: false,
      defaultValue: 'online',
      comment: '上线状态'
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '排序权重'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '创建时间'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '更新时间'
    }
  },
  {
    sequelize,
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
          await MerchantModel.update(
            { is_current_seller: false },
            { 
              where: { 
                type: 'seller',
                id: { [Op.ne]: merchant.id }
              },
              transaction: options.transaction
            }
          )
        }
      }
    }
  }
)

// Model exported as default export only