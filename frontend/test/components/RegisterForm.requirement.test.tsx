import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, beforeEach, afterAll } from 'vitest'
import RegisterForm from '../../src/components/RegisterForm'

// Mock fetch and alert
const originalFetch = global.fetch
const originalAlert = global.alert

beforeEach(() => {
  vi.restoreAllMocks()
  global.fetch = vi.fn()
  global.alert = vi.fn()
})

describe('RegisterForm 基于 requirement_sign_up 的功能测试（仅短信注册，获取验证码需要图形验证码）', () => {
  it('默认展示短信注册，包含手机号、图形验证码、短信验证码和“获取验证码”按钮', async () => {
    render(<RegisterForm />)

    expect(screen.getByPlaceholderText('请输入手机号')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('请输入图形验证码')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('请输入验证码')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '获取验证码' })).toBeInTheDocument()
  })

  it('手机号不合法时不能发送验证码，点击不会触发请求', async () => {
    render(<RegisterForm />)

    const phoneInput = screen.getByPlaceholderText('请输入手机号')
    const captchaInput = screen.getByPlaceholderText('请输入图形验证码')
    const getCodeBtn = screen.getByRole('button', { name: '获取验证码' })

    await userEvent.type(phoneInput, '123')
    await userEvent.type(captchaInput, 'abcd')
    await userEvent.click(getCodeBtn)

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('手机号合法且填了图形验证码时发送验证码成功后启动60秒倒计时', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Code generated.' }) })

    render(<RegisterForm />)

    const phoneInput = screen.getByPlaceholderText('请输入手机号')
    const captchaInput = screen.getByPlaceholderText('请输入图形验证码')
    const getCodeBtn = screen.getByRole('button', { name: '获取验证码' })

    await userEvent.type(phoneInput, '13800138000')
    await userEvent.type(captchaInput, 'abcd')
    await userEvent.click(getCodeBtn)

    expect(global.fetch).toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.getByText(/\ds/)).toBeInTheDocument() // 显示如“60s”
    })
  })

  it('未勾选协议时点击登录（注册）不会发起请求', async () => {
    render(<RegisterForm />)

    const phoneInput = screen.getByPlaceholderText('请输入手机号')
    const codeInput = screen.getByPlaceholderText('请输入验证码')
    const loginBtn = screen.getByRole('button', { name: '登录' })

    await userEvent.type(phoneInput, '13800138003')
    await userEvent.type(codeInput, '123456')
    await userEvent.click(loginBtn)

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('勾选协议且验证码有效时点击登录（注册）会成功并提示', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ userId: '456', token: 'new-jwt-token' }) })

    render(<RegisterForm />)

    const phoneInput = screen.getByPlaceholderText('请输入手机号')
    const codeInput = screen.getByPlaceholderText('请输入验证码')
    const checkbox = screen.getByRole('checkbox')
    const loginBtn = screen.getByRole('button', { name: '登录' })

    await userEvent.type(phoneInput, '13800138003')
    await userEvent.type(codeInput, '123456')
    await userEvent.click(checkbox)
    await userEvent.click(loginBtn)

    expect(global.fetch).toHaveBeenCalled()
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('注册成功')
    })
  })

  it('验证码错误时提示错误', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: 'Verification code invalid.' }) })

    render(<RegisterForm />)

    const phoneInput = screen.getByPlaceholderText('请输入手机号')
    const codeInput = screen.getByPlaceholderText('请输入验证码')
    const checkbox = screen.getByRole('checkbox')
    const loginBtn = screen.getByRole('button', { name: '登录' })

    await userEvent.type(phoneInput, '13800138002')
    await userEvent.type(codeInput, '000000')
    await userEvent.click(checkbox)
    await userEvent.click(loginBtn)

    expect(global.fetch).toHaveBeenCalled()
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('注册失败')
    })
  })
})

// 恢复全局对象以避免影响其他测试
afterAll(() => {
  global.fetch = originalFetch
  global.alert = originalAlert
})