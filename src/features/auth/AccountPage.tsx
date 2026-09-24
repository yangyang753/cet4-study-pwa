import { useAuth } from './AuthProvider';
import { LoginPage } from './LoginPage';
import './auth.css';
import { SyncStatus } from '../../components/SyncStatus';
import { DataManagement } from './DataManagement';
import { LearningSettings } from '../settings/LearningSettings';
import type { LearningRepository } from '../../data/repositories/LearningRepository';

export function AccountPage({ cloudConfigured, repository }: { cloudConfigured: boolean; repository?: LearningRepository }) {
  const auth = useAuth();
  if (auth.status === 'loading') return <p role="status">正在恢复登录状态…</p>;
  return <section className="account-page"><header><span>ACCOUNT & SYNC</span><h1>账户与跨设备同步</h1><p>本机会优先保存答题记录；联网登录后自动同步到电脑和手机。</p></header><LearningSettings repository={repository} /><div className="cloud-notice"><SyncStatus /></div>{!cloudConfigured && <div className="cloud-notice">当前为离线体验模式。部署时配置 Supabase 环境变量即可启用账户同步。</div>}{auth.user ? <section className="account-card"><h2>{auth.user.email}</h2><p>登录状态正常，待同步记录会在联网后自动上传。</p><button onClick={() => void auth.signOut()}>退出登录</button></section> : cloudConfigured ? <LoginPage /> : null}<DataManagement /></section>;
}
