import { GEMINI_URL } from './config';
import type { Pet } from '../types';

export interface VetAdvice {
  observations: string[];
  recommendations: string[];
  alerts: string[];
  updates: { module: string; field: string; value: unknown }[];
}

const SYSTEM_PROMPT = `Ты — опытный ветеринарный консультант. Анализируешь историю питомца и даёшь советы владельцу.

Твои задачи:
1. Найти паттерны (повторяющиеся симптомы, закономерности)
2. Выявить потенциальные проблемы
3. Дать конкретные рекомендации
4. Предложить обновления данных если видишь несоответствия

Отвечай на русском языке. Тон — дружелюбный, понятный, без медицинского жаргона.
Отвечай ТОЛЬКО валидным JSON, без markdown.

Формат ответа:
{
  "observations": ["наблюдение 1", "наблюдение 2"],
  "recommendations": ["рекомендация 1", "рекомендация 2"],
  "alerts": ["срочное предупреждение если есть"],
  "updates": [{ "module": "habits", "field": "activityLevel", "value": "low" }]
}`;

export async function analyzeWithVetAgent(pet: Pet, allData: Record<string, unknown[]>): Promise<VetAdvice> {
  const petInfo = `
Питомец: ${pet.name}
Вид: ${pet.species}
Порода: ${pet.breed || 'не указана'}
Возраст: ${pet.birthDate ? Math.floor((Date.now() - new Date(pet.birthDate).getTime()) / 31536000000) + ' лет' : 'не указан'}
Вес: ${pet.weight > 0 ? pet.weight + ' кг' : 'не указан'}
`;

  const historyText = Object.entries(allData)
    .filter(([, entries]) => entries.length > 0)
    .map(([module, entries]) => `\n=== ${module.toUpperCase()} ===\n${JSON.stringify(entries, null, 2)}`)
    .join('\n');

  const prompt = `${petInfo}\n\nИСТОРИЯ ПИТОМЦА:${historyText || '\nДанных пока нет.'}

Проанализируй и дай советы.`;

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
    }),
  });

  const json = await response.json();
  const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!raw) return { observations: [], recommendations: [], alerts: [], updates: [] };

  try {
    return JSON.parse(raw);
  } catch {
    return { observations: [], recommendations: [], alerts: [], updates: [] };
  }
}
