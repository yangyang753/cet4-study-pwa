import { useEffect, useState } from 'react';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallHelp() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', capturePrompt);
    return () => window.removeEventListener('beforeinstallprompt', capturePrompt);
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setMessage(choice.outcome === 'accepted' ? '安装请求已发送' : '安装已取消，你可以稍后再试。');
    setInstallPrompt(null);
  }

  return <section className="install-help" aria-labelledby="install-help-title">
    <h2 id="install-help-title">安装到手机桌面</h2>
    <p>安装后可像普通应用一样打开，已访问的页面和练习支持离线使用。</p>
    {installPrompt && <button type="button" onClick={() => void install()}>安装应用</button>}
    <ul>
      <li><strong>iPhone / iPad：</strong>点 Safari 的“分享”，再选“添加到主屏幕”。</li>
      <li><strong>Android：</strong>打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。</li>
    </ul>
    {message && <p role="status">{message}</p>}
  </section>;
}
