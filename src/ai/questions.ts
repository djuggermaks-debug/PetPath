import type { Pet } from '../types';
import i18n from '../i18n';

export interface PendingQuestion {
  id: string;
  icon: string;
  text: string;
  inputHint: string;
}

export function getPendingQuestions(pet: Pet, _allData: Record<string, unknown[]>): PendingQuestion[] {
  const name = pet.name;
  const t = (key: string, opts?: Record<string, unknown>) => i18n.t(key, opts);

  return [
    {
      id: 'day',
      icon: '🐾',
      text: t('questionPrompt.questions.day.text', { name }),
      inputHint: t('questionPrompt.questions.day.hint', { name }),
    },
    {
      id: 'unusual',
      icon: '👀',
      text: t('questionPrompt.questions.unusual.text', { name }),
      inputHint: t('questionPrompt.questions.unusual.hint', { name }),
    },
    {
      id: 'food',
      icon: '🥣',
      text: t('questionPrompt.questions.food.text', { name }),
      inputHint: t('questionPrompt.questions.food.hint', { name }),
    },
    {
      id: 'vet',
      icon: '🩺',
      text: t('questionPrompt.questions.vet.text', { name }),
      inputHint: t('questionPrompt.questions.vet.hint', { name }),
    },
  ];
}
