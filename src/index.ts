// 必须在所有其他导入之前注册路径别名
import 'module-alias/register'
import dotenv from 'dotenv'
import app from './app'
import { testConnection, syncDatabase } from './config/database'
import { connectRedis } from './config/redis'
import { logger } from './utils/logger'
// import { seedMerchants } from './seeds/merchants'
// import { seedOrders } from './seeds/orders'
import { SchedulerService } from './utils/scheduler'

// 加载环境变量
dotenv.config()

const PORT = process.env.PORT || 3000

// 启动服务器
async function startServer() {
  try {
    // 先启动HTTP服务器
    const server = app.listen(PORT, () => {
      logger.info(`🚀 服务器启动成功`)
      logger.info(`📡 API地址: http://localhost:${PORT}`)
      logger.info(`🌍 环境: ${process.env.NODE_ENV || 'development'}`)
      logger.info(`📊 健康检查: http://localhost:${PORT}/api/health`)
    })

    // 异步初始化数据库和Redis（不阻塞服务器启动）
    setTimeout(() => {
      initializeServices()
    }, 1000)
  
  async function initializeServices() {
    // 连接数据库
    try {
      logger.info('正在连接数据库...')
      logger.info(`数据库连接信息: host=${process.env.DB_HOST}, port=${process.env.DB_PORT}, database=${process.env.DB_NAME}`)
      await testConnection()
      logger.info('✅ 数据库连接成功')
      
      // 同步数据库模型
      logger.info('正在同步数据库模型...')
      await syncDatabase()
      logger.info('✅ 数据库模型同步完成')
      
      // 初始化种子数据
      if (process.env.NODE_ENV === 'development') {
        // await seedMerchants()
        // await seedOrders()
      }
    } catch (error) {
      logger.error('❌ 数据库初始化失败，但服务器继续运行:', error)
      logger.error('数据库错误详情:', {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        error: error instanceof Error ? error.message : String(error)
      })
    }
    
    // 连接Redis
    try {
      logger.info('正在连接Redis...')
      logger.info(`Redis连接信息: host=${process.env.REDIS_HOST}, port=${process.env.REDIS_PORT}`)
      await connectRedis()
      logger.info('✅ Redis连接成功')
    } catch (error) {
      logger.warn('❌ Redis连接失败，某些功能可能受影响:', error)
      logger.warn('Redis错误详情:', {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        error: error instanceof Error ? error.message : String(error)
      })
    }
    
    // 启动定时任务
    try {
      SchedulerService.startAll()
      logger.info('✅ 定时任务启动完成')
    } catch (error) {
      logger.warn('❌ 定时任务启动失败:', error)
    }
  }

    // 优雅关闭处理
    const gracefulShutdown = (signal: string) => {
      logger.info(`收到${signal}信号，开始优雅关闭服务器...`)
      
      server.close(async (err) => {
        if (err) {
          logger.error('服务器关闭时出错:', err)
          process.exit(1)
        }
        
        try {
          // 关闭数据库连接
          const { sequelize } = await import('./config/database')
          await sequelize.close()
          logger.info('数据库连接已关闭')
          
          // 停止定时任务
          SchedulerService.stopAll()
          
          // 关闭Redis连接
          const { redisClient } = await import('./config/redis')
          if (redisClient.isOpen) {
            await redisClient.quit()
            logger.info('Redis连接已关闭')
          }
          
          logger.info('服务器优雅关闭完成')
          process.exit(0)
        } catch (error) {
          logger.error('关闭服务时出错:', error)
          process.exit(1)
        }
      })
    }

    // 监听退出信号
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
    
    // 监听未捕获的异常
    process.on('uncaughtException', (error) => {
      logger.error('未捕获的异常:', error)
      process.exit(1)
    })
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('未处理的Promise拒绝:', { reason, promise })
      process.exit(1)
    })

  } catch (error: any) {
    logger.error('服务器启动失败:', error)
    process.exit(1)
  }
}

// 启动应用
startServer()