import { useState, useRef } from 'react';
import { Mic, Send, MicOff } from 'lucide-react';

interface InputBarProps {
  petId: string;
  activeModule: string | null;
}

export function InputBar({ petId, activeModule }: InputBarProps) {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!text.trim()) return;
    // TODO: send to AI parser
    console.log('Send:', { petId, activeModule, text });
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const toggleRecording = () => {
    setRecording(prev => !prev);
    // TODO: wire up Web Speech API
  };

  const placeholder = activeModule
    ? `Запись в раздел...`
    : 'Напишите что угодно о питомце...';

  return (
    <div className="input-bar">
      <div className={`input-bar-inner ${recording ? 'input-bar-inner--recording' : ''}`}>
        <button
          className={`mic-btn ${recording ? 'mic-btn--active' : ''}`}
          onClick={toggleRecording}
          type="button"
        >
          {recording ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <textarea
          ref={textareaRef}
          className="input-textarea"
          placeholder={placeholder}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          rows={1}
        />

        <button
          className={`send-btn ${text.trim() ? 'send-btn--active' : ''}`}
          onClick={handleSend}
          type="button"
          disabled={!text.trim()}
        >
          <Send size={16} />
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
