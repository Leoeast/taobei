const request = require('supertest');
const app = require('../../src/app');
const { db, initializeDatabase } = require('../../src/config/database');

describe('Authentication API', () => {
  // 在所有测试前初始化数据库
  beforeAll(() => {
    initializeDatabase();
  });

  // 在每个测试前初始化测试数据
  beforeEach(() => {
    // 清空数据库
    db.exec('DELETE FROM users');
    db.exec('DELETE FROM verification_codes');
    
    // 插入测试用户 13800138000
    const insertUser = db.prepare('INSERT INTO users (phone, created_at, updated_at) VALUES (?, ?, ?)');
    const now = new Date().toISOString();
    insertUser.run('13800138000', now, now);
    
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
      expect(response.body.error).toBe('Invalid phone format.');
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
      // 假设13800138000已注册
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phoneNumber: '13800138000',
          verificationCode: '000000'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Verification code invalid.');
    });

    it('应该在登录成功时返回200和用户信息', async () => {
      // 假设13800138000已注册且验证码正确
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
      // 假设13800138000已注册
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

    it('应该在成功注册新用户时返回201并自动登录', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          phoneNumber: '13800138003',
          verificationCode: '123456',
          agreeAgreement: true
        });

      expect(response.status).toBe(201);
      const stmt = db.prepare("SELECT used FROM verification_codes WHERE phone = ? AND purpose = 'register'");
      const record = stmt.get('13800138003');
      expect(record.used).toBe(1);
    });

    it('过期验证码应无法使用', async () => {
      const expired = new Date(Date.now() - 60 * 1000).toISOString();
      const insertCode = db.prepare('INSERT INTO verification_codes (phone, code, purpose, expires_at, used) VALUES (?, ?, ?, ?, ?)');
      insertCode.run('13800138004', '654321', 'register', expired, 0);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
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
});