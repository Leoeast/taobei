import React from 'react'
import RegisterForm from './components/RegisterForm'
import './App.css'

function App() {
  return (
    <div className="App">
      {/* 顶部导航 */}
      <div className="top-nav">
        <div className="logo-section">
          <span className="logo">淘宝</span>
          <span className="logo-en">Taobao</span>
        </div>
        <div className="nav-links">
          <span className="nav-link">网站导航</span>
          <span className="nav-link highlight">登录淘宝 免费注册</span>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="main-content">
        <div className="login-container">
          {/* 左侧扫码登录 */}
          <div className="qr-section">
            <h3>手机扫码登录</h3>
          <div className="qr-code">
            <svg width="200" height="200" viewBox="0 0 200 200">
              <rect width="200" height="200" fill="white"/>
              {/* 简化的二维码图案 */}
              <g fill="black">
                <rect x="20" y="20" width="20" height="20"/>
                <rect x="60" y="20" width="20" height="20"/>
                <rect x="100" y="20" width="20" height="20"/>
                <rect x="140" y="20" width="20" height="20"/>
                <rect x="180" y="20" width="20" height="20"/>
                <rect x="20" y="60" width="20" height="20"/>
                <rect x="180" y="60" width="20" height="20"/>
                <rect x="20" y="100" width="20" height="20"/>
                <rect x="60" y="100" width="20" height="20"/>
                <rect x="100" y="100" width="20" height="20"/>
                <rect x="140" y="100" width="20" height="20"/>
                <rect x="180" y="100" width="20" height="20"/>
                <rect x="20" y="140" width="20" height="20"/>
                <rect x="180" y="140" width="20" height="20"/>
                <rect x="20" y="180" width="20" height="20"/>
                <rect x="60" y="180" width="20" height="20"/>
                <rect x="100" y="180" width="20" height="20"/>
                <rect x="140" y="180" width="20" height="20"/>
                <rect x="180" y="180" width="20" height="20"/>
              </g>
            </svg>
            <div className="qr-overlay">
              <div className="qr-status">二维码已失效</div>
              <button className="qr-refresh">刷新</button>
            </div>
          </div>
            <p className="qr-tip">打开手机淘宝，扫码登录</p>
            <p className="register-link">免费注册淘宝？</p>
          </div>

          {/* 右侧表单登录 */}
          <div className="form-section">
            <RegisterForm />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App