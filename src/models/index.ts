import { Sequelize } from 'sequelize'
import { sequelize } from '../config/database'
import { AdminModel } from './Admin'
import { MerchantModel } from './Merchant'
import { OrderModel } from './Order'
import { OperationLogModel } from './OperationLog'

// 导出模型
export { AdminModel as Admin }
export { MerchantModel as Merchant }
export { OrderModel as Order }
export { OperationLogModel as OperationLog }

// 建立模型关联
export const setupAssociations = () => {
  // 管理员关联
  AdminModel.hasMany(AdminModel, { 
    foreignKey: 'parent_id',
    as: 'children'
  })
  AdminModel.belongsTo(AdminModel, { 
    foreignKey: 'parent_id',
    as: 'parent'
  })

  // 订单关联商家
  OrderModel.belongsTo(MerchantModel, {
    foreignKey: 'merchant_id',
    as: 'merchant'
  })
  MerchantModel.hasMany(OrderModel, {
    foreignKey: 'merchant_id',
    as: 'orders'
  })

  // 操作日志关联管理员
  OperationLogModel.belongsTo(AdminModel, {
    foreignKey: 'admin_id',
    as: 'admin'
  })
  AdminModel.hasMany(OperationLogModel, {
    foreignKey: 'admin_id',
    as: 'operationLogs'
  })
}

// 初始化模型关联
setupAssociations()

// 导出sequelize实例
export { sequelize }

// 同步数据库
export const syncModels = async () => {
  await sequelize.sync({ alter: process.env.NODE_ENV === 'development' })
}