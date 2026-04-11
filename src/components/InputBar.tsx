import { useState, useRef, useEffect } from 'react';
import { Mic, Send, MicOff, Loader, Zap, Camera, X } from 'lucide-react';
import { devLogger } from '../dev/logger';
import { generateTestPhrase } from '../dev/generator';
import type { Pet } from '../types';
import { geminiRequest } from '../ai/config';

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

async function transcribeAudio(base64: string, mimeType: string): Promise<string> {
  const res = await geminiRequest({
    contents: [{
      parts: [
        { inlineData: { mimeType, data: base64 } },
        { text: 'Транскрибируй этот аудиофрагмент на русском языке. Верни только текст без пояснений.' },
      ],
    }],
  });
  const json = await res.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

export function InputBar({ activeModule, onSend, parsing, devMode, pet, prefillText, onPrefillConsumed }: InputBarProps) {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [image, setImage] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!prefillText) return;
    setText(prefillText);
    onPrefillConsumed?.();
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        textareaRef.current.focus();
        const len = prefillText.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }, 0);
  }, [prefillText]);

  const resizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

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

  const handleMic = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setRecording(false);
        setTranscribing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              resolve(dataUrl.split(',')[1]);
            };
            reader.readAsDataURL(blob);
          });
          const mimeType = recorder.mimeType.split(';')[0];
          const transcript = await transcribeAudio(base64, mimeType);
          if (transcript) {
            setText(prev => prev ? prev + ' ' + transcript : transcript);
            setTimeout(resizeTextarea, 0);
          }
        } catch (e) {
          devLogger.log('error', 'Ошибка транскрипции', { error: String(e) });
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (e) {
      devLogger.log('error', 'Нет доступа к микрофону', { error: String(e) });
    }
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
      const [meta, base64] = dataUrl.split(',');
      const mimeType = meta.split(':')[1].split(';')[0];
      setImage({ base64, mimeType, preview: dataUrl });
    };
    reader.readAsDataURL(file);
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

      {image && (
        <div className="image-preview-wrap">
          <img src={image.preview} alt="фото" className="image-preview" />
          <button className="image-preview-remove" onClick={() => setImage(null)} type="button">
            <X size={12} />
          </button>
        </div>
      )}

      <div className={`input-bar-inner ${recording ? 'input-bar-inner--recording' : ''}`}>
        <button
          className={`mic-btn ${recording ? 'mic-btn--active' : ''}`}
          onClick={handleMic}
          disabled={transcribing}
          type="button"
        >
          {transcribing
            ? <Loader size={18} className="spin" />
            : recording
              ? <MicOff size={18} />
              : <Mic size={18} />
          }
        </button>

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
          <span className="recording-dot" />Говорите...
        </div>
      )}
      {transcribing && (
        <div className="recording-indicator font-typewriter">
          <span className="recording-dot" style={{ background: '#3498db' }} />Распознаю речь...
        </div>
      )}
    </div>
  );
}
