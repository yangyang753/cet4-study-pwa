import { Link } from 'react-router-dom';
import { contentCatalog } from '../../content/catalog';
import './exam.css';

export function ExamPicker() {
  return <section className="exam-picker"><header><span>FULL MOCK EXAM</span><h1>完整四级模拟</h1><p>125 分钟 · 57 题 · 交卷前不显示答案解析</p></header><div className="exam-grid">{contentCatalog.mocks.map((mock, index) => <article key={mock.id}><small>模拟卷 {String(index + 1).padStart(2, '0')}</small><h2>{mock.title}</h2><p>写作 30 分钟 · 听力 25 分钟<br />阅读 40 分钟 · 翻译 30 分钟</p><Link className="primary-action" to={`/exam/${mock.id}`}>开始模考</Link></article>)}</div><aside><strong>考试提醒</strong><p>建议预留完整 125 分钟。中途关闭页面后可恢复，刷新不会重置计时。</p></aside></section>;
}
