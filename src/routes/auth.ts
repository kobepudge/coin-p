import { Router } from 'express'
import { validate } from '@/middlewares/validation'
import { authenticate } from '@/middlewares/auth'
import * as authController from '@/controllers/auth'

const router = Router()

// 管理员登录
router.post(
  '/login',
  validate(authController.loginValidation),
  authController.login
)

// 管理员登出
router.post(
  '/logout',
  authenticate,
  authController.logout
)

// 刷新访问令牌
router.post(
  '/refresh',
  authController.refreshToken
)

// 验证token状态
router.get(
  '/verify',
  authenticate,
  authController.verifyToken
)

// 获取当前用户信息
router.get(
  '/profile',
  authenticate,
  authController.getProfile
)

// 更新个人信息
router.put(
  '/profile',
  authenticate,
  validate(authController.updateProfileValidation),
  authController.updateProfile
)

// 修改密码
router.post(
  '/change-password',
  authenticate,
  validate(authController.changePasswordValidation),
  authController.changePassword
)

export default router