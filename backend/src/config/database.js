const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 数据库配置
const dbConfig = {
  test: ':memory:', // 测试环境使用内存数据库
  development: path.join(__dirname, '../../data/app.db'),
  production: path.join(__dirname, '../../data/app.db')
};

const env = process.env.NODE_ENV || 'development';
const dbPath = dbConfig[env];
const dataDir = path.dirname(dbPath);
if (env !== 'test' && !fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 创建数据库连接
const db = new Database(dbPath);

// 初始化数据库表结构
function initializeDatabase() {
  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 验证码表
  db.exec(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      purpose TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database initialized successfully');
}

module.exports = {
  db,
  initializeDatabase
};