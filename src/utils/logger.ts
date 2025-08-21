import winston from 'winston'
import path from 'path'
import fs from 'fs'

// 确保日志目录存在
const logDir = process.env.LOG_DIR || 'logs'
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

// 日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

// 安全的JSON序列化函数，处理循环引用
const safeStringify = (obj: any, space?: number): string => {
  const seen = new WeakSet()
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]'
      }
      seen.add(value)
    }
    return value
  }, space)
}

// 控制台输出格式
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let logMessage = `${timestamp} [${level}]: ${message}`

    // 添加错误堆栈
    if (stack) {
      logMessage += `\n${stack}`
    }

    // 添加额外元数据，使用安全的JSON序列化
    if (Object.keys(meta).length > 0) {
      try {
        logMessage += `\n${safeStringify(meta, 2)}`
      } catch (error) {
        logMessage += `\n[Error serializing meta data: ${error}]`
      }
    }

    return logMessage
  })
)

// 创建logger实例
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'coin-trading-api' },
  transports: [
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // 组合日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  ]
})

// 开发环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }))
}

// HTTP请求日志格式
export const httpLogFormat = (tokens: any, req: any, res: any) => {
  const logData = {
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: tokens.status(req, res),
    responseTime: tokens['response-time'](req, res) + 'ms',
    contentLength: tokens.res(req, res, 'content-length'),
    userAgent: tokens['user-agent'](req, res),
    ip: req.ip || req.connection?.remoteAddress
  }
  
  return JSON.stringify(logData)
}

// 记录请求日志的中间件
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent') || '',
      contentLength: res.get('content-length') || 0
    }
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData)
    } else {
      logger.info('HTTP Request', logData)
    }
  })
  
  next()
}

// 错误日志记录函数
export const logError = (error: Error, context?: any) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    context: context || {}
  })
}

// 操作日志记录函数
export const logOperation = (operation: string, adminId: number, details?: any) => {
  logger.info('Admin Operation', {
    operation,
    adminId,
    details: details || {},
    timestamp: new Date().toISOString()
  })
}