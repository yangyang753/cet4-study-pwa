import { useState } from 'react';
import { useAuth } from './AuthProvider';

export function PasswordRecoveryPage() {
  const auth = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  if (auth.status === 'loading') return <p>正在验证密码重置链接…</p>;
  if (success) return <section className="login-card"><h1>密码已更新</h1><p>现在可以使用新密码登录手机和电脑。</p><a href={`${import.meta.env.BASE_URL}account`}>返回账户页面</a></section>;
  if (!auth.isRecoverySession) return <section className="login-card"><h1>链接无效或已过期</h1><p>请返回账户页面重新发送密码重置邮件。</p><a href={`${import.meta.env.BASE_URL}account`}>重新发送邮件</a></section>;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) { setMessage('密码至少需要 8 个字符'); return; }
    if (password !== confirmation) { setMessage('两次输入的密码不一致'); return; }
    setSaving(true); setMessage('');
    try { await auth.updatePassword(password); setPassword(''); setConfirmation(''); setSuccess(true); }
    catch { setMessage('密码更新失败，请重新打开邮件中的链接'); }
    finally { setSaving(false); }
  };

  return <section className="login-card"><h1>设置新密码</h1><form onSubmit={(event) => void submit(event)}><label>新密码<input aria-label="新密码" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label>确认新密码<input aria-label="确认新密码" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><button type="submit" disabled={saving}>{saving ? '正在更新…' : '设置新密码'}</button>{message && <p role="alert">{message}</p>}</form></section>;
}
