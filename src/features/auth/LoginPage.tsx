import { useState, type FormEvent } from 'react';
import { useAuth } from './AuthProvider';

export function LoginPage() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.includes('@')) { setMessage('请输入有效邮箱'); return; }
    if (password.length < 8) { setMessage('密码至少需要 8 位'); return; }
    try { await auth.signIn(email, password); } catch { setMessage('登录失败，请检查邮箱和密码'); }
  }

  async function signUp() {
    if (!email.includes('@') || password.length < 8) { setMessage('请填写有效邮箱和至少 8 位密码'); return; }
    try { await auth.signUp(email, password); setMessage('注册成功；若启用了邮箱验证，请检查收件箱。'); } catch { setMessage('注册失败，请稍后再试'); }
  }

  async function resetPassword() {
    if (!email.includes('@')) { setMessage('请先填写有效邮箱'); return; }
    const redirectTo = new URL(`${import.meta.env.BASE_URL}recover`, window.location.origin).toString();
    try { await auth.resetPassword(email, redirectTo); setMessage('重置邮件已发送，请检查收件箱。'); } catch { setMessage('暂时无法发送重置邮件，请稍后再试'); }
  }

  return <section className="login-card"><h2>登录四级向前</h2><form onSubmit={submit}><label>邮箱<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" /></label><label>密码<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" /></label><div className="login-actions"><button type="submit">登录</button><button className="secondary" type="button" onClick={() => void signUp()}>创建账户</button><button className="secondary" type="button" onClick={() => void resetPassword()}>忘记密码</button></div>{message && <p role="alert">{message}</p>}</form></section>;
}
