// 简化的类型定义，避免复杂的shared模块依赖

export interface LoginCredentials {
  username: string
  password: string
}

export interface AdminPermissions {
  merchant_manage: boolean
  order_manage: boolean
  admin_manage: boolean
  system_config: boolean
  [key: string]: boolean
}

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'rejected'
export type MerchantStatus = 'online' | 'offline'  
export type MerchantType = 'seller' | 'buyer'
export type AdminRole = 'super_admin' | 'admin' | 'operator'

export interface Merchant {
  id: number
  name: string
  type: MerchantType
  price: string
  trade_method: string
  stock_or_demand?: string
  speed?: string
  guarantee?: string
  alipay_account?: string // 支付宝账号
  status: MerchantStatus
  is_current_seller?: boolean
  payment_qr?: string
  transfer_game_id?: string
  sort_order: number
  created_at: Date
  updated_at: Date
}

export interface Order {
  id: number
  merchant_id: number
  player_game_id: string
  payment_qr_url?: string
  amount?: number
  quantity?: number
  status: OrderStatus
  admin_note?: string
  created_at: Date
  updated_at: Date
}

export interface Admin {
  id: number
  username: string
  password: string
  real_name: string
  email?: string
  role: 'super_admin' | 'admin'
  permissions: AdminPermissions
  parent_id?: number
  status: 'active' | 'inactive'
  last_login_at?: Date
  created_at: Date
  updated_at: Date
}

export interface CreateAdminData {
  username: string
  password: string
  real_name: string
  email?: string
  role: 'super_admin' | 'admin'
  permissions: AdminPermissions
}

export interface UpdateAdminData {
  real_name?: string
  email?: string
  role?: 'super_admin' | 'admin'
  permissions?: AdminPermissions
  status?: 'active' | 'inactive'
}

export interface OperationLog {
  id: number
  admin_id: number
  action: string
  target_type: 'merchant' | 'order' | 'admin'
  target_id?: number | string
  details?: any
  ip_address?: string
  user_agent?: string
  created_at: Date
  updated_at: Date
}

export interface OperationLogCreationAttributes {
  admin_id: number
  action: string
  target_type: 'merchant' | 'order' | 'admin'
  target_id?: number | string
  details?: any
  old_data?: any
  new_data?: any
  ip_address?: string
  user_agent?: string
}