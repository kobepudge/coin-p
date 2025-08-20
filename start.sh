#!/bin/sh

# Railway部署启动脚本
# 在启动应用之前执行数据库迁移

echo "🚀 Starting application deployment..."

# 显示环境信息
echo "📋 Environment info:"
echo "NODE_ENV: $NODE_ENV"
echo "DB_HOST: $DB_HOST"
echo "DB_NAME: $DB_NAME"
echo "Working directory: $(pwd)"
echo "Files in current directory:"
ls -la

# 创建.sequelizerc配置文件
echo "🔧 Creating .sequelizerc configuration..."
cat > .sequelizerc << 'EOF'
const path = require('path');

module.exports = {
  'config': path.resolve('src', 'config', 'database.js'),
  'models-path': path.resolve('src', 'models'),
  'seeders-path': path.resolve('src', 'database', 'seeders'),
  'migrations-path': path.resolve('src', 'database', 'migrations')
};
EOF

# 检查配置文件
echo "🔍 Checking configuration files..."
if [ -f ".sequelizerc" ]; then
    echo "✅ .sequelizerc created successfully"
    cat .sequelizerc
else
    echo "❌ .sequelizerc creation failed"
fi

if [ -f "src/config/database.js" ]; then
    echo "✅ database.js found"
else
    echo "❌ database.js not found"
fi

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
