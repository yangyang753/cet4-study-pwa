import { useMemo, useState } from 'react';
import { contentCatalog } from '../../content/catalog';
import { buildPrintPacket, type PrintPacketKind, type PrintPage as PacketPage } from './buildPrintPacket';
import './print.css';

const practiceOptions = [
  ['vocabulary', '词汇'], ['grammar', '语法'], ['listening', '听力'], ['reading', '阅读'], ['writing', '写作'], ['translation', '翻译'],
] as const;

function Sheet({ page, answers = false }: { page: PacketPage; answers?: boolean }) {
  return <section className={`print-sheet ${answers ? 'answer-sheet' : ''}`} data-page={page.pageNumber}>
    <h1>{page.title}</h1>
    {!answers && <div className="print-meta"><span>姓名：____________</span><span>日期：____________</span><span>原创仿真练习</span></div>}
    {page.blocks.map((block) => {
      if (block.kind === 'writing-space') return <div key={`${block.questionId}:space`} className="writing-space" aria-label={`${block.questionId} 答题区`} />;
      if (block.kind === 'knowledge') return <div key={block.questionId} className="knowledge-block"><b>{block.title}</b><span>{block.text}</span></div>;
      return <div key={`${block.questionId}:${block.kind}`} className="print-block"><h2>{block.title} {block.text}</h2>{block.options?.map((option) => <p key={option}>{option}</p>)}{answers && <><p className="print-answer"><strong>答案：</strong>{block.answer ?? '见上一段'}</p><p className="print-explanation"><strong>解析：</strong>{block.explanation}</p></>}</div>;
    })}
    <footer>第 {page.pageNumber} 页 / 共 {page.totalPages} 页</footer>
  </section>;
}

export function PrintPage() {
  const [kind, setKind] = useState<PrintPacketKind>('daily');
  const [sourceId, setSourceId] = useState('reading');
  const [includeKnowledge, setIncludeKnowledge] = useState(true);
  const packet = useMemo(() => buildPrintPacket({ kind, sourceId: kind === 'mock' ? (sourceId.startsWith('mock-') ? sourceId : 'mock-1') : sourceId, includeKnowledge, pageCapacity: 8 }), [includeKnowledge, kind, sourceId]);
  const changeKind = (next: PrintPacketKind) => { setKind(next); setSourceId(next === 'mock' ? 'mock-1' : 'reading'); };

  return <section className="print-center">
    <header className="print-toolbar"><div><h1>A4 打印预览</h1><p>题目页与答案解析页分离，页码按实际内容自动计算。</p></div><div className="print-controls"><label>练习来源<select aria-label="练习来源" value={kind} onChange={(event) => changeKind(event.target.value as PrintPacketKind)}><option value="daily">今日 60 分钟</option><option value="practice">专项练习</option><option value="mock">完整模拟卷</option></select></label>{kind === 'practice' && <label>专项类别<select aria-label="专项类别" value={sourceId} onChange={(event) => setSourceId(event.target.value)}>{practiceOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>}{kind === 'mock' && <label>模拟卷<select aria-label="模拟卷" value={sourceId} onChange={(event) => setSourceId(event.target.value)}>{contentCatalog.mocks.map((mock) => <option value={mock.id} key={mock.id}>{mock.title}</option>)}</select></label>}<label className="knowledge-toggle"><input type="checkbox" checked={includeKnowledge} onChange={(event) => setIncludeKnowledge(event.target.checked)} />附高频知识</label><button onClick={() => window.print()}>打印 / 保存 PDF</button></div></header>
    <p className="print-summary">共 {packet.questionCount} 题，预计打印 {packet.questionPages.length + packet.answerPages.length} 页。</p>
    {packet.questionPages.map((page) => <Sheet key={`question:${page.pageNumber}`} page={page} />)}
    {packet.answerPages.map((page) => <Sheet key={`answer:${page.pageNumber}`} page={page} answers />)}
  </section>;
}
