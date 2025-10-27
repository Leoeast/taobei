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
      username TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 兼容旧库：如果旧的 users 表缺少 username 或 password_hash 列，则在初始化阶段添加
  try {
    const columns = db.prepare("PRAGMA table_info('users')").all();
    const colNames = columns.map(c => c.name);
    if (!colNames.includes('username')) {
      db.exec("ALTER TABLE users ADD COLUMN username TEXT NOT NULL DEFAULT ''");
      // 将空用户名更新为手机号（临时策略，后续可完善）
      db.exec("UPDATE users SET username = COALESCE(username, phone)");
    }
    if (!colNames.includes('password_hash')) {
      // 对于旧用户无法回填真实密码哈希，先设置占位值，后续第一次登录/重置密码时更新
      db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT 'legacy-no-password'");
    }
  } catch (e) {
    console.warn('users 表结构检查或迁移失败：', e);
  }

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

  // 索引优化：提升常用查询与限频检索性能
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_verif_codes_phone_purpose_created ON verification_codes (phone, purpose, created_at);
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_verif_codes_lookup ON verification_codes (phone, code, purpose, expires_at, used);
  `);

  console.log('Database initialized successfully');
}

module.exports = {
  db,
  initializeDatabase
};