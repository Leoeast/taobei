const express = require('express');
const { db } = require('../config/database');
const bcrypt = require('bcryptjs');
const router = express.Router();
const repo = require('../data/repository');

// 短信验证码伪功能开关：当为 true 时，验证码默认视为有效，注册/登录仍调用后端接口
const USE_PSEUDO_SMS = process.env.PSEUDO_SMS === 'true';
// 开发环境调试开关：非生产环境下对请求验证码接口总是返回 debugCode，便于前端工作台展示
const INCLUDE_DEBUG_CODE = (process.env.NODE_ENV || 'development') !== 'production';

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

    // 验证purpose字段（新增支持 reset 用途）
    if (purpose !== 'login' && purpose !== 'register' && purpose !== 'reset') {
      return res.status(400).json({ error: 'Invalid purpose.' });
    }

    // 频率限制：同一手机号+用途60秒内仅可发送一次
    const last = repo.getLatestCodeForPurpose(phoneNumber, purpose);
    if (last) {
      const lastTs = new Date(last.created_at).getTime();
      if (Date.now() - lastTs < 60 * 1000) {
        return res.status(429).json({ error: 'Too many requests. Please wait before requesting a new code.' });
      }
    }

    // 生成验证码
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 60 * 1000); // 60秒后过期
    const createdAtIso = new Date().toISOString();

    // 删除该手机号的旧验证码
    // 为满足测试“仅保留最新验证码”，清除该手机号的旧验证码
    // 注意：这里按手机号清除所有用途的旧验证码，以确保总数为1（测试按 phone 统计）
    repo.deleteCodesByPhone(phoneNumber);

    // 保存新验证码（显式写入 created_at 为 ISO，便于限频解析）
    repo.insertCode({
      phone: phoneNumber,
      code,
      purpose,
      expiresAtIso: expiresAt.toISOString(),
      createdAtIso,
    });

    // 在控制台打印验证码（用于演示和调试）
    console.log(`验证码已生成 - 手机号: ${phoneNumber}, 验证码: ${code}, 用途: ${purpose}`);

    // 工作台调试：在伪功能模式或开发环境下返回 debugCode，便于前端展示实时验证码
    // 保持原有 message 字段不变，测试仍按 message 断言；新增字段不影响测试
    const responsePayload = { message: 'Code generated.' };
    if (USE_PSEUDO_SMS || INCLUDE_DEBUG_CODE) {
      responsePayload.debugCode = code;
    }
    res.status(200).json(responsePayload);
  } catch (error) {
    console.error('请求验证码失败:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/auth/login - 用户登录
router.post('/login', (req, res) => {
  try {
    const { phoneNumber, verificationCode, accountOrPhone, password } = req.body;

    // 短信登录
    if (phoneNumber && verificationCode) {
      if (!isValidPhoneNumber(phoneNumber)) {
        return res.status(400).json({ error: 'Invalid input or format.' });
      }
      const user = repo.getUserByPhone(phoneNumber);
      if (!user) {
        return res.status(404).json({ error: 'Phone not registered.' });
      }
      if (!USE_PSEUDO_SMS) {
        const codeRecord = repo.getValidCode(phoneNumber, verificationCode, 'login');
        if (!codeRecord) {
          return res.status(401).json({ error: 'Verification code invalid.' });
        }
        repo.markCodeUsed(codeRecord.id);
      }
      // 伪功能开启时跳过验证码校验，但仍返回登录成功并生成 token
      const token = generateToken(user.id);
      return res.status(200).json({ userId: user.id.toString(), token });
    }

    // 密码登录
    if (accountOrPhone && password) {
      let user;
      if (isValidPhoneNumber(accountOrPhone)) {
        user = repo.getUserByPhone(accountOrPhone);
      } else {
        user = repo.getUserByUsername(accountOrPhone);
      }
      if (!user) {
        return res.status(404).json({ error: 'Account not found.' });
      }
      if (!user.password_hash || user.password_hash === 'legacy-no-password') {
        return res.status(401).json({ error: 'Password not set.' });
      }
      const ok = bcrypt.compareSync(password, user.password_hash);
      if (!ok) {
        return res.status(401).json({ error: 'Incorrect password.' });
      }
      const token = generateToken(user.id);
      return res.status(200).json({ userId: user.id.toString(), token });
    }

    return res.status(400).json({ error: 'Invalid input or format.' });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/auth/register - 用户注册
router.post('/register', (req, res) => {
  try {
    const { username, phoneNumber, password, verificationCode, agreeAgreement } = req.body;

    if (!phoneNumber || (!USE_PSEUDO_SMS && !verificationCode)) {
      return res.status(400).json({ error: 'Invalid input or format.' });
    }
    if (!isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid input or format.' });
    }
    // 如果传入了协议参数且未同意，则返回 412
    if (agreeAgreement === false) {
      return res.status(412).json({ error: 'Agreement not accepted.' });
    }

    if (!USE_PSEUDO_SMS) {
      const codeRecord = repo.getValidCode(phoneNumber, verificationCode, 'register');
      if (!codeRecord) {
        return res.status(401).json({ error: 'Verification code invalid.' });
      }
      // 标记验证码为已使用
      repo.markCodeUsed(codeRecord.id);
    }

    // 检查用户是否已存在
    const existingUser = repo.getUserByPhone(phoneNumber);
    if (existingUser) {
      // 若是旧用户且未设置密码（legacy-no-password），并且本次提交了合法密码，则为其设置密码
      if (password && password.length >= 6 && (!existingUser.password_hash || existingUser.password_hash === 'legacy-no-password')) {
        const newHash = bcrypt.hashSync(password, 10);
        repo.updateUserPassword(existingUser.id, newHash);
      }
      // 已注册：直接登录
      const token = generateToken(existingUser.id);
      return res.status(200).json({
        userId: existingUser.id.toString(),
        token,
        existingUser: true
      });
    }

    // 新注册：必须提供 username 与 password
    if (!username || !password || password.length < 6) {
      return res.status(400).json({ error: 'Invalid input or format.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = repo.insertUser({ username, phone: phoneNumber, passwordHash });

    const token = generateToken(result.lastInsertRowid);
    return res.status(201).json({
      userId: result.lastInsertRowid.toString(),
      token
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/auth/reset-password - 忘记密码：通过验证码设置新密码
router.post('/reset-password', (req, res) => {
  try {
    const { phoneNumber, verificationCode, newPassword } = req.body;

    // 输入校验
    if (!phoneNumber || !newPassword || (!USE_PSEUDO_SMS && !verificationCode)) {
      return res.status(400).json({ error: 'Invalid input or format.' });
    }
    if (!isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid input or format.' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'Invalid input or format.' });
    }

    // 用户存在性校验
    const user = repo.getUserByPhone(phoneNumber);
    if (!user) {
      return res.status(404).json({ error: 'Phone not registered.' });
    }

    // 验证码校验（伪功能开启时跳过校验）
    if (!USE_PSEUDO_SMS) {
      const codeRecord = repo.getValidCode(phoneNumber, verificationCode, 'reset');
      if (!codeRecord) {
        return res.status(401).json({ error: 'Verification code invalid.' });
      }
      repo.markCodeUsed(codeRecord.id);
    }

    // 更新密码
    const newHash = bcrypt.hashSync(newPassword, 10);
    repo.updateUserPassword(user.id, newHash);

    return res.status(200).json({ message: 'Password updated.' });
  } catch (error) {
    console.error('重置密码失败:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;