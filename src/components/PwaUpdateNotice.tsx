import { useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

export function PwaUpdateNotice() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const update = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);
  useEffect(() => {
    update.current = registerSW({ immediate: true, onNeedRefresh: () => setUpdateAvailable(true) });
  }, []);
  if (!updateAvailable) return null;
  return <aside className="pwa-update" role="status"><span>学习内容已有新版本</span><button onClick={() => void update.current?.(true)}>立即更新</button><button onClick={() => setUpdateAvailable(false)}>稍后</button></aside>;
}
