import { useState, useRef } from 'react';
import { Mic, Send, MicOff, Loader } from 'lucide-react';

interface InputBarProps {
  petId: string;
  activeModule: string | null;
  onSend: (text: string) => Promise<void>;
  parsing: boolean;
}

export function InputBar({ activeModule, onSend, parsing }: InputBarProps) {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (!text.trim() || parsing) return;
    const msg = text.trim();
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await onSend(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const placeholder = activeModule ? 'Запись в раздел...' : 'Напишите что угодно о питомце...';

  return (
    <div className="input-bar">
      <div className={`input-bar-inner ${recording ? 'input-bar-inner--recording' : ''}`}>
        <button className={`mic-btn ${recording ? 'mic-btn--active' : ''}`}
          onClick={() => setRecording(p => !p)} type="button">
          {recording ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <textarea ref={textareaRef} className="input-textarea"
          placeholder={placeholder} value={text}
          onChange={handleInput} onKeyDown={handleKeyDown} rows={1}
          disabled={parsing}
        />

        <button className={`send-btn ${text.trim() && !parsing ? 'send-btn--active' : ''}`}
          onClick={handleSend} type="button" disabled={!text.trim() || parsing}>
          {parsing ? <Loader size={16} className="spin" /> : <Send size={16} />}
        </button>
      </div>

      {recording && (
        <div className="recording-indicator font-typewriter">
          <span className="recording-dot" />
          Запись голоса...
        </div>
      )}
    </div>
  );
}
