const express = require('express');
const { db } = require('../config/database');
const router = express.Router();

// 手机号格式验证
function isValidPhoneNumber(phone) {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

// 生成6位验证码
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 生成简单的JWT token (实际项目中应使用专业的JWT库)
function generateToken(userId) {
  return `jwt-token-${userId}-${Date.now()}`;
}

// POST /api/auth/request-code - 请求验证码
router.post('/request-code', (req, res) => {
  try {
    const { phoneNumber, purpose } = req.body;

    // 验证输入参数
    if (!phoneNumber || !purpose) {
      return res.status(400).json({ error: 'Invalid input or format.' });
    }

    // 验证手机号格式
    if (!isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid phone format.' });
    }

    // 验证purpose字段
    if (purpose !== 'login' && purpose !== 'register') {
      return res.status(400).json({ error: 'Invalid phone format.' });
    }

    // 生成验证码
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 60 * 1000); // 60秒后过期

    // 删除该手机号的旧验证码
    const deleteStmt = db.prepare('DELETE FROM verification_codes WHERE phone = ?');
    deleteStmt.run(phoneNumber);

    // 保存新验证码
    const insertStmt = db.prepare(`
      INSERT INTO verification_codes (phone, code, purpose, expires_at)
      VALUES (?, ?, ?, ?)
    `);
    insertStmt.run(phoneNumber, code, purpose, expiresAt.toISOString());

    // 在控制台打印验证码（用于演示和调试）
    console.log(`验证码已生成 - 手机号: ${phoneNumber}, 验证码: ${code}, 用途: ${purpose}`);

    res.status(200).json({ message: 'Code generated.' });
  } catch (error) {
    console.error('请求验证码失败:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/auth/login - 用户登录
router.post('/login', (req, res) => {
  try {
    const { phoneNumber, verificationCode } = req.body;

    // 验证输入参数
    if (!phoneNumber || !verificationCode) {
      return res.status(400).json({ error: 'Invalid input or format.' });
    }

    // 验证手机号格式
    if (!isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid input or format.' });
    }

    // 检查用户是否已注册
    const userStmt = db.prepare('SELECT * FROM users WHERE phone = ?');
    const user = userStmt.get(phoneNumber);

    if (!user) {
      return res.status(404).json({ error: 'Phone not registered.' });
    }

    // 验证验证码
    const now = new Date().toISOString();
    const codeStmt = db.prepare(`
      SELECT * FROM verification_codes 
      WHERE phone = ? AND code = ? AND purpose = 'login' AND used = 0 AND expires_at > ?
    `);
    const codeRecord = codeStmt.get(phoneNumber, verificationCode, now);

    if (!codeRecord) {
      return res.status(401).json({ error: 'Verification code invalid.' });
    }

    // 标记验证码为已使用
    const updateStmt = db.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?');
    updateStmt.run(codeRecord.id);

    // 生成token并返回
    const token = generateToken(user.id);
    res.status(200).json({ 
      userId: user.id.toString(), 
      token: token 
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/auth/register - 用户注册
router.post('/register', (req, res) => {
  try {
    const { phoneNumber, verificationCode, agreeAgreement } = req.body;

    // 验证输入参数
    if (!phoneNumber || !verificationCode || agreeAgreement === undefined) {
      return res.status(400).json({ error: 'Invalid input or format.' });
    }

    // 验证手机号格式
    if (!isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid input or format.' });
    }

    // 检查是否同意协议
    if (!agreeAgreement) {
      return res.status(412).json({ error: 'Agreement not accepted.' });
    }

    // 验证验证码
    const now = new Date().toISOString();
    const codeStmt = db.prepare(`
      SELECT * FROM verification_codes 
      WHERE phone = ? AND code = ? AND purpose = 'register' AND used = 0 AND expires_at > ?
    `);
    const codeRecord = codeStmt.get(phoneNumber, verificationCode, now);

    if (!codeRecord) {
      return res.status(401).json({ error: 'Verification code invalid.' });
    }

    // 检查用户是否已存在
    const userStmt = db.prepare('SELECT * FROM users WHERE phone = ?');
    const existingUser = userStmt.get(phoneNumber);

    // 标记验证码为已使用
    const updateStmt = db.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?');
    updateStmt.run(codeRecord.id);

    if (existingUser) {
      // 用户已存在，直接登录
      const token = generateToken(existingUser.id);
      return res.status(200).json({ 
        userId: existingUser.id.toString(), 
        token: token,
        existingUser: true
      });
    } else {
      // 创建新用户
      const insertStmt = db.prepare(`
        INSERT INTO users (phone, created_at, updated_at)
        VALUES (?, ?, ?)
      `);
      const now = new Date().toISOString();
      const result = insertStmt.run(phoneNumber, now, now);
      
      const token = generateToken(result.lastInsertRowid);
      return res.status(201).json({ 
        userId: result.lastInsertRowid.toString(), 
        token: token 
      });
    }
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;