const { db } = require('../config/database');

// 为避免在测试环境中尚未初始化表结构就 prepare 导致的错误，以下查询均在函数调用时 prepare

// Users repository
function getUserByPhone(phone) {
  return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
}

function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function insertUser({ username, phone, passwordHash }) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO users (username, phone, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(username, phone, passwordHash, now, now);
  return result;
}

function updateUserPassword(userId, passwordHash) {
  const now = new Date().toISOString();
  const stmt = db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?');
  stmt.run(passwordHash, now, userId);
}

// Verification codes repository
function getLatestCodeForPurpose(phone, purpose) {
  const stmt = db.prepare(`
    SELECT * FROM verification_codes 
    WHERE phone = ? AND purpose = ? 
    ORDER BY created_at DESC LIMIT 1
  `);
  return stmt.get(phone, purpose);
}

function getValidCode(phone, code, purpose) {
  const nowIso = new Date().toISOString();
  const stmt = db.prepare(`
    SELECT * FROM verification_codes 
    WHERE phone = ? AND code = ? AND purpose = ? AND used = 0 AND expires_at > ?
  `);
  return stmt.get(phone, code, purpose, nowIso);
}

function markCodeUsed(id) {
  db.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(id);
}

function deleteCodesByPhone(phone) {
  db.prepare('DELETE FROM verification_codes WHERE phone = ?').run(phone);
}

function deleteCodesByPhonePurpose(phone, purpose) {
  db.prepare('DELETE FROM verification_codes WHERE phone = ? AND purpose = ?').run(phone, purpose);
}

function insertCode({ phone, code, purpose, expiresAtIso, createdAtIso }) {
  const stmt = db.prepare(`
    INSERT INTO verification_codes (phone, code, purpose, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(phone, code, purpose, expiresAtIso, createdAtIso);
}

module.exports = {
  // users
  getUserByPhone,
  getUserByUsername,
  insertUser,
  updateUserPassword,
  // verification codes
  getLatestCodeForPurpose,
  getValidCode,
  markCodeUsed,
  deleteCodesByPhone,
  deleteCodesByPhonePurpose,
  insertCode,
};