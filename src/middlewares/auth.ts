import { Request, Response, NextFunction } from 'express'
import { JWTUtils, JwtPayload } from '@/utils/jwt'
import { Admin } from '@/models'
import { AuthenticationError, AuthorizationError } from '@/middlewares/error'
import { logger } from '@/utils/logger'
import type { AdminPermissions } from '@/types'

// 扩展Request接口，添加用户信息
declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: number
        username: string
        role: 'super_admin' | 'admin'
        permissions: AdminPermissions
        real_name?: string
        email?: string
      }
      token?: string
    }
  }
}

/**
 * 认证中间件 - 验证JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('缺少访问令牌')
    }

    const token = authHeader.substring(7) // 移除 'Bearer ' 前缀
    req.token = token

    // 验证token
    const payload: JwtPayload = await JWTUtils.verifyAccessToken(token)

    // 从数据库获取最新的用户信息
    const admin = await Admin.findByPk(payload.id, {
      attributes: { exclude: ['password'] }
    })

    if (!admin) {
      throw new AuthenticationError('用户不存在')
    }

    if (admin.status === 'inactive') {
      throw new AuthenticationError('用户账号已被禁用')
    }

    // 将用户信息添加到请求对象
    req.admin = {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      permissions: admin.permissions,
      real_name: admin.real_name,
      email: admin.email || undefined
    }

    next()
  } catch (error: any) {
    logger.error('认证中间件错误:', {
      message: error.message,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip
    })
    next(new AuthenticationError(error.message))
  }
}

/**
 * 可选认证中间件 - token存在时验证，不存在时继续
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next() // 没有token时直接继续
    }

    // 有token时进行验证
    await authenticate(req, res, next)
  } catch (error) {
    // 可选认证失败时也继续执行
    next()
  }
}

/**
 * 权限验证中间件工厂函数
 */
export const authorize = (
  ...requiredPermissions: Array<keyof AdminPermissions>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      return next(new AuthenticationError('请先登录'))
    }

    // 超级管理员拥有所有权限
    if (req.admin.role === 'super_admin') {
      return next()
    }

    // 检查所需权限
    const hasPermission = requiredPermissions.every(permission => 
      req.admin!.permissions[permission] === true
    )

    if (!hasPermission) {
      logger.warn('权限验证失败:', {
        adminId: req.admin.id,
        username: req.admin.username,
        requiredPermissions,
        userPermissions: req.admin.permissions,
        url: req.originalUrl,
        method: req.method
      })
      
      return next(new AuthorizationError('权限不足，无法执行此操作'))
    }

    next()
  }
}

/**
 * 角色验证中间件
 */
export const requireRole = (
  ...allowedRoles: Array<'super_admin' | 'admin'>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      return next(new AuthenticationError('请先登录'))
    }

    if (!allowedRoles.includes(req.admin.role)) {
      logger.warn('角色验证失败:', {
        adminId: req.admin.id,
        username: req.admin.username,
        userRole: req.admin.role,
        allowedRoles,
        url: req.originalUrl,
        method: req.method
      })
      
      return next(new AuthorizationError(`需要以下角色之一: ${allowedRoles.join(', ')}`))
    }

    next()
  }
}

/**
 * 超级管理员验证中间件
 */
export const requireSuperAdmin = requireRole('super_admin')

/**
 * 自己或上级权限验证中间件
 * 用于个人信息修改等场景，允许用户修改自己的信息或上级修改下级信息
 */
export const requireSelfOrSuperior = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      return next(new AuthenticationError('请先登录'))
    }

    const targetUserId = parseInt(req.params.id || req.body.id)
    
    // 修改自己的信息
    if (targetUserId === req.admin.id) {
      return next()
    }

    // 超级管理员可以修改任何人的信息
    if (req.admin.role === 'super_admin') {
      return next()
    }

    // 检查是否有admin_manage权限
    if (req.admin.permissions.admin_manage) {
      // 验证目标用户是否是自己创建的下级
      const targetAdmin = await Admin.findByPk(targetUserId)
      if (targetAdmin && targetAdmin.parent_id === req.admin.id) {
        return next()
      }
    }

    return next(new AuthorizationError('只能修改自己或下级的信息'))
  } catch (error) {
    next(error)
  }
}

// 别名导出，保持向后兼容
export const authenticateToken = authenticate
export const requirePermission = authorize

/**
 * 限制访问速率中间件（基于用户）
 */
export const rateLimitByUser = (
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15分钟
) => {
  const requestCounts = new Map<number, { count: number; resetTime: number }>()

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return next()
    }

    const now = Date.now()
    const userId = req.admin.id
    const windowStart = now - windowMs

    // 清理过期记录
    for (const [id, data] of requestCounts.entries()) {
      if (data.resetTime < now) {
        requestCounts.delete(id)
      }
    }

    // 获取或创建用户请求记录
    let userRecord = requestCounts.get(userId)
    if (!userRecord || userRecord.resetTime < now) {
      userRecord = { count: 0, resetTime: now + windowMs }
      requestCounts.set(userId, userRecord)
    }

    userRecord.count++

    if (userRecord.count > maxRequests) {
      logger.warn('用户请求频率超限:', {
        adminId: req.admin.id,
        username: req.admin.username,
        requestCount: userRecord.count,
        maxRequests,
        url: req.originalUrl,
        method: req.method
      })

      return res.status(429).json({
        success: false,
        message: '请求过于频繁，请稍后再试',
        retryAfter: Math.ceil((userRecord.resetTime - now) / 1000)
      })
    }

    next()
  }
}