// 简化的常量定义，避免复杂的shared模块依赖

export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing', 
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const

export const MERCHANT_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline'
} as const

export const MERCHANT_TYPE = {
  SELLER: 'seller',
  BUYER: 'buyer'
} as const

export const ADMIN_ROLE = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  OPERATOR: 'operator'
} as const

export const STATUS_TEXT = {
  [ORDER_STATUS.PENDING]: '待处理',
  [ORDER_STATUS.PROCESSING]: '处理中',
  [ORDER_STATUS.COMPLETED]: '已完成',
  [ORDER_STATUS.FAILED]: '失败',
  [ORDER_STATUS.CANCELLED]: '已取消'
}

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  INTERNAL_ERROR: 500  // Alias for compatibility
}