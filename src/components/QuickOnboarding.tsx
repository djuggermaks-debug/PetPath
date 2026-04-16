import { useState, useRef } from 'react';
import { Mic, MicOff, Send, Loader } from 'lucide-react';
import { parsePetProfile, type PetProfileDraft } from '../ai/breedDetector';
import { geminiRequest } from '../ai/config';
import { useTranslation } from 'react-i18next';
import { appLang } from '../i18n';

interface QuickOnboardingProps {
  onComplete: (draft: PetProfileDraft) => void;
}

async function transcribeAudio(base64: string, mimeType: string, lang: string): Promise<string> {
  const prompt = lang === 'ru'
    ? 'Транскрибируй этот аудиофрагмент на русском языке. Верни только текст без пояснений.'
    : 'Transcribe this audio in English. Return only the text, no explanations.';
  const res = await geminiRequest({
    contents: [{
      parts: [
        { inlineData: { mimeType, data: base64 } },
        { text: prompt },
      ],
    }],
  });
  const json = await res.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

export function QuickOnboarding({ onComplete }: QuickOnboardingProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [parsing, setParsing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(blob);
          });
          const transcript = await transcribeAudio(base64, recorder.mimeType.split(';')[0], appLang);
          if (transcript) setText(transcript);
        } finally {
          setTranscribing(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      // no mic access
    }
  };

  const handleSend = async () => {
    if (!text.trim() || parsing) return;
    setParsing(true);
    try {
      const draft = await parsePetProfile(text.trim());
      onComplete(draft);
    } finally {
      setParsing(false);
    }
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

  return (
    <div className="quick-onboarding-overlay">
      <div className="quick-onboarding-top">
        <img src="/PetPath/logo.png" alt="PetPath" className="quick-onboarding-bg-logo" />
      </div>

      <div className="onboarding-card">
        <p className="quick-onboarding-hint">
          {t('quickOnboarding.hint')}<br />
          {t('quickOnboarding.hintMic')}
        </p>

        <div className="quick-onboarding-examples">
          <span>{t('quickOnboarding.examplesLabel')}</span>
          <em>{t('quickOnboarding.example1')}</em>
          <em>{t('quickOnboarding.example2')}</em>
        </div>

        <div className={`input-bar-inner ${recording ? 'input-bar-inner--recording' : ''}`} style={{ marginTop: '16px' }}>
          <button
            className={`mic-btn ${recording ? 'mic-btn--active' : ''}`}
            onClick={handleMic}
            disabled={transcribing || parsing}
            type="button"
          >
            {transcribing
              ? <Loader size={18} className="spin" />
              : recording
                ? <MicOff size={18} />
                : <Mic size={18} />
            }
          </button>

          <textarea
            ref={textareaRef}
            className="input-textarea"
            placeholder={t('quickOnboarding.placeholder')}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={parsing}
          />

          <button
            className={`send-btn ${text.trim() ? 'send-btn--active' : ''}`}
            onClick={handleSend}
            type="button"
            disabled={!text.trim() || parsing}
          >
            {parsing ? <Loader size={16} className="spin" /> : <Send size={16} />}
          </button>
        </div>

        {recording && (
          <div className="recording-indicator font-typewriter">
            <span className="recording-dot" />{t('quickOnboarding.recording')}
          </div>
        )}
        {transcribing && (
          <div className="recording-indicator font-typewriter">
            <span className="recording-dot" style={{ background: '#3498db' }} />{t('quickOnboarding.transcribing')}
          </div>
        )}
        {parsing && (
          <div className="recording-indicator font-typewriter">
            <span className="recording-dot" style={{ background: '#27ae60' }} />{t('quickOnboarding.parsing')}
          </div>
        )}
      </div>
    </div>
  );
}
