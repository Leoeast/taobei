import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 允许局域网其他主机访问本地开发服务器
  server: {
    host: true,      // 监听 0.0.0.0，使同一局域网其他设备可访问
    port: 5173,      // 固定端口，便于开放防火墙与共享地址
    strictPort: true,
    cors: true,
    proxy: {
      '/api': {
        // 与后端 Express 默认端口保持一致（backend/src/app.js 默认 3000）
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})