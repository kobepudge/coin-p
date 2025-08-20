import { Request, Response, NextFunction } from 'express'
import { validationResult, ValidationChain } from 'express-validator'
import { ValidationError } from '@/middlewares/error'
import { logger } from '@/utils/logger'

/**
 * 验证请求数据中间件
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    const validationErrors: Record<string, string[]> = {}
    
    errors.array().forEach((error: any) => {
      const field = error.path || error.param || 'unknown'
      if (!validationErrors[field]) {
        validationErrors[field] = []
      }
      validationErrors[field].push(error.msg)
    })

    logger.warn('请求验证失败:', {
      url: req.originalUrl,
      method: req.method,
      errors: validationErrors,
      body: req.body,
      params: req.params,
      query: req.query
    })

    // 构建更友好的错误信息
    const errorMessages = Object.entries(validationErrors)
      .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
      .join('; ')

    const friendlyMessage = `数据验证失败: ${errorMessages}`

    return next(new ValidationError(validationErrors, friendlyMessage))
  }
  
  next()
}

/**
 * 创建验证规则组合
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 执行所有验证规则
    await Promise.all(validations.map(validation => validation.run(req)))
    
    // 检查验证结果
    validateRequest(req, res, next)
  }
}

/**
 * 文件上传验证中间件
 */
export const validateFileUpload = (
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/gif'],
  maxSize: number = 5 * 1024 * 1024 // 5MB
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.file && !req.files) {
      return next()
    }

    const files = req.files ? (Array.isArray(req.files) ? req.files : [req.file]) : [req.file]
    
    for (const file of files) {
      if (!file) continue

      // 检查文件类型
      if (!allowedTypes.includes(file.mimetype)) {
        return next(new ValidationError(
          { file: [`不支持的文件类型: ${file.mimetype}`] },
          '文件类型不被允许'
        ))
      }

      // 检查文件大小
      if (file.size > maxSize) {
        return next(new ValidationError(
          { file: [`文件大小超出限制: ${Math.round(file.size / 1024 / 1024)}MB > ${Math.round(maxSize / 1024 / 1024)}MB`] },
          '文件大小超出限制'
        ))
      }
    }

    next()
  }
}

/**
 * 分页参数验证中间件
 */
export const validatePagination = (
  defaultPage: number = 1,
  defaultLimit: number = 10,
  maxLimit: number = 100
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 处理页码
    let page = parseInt(req.query.page as string) || defaultPage
    if (page < 1) page = defaultPage

    // 处理每页数量
    let limit = parseInt(req.query.limit as string) || defaultLimit
    if (limit < 1) limit = defaultLimit
    if (limit > maxLimit) limit = maxLimit

    // 添加到请求对象
    req.pagination = {
      page,
      limit,
      offset: (page - 1) * limit
    }

    next()
  }
}

/**
 * 排序参数验证中间件
 */
export const validateSorting = (allowedFields: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const sort = req.query.sort as string
    const order = (req.query.order as string)?.toLowerCase()

    // 默认排序
    let sortField = 'created_at'
    let sortOrder: 'asc' | 'desc' = 'desc'

    // 验证排序字段
    if (sort && allowedFields.includes(sort)) {
      sortField = sort
    }

    // 验证排序方向
    if (order === 'asc' || order === 'desc') {
      sortOrder = order
    }

    // 添加到请求对象
    req.sorting = {
      field: sortField,
      order: sortOrder
    }

    next()
  }
}

/**
 * 搜索参数验证中间件
 */
export const validateSearch = (
  searchFields: string[] = [],
  maxLength: number = 100
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const search = req.query.search as string

    if (search) {
      // 验证搜索关键词长度
      if (search.length > maxLength) {
        return next(new ValidationError(
          { search: [`搜索关键词长度不能超过${maxLength}个字符`] },
          '搜索参数无效'
        ))
      }

      // 清理搜索关键词
      const cleanedSearch = search.trim()
      if (cleanedSearch.length === 0) {
        req.search = undefined
      } else {
        req.search = {
          keyword: cleanedSearch,
          fields: searchFields
        }
      }
    }

    next()
  }
}

// 扩展Request接口
declare global {
  namespace Express {
    interface Request {
      pagination?: {
        page: number
        limit: number
        offset: number
      }
      sorting?: {
        field: string
        order: 'asc' | 'desc'
      }
      search?: {
        keyword: string
        fields: string[]
      }
    }
  }
}