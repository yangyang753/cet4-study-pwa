import rawContent from '../../content/starter/content.json';
import { parseContentPack } from '../../content/schema';
import { buildPrintPacket, type PrintPage as PacketPage } from './buildPrintPacket';
import './print.css';

const packet = buildPrintPacket(parseContentPack(rawContent).questions);

function Sheet({ page, answers = false }: { page: PacketPage; answers?: boolean }) {
  return <section className={`print-sheet ${answers ? 'answer-sheet' : ''}`}><h1>{page.title}</h1><div className="print-meta"><span>姓名：____________</span><span>日期：____________</span><span>建议用时：60 分钟</span></div>{page.blocks.map((block, index) => block.kind === 'writing-space' ? <div key={`${block.questionId}:space`} className="writing-space" aria-label={`${block.questionId} 答题区`} /> : <div key={`${block.questionId}:${block.kind}`} className="print-block"><h2>{block.title} {block.text}</h2>{block.options?.map((option) => <p key={option}>{option}</p>)}{answers && <p className="print-explanation">对应知识点解析请在应用中查看。</p>}</div>)}<footer>第 {answers ? 2 : 1} 页 / 共 2 页</footer></section>;
}

export function PrintPage() {
  return <section className="print-center"><header className="print-toolbar"><div><h1>A4 打印预览</h1><p>练习页与答案页自动分离，并预留手写空间。</p></div><button onClick={() => window.print()}>打印 / 保存 PDF</button></header>{packet.questionPages.map((page) => <Sheet key={page.title} page={page} />)}{packet.answerPages.map((page) => <Sheet key={page.title} page={page} answers />)}</section>;
}
