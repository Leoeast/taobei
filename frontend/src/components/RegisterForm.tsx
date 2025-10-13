import { useState, useEffect, FC } from 'react'
import './RegisterForm.css'

interface RegisterFormProps {}

const RegisterForm: FC<RegisterFormProps> = () => {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [activeTab, setActiveTab] = useState('password') // 'password' or 'sms'

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const isPhoneValid = /^1[3-9]\d{9}$/.test(phone)
  const canGetCode = isPhoneValid && countdown === 0
  const canRegister = isPhoneValid && verificationCode.length >= 4 && agreed

  const handleGetCode = async () => {
    if (!canGetCode) return
    
    try {
      const response = await fetch('http://localhost:3000/api/request-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      })
      
      if (response.ok) {
        setCountdown(60)
        alert('验证码已发送')
      } else {
        alert('发送验证码失败')
      }
    } catch (error) {
      alert('网络错误')
    }
  }

  const handleRegister = async () => {
    if (!canRegister) return
    
    try {
      const response = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          password,
          verificationCode,
        }),
      })
      
      if (response.ok) {
        alert('注册成功')
      } else {
        const error = await response.json()
        alert(error.message || '注册失败')
      }
    } catch (error) {
      alert('网络错误')
    }
  }

  const handleLogin = async () => {
    if (!isPhoneValid || !password) return
    
    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          password,
        }),
      })
      
      if (response.ok) {
        alert('登录成功')
      } else {
        const error = await response.json()
        alert(error.message || '登录失败')
      }
    } catch (error) {
      alert('网络错误')
    }
  }

  return (
    <div className="register-form">
      {/* 标签页切换 */}
      <div className="tab-header">
        <button 
          className={`tab-button ${activeTab === 'password' ? 'active' : ''}`}
          onClick={() => setActiveTab('password')}
        >
          密码登录
        </button>
        <button 
          className={`tab-button ${activeTab === 'sms' ? 'active' : ''}`}
          onClick={() => setActiveTab('sms')}
        >
          短信登录
        </button>
      </div>

      {/* 表单内容 */}
      <div className="form-content">
        {activeTab === 'password' ? (
          // 密码登录表单
          <>
            <div className="input-group">
              <input
                type="tel"
                placeholder="账号名/邮箱/手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="input-group">
              <input
                type="password"
                placeholder="请输入登录密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
              />
            </div>
          </>
        ) : (
          // 短信登录表单
          <>
            <div className="input-group phone-group">
              <div className="phone-prefix">
                <select className="country-code">
                  <option value="+86">+86</option>
                </select>
              </div>
              <input
                type="tel"
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="form-input phone-input"
              />
            </div>
            <div className="input-group verification-group">
              <input
                type="text"
                placeholder="请输入验证码"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="form-input verification-input"
              />
              <button
                type="button"
                onClick={handleGetCode}
                disabled={!canGetCode}
                className={`get-code-btn ${!canGetCode ? 'disabled' : ''}`}
              >
                {countdown > 0 ? `${countdown}s` : '获取验证码'}
              </button>
            </div>
          </>
        )}

        {/* 登录按钮 */}
        <button
          type="button"
          onClick={activeTab === 'password' ? handleLogin : handleRegister}
          className="login-btn"
        >
          登录
        </button>

        {/* 其他登录方式 */}
        <div className="other-login">
          <div className="social-login">
            <div className="social-icon qq">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0z"/>
              </svg>
            </div>
            <div className="social-icon weibo">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0z"/>
              </svg>
            </div>
          </div>
          <div className="login-links">
            <span className="link">忘记登录密码</span>
            <span className="link">免费注册</span>
          </div>
        </div>

        {/* 用户协议 */}
        <div className="agreement">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="checkbox"
            />
            <span className="agreement-text">
              登录即表示你同意淘宝网《服务协议》和《隐私权政策》，请你务必仔细阅读、充分理解各条款内容
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}

export default RegisterForm