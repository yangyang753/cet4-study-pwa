import { useState, type ChangeEvent } from 'react';
import { clearLocalLearningData, exportLearningData, importLearningData } from '../../data/backup/learningBackup';
import { studyDate } from '../../lib/studyDate';

export interface DataManagementActions { exportData(): Promise<unknown> | unknown; importData(input: unknown): Promise<void> | void; clearData(): Promise<void> | void }
const defaultActions: DataManagementActions = { exportData: exportLearningData, importData: (input) => importLearningData(undefined, input), clearData: clearLocalLearningData };

export function DataManagement({ actions = defaultActions }: { actions?: DataManagementActions }) {
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const download = async () => {
    const data = await actions.exportData();
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `cet4-study-backup-${studyDate()}.json`; anchor.click(); URL.revokeObjectURL(url);
    setMessage('备份已导出。');
  };
  const restore = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    try { await actions.importData(await file.text()); setMessage('备份导入成功。'); } catch (error) { setMessage(error instanceof Error ? error.message : '导入失败。'); }
    event.target.value = '';
  };
  const clear = async () => { await actions.clearData(); setConfirmation(''); setMessage('本机学习数据已清空。'); };
  return <section className="data-management"><h2>数据备份与恢复</h2><p>手动换设备：先在旧设备导出 JSON 备份，再在新设备导入 JSON。导入前会检查文件结构和版本。</p><div className="data-actions"><button onClick={() => void download()}>导出 JSON 备份</button><label className="file-button">导入 JSON<input type="file" accept="application/json,.json" onChange={(event) => void restore(event)} /></label></div><h3>清空本机数据</h3><p>请输入“清空本机数据”后再执行，此操作不会删除云端数据。</p><label>清空确认<input aria-label="清空确认" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><button className="danger" disabled={confirmation !== '清空本机数据'} onClick={() => void clear()}>清空本机数据</button>{message && <p role="status">{message}</p>}</section>;
}
