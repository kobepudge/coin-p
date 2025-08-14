import * as jwt from 'jsonwebtoken'
import { redisUtils } from '@/config/redis'
import { logger } from '@/utils/logger'
import type { Admin } from '@/types'

// JWT负载接口
export interface JwtPayload {
  id: number
  username: string
  role: 'super_admin' | 'admin'
  permissions: Record<string, boolean>
  iat?: number
  exp?: number
}

// JWT工具类
export class JWTUtils {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key'
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
  private static readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  
  // Token前缀
  private static readonly TOKEN_BLACKLIST_PREFIX = 'blacklist:token:'
  private static readonly REFRESH_TOKEN_PREFIX = 'refresh:token:'

  /**
   * 生成访问令牌
   */
  public static generateAccessToken(admin: Admin): string {
    const payload: JwtPayload = {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      permissions: admin.permissions
    }

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'coin-trading-api',
      audience: 'coin-trading-frontend'
    } as jwt.SignOptions)
  }

  /**
   * 生成刷新令牌
   */
  public static generateRefreshToken(adminId: number): string {
    const payload = { id: adminId, type: 'refresh' }
    
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_REFRESH_EXPIRES_IN
    } as jwt.SignOptions)
  }

  /**
   * 验证访问令牌
   */
  public static async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      // 检查token是否在黑名单中
      const isBlacklisted = await this.isTokenBlacklisted(token)
      if (isBlacklisted) {
        throw new Error('Token已被撤销')
      }

      // 验证token
      const payload = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'coin-trading-api',
        audience: 'coin-trading-frontend'
      }) as JwtPayload

      return payload
    } catch (error: any) {
      logger.error('JWT验证失败:', error)
      
      if (error.name === 'TokenExpiredError') {
        throw new Error('访问令牌已过期')
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('无效的访问令牌')
      } else {
        throw new Error(error.message || 'Token验证失败')
      }
    }
  }

  /**
   * 验证刷新令牌
   */
  public static async verifyRefreshToken(token: string): Promise<{ id: number }> {
    try {
      // 检查token是否存在于Redis中
      const storedToken = await redisUtils.get(`${this.REFRESH_TOKEN_PREFIX}${token}`)
      if (!storedToken) {
        throw new Error('刷新令牌不存在或已过期')
      }

      // 验证token
      const payload = jwt.verify(token, this.JWT_SECRET) as any
      
      if (payload.type !== 'refresh') {
        throw new Error('无效的刷新令牌类型')
      }

      return { id: payload.id }
    } catch (error: any) {
      logger.error('刷新令牌验证失败:', error)
      
      if (error.name === 'TokenExpiredError') {
        throw new Error('刷新令牌已过期')
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('无效的刷新令牌')
      } else {
        throw new Error(error.message || '刷新令牌验证失败')
      }
    }
  }

  /**
   * 存储刷新令牌
   */
  public static async storeRefreshToken(token: string, adminId: number): Promise<void> {
    try {
      const ttl = this.getTokenTTL(this.JWT_REFRESH_EXPIRES_IN)
      await redisUtils.set(`${this.REFRESH_TOKEN_PREFIX}${token}`, adminId, ttl)
    } catch (error) {
      logger.error('存储刷新令牌失败:', error)
    }
  }

  /**
   * 将token加入黑名单
   */
  public static async blacklistToken(token: string): Promise<void> {
    try {
      const payload = jwt.decode(token) as any
      if (payload && payload.exp) {
        // 计算剩余有效期
        const now = Math.floor(Date.now() / 1000)
        const ttl = payload.exp - now
        
        if (ttl > 0) {
          await redisUtils.set(`${this.TOKEN_BLACKLIST_PREFIX}${token}`, 'blacklisted', ttl)
        }
      }
    } catch (error) {
      logger.error('Token加入黑名单失败:', error)
    }
  }

  /**
   * 检查token是否在黑名单中
   */
  public static async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      return await redisUtils.exists(`${this.TOKEN_BLACKLIST_PREFIX}${token}`)
    } catch (error) {
      logger.error('检查Token黑名单状态失败:', error)
      return false
    }
  }

  /**
   * 删除刷新令牌
   */
  public static async removeRefreshToken(token: string): Promise<void> {
    try {
      await redisUtils.del(`${this.REFRESH_TOKEN_PREFIX}${token}`)
    } catch (error) {
      logger.error('删除刷新令牌失败:', error)
    }
  }

  /**
   * 清除用户所有刷新令牌
   */
  public static async clearUserRefreshTokens(adminId: number): Promise<void> {
    try {
      const pattern = `${this.REFRESH_TOKEN_PREFIX}*`
      const keys = await redisUtils.keys(pattern)
      
      for (const key of keys) {
        const storedAdminId = await redisUtils.get(key)
        if (storedAdminId === adminId) {
          await redisUtils.del(key)
        }
      }
    } catch (error) {
      logger.error('清除用户刷新令牌失败:', error)
    }
  }

  /**
   * 解码token（不验证签名）
   */
  public static decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload
    } catch (error) {
      logger.error('Token解码失败:', error)
      return null
    }
  }

  /**
   * 获取token剩余有效期（秒）
   */
  public static getTokenRemainingTime(token: string): number {
    try {
      const payload = jwt.decode(token) as any
      if (payload && payload.exp) {
        const now = Math.floor(Date.now() / 1000)
        return Math.max(0, payload.exp - now)
      }
      return 0
    } catch (error) {
      logger.error('获取Token剩余时间失败:', error)
      return 0
    }
  }

  /**
   * 将时间字符串转换为秒数
   */
  private static getTokenTTL(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/)
    if (!match) return 7 * 24 * 60 * 60 // 默认7天
    
    const value = parseInt(match[1])
    const unit = match[2]
    
    switch (unit) {
      case 's': return value
      case 'm': return value * 60
      case 'h': return value * 60 * 60
      case 'd': return value * 24 * 60 * 60
      default: return value
    }
  }
}