import { useAuth } from './AuthProvider';
import { LoginPage } from './LoginPage';
import './auth.css';
import { SyncStatus } from '../../components/SyncStatus';
import { DataManagement } from './DataManagement';
import { LearningSettings } from '../settings/LearningSettings';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { PwaInstallHelp } from '../../components/PwaInstallHelp';

export function AccountPage({ cloudConfigured, repository }: { cloudConfigured: boolean; repository?: LearningRepository }) {
  const auth = useAuth();
  if (auth.status === 'loading') return <p role="status">正在恢复登录状态…</p>;
  return <section className="account-page"><header><span>ACCOUNT & SYNC</span><h1>账户与跨设备同步</h1><p>{cloudConfigured ? '本机会优先保存答题记录；登录后可同步到电脑和手机。' : '当前学习记录保存在这个浏览器中，可离线使用。'}</p></header><LearningSettings repository={repository} /><PwaInstallHelp /><div className="cloud-notice"><SyncStatus /></div>{!cloudConfigured && <div className="cloud-notice local-only-warning"><strong>当前没有启用云端同步</strong><p>学习记录只保存在当前浏览器，手机和电脑不会自动同步。网页版本更新也不会把学习记录同步到另一台设备。</p><p>换设备时，请先在旧设备导出 JSON，再到另一台设备导入 JSON。</p></div>}{auth.user ? <section className="account-card"><h2>{auth.user.email}</h2><p>登录状态正常，待同步记录会在联网后自动上传。</p><button onClick={() => void auth.signOut()}>退出登录</button></section> : cloudConfigured ? <LoginPage /> : null}<DataManagement /></section>;
}
