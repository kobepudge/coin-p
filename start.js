#!/usr/bin/env node

/**
 * Railway部署启动脚本
 * 处理数据库迁移、种子数据和应用启动
 */

const { spawn } = require('child_process');
const path = require('path');

// 环境检查
const isProduction = process.env.NODE_ENV === 'production';
const hasDatabase = process.env.MYSQLHOST || process.env.DB_HOST;

console.log('🚀 启动游戏金币交易平台后端...');
console.log(`📊 环境: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔌 端口: ${process.env.PORT || 3000}`);
console.log(`🗄️  数据库: ${hasDatabase ? '已连接' : '未配置'}`);

// 启动主应用
function startApp() {
  console.log('🎯 启动应用服务器...');
  const app = spawn('node', ['dist/index.js'], {
    stdio: 'inherit',
    env: { ...process.env }
  });

  app.on('error', (err) => {
    console.error('❌ 应用启动失败:', err);
    process.exit(1);
  });

  app.on('exit', (code) => {
    console.log(`📤 应用退出，代码: ${code}`);
    process.exit(code);
  });

  // 优雅关闭处理
  process.on('SIGINT', () => {
    console.log('📋 收到SIGINT信号，正在关闭...');
    app.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log('📋 收到SIGTERM信号，正在关闭...');
    app.kill('SIGTERM');
  });
}

// 数据库初始化（如果需要）
async function initDatabase() {
  if (!hasDatabase) {
    console.log('⚠️  未检测到数据库配置，跳过数据库初始化');
    return;
  }

  console.log('🔧 初始化数据库...');
  
  return new Promise((resolve, reject) => {
    const migrate = spawn('npx', ['sequelize-cli', 'db:migrate'], {
      stdio: 'inherit',
      cwd: __dirname
    });

    migrate.on('close', (code) => {
      if (code === 0) {
        console.log('✅ 数据库迁移完成');
        
        // 运行种子数据 (仅在生产环境第一次运行)
        if (isProduction && process.env.INIT_SEED_DATA === 'true') {
          console.log('🌱 初始化种子数据...');
          const seed = spawn('npx', ['sequelize-cli', 'db:seed:all'], {
            stdio: 'inherit',
            cwd: __dirname
          });

          seed.on('close', (seedCode) => {
            if (seedCode === 0) {
              console.log('✅ 种子数据初始化完成');
            } else {
              console.warn('⚠️  种子数据初始化失败，继续启动应用');
            }
            resolve();
          });
        } else {
          resolve();
        }
      } else {
        console.warn('⚠️  数据库迁移失败，继续启动应用');
        resolve();
      }
    });

    migrate.on('error', (err) => {
      console.warn('⚠️  数据库迁移出错:', err.message);
      resolve(); // 继续启动应用
    });
  });
}

// 主启动流程
async function main() {
  try {
    // 初始化数据库
    await initDatabase();
    
    // 启动应用
    startApp();
  } catch (error) {
    console.error('❌ 启动失败:', error);
    process.exit(1);
  }
}

main();