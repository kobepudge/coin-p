#!/bin/sh

# Railway部署启动脚本
# 在启动应用之前执行数据库迁移

echo "🚀 Starting application deployment..."

# 等待数据库连接就绪
echo "⏳ Waiting for database connection..."
sleep 5

# 执行数据库迁移
echo "📊 Running database migrations..."
if npm run db:migrate; then
    echo "✅ Database migrations completed successfully"
else
    echo "❌ Database migrations failed"
    exit 1
fi

# 启动应用
echo "🎯 Starting application..."
exec node dist/index.js
