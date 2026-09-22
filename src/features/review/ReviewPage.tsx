import { useState } from 'react';

const items = [
  { id: 'q-vocab', type: '词汇', point: '固定搭配', reason: '不认识', title: 'encourage sb. to do sth.' },
  { id: 'q-conversation', type: '听力', point: '转折定位', reason: '定位错误', title: 'but 后的信息识别' },
];

export function ReviewPage() {
  const [filter, setFilter] = useState('全部');
  const shown = filter === '全部' ? items : items.filter((item) => item.type === filter);
  return <section><h1>错题与复习</h1><div>{['全部', '词汇', '听力'].map((value) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}</div>{shown.map((item) => <article key={item.id}><h2>{item.title}</h2><p>{item.type} · {item.point} · {item.reason}</p><button>重新练习</button></article>)}</section>;
}
