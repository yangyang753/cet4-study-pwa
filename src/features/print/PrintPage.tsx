import rawContent from '../../content/starter/content.json';
import { parseContentPack } from '../../content/schema';
import { buildPrintPacket, type PrintPage as PacketPage } from './buildPrintPacket';
import './print.css';
import vocabulary from '../../../content/v1/vocabulary.json';
import collocations from '../../../content/v1/collocations.json';
import grammarTopics from '../../../content/v1/grammarTopics.json';

const packet = buildPrintPacket(parseContentPack(rawContent).questions);

function Sheet({ page, answers = false, pageNumber }: { page: PacketPage; answers?: boolean; pageNumber: number }) {
  return <section className={`print-sheet ${answers ? 'answer-sheet' : ''}`}><h1>{page.title}</h1><div className="print-meta"><span>姓名：____________</span><span>日期：____________</span><span>建议用时：60 分钟</span></div>{page.blocks.map((block) => block.kind === 'writing-space' ? <div key={`${block.questionId}:space`} className="writing-space" aria-label={`${block.questionId} 答题区`} /> : <div key={`${block.questionId}:${block.kind}`} className="print-block"><h2>{block.title} {block.text}</h2>{block.options?.map((option) => <p key={option}>{option}</p>)}{answers && <p className="print-explanation">对应知识点解析请在应用中查看。</p>}</div>)}<footer>第 {pageNumber} 页 / 共 4 页</footer></section>;
}

function KnowledgeSheets() {
  return <><section className="print-sheet knowledge-print"><h1>高频词汇速记</h1><p className="print-instruction">遮住中文释义自测；不会的词在方框中打勾。</p><div className="print-word-grid">{vocabulary.slice(0, 36).map((item, index) => <div key={item.id}><i>□</i><b>{index + 1}. {item.word}</b><span>{item.phonetic}</span><p>{item.meaningZh}</p></div>)}</div><footer>第 1 页 / 共 4 页</footer></section><section className="print-sheet knowledge-print"><h1>重点搭配与语法</h1><div className="print-knowledge-columns"><div><h2>重点搭配</h2>{collocations.slice(0, 24).map((item, index) => <p key={item.id}><b>{index + 1}. {item.phrase}</b><span>{item.meaningZh}</span></p>)}</div><div><h2>语法检查清单</h2>{grammarTopics.map((item, index) => <p key={item.id}><b>{index + 1}. {item.title}</b><span>{item.checklist.join('；')}</span></p>)}</div></div><footer>第 2 页 / 共 4 页</footer></section></>;
}

export function PrintPage() {
  return <section className="print-center"><header className="print-toolbar"><div><h1>A4 打印预览</h1><p>高频知识、练习页与答案页分离，并预留手写空间。</p></div><button onClick={() => window.print()}>打印 / 保存 PDF</button></header><KnowledgeSheets />{packet.questionPages.map((page) => <Sheet key={page.title} page={page} pageNumber={3} />)}{packet.answerPages.map((page) => <Sheet key={page.title} page={page} answers pageNumber={4} />)}</section>;
}
