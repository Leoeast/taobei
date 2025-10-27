import React, { useState } from 'react'
import RegisterForm from './components/RegisterForm'
import LoginForm from './components/LoginForm'
import ForgotPasswordForm from './components/ForgotPasswordForm'
import './App.css'

function App() {
  const [activeView, setActiveView] = useState<'login' | 'register' | 'reset'>('login')
  // 供登录页预填手机号并在注册成功后自动请求登录验证码
  const [loginInitPhone, setLoginInitPhone] = useState<string | undefined>(undefined)
  const [loginAutoRequest, setLoginAutoRequest] = useState(false)

  return (
    <div className="App">
      {/* 顶部导航 */}
      <div className="top-nav">
        <div className="logo-section">
          <span className="logo">淘宝</span>
          <span className="logo-en">Taobao</span>
        </div>
        <div className="nav-links">
          <span className="nav-link" role="button" onClick={() => setActiveView('login')}>网站导航</span>
          <span className="nav-link highlight" role="button" onClick={() => setActiveView(activeView === 'login' ? 'register' : 'login')}>
            {activeView === 'login' ? '登录淘宝 免费注册' : '返回登录'}
          </span>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="main-content">
        <div className="login-container">
          {/* 右侧表单登录/注册（移除页面级扫码模块，避免重复） */}
          <div className="form-section">
            {activeView === 'login' && (
              <LoginForm
                onNavigateToRegister={() => setActiveView('register')}
                onNavigateToReset={() => setActiveView('reset')}
                initialPhone={loginInitPhone}
                autoRequestCode={loginAutoRequest}
              />
            )}
            {activeView === 'register' && (
              <RegisterForm
                onNavigateToLogin={(phone?: string) => {
                  setActiveView('login')
                  if (phone && /^1[3-9]\d{9}$/.test(phone)) {
                    setLoginInitPhone(phone)
                    setLoginAutoRequest(true)
                  } else {
                    setLoginAutoRequest(false)
                  }
                }}
                onNavigateToReset={() => setActiveView('reset')}
              />
            )}
            {activeView === 'reset' && (
              <ForgotPasswordForm
                onNavigateToLogin={(phone?: string) => {
                  setActiveView('login')
                  if (phone && /^1[3-9]\d{9}$/.test(phone)) {
                    setLoginInitPhone(phone)
                    // 重置密码后通常使用“密码登录”，不需要自动请求短信验证码
                    setLoginAutoRequest(false)
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App