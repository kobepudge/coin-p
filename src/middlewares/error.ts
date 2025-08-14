import { Request, Response, NextFunction } from 'express'
import { ValidationError as SequelizeValidationError } from 'sequelize'
import { logger } from '@/utils/logger'
import { HTTP_STATUS } from '@/constants'

// 应用错误类
export class AppError extends Error {
  public statusCode: number
  public isOperational: boolean
  public code?: string

  constructor(message: string, statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR, code?: string) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    this.code = code

    Error.captureStackTrace(this, this.constructor)
  }
}

// 验证错误类
export class ValidationError extends AppError {
  public errors: Record<string, string[]>

  constructor(errors: Record<string, string[]>, message: string = '数据验证失败') {
    super(message, HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR')
    this.errors = errors
  }
}

// 认证错误类
export class AuthenticationError extends AppError {
  constructor(message: string = '认证失败') {
    super(message, HTTP_STATUS.UNAUTHORIZED, 'AUTHENTICATION_ERROR')
  }
}

// 授权错误类
export class AuthorizationError extends AppError {
  constructor(message: string = '权限不足') {
    super(message, HTTP_STATUS.FORBIDDEN, 'AUTHORIZATION_ERROR')
  }
}

// 资源未找到错误类
export class NotFoundError extends AppError {
  constructor(resource: string = '资源') {
    super(`${resource}不存在`, HTTP_STATUS.NOT_FOUND, 'NOT_FOUND')
  }
}

// 冲突错误类
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, HTTP_STATUS.CONFLICT, 'CONFLICT')
  }
}

// 404处理中间件
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`路径 ${req.originalUrl}`)
  next(error)
}

// 全局错误处理中间件
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err } as any
  error.message = err.message

  // 记录错误日志
  logger.error('API Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    params: req.params,
    query: req.query
  })

  // Sequelize验证错误
  if (err instanceof SequelizeValidationError) {
    const errors: Record<string, string[]> = {}
    err.errors.forEach((validationError) => {
      const field = validationError.path || 'unknown'
      if (!errors[field]) {
        errors[field] = []
      }
      errors[field].push(validationError.message)
    })
    error = new ValidationError(errors)
  }

  // Sequelize唯一约束错误
  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = '数据已存在，请检查唯一字段'
    error = new ConflictError(message)
  }

  // Sequelize外键约束错误
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    const message = '关联数据不存在或已被删除'
    error = new AppError(message, HTTP_STATUS.BAD_REQUEST)
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    error = new AuthenticationError('无效的访问令牌')
  }

  if (err.name === 'TokenExpiredError') {
    error = new AuthenticationError('访问令牌已过期')
  }

  // Multer文件上传错误
  if (err.name === 'MulterError') {
    const multerErr = err as any
    if (multerErr.code === 'LIMIT_FILE_SIZE') {
      error = new AppError('文件大小超出限制', HTTP_STATUS.BAD_REQUEST, 'FILE_TOO_LARGE')
    } else if (multerErr.code === 'LIMIT_UNEXPECTED_FILE') {
      error = new AppError('不支持的文件类型', HTTP_STATUS.BAD_REQUEST, 'FILE_TYPE_NOT_ALLOWED')
    } else {
      error = new AppError('文件上传失败', HTTP_STATUS.BAD_REQUEST, 'FILE_UPLOAD_FAILED')
    }
  }

  // 设置默认错误
  if (!(error instanceof AppError)) {
    error = new AppError(
      process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }

  // 构建错误响应
  const response: any = {
    success: false,
    message: error.message,
    code: error.code
  }

  // 验证错误包含详细信息
  if (error instanceof ValidationError) {
    response.errors = error.errors
  }

  // 开发环境包含错误堆栈
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack
  }

  res.status(error.statusCode).json(response)
}

// 异步错误捕获包装器
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}