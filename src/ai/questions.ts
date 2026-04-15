import type { Pet } from '../types';

export interface PendingQuestion {
  id: string;
  icon: string;
  text: string;
  inputHint: string;
}

export function getPendingQuestions(pet: Pet, _allData: Record<string, unknown[]>): PendingQuestion[] {
  const name = pet.name;

  return [
    {
      id: 'day',
      icon: '🐾',
      text: `Расскажи как прошёл день у ${name} — что ел, как себя чувствует?`,
      inputHint: `Сегодня ${name} `,
    },
    {
      id: 'unusual',
      icon: '👀',
      text: `Было что-то необычное у ${name} сегодня?`,
      inputHint: `${name} сегодня `,
    },
    {
      id: 'food',
      icon: '🥣',
      text: `Чем кормили ${name} сегодня?`,
      inputHint: `${name} ел `,
    },
    {
      id: 'vet',
      icon: '🩺',
      text: `${name} был у ветеринара недавно? Расскажи.`,
      inputHint: `Были у ветеринара, `,
    },
  ];
}
