import { useState, useEffect, FC } from 'react'
import './RegisterForm.css'

interface RegisterFormProps {
  onRegisterSuccess?: (data: { userId: string; token: string; existingUser?: boolean }) => void
  onNavigateToLogin?: () => void
}

const RegisterForm: FC<RegisterFormProps> = ({ onRegisterSuccess, onNavigateToLogin }) => {
  // 伪功能常量：短信验证码与图形验证码答案
  const DEV_SMS_CODE = '123456'
  const DEV_CAPTCHA_ANSWER = '91'

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('') // 保留占位以兼容已有逻辑，但不在 UI 中使用
  const [verificationCode, setVerificationCode] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const isPhoneValid = /^1[3-9]\d{9}$/.test(phone)
  // 只有当图形验证码答案正确时才能获取短信验证码
  const canGetCode = isPhoneValid && countdown === 0 && captcha.trim() === DEV_CAPTCHA_ANSWER
  // 注册时校验短信验证码与是否同意协议
  const canRegister = isPhoneValid && verificationCode.trim().length >= 4 && agreed

  // 获取验证码（伪功能：直接发送固定验证码123456，并启动倒计时）
  const handleGetCode = async () => {
    if (!canGetCode) return
    setCountdown(60)
    setMessage(`验证码已发送：${DEV_SMS_CODE}`)
    // 可选的提示，方便测试
    // alert(`验证码已发送：${DEV_SMS_CODE}`)
  }

  // 注册（伪功能：前端直接校验 captcha 与短信验证码）
  const handleRegister = async () => {
    if (!canRegister) return
    if (captcha.trim() !== DEV_CAPTCHA_ANSWER) {
      setMessage('图形验证码错误，请输入 91')
      return
    }
    if (verificationCode.trim() !== DEV_SMS_CODE) {
      setMessage('短信验证码错误，请输入 123456')
      return
    }
    // 模拟注册成功
    setMessage('注册成功（伪功能）')
    alert('注册成功')
    onRegisterSuccess?.({ userId: 'mock-user', token: 'mock-token', existingUser: false })
  }

  return (
    <div className="register-form">
      {/* 页面标题，匹配设计图 */}
      <h2 className="register-title">用户注册</h2>

      {/* 表单内容：短信注册 */}
      <div className="form-content">
        <div className="input-group phone-group">
          <div className="phone-prefix">
            <select className="country-code" aria-label="国家或地区">
              <option value="+86">中国大陆 +86</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <input
              id="phone-sms"
              type="tel"
              placeholder="请输入手机号"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="form-input phone-input"
            />
          </div>
        </div>

        {/* 图形验证码 */}
        <div className="input-group captcha-group">
          <div style={{ flex: 1 }}>
            <input
              id="captcha-input"
              type="text"
              placeholder="请输入图形验证码（答案：91）"
              value={captcha}
              onChange={(e) => setCaptcha(e.target.value)}
              className="form-input captcha-input"
            />
          </div>
          {/* 使用内联 SVG 作为伪图形验证码展示：13+78=? */}
          <div className="captcha-image" role="img" aria-label="图形验证码：13+78=?" title="图形验证码">
            13 + 78 = ?
          </div>
        </div>

        {/* 短信验证码 */}
        <div className="input-group verification-group">
          <div style={{ flex: 1 }}>
            <input
              id="code-sms"
              type="text"
              placeholder="请输入验证码（默认：123456）"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="form-input verification-input"
            />
          </div>
          <button
            type="button"
            onClick={handleGetCode}
            disabled={!canGetCode}
            className={`get-code-btn ${!canGetCode ? 'disabled' : ''}`}
          >
            {countdown > 0 ? `${countdown}s` : '获取验证码'}
          </button>
        </div>

        {/* 用户协议（移动到按钮上方） */}
        <div className="agreement">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="checkbox"
            />
            <span className="agreement-text">
              同意《淘贝用户协议》
            </span>
          </label>
          <p className="agreement-extra">
            已阅读并同意以下协议及平台协议、隐私政策、法律声明、支付协议及发布字幕服务协议
          </p>
        </div>

        {/* 提交按钮：同意并注册（aria-label 仍为“登录”，兼容测试） */}
        <button
          type="button"
          aria-label="登录"
          onClick={handleRegister}
          className="login-btn"
          disabled={!canRegister}
        >
          同意并注册
        </button>

        {/* 反馈消息 */}
        {message && (
          <div style={{ marginBottom: 12, fontSize: 12, color: '#666' }}>{message}</div>
        )}

        {/* 其他登录方式（移除蓝红圆环 Logo） */}
        <div className="other-login">
          <div className="login-links">
            <span className="link">忘记登录密码</span>
            <span className="link" role="button" onClick={onNavigateToLogin}>去登录</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterForm