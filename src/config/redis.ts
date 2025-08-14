import { createClient } from 'redis'
import dotenv from 'dotenv'
import { logger } from '../utils/logger'

// 加载环境变量
dotenv.config()

// Redis配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0')
}

// 创建Redis客户端
export const redisClient = createClient({
  socket: {
    host: redisConfig.host,
    port: redisConfig.port
  },
  password: redisConfig.password || undefined,
  database: redisConfig.db
})

// Redis连接事件
redisClient.on('connect', () => {
  logger.info('Redis连接成功')
})

redisClient.on('error', (error) => {
  logger.error('Redis连接错误:', error)
})

redisClient.on('ready', () => {
  logger.info('Redis准备就绪')
})

redisClient.on('end', () => {
  logger.info('Redis连接断开')
})

// 连接Redis
export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect()
  } catch (error) {
    logger.error('Redis连接失败:', error)
    throw error
  }
}

// Redis工具函数
export const redisUtils = {
  // 设置缓存
  set: async (key: string, value: any, ttl?: number): Promise<void> => {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
      if (ttl) {
        await redisClient.setEx(key, ttl, stringValue)
      } else {
        await redisClient.set(key, stringValue)
      }
    } catch (error) {
      logger.error('Redis设置缓存失败:', error)
      throw error
    }
  },

  // 获取缓存
  get: async <T = any>(key: string): Promise<T | null> => {
    try {
      const value = await redisClient.get(key)
      if (!value) return null
      
      try {
        return JSON.parse(value)
      } catch {
        return value as T
      }
    } catch (error) {
      logger.error('Redis获取缓存失败:', error)
      return null
    }
  },

  // 删除缓存
  del: async (key: string): Promise<void> => {
    try {
      await redisClient.del(key)
    } catch (error) {
      logger.error('Redis删除缓存失败:', error)
      throw error
    }
  },

  // 检查key是否存在
  exists: async (key: string): Promise<boolean> => {
    try {
      const result = await redisClient.exists(key)
      return result === 1
    } catch (error) {
      logger.error('Redis检查key存在性失败:', error)
      return false
    }
  },

  // 设置过期时间
  expire: async (key: string, seconds: number): Promise<void> => {
    try {
      await redisClient.expire(key, seconds)
    } catch (error) {
      logger.error('Redis设置过期时间失败:', error)
      throw error
    }
  },

  // 获取所有匹配的key
  keys: async (pattern: string): Promise<string[]> => {
    try {
      return await redisClient.keys(pattern)
    } catch (error) {
      logger.error('Redis获取keys失败:', error)
      return []
    }
  }
}