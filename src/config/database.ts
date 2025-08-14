import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'
import { logger } from '../utils/logger'

// 加载环境变量
dotenv.config()

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'coin_trading',
  username: process.env.DB_USER || 'coin_user',
  password: process.env.DB_PASSWORD || 'coin_pass_2024',
  dialect: 'mysql' as const,
  timezone: '+08:00',
  logging: process.env.NODE_ENV === 'development' ? logger.info.bind(logger) : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    underscoredAll: true,
    paranoid: false
  }
}

// 创建Sequelize实例
export const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    timezone: dbConfig.timezone,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    define: dbConfig.define
  }
)

// 测试数据库连接
export const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate()
    logger.info('数据库连接成功')
  } catch (error) {
    logger.error('数据库连接失败:', error)
    throw error
  }
}

// 同步数据库模型
export const syncDatabase = async (): Promise<void> => {
  try {
    // 导入模型以确保它们被注册
    await import('../models')
    
    await sequelize.sync({ force: false })
    logger.info('数据库模型同步成功')
  } catch (error) {
    logger.error('数据库模型同步失败:', error)
    throw error
  }
}

// Sequelize CLI配置
export default {
  development: {
    ...dbConfig,
    logging: console.log
  },
  test: {
    ...dbConfig,
    database: `${dbConfig.database}_test`,
    logging: false
  },
  production: {
    ...dbConfig,
    logging: false
  }
}