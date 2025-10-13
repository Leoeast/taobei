import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterForm from '../../src/components/RegisterForm';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染所有必需的表单元素', () => {
    render(<RegisterForm />);
    
    expect(screen.getByLabelText('手机号')).toBeInTheDocument();
    expect(screen.getByLabelText('验证码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '获取验证码' })).toBeInTheDocument();
    expect(screen.getByLabelText('同意《淘贝用户协议》')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '注册' })).toBeInTheDocument();
  });

  it('应该在未勾选协议时注册按钮不可点击', () => {
    render(<RegisterForm />);
    
    const registerButton = screen.getByRole('button', { name: '注册' });
    const checkbox = screen.getByLabelText('同意《淘贝用户协议》');
    
    expect(registerButton).toBeDisabled();
    expect(checkbox).not.toBeChecked();
  });

  it('应该在勾选协议后注册按钮变为可点击', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    
    const registerButton = screen.getByRole('button', { name: '注册' });
    const checkbox = screen.getByLabelText('同意《淘贝用户协议》');
    
    await user.click(checkbox);
    
    expect(registerButton).not.toBeDisabled();
    expect(checkbox).toBeChecked();
  });

  it('应该在手机号格式无效时禁用获取验证码按钮并显示提示', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    
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
    
    render(<RegisterForm />);
    
    const phoneInput = screen.getByLabelText('手机号');
    const codeButton = screen.getByRole('button', { name: '获取验证码' });
    
    await user.type(phoneInput, '13800138000');
    await user.click(codeButton);
    
    await waitFor(() => {
      expect(screen.getByText(/秒后重试/)).toBeInTheDocument();
    });
  });

  it('应该在已注册手机号注册时提示并直接登录', async () => {
    const user = userEvent.setup();
    const mockOnRegisterSuccess = vi.fn();
    
    // Mock API response for existing user
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ 
        userId: '123', 
        token: 'jwt-token', 
        existingUser: true 
      })
    });
    
    render(<RegisterForm onRegisterSuccess={mockOnRegisterSuccess} />);
    
    const phoneInput = screen.getByLabelText('手机号');
    const codeInput = screen.getByLabelText('验证码');
    const checkbox = screen.getByLabelText('同意《淘贝用户协议》');
    const registerButton = screen.getByRole('button', { name: '注册' });
    
    await user.type(phoneInput, '13800138000');
    await user.type(codeInput, '123456');
    await user.click(checkbox);
    await user.click(registerButton);
    
    await waitFor(() => {
      expect(screen.getByText('该手机号已注册，将直接为您登录')).toBeInTheDocument();
      expect(mockOnRegisterSuccess).toHaveBeenCalledWith({
        userId: '123',
        token: 'jwt-token',
        existingUser: true
      });
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
    
    render(<RegisterForm />);
    
    const phoneInput = screen.getByLabelText('手机号');
    const codeInput = screen.getByLabelText('验证码');
    const checkbox = screen.getByLabelText('同意《淘贝用户协议》');
    const registerButton = screen.getByRole('button', { name: '注册' });
    
    await user.type(phoneInput, '13800138002');
    await user.type(codeInput, '000000');
    await user.click(checkbox);
    await user.click(registerButton);
    
    await waitFor(() => {
      expect(screen.getByText('验证码错误')).toBeInTheDocument();
    });
  });

  it('应该在成功注册新用户时显示成功提示并调用回调', async () => {
    const user = userEvent.setup();
    const mockOnRegisterSuccess = vi.fn();
    
    // Mock successful registration response
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ userId: '456', token: 'new-jwt-token' })
    });
    
    render(<RegisterForm onRegisterSuccess={mockOnRegisterSuccess} />);
    
    const phoneInput = screen.getByLabelText('手机号');
    const codeInput = screen.getByLabelText('验证码');
    const checkbox = screen.getByLabelText('同意《淘贝用户协议》');
    const registerButton = screen.getByRole('button', { name: '注册' });
    
    await user.type(phoneInput, '13800138003');
    await user.type(codeInput, '123456');
    await user.click(checkbox);
    await user.click(registerButton);
    
    await waitFor(() => {
      expect(screen.getByText('注册成功')).toBeInTheDocument();
      expect(mockOnRegisterSuccess).toHaveBeenCalledWith({
        userId: '456',
        token: 'new-jwt-token'
      });
    });
  });
});