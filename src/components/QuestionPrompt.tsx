import { useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import type { PendingQuestion } from '../ai/questions';

interface QuestionPromptProps {
  questions: PendingQuestion[];
  onSelect: (hint: string) => void;
}

export function QuestionPrompt({ questions, onSelect }: QuestionPromptProps) {
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || questions.length === 0) return null;

  const q = questions[index % questions.length];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex(i => (i + 1) % questions.length);
  };

  return (
    <div className="question-prompt" onClick={() => onSelect(q.inputHint)}>
      <span className="question-prompt-icon">{q.icon}</span>
      <span className="question-prompt-text">{q.text}</span>
      <span className="question-prompt-hint">нажми чтобы ответить</span>
      <div className="question-prompt-actions">
        {questions.length > 1 && (
          <button className="question-prompt-btn" onClick={handleNext} title="Следующий вопрос">
            <ChevronRight size={14} />
          </button>
        )}
        <button className="question-prompt-btn" onClick={e => { e.stopPropagation(); setDismissed(true); }} title="Скрыть">
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
