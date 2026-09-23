import { Link } from 'react-router-dom';
import { contentCatalog, getPracticeItems } from '../../content/catalog';
import type { PracticeKind } from '../../domain/content';
import './practice.css';

const categories: Array<{ kind: PracticeKind; title: string; count: string; description: string }> = [
  { kind: 'vocabulary', title: '高频词汇', count: `${contentCatalog.vocabulary.length} 词`, description: '词义、词性与例句' },
  { kind: 'grammar', title: '重点语法', count: `${contentCatalog.grammar.length} 个主题`, description: '先找主干，再检查形式' },
  { kind: 'listening', title: '听力', count: `${contentCatalog.listening.length} 套`, description: '短篇新闻、长对话与篇章' },
  { kind: 'reading', title: '阅读', count: `${contentCatalog.reading.length} 套`, description: '选词、匹配与仔细阅读' },
  { kind: 'translation', title: '翻译', count: `${getPracticeItems('translation').length} 篇`, description: '主干分析与高频表达' },
  { kind: 'writing', title: '写作', count: `${getPracticeItems('writing').length} 篇`, description: '观点、理由与总结' },
];

export function PracticeHub() {
  return <section className="practice-hub"><header><span>PRACTICE</span><h1>专项练习</h1><p>从薄弱项开始，每次完成一小组。</p></header><div className="practice-categories">{categories.map((category) => <Link key={category.kind} to={`/practice/${category.kind}`}><span>{category.count}</span><h2>{category.title}</h2><p>{category.description}</p><b>开始练习 →</b></Link>)}</div><p className="source-note">本应用内容为依据四级题型与高频考点编写的原创仿真练习。</p></section>;
}
