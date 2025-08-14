import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '@/config/database'
import type { OperationLog } from '@/types'

// 创建时的可选字段
interface OperationLogModelCreationAttributes extends Optional<OperationLog, 'id' | 'created_at' | 'updated_at' | 'target_id' | 'details' | 'ip_address' | 'user_agent'> {}

// 操作日志模型类
export class OperationLogModel extends Model<OperationLog, OperationLogModelCreationAttributes> implements OperationLog {
  public id!: number
  public admin_id!: number
  public action!: string
  public target_type!: 'merchant' | 'order' | 'admin'
  public target_id?: number | string
  public details?: Record<string, any>
  public ip_address?: string
  public user_agent?: string
  public created_at!: Date
  public updated_at!: Date

  // 关联模型
  public admin?: any

  // 静态方法：记录操作日志
  public static async logOperation(
    adminId: number,
    action: string,
    targetType: 'merchant' | 'order' | 'admin',
    targetId?: number,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<OperationLogModel> {
    return this.create({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
      ip_address: ipAddress,
      user_agent: userAgent
    })
  }

  // 实例方法
  public getActionDescription(): string {
    const actionMap: Record<string, string> = {
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
    }
    
    return actionMap[this.action] || this.action
  }

  public getTargetDescription(): string {
    const typeMap: Record<string, string> = {
      'merchant': '商家',
      'order': '订单',
      'admin': '管理员'
    }
    
    return typeMap[this.target_type] || this.target_type
  }
}

// 定义模型
OperationLogModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: '日志ID'
    },
    admin_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '管理员ID',
      references: {
        model: 'admins',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '操作动作',
      validate: {
        len: [1, 100]
      }
    },
    target_type: {
      type: DataTypes.ENUM('merchant', 'order', 'admin'),
      allowNull: false,
      comment: '目标类型'
    },
    target_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '目标ID'
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '操作详情'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP地址',
      validate: {
        len: [0, 45]
      }
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '用户代理'
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
    modelName: 'OperationLog',
    tableName: 'operation_logs',
    timestamps: true,
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
  }
)

// Model exported as default export only