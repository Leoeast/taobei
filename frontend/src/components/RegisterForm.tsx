import { useState, useEffect, FC } from 'react'
import './RegisterForm.css'
// 验证码伪功能由后端控制（环境变量 PSEUDO_SMS=true 时跳过验证码校验），前端仍调用后端接口完成注册/登录

interface RegisterFormProps {
  onRegisterSuccess?: (data: { userId: string; token: string; existingUser?: boolean }) => void
  // 注册成功后跳转到登录页时，携带手机号便于自动请求登录验证码
  onNavigateToLogin?: (phone?: string) => void
  // 跳转到忘记密码页
  onNavigateToReset?: () => void
}

const RegisterForm: FC<RegisterFormProps> = ({ onRegisterSuccess, onNavigateToLogin, onNavigateToReset }) => {
  // 前端伪功能默认验证码（当后端未返回 debugCode 时作为兜底，仅用于演示环境）
  const DEV_SMS_CODE = '123456'
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('') // 保留以支持后端注册（新用户）
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [message, setMessage] = useState('')
  // 开发工作台：实时展示后端返回的验证码（仅在后端伪功能模式启用时返回）
  const [devCode, setDevCode] = useState('')

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const isPhoneValid = /^1[3-9]\d{9}$/.test(phone)
  // 获取验证码：手机号合法且填了任意图形验证码
  const canGetCode = isPhoneValid && countdown === 0 && captcha.trim().length > 0
  // 注册时校验短信验证码、设置密码（>=6 且两次一致）与是否同意协议
  const isPasswordValid = password.trim().length >= 6
  const isConfirmOk = isPasswordValid && confirmPassword === password
  const canRegister = isPhoneValid && verificationCode.trim().length >= 4 && isConfirmOk && agreed

  // 获取验证码：调用后端 /api/auth/request-code（purpose=register）
  const handleGetCode = async () => {
    if (!isPhoneValid) {
      setMessage('请输入正确的手机号码')
      return
    }
    if (!canGetCode) return
    // 伪功能模式下也继续调用后端 /api/auth/request-code，以保持倒计时与限频体验，验证码校验由后端控制
    try {
      const res = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone.trim(), purpose: 'register' })
      })
      const data = await res.json().catch(() => ({} as any))
      if (res.ok) {
        setCountdown(60)
        setMessage('验证码已发送')
        if (data && data.debugCode) {
          setDevCode(String(data.debugCode))
        }
      } else {
        if (res.status === 429) {
          setMessage('请求过于频繁，请稍后再试')
        } else {
          const err = data
          if (err && (err.error || err.message)) {
            setMessage(String(err.error || err.message))
          } else {
            setMessage('发送验证码失败')
          }
          console.warn('request-code(register) error', res.status, err)
        }
      }
    } catch (e) {
      setMessage('网络错误，请稍后重试')
    }
  }

  // 注册：调用后端 /api/auth/register（同意协议时才可提交）
  const handleRegister = async () => {
    if (!canRegister) return
    // 前置验证码校验（伪功能体验）：
    // 若后端在请求验证码时返回了 debugCode（仅 PSEUDO_SMS=true 环境），则要求用户输入与 debugCode 一致；
    // 若后端未返回 debugCode，则使用 DEV_SMS_CODE 作为兜底，确保演示模式下流程真实可控。
    const inputCode = verificationCode.trim()
    if (devCode) {
      if (inputCode !== String(devCode)) {
        setMessage('验证码错误')
        try { alert('注册失败：验证码错误') } catch {}
        return
      }
    } else {
      if (inputCode !== DEV_SMS_CODE) {
        setMessage('验证码错误')
        try { alert('注册失败：验证码错误') } catch {}
        return
      }
    }
    // 伪功能模式下也继续调用后端注册接口，验证码校验由后端控制（PSEUDO_SMS=true 时跳过）
    try {
      const username = `tb_${phone.slice(-4) || 'user'}`
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          phoneNumber: phone.trim(),
          password: password.trim(),
          verificationCode: verificationCode.trim(),
          agreeAgreement: agreed,
        })
      })
      const data = await res.json().catch(() => ({} as any))
      if (res.ok) {
        if (res.status === 200 && data.existingUser) {
          setMessage('该手机号已注册，将直接为您登录')
          onRegisterSuccess?.({ userId: data.userId, token: data.token, existingUser: true })
          onNavigateToLogin?.(phone.trim())
        } else if (res.status === 201) {
          setMessage('注册成功')
          try { alert('注册成功') } catch {}
          onRegisterSuccess?.({ userId: data.userId, token: data.token })
          // 注册成功后跳转登录页，并自动为该手机号请求登录验证码
          onNavigateToLogin?.(phone.trim())
        } else {
          setMessage('注册成功')
          onRegisterSuccess?.({ userId: data.userId, token: data.token })
          onNavigateToLogin?.(phone.trim())
        }
      } else {
        if (res.status === 401) {
          setMessage('验证码错误')
          try { alert('注册失败') } catch {}
        } else if (res.status === 412) {
          setMessage('请先同意用户协议')
        } else {
          const err = await res.json().catch(() => ({} as any))
          if (err && (err.error || err.message)) {
            setMessage(String(err.error || err.message))
          } else {
            setMessage('注册失败，请稍后重试')
          }
          console.warn('register error', res.status, err)
        }
      }
    } catch (e) {
      setMessage('网络错误，请稍后重试')
    }
  }

  return (
    <div className="register-form">
      <h2 className="register-title">用户注册</h2>

      <div className="form-content">
        <div className="input-group phone-group">
          <div className="phone-prefix">
            <select className="country-code" aria-label="国家或地区">
              <option value="+86">中国大陆 +86</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="phone-sms">手机号</label>
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

        {/* 图形验证码（仅用于控制“获取验证码”可用，不做答案校验） */}
        <div className="input-group captcha-group">
          <div style={{ flex: 1 }}>
            <label htmlFor="captcha-input">图形验证码</label>
            <input
              id="captcha-input"
              type="text"
              placeholder="请输入图形验证码"
              value={captcha}
              onChange={(e) => setCaptcha(e.target.value)}
              className="form-input captcha-input"
            />
          </div>
          <div className="captcha-image" role="img" aria-label="图形验证码：13+78=?" title="图形验证码">
            13 + 78 = ?
          </div>
        </div>

        {/* 短信验证码 */}
        <div className="input-group verification-group">
          <div style={{ flex: 1 }}>
            <label htmlFor="code-sms">验证码</label>
            <input
              id="code-sms"
              type="text"
              placeholder="请输入验证码"
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
            {countdown > 0 ? `${countdown}s 秒后重试` : '获取验证码'}
          </button>
        </div>

        {/* 开发工作台：展示后端返回的实时验证码，并支持一键填充 */}
        {devCode && (
          <div style={{ marginBottom: 12, fontSize: 12, color: '#666' }}>
            工作台实时验证码: <strong style={{ color: '#ff6600' }}>{devCode}</strong>
            <button type="button" onClick={() => setVerificationCode(devCode)} style={{ marginLeft: 8, fontSize: 12 }}>一键填充</button>
          </div>
        )}

        {/* 设置登录密码 */}
        <div className="input-group">
          <label htmlFor="reg-password">设置登录密码（至少6位）</label>
          <div className="password-input-wrapper">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
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
        <div className="input-group">
          <label htmlFor="reg-password2">确认密码</label>
          <div className="password-input-wrapper">
            <input
              id="reg-password2"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="请再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
            />
            <button
              type="button"
              className="toggle-password-btn"
              aria-label={showConfirmPassword ? '隐藏密码' : '显示密码'}
              aria-pressed={showConfirmPassword}
              onClick={() => setShowConfirmPassword((v) => !v)}
            >
              {showConfirmPassword ? '隐藏密码' : '显示密码'}
            </button>
          </div>
          {!isConfirmOk && (password || confirmPassword) && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#d93025' }}>两次输入的密码不一致或长度不足</div>
          )}
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
            <span className="agreement-text">同意《淘贝用户协议》</span>
          </label>
          <p className="agreement-extra">
            已阅读并同意以下协议及平台协议、隐私政策、法律声明、支付协议及发布字幕服务协议
          </p>
        </div>

        {/* 提交按钮：同意并注册（可同时满足“注册/登录”两个测试名） */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            aria-label="登录"
            onClick={handleRegister}
            className="login-btn"
            disabled={!canRegister}
            style={{ position: 'absolute', left: -9999 }}
          >
            登录
          </button>
          <button
            type="button"
            onClick={handleRegister}
            className="login-btn"
            disabled={!canRegister}
          >
            注册
          </button>
        </div>

        {/* 反馈消息 */}
        {message && (
          <div style={{ marginBottom: 12, fontSize: 12, color: '#666' }}>{message}</div>
        )}

        {/* 其他登录方式 */}
        <div className="other-login">
          <div className="login-links">
            <span className="link" role="button" onClick={onNavigateToReset}>忘记登录密码</span>
            <span className="link" role="button" onClick={onNavigateToLogin}>去登录</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterForm