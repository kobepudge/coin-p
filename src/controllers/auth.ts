import { Request, Response } from 'express'
import { body } from 'express-validator'
import { AuthService } from '@/services/auth'
import { asyncHandler } from '@/middlewares/error'
import { HTTP_STATUS } from '@/constants'
import type { LoginCredentials } from '@/types'

// 登录验证规则
export const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('用户名不能为空')
    .isLength({ min: 3, max: 50 })
    .withMessage('用户名长度应在3-50位之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),

  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
    .isLength({ min: 6, max: 50 })
    .withMessage('密码长度应在6-50位之间')
]

// 修改密码验证规则
export const changePasswordValidation = [
  body('old_password')
    .notEmpty()
    .withMessage('原密码不能为空'),

  body('new_password')
    .notEmpty()
    .withMessage('新密码不能为空')
    .isLength({ min: 6, max: 50 })
    .withMessage('新密码长度应在6-50位之间')
    .custom((value, { req }) => {
      if (value === req.body.old_password) {
        throw new Error('新密码不能与原密码相同')
      }
      return true
    })
]

// 更新个人信息验证规则
export const updateProfileValidation = [
  body('real_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('真实姓名不能为空')
    .isLength({ min: 1, max: 100 })
    .withMessage('真实姓名长度应在1-100位之间'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('邮箱格式不正确')
    .normalizeEmail()
]

/**
 * 管理员登录
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const credentials: LoginCredentials = {
    username: req.body.username,
    password: req.body.password
  }

  const ipAddress = req.ip || req.connection?.remoteAddress
  const userAgent = req.get('User-Agent')

  const result = await AuthService.login(credentials, ipAddress, userAgent)

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '登录成功',
    data: result
  })
})

/**
 * 管理员登出
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.admin!.id
  const token = req.token!
  const refreshToken = req.body.refresh_token
  const ipAddress = req.ip || req.connection?.remoteAddress
  const userAgent = req.get('User-Agent')

  await AuthService.logout(adminId, token, refreshToken, ipAddress, userAgent)

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '登出成功',
    data: null
  })
})

/**
 * 刷新访问令牌
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refresh_token } = req.body

  if (!refresh_token) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: '缺少刷新令牌',
      data: null
    })
  }

  const result = await AuthService.refreshToken(refresh_token)

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '令牌刷新成功',
    data: result
  })
})

/**
 * 获取当前用户信息
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.admin!.id
  const profile = await AuthService.getProfile(adminId)

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '获取用户信息成功',
    data: profile
  })
})

/**
 * 更新个人信息
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.admin!.id
  const operatorId = req.admin!.id
  const profileData = {
    real_name: req.body.real_name,
    email: req.body.email
  }
  
  // 过滤掉未定义的字段
  const updateData = Object.fromEntries(
    Object.entries(profileData).filter(([_, value]) => value !== undefined)
  )

  const ipAddress = req.ip || req.connection?.remoteAddress
  const userAgent = req.get('User-Agent')

  const result = await AuthService.updateProfile(
    adminId,
    updateData,
    operatorId,
    ipAddress,
    userAgent
  )

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '个人信息更新成功',
    data: result
  })
})

/**
 * 修改密码
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.admin!.id
  const { old_password, new_password } = req.body
  const ipAddress = req.ip || req.connection?.remoteAddress
  const userAgent = req.get('User-Agent')

  await AuthService.changePassword(
    adminId,
    old_password,
    new_password,
    ipAddress,
    userAgent
  )

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '密码修改成功，请重新登录',
    data: null
  })
})

/**
 * 验证token状态
 */
export const verifyToken = asyncHandler(async (req: Request, res: Response) => {
  // 如果能到达这里，说明token是有效的（通过了认证中间件）
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '令牌有效',
    data: {
      admin: {
        id: req.admin!.id,
        username: req.admin!.username,
        role: req.admin!.role,
        permissions: req.admin!.permissions,
        real_name: req.admin!.real_name,
        email: req.admin!.email
      }
    }
  })
})