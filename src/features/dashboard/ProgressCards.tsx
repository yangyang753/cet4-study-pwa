export function ProgressCards() {
  return <aside className="progress-card"><h2>学习状态</h2><div className="streak"><span>连续学习</span><strong>6 天</strong></div><h3>当前薄弱项</h3><p>听力细节定位 <b>42%</b></p><div className="meter"><i style={{ width: '42%' }} /></div><p>选词填空 <b>56%</b></p><div className="meter"><i style={{ width: '56%' }} /></div></aside>;
}
