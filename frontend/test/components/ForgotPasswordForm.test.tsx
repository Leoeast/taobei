import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, beforeEach, afterAll } from 'vitest'
import ForgotPasswordForm from '../../src/components/ForgotPasswordForm'

// Mock fetch and alert
const originalFetch = global.fetch
const originalAlert = global.alert

describe('ForgotPasswordForm 找回密码流程 UI 测试', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    global.fetch = vi.fn()
    global.alert = vi.fn()
  })

  afterAll(() => {
    global.fetch = originalFetch
    global.alert = originalAlert
  })

  it('应该渲染所有必需的表单元素', () => {
    render(<ForgotPasswordForm />)

    expect(screen.getByText('找回登录密码')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('请输入手机号')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('请输入图形验证码')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('请输入验证码')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('请输入新密码')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('请再次输入密码')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '获取验证码' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重置密码' })).toBeInTheDocument()
    expect(screen.getByText('返回登录')).toBeInTheDocument()
  })

  it('手机号不合法或未填图形验证码时不能发送验证码，点击不会触发请求', async () => {
    render(<ForgotPasswordForm />)

    const phoneInput = screen.getByPlaceholderText('请输入手机号')
    const getCodeBtn = screen.getByRole('button', { name: '获取验证码' })

    await userEvent.type(phoneInput, '123')
    await userEvent.click(getCodeBtn)

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('手机号合法且填了图形验证码时发送验证码成功后启动60秒倒计时并展示工作台验证码', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Code generated.', debugCode: '888888' }) })

    render(<ForgotPasswordForm />)

    const phoneInput = screen.getByPlaceholderText('请输入手机号')
    const captchaInput = screen.getByPlaceholderText('请输入图形验证码')
    const getCodeBtn = screen.getByRole('button', { name: '获取验证码' })

    await userEvent.type(phoneInput, '13800138000')
    await userEvent.type(captchaInput, 'abcd')
    await userEvent.click(getCodeBtn)

    expect(global.fetch).toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.getByText(/秒后重试/)).toBeInTheDocument()
      expect(screen.getByText('验证码已发送')).toBeInTheDocument()
      expect(screen.getByText(/工作台实时验证码/)).toBeInTheDocument()
    })

    // 一键填充工作台验证码
    const fillBtn = screen.getByRole('button', { name: '一键填充' })
    await userEvent.click(fillBtn)
    expect(screen.getByDisplayValue('888888')).toBeInTheDocument()
  })

  it('重置成功后显示提示并调用返回登录回调（携带手机号）', async () => {
    // 第一次 mock 是发送验证码（如果有），第二次 mock 是重置密码
    ;(global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Code generated.' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Password reset.' }) })

    const onNavigateToLogin = vi.fn()
    render(<ForgotPasswordForm onNavigateToLogin={onNavigateToLogin} />)

    const phoneInput = screen.getByPlaceholderText('请输入手机号')
    const captchaInput = screen.getByPlaceholderText('请输入图形验证码')
    const getCodeBtn = screen.getByRole('button', { name: '获取验证码' })
    const codeInput = screen.getByPlaceholderText('请输入验证码')
    const newPwdInput = screen.getByPlaceholderText('请输入新密码')
    const confirmPwdInput = screen.getByPlaceholderText('请再次输入密码')
    const resetBtn = screen.getByRole('button', { name: '重置密码' })

    await userEvent.type(phoneInput, '13800138009')
    await userEvent.type(captchaInput, 'abcd')
    await userEvent.click(getCodeBtn)

    await userEvent.type(codeInput, '123456')
    await userEvent.type(newPwdInput, 'abcdef')
    await userEvent.type(confirmPwdInput, 'abcdef')
    await userEvent.click(resetBtn)

    expect(global.fetch).toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.getByText('密码已更新，请使用密码登录')).toBeInTheDocument()
      expect(global.alert).toHaveBeenCalledWith('重置成功')
      expect(onNavigateToLogin).toHaveBeenCalledWith('13800138009')
    })
  })

  it('重置失败时显示对应错误（手机号未注册或验证码错误）', async () => {
    // 模拟 404 未注册
    ;(global.fetch as any).mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ error: 'Phone not registered.' }) })

    render(<ForgotPasswordForm />)

    const phoneInput = screen.getByPlaceholderText('请输入手机号')
    const codeInput = screen.getByPlaceholderText('请输入验证码')
    const newPwdInput = screen.getByPlaceholderText('请输入新密码')
    const confirmPwdInput = screen.getByPlaceholderText('请再次输入密码')
    const resetBtn = screen.getByRole('button', { name: '重置密码' })

    await userEvent.type(phoneInput, '13800138011')
    await userEvent.type(codeInput, '000000')
    await userEvent.type(newPwdInput, 'abcdef')
    await userEvent.type(confirmPwdInput, 'abcdef')
    await userEvent.click(resetBtn)

    await waitFor(() => {
      expect(screen.getByText('手机号未注册')).toBeInTheDocument()
    })

    // 模拟 401 验证码错误或过期
    ;(global.fetch as any).mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: 'Verification code invalid.' }) })

    await userEvent.click(resetBtn)

    await waitFor(() => {
      expect(screen.getByText('验证码错误或已过期')).toBeInTheDocument()
    })
  })

  it('密码显隐切换与两次输入不一致提示', async () => {
    render(<ForgotPasswordForm />)

    const newPwdInput = screen.getByPlaceholderText('请输入新密码')
    const toggleNewPwdBtn = screen.getByRole('button', { name: '显示密码' })

    await userEvent.type(newPwdInput, 'abcdef')
    await userEvent.click(toggleNewPwdBtn)
    // 切换为明文显示
    expect((newPwdInput as HTMLInputElement).type).toBe('text')

    const confirmPwdInput = screen.getByPlaceholderText('请再次输入密码')
    await userEvent.type(confirmPwdInput, 'abc')

    expect(screen.getByText('两次输入的密码不一致或长度不足')).toBeInTheDocument()
  })

  it('点击“返回登录”会调用回调（携带手机号）', async () => {
    const onNavigateToLogin = vi.fn()
    render(<ForgotPasswordForm onNavigateToLogin={onNavigateToLogin} />)

    const phoneInput = screen.getByPlaceholderText('请输入手机号')
    await userEvent.type(phoneInput, '13800138001')

    const backLink = screen.getByText('返回登录')
    await userEvent.click(backLink)

    expect(onNavigateToLogin).toHaveBeenCalledWith('13800138001')
  })
})