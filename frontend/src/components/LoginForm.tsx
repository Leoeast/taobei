import React, { useState, useEffect } from 'react';
import './LoginForm.css';

interface LoginFormProps {
  onLoginSuccess?: (data: { userId: string; token: string }) => void;
  onNavigateToRegister?: () => void;
  onNavigateToReset?: () => void;
  // 从注册页跳转时预填手机号并自动请求登录验证码
  initialPhone?: string;
  autoRequestCode?: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess, onNavigateToRegister, onNavigateToReset, initialPhone, autoRequestCode }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loginMethod, setLoginMethod] = useState<'sms' | 'password'>('sms');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captcha, setCaptcha] = useState('');
  // 开发工作台：实时展示后端返回的验证码（仅在后端伪功能模式启用时返回）
  const [devCode, setDevCode] = useState('');
  // DEV_SMS_CODE：在未返回随机验证码（debugCode）时的默认验证码
  const DEV_SMS_CODE = '123456';

  // 预填手机号（来自注册成功后的跳转）
  useEffect(() => {
    if (initialPhone && initialPhone !== phoneNumber) {
      setPhoneNumber(initialPhone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPhone]);

  // 自动请求登录验证码，修复“注册后无法通过手机验证登录”的问题
  useEffect(() => {
    if (autoRequestCode && initialPhone && countdown === 0) {
      // 仅在前置条件满足时触发一次请求
      if (isValidPhoneNumber(initialPhone)) {
        handleGetCode();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRequestCode, initialPhone]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const isValidPhoneNumber = (phone: string) => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  // 获取验证码：调用后端 /api/auth/request-code
  const DEV_CAPTCHA_ANSWER = '91'
  const isCaptchaValid = captcha.trim() === DEV_CAPTCHA_ANSWER

  const handleGetCode = async () => {
    setError('');
    setInfo('');
    setDevCode('');
    if (!isValidPhoneNumber(phoneNumber)) {
      setError('请输入正确的手机号码');
      return;
    }
    // 为与演示逻辑保持一致，要求图形验证码正确后才允许获取短信验证码
    if (!isCaptchaValid) {
      setError(`图形验证码错误，请输入 ${DEV_CAPTCHA_ANSWER}`);
      return;
    }
    if (countdown > 0 || isLoading) return;
    // 伪功能模式下也继续调用后端 /api/auth/request-code 以保持倒计时与限频体验，验证码校验由后端控制
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim(), purpose: 'login' }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (res.ok) {
        setCountdown(60);
        setInfo('验证码已发送');
        if (data && data.debugCode) {
          setDevCode(String(data.debugCode));
        }
      } else {
        if (res.status === 429) {
          setError('请求过于频繁，请稍后再试');
        } else if (res.status === 400) {
          setError('输入无效，请检查手机号和用途');
        } else if (res.status === 404) {
          setError('接口不存在：请确认后端服务或代理配置');
        } else {
          const err = data;
          if (err && (err.error || err.message)) {
            setError(String(err.error || err.message));
          } else {
            setError('验证码发送失败，请稍后重试');
          }
          console.warn('request-code error', res.status, err);
        }
      }
    } catch (e) {
      setError('网络错误：后端未启动或代理未配置，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 短信登录：调用后端 /api/auth/login
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
    // 前端校验：在伪功能模式下，校验用户输入验证码是否等于后端返回的随机验证码（debugCode）。
    // 若后端未返回随机验证码，则使用默认 DEV_SMS_CODE 进行比对。
    const enteredCode = verificationCode.trim();
    if (devCode) {
      if (enteredCode !== devCode) {
        setError('验证码错误');
        return;
      }
    } else {
      if (enteredCode !== DEV_SMS_CODE) {
        setError('验证码错误');
        return;
      }
    }
    // 伪功能模式下也继续调用后端登录接口，验证码校验由后端控制（PSEUDO_SMS=true 时跳过）
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim(), verificationCode: verificationCode.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setInfo('登录成功！');
        try { alert('登录成功！'); } catch {}
        onLoginSuccess?.({ userId: data.userId, token: data.token });
      } else {
        if (res.status === 404) {
          setError('该手机号未注册，请先完成注册');
        } else if (res.status === 401) {
          setError('验证码错误');
        } else {
          const err = await res.json().catch(() => ({} as any));
          if (err && (err.error || err.message)) {
            setError(String(err.error || err.message));
          } else {
            setError('登录失败，请稍后重试');
          }
          console.warn('login(sms) error', res.status, err);
        }
      }
    } catch (e) {
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 密码登录：调用后端 /api/auth/login（账号或手机号 + 密码）
  const handlePasswordLogin = async () => {
    setError('');
    setInfo('');
    if (!account || !password) {
      setError('请填写账号和密码');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountOrPhone: account.trim(), password: password.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setInfo('登录成功！');
        try { alert('登录成功！'); } catch {}
        onLoginSuccess?.({ userId: data.userId, token: data.token });
      } else {
        if (res.status === 404) {
          setError('账号不存在');
        } else if (res.status === 401) {
          const err = await res.json().catch(() => ({} as any));
          if (err && err.error === 'Password not set.') {
            setError('该账号未设置密码，请使用短信登录');
          } else if (err && (err.error || err.message)) {
            setError(String(err.error || err.message));
          } else {
            setError('密码错误');
          }
          console.warn('login(password) error', res.status, err);
        } else {
          const err = await res.json().catch(() => ({} as any));
          if (err && (err.error || err.message)) {
            setError(String(err.error || err.message));
          } else {
            setError('登录失败，请稍后重试');
          }
          console.warn('login(password) error', res.status, err);
        }
      }
    } catch (e) {
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-form">
      <div className="form-container">
        <div className="login-layout">
          <div className="qr-section">
            <h3>手机扫码登录</h3>
            <div className="qr-box" aria-label="二维码登录">
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
                    <input id="code" type="text" placeholder="请输入验证码" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} maxLength={6} />
                    <button type="button" className="get-code-btn" onClick={handleGetCode}>{countdown > 0 ? `${countdown}秒后重试` : '获取验证码'}</button>
                  </div>
                </div>
                {/* 图形验证码，仅展示，不做强校验 */}
                <div className="input-group captcha-group">
                  <div className="captcha-input-wrapper">
                    <input id="captcha" type="text" placeholder="请输入图形验证码" value={captcha} onChange={(e)=>setCaptcha(e.target.value)} />
                  </div>
                  <div className="captcha-image" role="img" aria-label="图形验证码：13+78=?">13 + 78 = ?</div>
                </div>

                {error && <div className="error-message">{error}</div>}
                {info && !error && <div className="info-message">{info}</div>}
                {/* 开发工作台：展示后端返回的实时验证码，并支持一键填充 */}
                {!error && devCode && (
                  <div className="info-message" style={{ marginTop: 6 }}>
                    工作台实时验证码: <strong style={{ color: '#ff6600' }}>{devCode}</strong>
                    <button type="button" className="get-code-btn" onClick={() => setVerificationCode(devCode)} style={{ marginLeft: 8, padding: '4px 8px' }}>一键填充</button>
                  </div>
                )}
                {/* 演示环境兜底：后端未返回 debugCode 时，展示默认验证码 123456 以便演示 */}
                {!error && !devCode && countdown > 0 && (
                  <div className="info-message" style={{ marginTop: 6 }}>
                    演示默认验证码: <strong style={{ color: '#ff6600' }}>{DEV_SMS_CODE}</strong>
                    <button type="button" className="get-code-btn" onClick={() => setVerificationCode(DEV_SMS_CODE)} style={{ marginLeft: 8, padding: '4px 8px' }}>一键填充</button>
                  </div>
                )}

                <button type="button" className="login-btn" onClick={handleLogin} disabled={isLoading || !phoneNumber || !verificationCode}>{isLoading ? '登录中...' : '登录'}</button>

                <div className="form-footer">
                  <div className="other-login">
                    <span role="button" onClick={onNavigateToReset} style={{ color: '#0066cc' }}>忘记密码？</span>
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
                      placeholder="请输入密码"
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

                {/* 图形验证码，仅展示 */}
                <div className="input-group captcha-group">
                  <div className="captcha-input-wrapper">
                    <input id="captcha2" type="text" placeholder="请输入图形验证码" value={captcha} onChange={(e)=>setCaptcha(e.target.value)} />
                  </div>
                  <div className="captcha-image" role="img" aria-label="图形验证码：13+78=?">13 + 78 = ?</div>
                </div>

                {error && <div className="error-message">{error}</div>}
                {info && !error && <div className="info-message">{info}</div>}

                <button type="button" className="login-btn" onClick={handlePasswordLogin} disabled={isLoading || !account || !password}>{isLoading ? '登录中...' : '登录'}</button>

                <div className="form-footer">
                  <div className="other-login">
                    <span role="button" onClick={onNavigateToReset} style={{ color: '#0066cc' }}>忘记密码？</span>
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