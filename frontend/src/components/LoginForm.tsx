import React, { useState, useEffect } from 'react';
import './LoginForm.css';

interface LoginFormProps {
  onLoginSuccess?: (data: { userId: string; token: string }) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

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

  // 获取验证码
  const handleGetCode = async () => {
    if (!isValidPhoneNumber(phoneNumber)) {
      setError('请输入正确的手机号码');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          purpose: 'login'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCountdown(60);
        setError('');
      } else {
        setError(data.error || '获取验证码失败');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 登录
  const handleLogin = async () => {
    if (!phoneNumber || !verificationCode) {
      setError('请填写完整信息');
      return;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      setError('请输入正确的手机号码');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          verificationCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setError('');
        onLoginSuccess?.(data);
      } else {
        if (response.status === 404) {
          setError('该手机号未注册，请先完成注册');
        } else if (response.status === 401) {
          setError('验证码错误');
        } else {
          setError(data.error || '登录失败');
        }
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-form">
      <div className="form-container">
        <div className="form-header">
          <h2>密码登录</h2>
        </div>

        <div className="form-content">
          <div className="input-group">
            <label htmlFor="phone">手机号</label>
            <input
              id="phone"
              type="tel"
              placeholder="请输入手机号"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className={error && !isValidPhoneNumber(phoneNumber) ? 'error' : ''}
            />
          </div>

          <div className="input-group">
            <label htmlFor="code">验证码</label>
            <div className="code-input-wrapper">
              <input
                id="code"
                type="text"
                placeholder="请输入验证码"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
              />
              <button
                type="button"
                className="get-code-btn"
                onClick={handleGetCode}
                disabled={!isValidPhoneNumber(phoneNumber) || countdown > 0 || isLoading}
              >
                {countdown > 0 ? `${countdown}秒后重试` : '获取验证码'}
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="button"
            className="login-btn"
            onClick={handleLogin}
            disabled={isLoading || !phoneNumber || !verificationCode}
          >
            {isLoading ? '登录中...' : '登录'}
          </button>

          <div className="form-footer">
            <div className="other-login">
              <span>忘记账号？</span>
              <span>点击账号？</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;