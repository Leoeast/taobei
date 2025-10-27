// 确保在加载应用路由之前关闭伪短信模式（强制验证码校验）
process.env.PSEUDO_SMS = 'false';
const request = require('supertest');
const app = require('../../src/app');
const { db, initializeDatabase } = require('../../src/config/database');
const bcrypt = require('bcryptjs');

describe('Authentication API', () => {
  // 在所有测试前初始化数据库
  beforeAll(() => {
    initializeDatabase();
    // 测试环境默认关闭伪短信功能，确保验证码校验生效
    process.env.PSEUDO_SMS = 'false';
  });

  // 在每个测试前初始化测试数据
  beforeEach(() => {
    // 清空数据库
    db.exec('DELETE FROM users');
    db.exec('DELETE FROM verification_codes');
    
    // 插入测试用户 13800138000（含用户名与密码哈希：secret123）
    const insertUser = db.prepare('INSERT INTO users (username, phone, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)');
    const now = new Date().toISOString();
    const hash = bcrypt.hashSync('secret123', 10);
    insertUser.run('user13800138000', '13800138000', hash, now, now);

    // 插入一个无密码的旧用户（用于测试 Password not set）
    insertUser.run('legacyUser', '13800138006', 'legacy-no-password', now, now);
    
    // 插入有效的验证码用于测试
    const insertCode = db.prepare('INSERT INTO verification_codes (phone, code, purpose, expires_at, used) VALUES (?, ?, ?, ?, ?)');
    const expiresAt = new Date(Date.now() + 60 * 1000).toISOString(); // 60秒后过期
    
    // 为登录测试插入验证码
    insertCode.run('13800138000', '123456', 'login', expiresAt, 0);
    // 为注册测试插入验证码
    insertCode.run('13800138000', '123456', 'register', expiresAt, 0);
    insertCode.run('13800138003', '123456', 'register', expiresAt, 0);
  });

  describe('POST /api/auth/request-code', () => {
    it('应该在手机号格式无效时返回400错误', async () => {
      const response = await request(app)
        .post('/api/auth/request-code')
        .send({
          phoneNumber: '123',
          purpose: 'login'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid phone format.');
    });

    it('应该在手机号格式正确时返回200并生成验证码', async () => {
      const response = await request(app)
        .post('/api/auth/request-code')
        .send({
          phoneNumber: '13800138000',
          purpose: 'login'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Code generated.');
    });

    it('应该在purpose字段非法时返回400错误', async () => {
      const response = await request(app)
        .post('/api/auth/request-code')
        .send({
          phoneNumber: '13800138000',
          purpose: 'invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid purpose.');
    });

    it('同一手机号+用途60秒内第二次请求应返回429错误', async () => {
      const first = await request(app)
        .post('/api/auth/request-code')
        .send({ phoneNumber: '13800138005', purpose: 'login' });
      expect(first.status).toBe(200);

      const second = await request(app)
        .post('/api/auth/request-code')
        .send({ phoneNumber: '13800138005', purpose: 'login' });
      expect(second.status).toBe(429);
      expect(second.body.error).toBe('Too many requests. Please wait before requesting a new code.');
    });

    it('应该支持用途 purpose=reset 并生成验证码', async () => {
      const response = await request(app)
        .post('/api/auth/request-code')
        .send({ phoneNumber: '13800138000', purpose: 'reset' });

      expect(response.status).toBe(200);
      // 验证库中存在 purpose=reset 的验证码记录
      const rec = db.prepare("SELECT code, purpose FROM verification_codes WHERE phone = ? ORDER BY created_at DESC LIMIT 1").get('13800138000');
      expect(rec).toBeTruthy();
      expect(rec.purpose).toBe('reset');
    });
  });

  describe('POST /api/auth/login', () => {
    it('应该在使用未注册手机号时返回404错误', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phoneNumber: '13800138001',
          verificationCode: '123456'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Phone not registered.');
    });

    it('应该在验证码错误时返回401错误', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phoneNumber: '13800138000',
          verificationCode: '000000'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Verification code invalid.');
    });

    it('应该在短信登录成功时返回200和用户信息', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phoneNumber: '13800138000',
          verificationCode: '123456'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('token');
    });

    it('应该在密码未设置时返回401错误', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ accountOrPhone: '13800138006', password: 'anything' });
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Password not set.');
    });

    it('应该在密码错误时返回401错误', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ accountOrPhone: 'user13800138000', password: 'wrong' });
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Incorrect password.');
    });

    it('应该在密码登录成功（使用用户名）时返回200', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ accountOrPhone: 'user13800138000', password: 'secret123' });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('token');
    });

    it('应该在密码登录成功（使用手机号）时返回200', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ accountOrPhone: '13800138000', password: 'secret123' });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('token');
    });
  });

  describe('POST /api/auth/register', () => {
    it('应该在未同意协议时返回412错误', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          phoneNumber: '13800138002',
          verificationCode: '123456',
          agreeAgreement: false
        });

      expect(response.status).toBe(412);
      expect(response.body.error).toBe('Agreement not accepted.');
    });

    it('应该在验证码错误时返回401错误', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          phoneNumber: '13800138002',
          verificationCode: '000000',
          agreeAgreement: true
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Verification code invalid.');
    });

    it('应该在已注册手机号注册时返回200并直接登录', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          phoneNumber: '13800138000',
          verificationCode: '123456',
          agreeAgreement: true
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('token');
      expect(response.body.existingUser).toBe(true);
    });

    it('应该在成功注册新用户时返回201并自动登录且落库哈希密码', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          phoneNumber: '13800138003',
          password: 'newpass123',
          verificationCode: '123456',
          agreeAgreement: true
        });

      expect(response.status).toBe(201);
      const stmt = db.prepare("SELECT used FROM verification_codes WHERE phone = ? AND purpose = 'register'");
      const record = stmt.get('13800138003');
      expect(record.used).toBe(1);

      const u = db.prepare('SELECT username, password_hash FROM users WHERE phone = ?').get('13800138003');
      expect(u.username).toBe('newuser');
      expect(u.password_hash && u.password_hash !== 'legacy-no-password').toBe(true);
      expect(bcrypt.compareSync('newpass123', u.password_hash)).toBe(true);
    });

    it('过期验证码应无法使用', async () => {
      const expired = new Date(Date.now() - 60 * 1000).toISOString();
      const insertCode = db.prepare('INSERT INTO verification_codes (phone, code, purpose, expires_at, used) VALUES (?, ?, ?, ?, ?)');
      insertCode.run('13800138004', '654321', 'register', expired, 0);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'x',
          password: 'x12345',
          phoneNumber: '13800138004',
          verificationCode: '654321',
          agreeAgreement: true
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Verification code invalid.');
    });

    it('请求验证码应清除旧记录并仅保留最新验证码', async () => {
      // 预置两条旧验证码
      const insertCode = db.prepare('INSERT INTO verification_codes (phone, code, purpose, expires_at, used) VALUES (?, ?, ?, ?, ?)');
      const future = new Date(Date.now() + 60 * 1000).toISOString();
      insertCode.run('13800138005', '111111', 'register', future, 0);
      insertCode.run('13800138005', '222222', 'register', future, 0);

      const response = await request(app)
        .post('/api/auth/request-code')
        .send({
          phoneNumber: '13800138005',
          purpose: 'register'
        });

      expect(response.status).toBe(200);
      const countStmt = db.prepare('SELECT COUNT(*) as cnt FROM verification_codes WHERE phone = ?');
      const { cnt } = countStmt.get('13800138005');
      expect(cnt).toBe(1);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('应该在使用未注册手机号时返回404错误', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ phoneNumber: '13800138099', verificationCode: '123456', newPassword: 'newpass123' });
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Phone not registered.');
    });

    it('应该在验证码错误时返回401错误', async () => {
      // 为重置流程插入有效验证码
      const insertCode = db.prepare('INSERT INTO verification_codes (phone, code, purpose, expires_at, used) VALUES (?, ?, ?, ?, ?)');
      const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();
      insertCode.run('13800138000', '654321', 'reset', expiresAt, 0);

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ phoneNumber: '13800138000', verificationCode: '000000', newPassword: 'newpass123' });
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Verification code invalid.');
    });

    it('应该在成功重置密码时返回200并更新密码哈希且标记验证码为已使用', async () => {
      // 为登录用户插入重置验证码
      const insertCode = db.prepare('INSERT INTO verification_codes (phone, code, purpose, expires_at, used) VALUES (?, ?, ?, ?, ?)');
      const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();
      insertCode.run('13800138000', '987654', 'reset', expiresAt, 0);

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ phoneNumber: '13800138000', verificationCode: '987654', newPassword: 'newSecret123' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password updated.');

      // 验证验证码标记为已使用
      const codeRecord = db.prepare("SELECT used FROM verification_codes WHERE phone = ? AND purpose = 'reset' ORDER BY id DESC LIMIT 1").get('13800138000');
      expect(codeRecord.used).toBe(1);

      // 验证用户密码哈希已更新且可正确比对
      const user = db.prepare('SELECT password_hash FROM users WHERE phone = ?').get('13800138000');
      expect(bcrypt.compareSync('newSecret123', user.password_hash)).toBe(true);
    });
  });
});