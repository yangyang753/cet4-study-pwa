import type { PropsWithChildren } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import '../styles/global.css';
import { SyncStatus } from '../components/SyncStatus';
import { StudyReminder } from '../components/StudyReminder';

const primaryLinks = [
  { to: '/today', label: '今日学习', icon: '⌂' },
  { to: '/listen', label: '听力精练', icon: '◉' },
  { to: '/practice', label: '专项练习', icon: '✎' },
  { to: '/review', label: '错题复习', icon: '↻' },
  { to: '/exam', label: '限时模拟', icon: '✓' },
  { to: '/knowledge', label: '高频知识', icon: 'Aa', desktopOnly: true },
  { to: '/account', label: '账户同步', icon: '◎' },
  { to: '/print', label: 'A4 打印', icon: '▤' },
];

function PrimaryNav({ mobile = false }: { mobile?: boolean }) {
  return (
    <nav className={mobile ? 'mobile-nav' : 'desktop-nav'} aria-label={mobile ? '移动端主导航' : '主导航'}>
      {primaryLinks.filter((item) => !(mobile && item.desktopOnly)).map((item) => (
        <NavLink key={item.to} to={item.to}>
          <span aria-hidden="true">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <StudyReminder />
      <aside className="sidebar">
        <NavLink className="brand" to="/today" aria-label="四级向前首页">
          <span className="brand-mark">4</span>
          <span><strong>四级向前</strong><small>CET-4 Study Lab</small></span>
        </NavLink>
        <PrimaryNav />
        <div className="desktop-sync"><SyncStatus compact /></div>
      </aside>
      <main className="main-content">{children ?? <Outlet />}</main>
      <div className="mobile-sync"><SyncStatus compact /></div>
      <PrimaryNav mobile />
    </div>
  );
}
