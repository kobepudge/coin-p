# Railway部署优化Dockerfile
FROM node:20-alpine as builder

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装所有依赖 (包括devDependencies用于构建)
RUN npm ci

# 复制源代码和配置文件
COPY src ./src
COPY tsconfig.json ./

# 构建TypeScript项目
RUN npm run build

# 生产镜像
FROM node:20-alpine

# 安装dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# 创建应用用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# 复制package文件并安装生产依赖（包含sequelize-cli用于迁移）
COPY package*.json ./
RUN npm ci --only=production && \
    npm install sequelize-cli && \
    npm cache clean --force

# 复制构建产物和数据库配置
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs src/config/database.js ./src/config/
COPY --chown=nodejs:nodejs src/database/migrations ./src/database/migrations/
COPY --chown=nodejs:nodejs start.sh ./

# 创建必要目录并设置权限
RUN mkdir -p uploads logs src/config src/database/migrations && \
    chown -R nodejs:nodejs uploads logs src start.sh && \
    chmod +x start.sh

# 切换到非root用户
USER nodejs

# 暴露端口（Railway会动态设置PORT）
EXPOSE ${PORT:-3000}

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 使用dumb-init启动应用（包含数据库迁移）
CMD ["dumb-init", "./start.sh"]