"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("./utils/logger");
const error_1 = require("./middlewares/error");
const routes_1 = __importDefault(require("./routes"));
// 创建Express应用
const app = (0, express_1.default)();
// 信任代理
app.set('trust proxy', 1);
// 安全中间件
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
// CORS配置
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com', 'https://www.yourdomain.com']
        : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use((0, cors_1.default)(corsOptions));
// 压缩响应
app.use((0, compression_1.default)());
// 请求体解析
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// 静态文件服务
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'public', 'uploads')));
// 请求日志
if (process.env.NODE_ENV === 'production') {
    app.use((0, morgan_1.default)(logger_1.httpLogFormat, {
        stream: { write: (message) => logger_1.logger.info(message.trim()) }
    }));
}
else {
    app.use((0, morgan_1.default)('combined'));
    app.use(logger_1.requestLogger);
}
// 速率限制
const limiter = (0, express_rate_limit_1.default)({
    windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW || '15')) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: {
        success: false,
        message: '请求过于频繁，请稍后再试'
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);
// 健康检查端点 - 简化版，不依赖任何外部服务
app.get('/api/health', (req, res) => {
    const healthInfo = {
        success: true,
        message: 'API服务运行正常',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'staging',
        uptime: process.uptime(),
        version: '1.0.0',
        services: {
            api: 'running',
            database: process.env.DB_HOST ? 'configured' : 'not_configured',
            redis: process.env.REDIS_HOST ? 'configured' : 'not_configured'
        },
        config: {
            db_host: process.env.DB_HOST || 'not_set',
            redis_host: process.env.REDIS_HOST || 'not_set',
            node_env: process.env.NODE_ENV || 'not_set'
        }
    };
    logger_1.logger.info('健康检查请求:', healthInfo);
    res.status(200).json(healthInfo);
});
// 详细状态检查端点
app.get('/api/status', async (req, res) => {
    const envInfo = {
        success: true,
        message: 'API服务运行正常',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        environmentName: process.env.ENVIRONMENT_NAME || '测试环境',
        version: process.env.API_VERSION || 'v1',
        databasePrefix: process.env.DATABASE_PREFIX || 'dev',
        ossPrefix: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
    };
    res.json(envInfo);
});
// API路由
app.use(`/api/${process.env.API_VERSION || 'v1'}`, routes_1.default);
// 404处理
app.use(error_1.notFoundHandler);
// 错误处理中间件
app.use(error_1.errorHandler);
exports.default = app;
