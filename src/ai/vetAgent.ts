import { geminiRequest } from './config';
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

const MAX_PHOTOS = 5;

export async function analyzeWithVetAgent(pet: Pet, allData: Record<string, unknown[]>): Promise<VetAdvice> {
  const petInfo = `
Питомец: ${pet.name}
Вид: ${pet.species}
Порода: ${pet.breed || 'не указана'}
Возраст: ${pet.birthDate ? Math.floor((Date.now() - new Date(pet.birthDate).getTime()) / 31536000000) + ' лет' : 'не указан'}
Вес: ${pet.weight > 0 ? pet.weight + ' кг' : 'не указан'}
`;

  // Collect last N photos from health and allergies, strip _photo from text
  const photos: { mimeType: string; base64: string; label: string }[] = [];
  const dataForText: Record<string, unknown[]> = {};

  for (const [module, entries] of Object.entries(allData)) {
    dataForText[module] = entries.map((entry) => {
      const e = entry as Record<string, unknown>;
      if (e._photo && (module === 'health' || module === 'allergies')) {
        if (photos.length < MAX_PHOTOS) {
          photos.push({ mimeType: 'image/jpeg', base64: e._photo as string, label: `${module}: ${(e.description || e.allergen || '') as string}` });
        }
        const { _photo, ...rest } = e;
        void _photo;
        return rest;
      }
      return e;
    });
  }

  const historyText = Object.entries(dataForText)
    .filter(([, entries]) => entries.length > 0)
    .map(([module, entries]) => `\n=== ${module.toUpperCase()} ===\n${JSON.stringify(entries, null, 2)}`)
    .join('\n');

  const photoNote = photos.length > 0
    ? `\n\nК анализу прилагаются ${photos.length} фото из записей (здоровье/аллергии). Учитывай их при анализе.`
    : '';

  const prompt = `${petInfo}\n\nИСТОРИЯ ПИТОМЦА:${historyText || '\nДанных пока нет.'}${photoNote}

Проанализируй и дай советы.`;

  // Build parts: text first, then images
  const parts: unknown[] = [{ text: prompt }];
  for (const photo of photos) {
    parts.push({ inline_data: { mime_type: photo.mimeType, data: photo.base64 } });
  }

  const response = await geminiRequest({
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ parts }],
    generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
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
