import type { Pet } from '../types';
import i18n from '../i18n';

export interface PendingQuestion {
  id: string;
  icon: string;
  text: string;
  inputHint: string;
}

export function getPendingQuestions(pet: Pet, _allData: Record<string, unknown[]>): PendingQuestion[] {
  const name = pet.name || '…';
  const t = (key: string, opts?: Record<string, unknown>) => i18n.t(key, opts);

  const isProfileIncomplete = !pet.name || !pet.birthDate || pet.weight === 0 || !pet.breed;

  if (isProfileIncomplete) {
    const questions: PendingQuestion[] = [];
    if (!pet.name) {
      questions.push({
        id: 'setupName',
        icon: '🐾',
        text: t('questionPrompt.questions.setupName.text'),
        inputHint: t('questionPrompt.questions.setupName.hint'),
      });
    }
    if (pet.name && !pet.breed) {
      questions.push({
        id: 'setupSpecies',
        icon: '🐾',
        text: t('questionPrompt.questions.setupSpecies.text'),
        inputHint: t('questionPrompt.questions.setupSpecies.hint'),
      });
      questions.push({
        id: 'setupBreed',
        icon: '🧬',
        text: t('questionPrompt.questions.setupBreed.text', { name }),
        inputHint: t('questionPrompt.questions.setupBreed.hint'),
      });
    }
    if (!pet.birthDate) {
      questions.push({
        id: 'setupBirthDate',
        icon: '🎂',
        text: t('questionPrompt.questions.setupBirthDate.text', { name }),
        inputHint: t('questionPrompt.questions.setupBirthDate.hint'),
      });
    }
    if (pet.weight === 0) {
      questions.push({
        id: 'setupWeight',
        icon: '⚖️',
        text: t('questionPrompt.questions.setupWeight.text', { name }),
        inputHint: t('questionPrompt.questions.setupWeight.hint', { name }),
      });
    }
    return questions;
  }

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
