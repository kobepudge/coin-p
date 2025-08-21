-- 添加支付宝账号字段到商家表
-- 执行时间：2025-08-20

ALTER TABLE merchants 
ADD COLUMN alipay_account VARCHAR(100) DEFAULT NULL 
COMMENT '支付宝收款账号';

-- 创建索引（可选，如果需要按支付宝账号查询）
-- CREATE INDEX idx_merchants_alipay_account ON merchants(alipay_account);
