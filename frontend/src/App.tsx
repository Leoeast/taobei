import React, { useState } from 'react'
import RegisterForm from './components/RegisterForm'
import LoginForm from './components/LoginForm'
import './App.css'

function App() {
  const [activeView, setActiveView] = useState<'login' | 'register'>('login')

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
            {activeView === 'login' ? (
              <LoginForm onNavigateToRegister={() => setActiveView('register')} />
            ) : (
              <RegisterForm onNavigateToLogin={() => setActiveView('login')} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App