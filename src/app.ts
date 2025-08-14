import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { logger, httpLogFormat, requestLogger } from './utils/logger'
import { errorHandler, notFoundHandler } from './middlewares/error'
import routes from './routes'

// 创建Express应用
const app = express()

// 信任代理
app.set('trust proxy', 1)

// 安全中间件
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))

// CORS配置
const getFrontendUrls = () => {
  const frontendUrl = process.env.FRONTEND_URL
  if (frontendUrl) {
    // 支持多个域名，用逗号分隔
    return frontendUrl.split(',').map(url => url.trim())
  }

  // 默认开发环境域名
  return ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173']
}

const corsOptions = {
  origin: getFrontendUrls(),
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}
app.use(cors(corsOptions))

// 压缩响应
app.use(compression())

// 请求体解析
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 静态文件服务
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')))

// 请求日志
if (process.env.NODE_ENV === 'production') {
  app.use(morgan(httpLogFormat, {
    stream: { write: (message) => logger.info(message.trim()) }
  }))
} else {
  app.use(morgan('combined'))
  app.use(requestLogger)
}

// 速率限制
const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW || '15')) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
})
app.use(limiter)

// 健康检查端点 - 简化版，不依赖任何外部服务
app.get('/api/health', (req, res) => {
  const healthInfo = {
    success: true,
    message: 'API服务运行正常',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'staging',
    uptime: process.uptime(),
    version: '1.0.0',
    services: {
      api: 'running',
      database: process.env.DB_HOST ? 'configured' : 'not_configured',
      redis: process.env.REDIS_HOST ? 'configured' : 'not_configured'
    },
    config: {
      db_host: process.env.DB_HOST || 'not_set',
      redis_host: process.env.REDIS_HOST || 'not_set',
      node_env: process.env.NODE_ENV || 'not_set'
    }
  }
  
  logger.info('健康检查请求:', healthInfo)
  res.status(200).json(healthInfo)
})

// 详细状态检查端点
app.get('/api/status', async (req, res) => {
  const envInfo = {
    success: true,
    message: 'API服务运行正常',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    environmentName: process.env.ENVIRONMENT_NAME || '测试环境',
    version: process.env.API_VERSION || 'v1',
    databasePrefix: process.env.DATABASE_PREFIX || 'dev',
    ossPrefix: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  }
  res.json(envInfo)
})

// API路由
app.use(`/api/${process.env.API_VERSION || 'v1'}`, routes)

// 404处理
app.use(notFoundHandler)

// 错误处理中间件
app.use(errorHandler)

export default app