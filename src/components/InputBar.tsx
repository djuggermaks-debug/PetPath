import { useState, useRef, useEffect } from 'react';
import { Mic, Send, MicOff, Loader, Zap, Camera, X } from 'lucide-react';
import { devLogger } from '../dev/logger';
import { generateTestPhrase } from '../dev/generator';
import type { Pet } from '../types';

interface InputBarProps {
  petId: string;
  activeModule: string | null;
  onSend: (text: string, image?: { base64: string; mimeType: string }) => Promise<void>;
  parsing: boolean;
  devMode: boolean;
  pet: Pet;
  prefillText?: string;
  onPrefillConsumed?: () => void;
}

export function InputBar({ activeModule, onSend, parsing, devMode, pet, prefillText, onPrefillConsumed }: InputBarProps) {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [image, setImage] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!prefillText) return;
    setText(prefillText);
    onPrefillConsumed?.();
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        textareaRef.current.focus();
        // Move cursor to end
        const len = prefillText.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }, 0);
  }, [prefillText]);

  const handleSend = async () => {
    if ((!text.trim() && !image) || parsing) return;
    const msg = text.trim();
    devLogger.log('parse', 'Пользователь отправил', { text: msg, activeModule, hasImage: !!image });
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    const img = image ?? undefined;
    setImage(null);
    await onSend(msg, img);
    (window as any).__devRefresh?.();
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const phrase = await generateTestPhrase(pet);
      setText(phrase);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        textareaRef.current.focus();
      }
      (window as any).__devRefresh?.();
    } finally {
      setGenerating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      // dataUrl = "data:image/jpeg;base64,XXXX"
      const [meta, base64] = dataUrl.split(',');
      const mimeType = meta.split(':')[1].split(';')[0];
      setImage({ base64, mimeType, preview: dataUrl });
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be picked again
    e.target.value = '';
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

  const canSend = (text.trim().length > 0 || !!image) && !parsing;
  const placeholder = activeModule ? 'Запись в раздел...' : 'Напишите что угодно о питомце...';

  return (
    <div className="input-bar">
      {devMode && (
        <button
          className={`generate-btn ${generating ? 'generate-btn--loading' : ''}`}
          onClick={handleGenerate}
          disabled={generating}
          type="button"
        >
          {generating ? <Loader size={13} className="spin" /> : <Zap size={13} />}
          {generating ? 'Генерация...' : '⚡ Сгенерировать'}
        </button>
      )}

      {/* Image preview */}
      {image && (
        <div className="image-preview-wrap">
          <img src={image.preview} alt="фото" className="image-preview" />
          <button className="image-preview-remove" onClick={() => setImage(null)} type="button">
            <X size={12} />
          </button>
        </div>
      )}

      <div className={`input-bar-inner ${recording ? 'input-bar-inner--recording' : ''}`}>
        <button className={`mic-btn ${recording ? 'mic-btn--active' : ''}`}
          onClick={() => setRecording(p => !p)} type="button">
          {recording ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        {/* Hidden file input — no capture attr so user sees camera+gallery choice */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button className="camera-btn" onClick={() => fileInputRef.current?.click()} type="button">
          <Camera size={18} />
        </button>

        <textarea ref={textareaRef} className="input-textarea"
          placeholder={placeholder} value={text}
          onChange={handleInput} onKeyDown={handleKeyDown}
          rows={1} disabled={parsing}
        />

        <button className={`send-btn ${canSend ? 'send-btn--active' : ''}`}
          onClick={handleSend} type="button" disabled={!canSend}>
          {parsing ? <Loader size={16} className="spin" /> : <Send size={16} />}
        </button>
      </div>

      {recording && (
        <div className="recording-indicator font-typewriter">
          <span className="recording-dot" />Запись голоса...
        </div>
      )}
    </div>
  );
}
