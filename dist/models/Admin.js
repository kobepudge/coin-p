"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModel = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("@/config/database");
// 管理员模型类
class AdminModel extends sequelize_1.Model {
    // 实例方法
    hasPermission(permission) {
        if (this.role === 'super_admin')
            return true;
        return this.permissions[permission] === true;
    }
    isSuperAdmin() {
        return this.role === 'super_admin';
    }
    toSafeJSON() {
        const { password, ...safeData } = this.toJSON();
        return safeData;
    }
}
exports.AdminModel = AdminModel;
// 定义模型
AdminModel.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '管理员ID'
    },
    username: {
        type: sequelize_1.DataTypes.STRING(50),
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
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        comment: '加密密码'
    },
    real_name: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        comment: '真实姓名',
        validate: {
            len: [1, 100]
        }
    },
    email: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true,
        comment: '邮箱',
        validate: {
            isEmail: {
                msg: '邮箱格式不正确'
            }
        }
    },
    role: {
        type: sequelize_1.DataTypes.ENUM('super_admin', 'admin'),
        allowNull: false,
        defaultValue: 'admin',
        comment: '角色'
    },
    permissions: {
        type: sequelize_1.DataTypes.JSON,
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
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        comment: '创建者ID',
        references: {
            model: 'admins',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
        comment: '状态'
    },
    last_login_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        comment: '最后登录时间'
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
});
// Model exported as default export only
