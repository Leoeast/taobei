import React, { useEffect, useState } from 'react'
import './ForgotPasswordForm.css'

interface ForgotPasswordFormProps {
  onNavigateToLogin?: (phone?: string) => void
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onNavigateToLogin }) => {
  const [phone, setPhone] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [devCode, setDevCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [captchaImgError, setCaptchaImgError] = useState(false)

  // DEV_CAPTCHA_ANSWER：图形验证码题面 13 + 78 = ? 的正确答案
  const DEV_CAPTCHA_ANSWER = '91'
  // DEV_SMS_CODE：在未返回随机验证码（debugCode）时的默认验证码
  const DEV_SMS_CODE = '123456'

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const isPhoneValid = /^1[3-9]\d{9}$/.test(phone)
  const isCaptchaValid = captcha.trim() === DEV_CAPTCHA_ANSWER
  const canGetCode = isPhoneValid && countdown === 0 && isCaptchaValid
  const isPasswordValid = newPassword.trim().length >= 6
  const isConfirmOk = isPasswordValid && confirmPassword === newPassword
  const canSubmit = isPhoneValid && verificationCode.trim().length > 0 && isConfirmOk

  const handleGetCode = async () => {
    setError('')
    setMessage('')
    // 统一与登录/注册逻辑的用户反馈：手机号不合法或未填图形验证码均提示
    if (!isPhoneValid) {
      setError('请输入正确的手机号码')
      return
    }
    if (!isCaptchaValid) {
      setError(`图形验证码错误，请输入 ${DEV_CAPTCHA_ANSWER}`)
      return
    }
    if (!canGetCode) return
    try {
      const res = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone.trim(), purpose: 'reset' })
      })
      const data = await res.json().catch(() => ({} as any))
      if (res.ok) {
        setMessage('验证码已发送')
        if (data && data.debugCode) {
          setDevCode(String(data.debugCode))
        }
        setCountdown(60)
      } else {
        if (res.status === 429) {
          setError('请求过于频繁，请稍后再试')
        } else if (res.status === 400) {
          setError('输入无效，请检查手机号和用途')
        } else {
          setError(String(data.error || data.message || '获取验证码失败'))
        }
      }
    } catch (e) {
      setError('网络错误，请稍后重试')
    }
  }

  const handleReset = async () => {
    setError('')
    setMessage('')
    // 统一与登录/注册逻辑的用户反馈
    if (!isPhoneValid) {
      setError('请输入正确的手机号码')
      return
    }
    if (verificationCode.trim().length === 0) {
      setError('请填写验证码')
      return
    }
    if (!isConfirmOk) {
      setError('两次输入的密码不一致或长度不足')
      return
    }
    // 前端校验：在伪功能模式下，校验用户输入的验证码是否等于后端返回的随机验证码（debugCode）。
    // 若后端未返回随机验证码，则使用默认 DEV_SMS_CODE 进行比对。
    const enteredCode = verificationCode.trim()
    if (devCode) {
      if (enteredCode !== devCode) {
        setError('验证码错误或已过期')
        return
      }
    } else {
      if (enteredCode !== DEV_SMS_CODE) {
        setError('验证码错误')
        return
      }
    }
    if (!canSubmit) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phone.trim(),
          verificationCode: verificationCode.trim(),
          newPassword: newPassword.trim(),
        })
      })
      const data = await res.json().catch(() => ({} as any))
      if (res.ok) {
        setMessage('密码已更新，请使用密码登录')
        try { alert('重置成功') } catch {}
        onNavigateToLogin?.(phone.trim())
      } else {
        if (res.status === 404) {
          setError('手机号未注册')
        } else if (res.status === 401) {
          setError('验证码错误或已过期')
        } else {
          setError(String(data.error || data.message || '重置失败，请稍后再试'))
        }
      }
    } catch (e) {
      setError('网络错误，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="forgot-form">
      <h2 className="forgot-title">找回登录密码</h2>
      <div className="form-content">
        <div className="input-group phone-group">
          <div className="phone-prefix">
            <select className="country-code" aria-label="国家或地区">
              <option value="+86">中国大陆 +86</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="phone-reset">手机号</label>
            <input
              id="phone-reset"
              type="tel"
              placeholder="请输入手机号"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="form-input phone-input"
            />
          </div>
        </div>

        {/* 图形验证码：用于控制“获取验证码”可用，不做答案校验 */}
        <div className="input-group captcha-group">
          <div style={{ flex: 1 }}>
            <label htmlFor="captcha-reset">图形验证码</label>
            <input
              id="captcha-reset"
              type="text"
              placeholder="请输入图形验证码"
              value={captcha}
              onChange={(e) => setCaptcha(e.target.value)}
              className="form-input captcha-input"
            />
          </div>
          <div className="captcha-image" title="图形验证码：13 + 78 = ?" role="img" aria-label="图形验证码：13 + 78 = ?">
            {captchaImgError ? (
              <span>13 + 78 = ?</span>
            ) : (
              <img className="captcha-img" src="/captcha.png" alt="图形验证码" loading="lazy" onError={() => setCaptchaImgError(true)} />
            )}
          </div>
        </div>

        {/* 短信验证码 */}
        <div className="input-group code-input-wrapper">
          <div style={{ flex: 1 }}>
            <label htmlFor="code-reset">短信验证码</label>
            <input
              id="code-reset"
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
        {/* 演示环境兜底：后端未返回 debugCode 时，展示默认验证码 123456 以便演示 */}
        {!devCode && countdown > 0 && (
          <div style={{ marginBottom: 12, fontSize: 12, color: '#666' }}>
            演示默认验证码: <strong style={{ color: '#ff6600' }}>{DEV_SMS_CODE}</strong>
            <button type="button" onClick={() => setVerificationCode(DEV_SMS_CODE)} style={{ marginLeft: 8, fontSize: 12 }}>一键填充</button>
          </div>
        )}

        {/* 设置新密码 */}
        <div className="input-group">
          <label htmlFor="new-password">新密码（至少6位）</label>
          <div className="password-input-wrapper">
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="请输入新密码"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
          <label htmlFor="confirm-password">确认密码</label>
          <div className="password-input-wrapper">
            <input
              id="confirm-password"
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
          {!isConfirmOk && (newPassword || confirmPassword) && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#d93025' }}>两次输入的密码不一致或长度不足</div>
          )}
        </div>

        {/* 提交按钮 */}
        <button
          type="button"
          onClick={handleReset}
          className="login-btn"
          disabled={!canSubmit || isLoading}
        >
          {isLoading ? '提交中...' : '重置密码'}
        </button>

        {/* 反馈消息 */}
        {error && <div className="error-message">{error}</div>}
        {message && <div className="info-message">{message}</div>}

        {/* 其他操作 */}
        <div className="other-login">
          <span className="link" role="button" onClick={() => onNavigateToLogin?.(phone.trim())}>返回登录</span>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordForm