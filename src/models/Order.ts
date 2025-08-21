import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '@/config/database'
import type { Order, OrderStatus } from '@/types'

// 创建时的可选字段
interface OrderCreationAttributes extends Optional<Order, 'id' | 'created_at' | 'updated_at' | 'status' | 'admin_note'> {}

// 订单模型类
export class OrderModel extends Model<Order, OrderCreationAttributes> implements Order {
  public id!: number
  public merchant_id!: number
  public player_game_id!: string
  public payment_qr_url!: string
  public transfer_screenshot_url?: string
  public status!: OrderStatus
  public admin_note?: string
  public created_at!: Date
  public updated_at!: Date

  // 关联模型
  public merchant?: any

  // 实例方法
  public isPending(): boolean {
    return this.status === 'pending'
  }

  public isCompleted(): boolean {
    return this.status === 'completed'
  }

  public isFailed(): boolean {
    return this.status === 'failed'
  }

  public isRejected(): boolean {
    return this.status === 'rejected'
  }

  public canProcess(): boolean {
    return this.status === 'pending'
  }

  public async markAsCompleted(note?: string): Promise<void> {
    this.status = 'completed'
    if (note) this.admin_note = note
    await this.save()
  }

  public async markAsFailed(note?: string): Promise<void> {
    this.status = 'failed'
    if (note) this.admin_note = note
    await this.save()
  }

  public async markAsRejected(note?: string): Promise<void> {
    this.status = 'rejected'
    if (note) this.admin_note = note
    await this.save()
  }

  // 获取状态中文描述
  public getStatusText(): string {
    const statusMap: Record<OrderStatus, string> = {
      pending: '待处理',
      processing: '处理中',
      completed: '已完成',
      failed: '失败',
      cancelled: '已取消',
      rejected: '已拒绝'
    }
    return statusMap[this.status] || this.status
  }

  // 检查是否可以取消
  public canCancel(): boolean {
    return this.status === 'pending'
  }

  // 安全的JSON序列化，避免循环引用
  public toSafeJSON(): any {
    const json = this.toJSON() as any

    // 如果包含merchant关联，只保留必要字段，避免循环引用
    if (json.merchant) {
      json.merchant = {
        id: json.merchant.id,
        name: json.merchant.name,
        type: json.merchant.type,
        status: json.merchant.status,
        trade_method: json.merchant.trade_method,
        price: json.merchant.price
      }
    }

    return json
  }
}

// 定义模型
OrderModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: '订单ID'
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '关联商家ID',
      references: {
        model: 'merchants',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    player_game_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '玩家游戏ID',
      validate: {
        len: [1, 100]
      }
    },
    payment_qr_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: '玩家收款二维码URL',
      validate: {
        len: [1, 500]
      }
    },
    transfer_screenshot_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '转账截图URL',
      validate: {
        len: [0, 500]
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
      comment: '订单状态'
    },
    admin_note: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '管理员备注'
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
  }
)

// Model exported as default export only