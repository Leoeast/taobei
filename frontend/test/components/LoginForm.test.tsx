import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '../../src/components/LoginForm';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染所有必需的表单元素', () => {
    render(<LoginForm />);
    
    expect(screen.getByLabelText('手机号')).toBeInTheDocument();
    expect(screen.getByLabelText('验证码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '获取验证码' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
  });

  it('应该在手机号格式无效时禁用获取验证码按钮并显示提示', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    
    const phoneInput = screen.getByLabelText('手机号');
    const codeButton = screen.getByRole('button', { name: '获取验证码' });
    
    await user.type(phoneInput, '123');
    await user.click(codeButton);
    
    await waitFor(() => {
      expect(screen.getByText('请输入正确的手机号码')).toBeInTheDocument();
    });
  });

  it('应该在成功请求验证码后开始60秒倒计时', async () => {
    const user = userEvent.setup();
    
    // Mock successful API response
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Code generated.' })
    });
    
    render(<LoginForm />);
    
    const phoneInput = screen.getByLabelText('手机号');
    const codeButton = screen.getByRole('button', { name: '获取验证码' });
    
    await user.type(phoneInput, '13800138000');
    await user.click(codeButton);
    
    await waitFor(() => {
      expect(screen.getByText(/秒后重试/)).toBeInTheDocument();
    });
  });

  it('应该在使用未注册手机号登录时显示错误提示', async () => {
    const user = userEvent.setup();
    
    // Mock API response for unregistered phone
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Phone not registered.' })
    });
    
    render(<LoginForm />);
    
    const phoneInput = screen.getByLabelText('手机号');
    const codeInput = screen.getByLabelText('验证码');
    const loginButton = screen.getByRole('button', { name: '登录' });
    
    await user.type(phoneInput, '13800138001');
    await user.type(codeInput, '123456');
    await user.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText('该手机号未注册，请先完成注册')).toBeInTheDocument();
    });
  });

  it('应该在验证码错误时显示错误提示', async () => {
    const user = userEvent.setup();
    
    // Mock API response for invalid code
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Verification code invalid.' })
    });
    
    render(<LoginForm />);
    
    const phoneInput = screen.getByLabelText('手机号');
    const codeInput = screen.getByLabelText('验证码');
    const loginButton = screen.getByRole('button', { name: '登录' });
    
    await user.type(phoneInput, '13800138000');
    await user.type(codeInput, '000000');
    await user.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText('验证码错误')).toBeInTheDocument();
    });
  });

  it('应该在登录成功时调用回调函数', async () => {
    const user = userEvent.setup();
    const mockOnLoginSuccess = vi.fn();
    
    // Mock successful login response
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ userId: '123', token: 'jwt-token' })
    });
    
    render(<LoginForm onLoginSuccess={mockOnLoginSuccess} />);
    
    const phoneInput = screen.getByLabelText('手机号');
    const codeInput = screen.getByLabelText('验证码');
    const loginButton = screen.getByRole('button', { name: '登录' });
    
    await user.type(phoneInput, '13800138000');
    await user.type(codeInput, '123456');
    await user.click(loginButton);
    
    await waitFor(() => {
      expect(mockOnLoginSuccess).toHaveBeenCalledWith({
        userId: '123',
        token: 'jwt-token'
      });
    });
  });
});