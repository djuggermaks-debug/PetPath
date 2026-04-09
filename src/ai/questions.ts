import type { Pet } from '../types';

export interface PendingQuestion {
  id: string;
  icon: string;
  text: string;
  inputHint: string; // pre-filled text for input bar
}

export function getPendingQuestions(pet: Pet, allData: Record<string, unknown[]>): PendingQuestion[] {
  const q: PendingQuestion[] = [];
  const name = pet.name;

  // Basic pet info
  if (!pet.breed) q.push({ id: 'breed', icon: '🐾', text: `Какая порода у ${name}?`, inputHint: `Порода ${name}: ` });
  if (!pet.birthDate) q.push({ id: 'birthDate', icon: '📅', text: `Когда родился ${name}?`, inputHint: `Дата рождения ${name}: ` });
  if (!pet.weight || pet.weight === 0) q.push({ id: 'weight', icon: '⚖️', text: `Сколько весит ${name}?`, inputHint: `Вес ${name}: ` });
  if (!pet.gender) q.push({ id: 'gender', icon: '♀♂', text: `${name} — мальчик или девочка?`, inputHint: `${name} ` });
  if (!pet.color) q.push({ id: 'color', icon: '🎨', text: `Какого окраса ${name}?`, inputHint: `Окрас ${name}: ` });

  // Module-based
  const health = (allData.health || []) as unknown[];
  if (health.length === 0) q.push({ id: 'health', icon: '🩺', text: `Есть ли у ${name} хронические болезни?`, inputHint: `${name} диагноз: ` });

  const vaccines = (allData.vaccines || []) as unknown[];
  if (vaccines.length === 0) q.push({ id: 'vaccines', icon: '💉', text: `Какие прививки сделаны ${name}?`, inputHint: `Прививка ${name}: ` });

  const allergies = (allData.allergies || []) as unknown[];
  if (allergies.length === 0) q.push({ id: 'allergies', icon: '⚠️', text: `Есть ли у ${name} аллергии?`, inputHint: `Аллергия у ${name}: ` });

  const meds = (allData.medications || []) as unknown[];
  if (meds.length === 0) q.push({ id: 'medications', icon: '💊', text: `Принимает ли ${name} лекарства?`, inputHint: `${name} принимает ` });

  const nutrition = (allData.nutrition || []) as unknown[];
  if (nutrition.length === 0) q.push({ id: 'nutrition', icon: '🥣', text: `Чем кормите ${name}?`, inputHint: `${name} ест ` });

  const habits = (allData.habits || []) as unknown[];
  if (habits.length === 0) q.push({ id: 'habits', icon: '🐾', text: `Насколько активен ${name}?`, inputHint: `Активность ${name}: ` });

  return q;
}
