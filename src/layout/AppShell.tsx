import type { PropsWithChildren } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import '../styles/global.css';
import { SyncStatus } from '../components/SyncStatus';
import { StudyReminder } from '../components/StudyReminder';
import type { LearningRepository } from '../data/repositories/LearningRepository';
import { MobileMoreMenu } from './MobileMoreMenu';
import { SidebarStudySummary } from './SidebarStudySummary';

const navGroups = [
  { label: '每日训练', links: [
    { to: '/today', label: '今日学习', icon: '⌂' },
    { to: '/listen', label: '听力精练', icon: '◉' },
    { to: '/practice', label: '专项练习', icon: '✎' },
  ] },
  { label: '巩固提升', links: [
    { to: '/review', label: '错题复习', icon: '↻' },
    { to: '/exam', label: '限时模拟', icon: '✓' },
    { to: '/knowledge', label: '高频知识', icon: 'Aa' },
  ] },
  { label: '工具与数据', links: [
    { to: '/account', label: '账户同步', icon: '◎' },
    { to: '/print', label: 'A4 打印', icon: '▤' },
  ] },
];

const mobileLinks = [navGroups[0].links[0], navGroups[0].links[1], navGroups[0].links[2], navGroups[1].links[0]];

function DesktopNav() {
  return (
    <nav className="desktop-nav" aria-label="主导航">
      {navGroups.map((group) => <section className="nav-group" key={group.label} aria-label={group.label}>
        <h2>{group.label}</h2>
        {group.links.map((item) => <NavLink key={item.to} to={item.to}><span aria-hidden="true">{item.icon}</span><b>{item.label}</b><i aria-hidden="true">›</i></NavLink>)}
      </section>)}
    </nav>
  );
}

function MobileNav() {
  return <nav className="mobile-nav" aria-label="移动端主导航">
    {mobileLinks.map((item) => <NavLink key={item.to} to={item.to}><span aria-hidden="true">{item.icon}</span>{item.label}</NavLink>)}
    <MobileMoreMenu />
  </nav>;
}

export function AppShell({ children, repository, today }: PropsWithChildren<{ repository?: LearningRepository; today?: string }>) {
  return (
    <div className="app-shell">
      <StudyReminder repository={repository} />
      <aside className="sidebar">
        <div className="sidebar-top">
          <NavLink className="brand" to="/today" aria-label="四级向前首页">
            <span className="brand-mark">4</span>
            <span><strong>四级向前</strong><small>CET-4 STUDY LAB</small></span>
          </NavLink>
          <span className="sidebar-target">目标 425+</span>
        </div>
        <DesktopNav />
        <div className="sidebar-bottom">
          <SidebarStudySummary repository={repository} today={today} />
          <section className="sidebar-sync-card" aria-label="学习数据状态">
            <div><span className="sync-dot" aria-hidden="true" /><SyncStatus compact /></div>
            <NavLink to="/account" aria-label="备份学习数据">备份与同步 <span aria-hidden="true">→</span></NavLink>
          </section>
        </div>
      </aside>
      <main className="main-content">{children ?? <Outlet />}</main>
      <MobileNav />
    </div>
  );
}
