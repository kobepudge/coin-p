// Sequelize CLI配置文件
require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'coin_user',
    password: process.env.DB_PASSWORD || 'coin_pass_2024',
    database: process.env.DB_NAME || 'coin_trading',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    timezone: '+08:00',
    logging: console.log,
    define: {
      timestamps: true,
      underscored: true,
      underscoredAll: true,
      paranoid: false
    }
  },
  test: {
    username: process.env.DB_USER || 'coin_user',
    password: process.env.DB_PASSWORD || 'coin_pass_2024',
    database: (process.env.DB_NAME || 'coin_trading') + '_test',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    timezone: '+08:00',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      underscoredAll: true,
      paranoid: false
    }
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    timezone: '+08:00',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      underscoredAll: true,
      paranoid: false
    }
  }
};