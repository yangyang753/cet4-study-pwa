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

  return <main><h1>登录四级向前</h1><form onSubmit={submit}><label>邮箱<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" /></label><label>密码<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" /></label><button type="submit">登录</button>{message && <p role="alert">{message}</p>}</form></main>;
}
