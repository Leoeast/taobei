import React, { useState, useEffect } from 'react';
import './LoginForm.css';

interface LoginFormProps {
  onLoginSuccess?: (data: { userId: string; token: string }) => void;
  onNavigateToRegister?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess, onNavigateToRegister }) => {
  // 伪功能常量：短信验证码与图形验证码答案
  const DEV_SMS_CODE = '123456';
  const DEV_CAPTCHA_ANSWER = '91';

  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [countdown, setCountdown] = useState(0);
  // 登录方式：短信/密码（默认短信以兼容现有测试），二维码固定在左侧
  const [loginMethod, setLoginMethod] = useState<'sms' | 'password'>('sms');
  // 密码登录的账号与密码
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // 图形验证码（登录需要）
  const [captcha, setCaptcha] = useState('');

  // 倒计时效果
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // 手机号格式验证
  const isValidPhoneNumber = (phone: string) => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  // 获取验证码（伪功能：要求图形验证码为91，发送固定验证码123456）
  const handleGetCode = async () => {
    setError('');
    setInfo('');
    if (!isValidPhoneNumber(phoneNumber)) {
      setError('请输入正确的手机号码');
      return;
    }
    if (countdown > 0 || isLoading) {
      return;
    }
    if (captcha.trim() !== DEV_CAPTCHA_ANSWER) {
      setError('请先完成图形验证码（答案：91）');
      return;
    }
    setIsLoading(true);
    try {
      // 伪功能不调用后端，直接设置倒计时与提示
      setCountdown(60);
      setInfo(`验证码已发送：${DEV_SMS_CODE}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 登录（伪功能：本地校验验证码与图形验证码）
  const handleLogin = async () => {
    setError('');
    setInfo('');
    if (!phoneNumber || !verificationCode) {
      setError('请填写完整信息');
      return;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      setError('请输入正确的手机号码');
      return;
    }

    if (captcha.trim() !== DEV_CAPTCHA_ANSWER) {
      setError('图形验证码错误，请输入 91');
      return;
    }

    if (verificationCode.trim() !== DEV_SMS_CODE) {
      setError('短信验证码错误，请输入 123456');
      return;
    }

    // 模拟登录成功
    alert('登录成功');
    onLoginSuccess?.({ userId: 'mock-user', token: 'mock-token' });
  };

  // 密码登录（伪功能：仅允许密码为 admin，同时校验图形验证码为91）
  const handlePasswordLogin = async () => {
    setError('');
    setInfo('');
    if (!account || !password) {
      setError('请填写账号和密码');
      return;
    }
    if (captcha.trim() !== DEV_CAPTCHA_ANSWER) {
      setError('图形验证码错误，请输入 91');
      return;
    }
    if (password !== 'admin') {
      setError('密码错误，请输入 admin');
      return;
    }
    // 模拟登录成功
    alert('登录成功');
    onLoginSuccess?.({ userId: 'mock-user', token: 'mock-token' });
  };

  return (
    <div className="login-form">
      <div className="form-container">
        <div className="login-layout">
          <div className="qr-section">
            <h3>手机扫码登录</h3>
            <div className="qr-box" aria-label="二维码登录">
              {/* 使用项目图片 ./qrcode.png */}
              <img className="qr-img" alt="二维码" src="/qrcode.png" />
            </div>
            <div className="qr-tips">打开淘宝APP-点击左上角扫一扫</div>
          </div>
          <div className="form-section">
            <div className="form-tabs" role="tablist" aria-label="登录方式">
              <button type="button" className={`form-tab ${loginMethod==='password'?'active':''}`} onClick={() => setLoginMethod('password')} aria-label="密码登录">密码登录</button>
              <button type="button" className={`form-tab ${loginMethod==='sms'?'active':''}`} onClick={() => setLoginMethod('sms')} aria-label="短信登录">短信登录</button>
            </div>

            {loginMethod === 'sms' && (
              <div className="form-content">
                <div className="input-group">
                  <label htmlFor="phone">手机号</label>
                  <input id="phone" type="tel" placeholder="请输入手机号" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className={error && !isValidPhoneNumber(phoneNumber) ? 'error' : ''} />
                </div>
                <div className="input-group">
                  <label htmlFor="code">验证码</label>
                  <div className="code-input-wrapper">
                    <input id="code" type="text" placeholder="请输入验证码（默认：123456）" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} maxLength={6} />
                    <button type="button" className="get-code-btn" onClick={handleGetCode}>{countdown > 0 ? `${countdown}秒后重试` : '获取验证码'}</button>
                  </div>
                </div>
                {/* 图形验证码 */}
                <div className="input-group captcha-group">
                  <div className="captcha-input-wrapper">
                    <input id="captcha" type="text" placeholder="请输入图形验证码（答案：91）" value={captcha} onChange={(e)=>setCaptcha(e.target.value)} />
                  </div>
                  <div className="captcha-image" role="img" aria-label="图形验证码：13+78=?">13 + 78 = ?</div>
                </div>

                {error && <div className="error-message">{error}</div>}
                {info && !error && <div className="info-message">{info}</div>}

                <button type="button" className="login-btn" onClick={handleLogin} disabled={isLoading || !phoneNumber || !verificationCode}>{isLoading ? '登录中...' : '登录'}</button>

                <div className="form-footer">
                  <div className="other-login">
                    <span>忘记账号？</span>
                    <span role="button" onClick={onNavigateToRegister} style={{ color: '#0066cc' }}>免费注册</span>
                  </div>
                </div>
              </div>
            )}

            {loginMethod === 'password' && (
              <div className="form-content">
                <div className="input-group">
                  <label htmlFor="account">账号</label>
                  <input id="account" type="text" placeholder="请输入账号/手机号/邮箱" value={account} onChange={(e) => setAccount(e.target.value)} />
                </div>
                <div className="input-group">
                  <label htmlFor="password">密码</label>
                  <div className="password-input-wrapper">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入密码（密码：admin）"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="toggle-password-btn"
                      aria-label={showPassword ? '隐藏密码' : '显示密码'}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? '隐藏密码' : '显示密码'}
                    </button>
                  </div>
                </div>

                {/* 图形验证码 */}
                <div className="input-group captcha-group">
                  <div className="captcha-input-wrapper">
                    <input id="captcha2" type="text" placeholder="请输入图形验证码（答案：91）" value={captcha} onChange={(e)=>setCaptcha(e.target.value)} />
                  </div>
                  <div className="captcha-image" role="img" aria-label="图形验证码：13+78=?">13 + 78 = ?</div>
                </div>

                {error && <div className="error-message">{error}</div>}
                {info && !error && <div className="info-message">{info}</div>}

                <button type="button" className="login-btn" onClick={handlePasswordLogin} disabled={isLoading || !account || !password}>{isLoading ? '登录中...' : '登录'}</button>

                <div className="form-footer">
                  <div className="other-login">
                    <span>忘记密码？</span>
                    <span role="button" onClick={onNavigateToRegister} style={{ color: '#0066cc' }}>免费注册</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;