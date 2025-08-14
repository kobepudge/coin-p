import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '@/config/database'
import type { Admin, AdminPermissions } from '@/types'

// 创建时的可选字段
interface AdminCreationAttributes extends Optional<Admin, 'id' | 'created_at' | 'updated_at' | 'last_login_at'> {}

// 管理员模型类
export class AdminModel extends Model<Admin, AdminCreationAttributes> implements Admin {
  public id!: number
  public username!: string
  public password!: string
  public real_name!: string
  public email?: string
  public role!: 'super_admin' | 'admin'
  public permissions!: AdminPermissions
  public parent_id?: number
  public status!: 'active' | 'inactive'
  public last_login_at?: Date
  public created_at!: Date
  public updated_at!: Date

  // 关联模型
  public parent?: AdminModel
  public children?: AdminModel[]
  public operationLogs?: any[]

  // 实例方法
  public hasPermission(permission: keyof AdminPermissions): boolean {
    if (this.role === 'super_admin') return true
    return this.permissions[permission] === true
  }

  public isSuperAdmin(): boolean {
    return this.role === 'super_admin'
  }

  public toSafeJSON(): Omit<Admin, 'password'> {
    const { password, ...safeData } = this.toJSON()
    return safeData
  }
}

// 定义模型
AdminModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: '管理员ID'
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '登录用户名',
      validate: {
        len: [3, 50],
        isAlphanumeric: {
          msg: '用户名只能包含字母、数字和下划线'
        }
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '加密密码'
    },
    real_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '真实姓名',
      validate: {
        len: [1, 100]
      }
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '邮箱',
      validate: {
        isEmail: {
          msg: '邮箱格式不正确'
        }
      }
    },
    role: {
      type: DataTypes.ENUM('super_admin', 'admin'),
      allowNull: false,
      defaultValue: 'admin',
      comment: '角色'
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        merchant_manage: false,
        order_manage: false,
        admin_manage: false,
        system_config: false
      },
      comment: '权限配置'
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '创建者ID',
      references: {
        model: 'admins',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
      comment: '状态'
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '最后登录时间'
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
    modelName: 'Admin',
    tableName: 'admins',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
      {
        fields: ['username']
      },
      {
        fields: ['parent_id']
      },
      {
        fields: ['status']
      }
    ]
  }
)

// Model exported as default export only