import { useState } from 'react';

export function PronounceButton({ text }: { text: string }) {
  const [message, setMessage] = useState('');

  function pronounce() {
    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      setMessage('当前浏览器不支持单词发音，请使用系统词典或更换浏览器。');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    const voice = window.speechSynthesis.getVoices().find((candidate) => /^en(?:-|_)/i.test(candidate.lang));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setMessage('');
  }

  return <span className="pronunciation-control">
    <button type="button" className="pronounce-button" aria-label={`播放 ${text} 发音`} onClick={pronounce}>🔊 发音</button>
    {message && <small role="status">{message}</small>}
  </span>;
}
