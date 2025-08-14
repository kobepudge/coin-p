# OSS调试日志版本记录

## 版本信息
- **版本号**: v1.0.0-debug
- **创建时间**: 2025-08-14
- **目的**: 排查OSS上传失败问题 - "The OSS Access Key Id you provided does not exist in our records"

## 添加的调试日志

### 1. OSS配置初始化日志 (`src/config/oss.ts`)
- **位置**: 第46-104行
- **功能**: 详细记录OSS配置参数和连接测试
- **标识**: `[DEBUG] OSS配置详情` 和 `[DEBUG] OSS连接测试`

### 2. OSS上传方法增强日志 (`src/config/oss.ts`)
- **位置**: 第128-237行 (uploadFile方法)
- **功能**: 记录上传开始、参数、详细错误信息
- **标识**: `[DEBUG] 开始OSS文件上传`、`[DEBUG] OSS上传参数`、`[DEBUG] OSS文件上传失败`

### 3. Controller层错误日志 (`src/controllers/upload.ts`)
- **位置**: 
  - 第101-128行 (uploadImage错误处理)
  - 第190-217行 (uploadPaymentQr错误处理)  
  - 第273-299行 (deleteFile错误处理)
- **功能**: 记录请求上下文和详细错误信息
- **标识**: `[DEBUG] 文件上传失败`、`[DEBUG] 支付二维码上传失败`、`[DEBUG] 文件删除失败`

### 4. OSS调试测试接口 (`src/routes/upload.ts`)
- **位置**: 第21-113行
- **路径**: `GET /api/v1/upload/oss-debug`
- **功能**: 实时查看OSS配置状态和连接测试
- **标识**: `[DEBUG] OSS调试信息查询`

## 调试信息包含内容

### OSS配置信息
- AccessKey ID (脱敏显示前8位)
- AccessKey ID长度
- AccessKey Secret状态
- AccessKey Secret长度
- Bucket名称
- Region区域
- 环境前缀
- 客户端创建状态

### 错误详细信息
- 错误消息 (message)
- 错误代码 (code)
- HTTP状态 (status/statusCode)
- 请求ID (requestId)
- 主机ID (hostId)
- 错误名称 (name)
- 错误堆栈 (stack)
- 请求头 (headers)
- 请求参数 (params)

### 请求上下文信息
- 请求方法
- 请求URL
- 客户端IP
- User-Agent
- 文件信息 (原始名称、大小、MIME类型)

## 测试接口使用方法

### 访问调试接口
```bash
curl https://coin-p-test.up.railway.app/api/v1/upload/oss-debug
```

### 返回信息示例
```json
{
  "success": true,
  "data": {
    "version": "v1.0.0-debug",
    "timestamp": "2025-08-14T15:30:00.000Z",
    "environment": "staging",
    "ossConfig": {
      "accessKeyId": "LTAI5tCS...",
      "accessKeyIdLength": 25,
      "accessKeySecret": "已设置",
      "accessKeySecretLength": 30,
      "bucket": "cximags",
      "region": "oss-cn-shenzhen",
      "envPrefix": "dev"
    },
    "ossClientStatus": "已创建",
    "bucketTest": {
      "success": true,
      "bucketName": "cximags",
      "bucketRegion": "oss-cn-shenzhen"
    },
    "listTest": {
      "success": true,
      "fileCount": 10
    }
  }
}
```

## 清理计划

### 问题解决后需要删除的内容
1. 所有带 `[DEBUG v1.0.0]` 标识的日志代码
2. OSS调试测试接口 (`/oss-debug`)
3. 本文件 (`DEBUG_LOG_VERSION.md`)

### 保留的内容
- 原有的简洁错误日志
- 正常的成功日志
- 基础的OSS配置日志

## 注意事项
- 调试日志包含敏感信息，仅用于开发调试
- 生产环境部署前必须清理所有调试代码
- 调试接口为公开接口，注意安全性
