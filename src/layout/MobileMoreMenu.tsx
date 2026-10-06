import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';

const moreLinks = [
  { to: '/foundation-vocabulary', label: '基础必会词', icon: 'Ab' },
  { to: '/exam', label: '限时模拟', icon: '✓' },
  { to: '/knowledge', label: '高频知识', icon: 'Aa' },
  { to: '/account', label: '账户同步', icon: '◎' },
  { to: '/print', label: 'A4 打印', icon: '▤' },
];

export function MobileMoreMenu() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); window.setTimeout(() => triggerRef.current?.focus(), 0); };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button ref={triggerRef} className="mobile-more-trigger" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <span aria-hidden="true">•••</span>更多
      </button>
      {open && <div className="mobile-more-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
        <section className="mobile-more-menu" role="dialog" aria-modal="true" aria-label="更多学习功能">
          <header><div><small>MORE TOOLS</small><h2>更多学习功能</h2></div><button type="button" aria-label="关闭更多学习功能" onClick={close}>×</button></header>
          <nav aria-label="移动端更多导航">
            {moreLinks.map((item) => <NavLink key={item.to} to={item.to} onClick={close}><span aria-hidden="true">{item.icon}</span><b>{item.label}</b><i aria-hidden="true">→</i></NavLink>)}
          </nav>
        </section>
      </div>}
    </>
  );
}
