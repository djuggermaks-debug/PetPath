import { geminiRequest } from './config';
import type { Pet } from '../types';
import { appLang } from '../i18n';

export interface VetAdvice {
  observations: string[];
  recommendations: string[];
  alerts: string[];
  updates: { module: string; field: string; value: unknown }[];
}

const SYSTEM_PROMPT_RU = `Ты — опытный ветеринарный консультант. Анализируешь историю питомца и даёшь советы владельцу.

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

const SYSTEM_PROMPT_EN = `You are an experienced veterinary consultant. You analyse a pet's history and give advice to the owner.

Your tasks:
1. Find patterns (recurring symptoms, trends)
2. Identify potential issues
3. Give specific recommendations
4. Suggest data updates if you notice inconsistencies

Reply in English. Tone — friendly, clear, no medical jargon.
Reply ONLY with valid JSON, no markdown.

Response format:
{
  "observations": ["observation 1", "observation 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "alerts": ["urgent warning if any"],
  "updates": [{ "module": "habits", "field": "activityLevel", "value": "low" }]
}`;

const MAX_PHOTOS = 5;

export async function analyzeWithVetAgent(pet: Pet, allData: Record<string, unknown[]>): Promise<VetAdvice> {
  const isRu = appLang === 'ru';
  const systemPrompt = isRu ? SYSTEM_PROMPT_RU : SYSTEM_PROMPT_EN;

  const petInfo = isRu
    ? `\nПитомец: ${pet.name}\nВид: ${pet.species}\nПорода: ${pet.breed || 'не указана'}\nВозраст: ${pet.birthDate ? Math.floor((Date.now() - new Date(pet.birthDate).getTime()) / 31536000000) + ' лет' : 'не указан'}\nВес: ${pet.weight > 0 ? pet.weight + ' кг' : 'не указан'}\n`
    : `\nPet: ${pet.name}\nSpecies: ${pet.species}\nBreed: ${pet.breed || 'unknown'}\nAge: ${pet.birthDate ? Math.floor((Date.now() - new Date(pet.birthDate).getTime()) / 31536000000) + ' years' : 'unknown'}\nWeight: ${pet.weight > 0 ? pet.weight + ' kg' : 'unknown'}\n`;

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
    ? isRu
      ? `\n\nК анализу прилагаются ${photos.length} фото из записей (здоровье/аллергии). Учитывай их при анализе.`
      : `\n\n${photos.length} photo(s) from records (health/allergies) are attached. Consider them in your analysis.`
    : '';

  const noDataText = isRu ? '\nДанных пока нет.' : '\nNo data yet.';
  const analyseText = isRu ? 'Проанализируй и дай советы.' : 'Analyse and give advice.';
  const historyLabel = isRu ? 'ИСТОРИЯ ПИТОМЦА:' : 'PET HISTORY:';

  const prompt = `${petInfo}\n\n${historyLabel}${historyText || noDataText}${photoNote}\n\n${analyseText}`;

  const parts: unknown[] = [{ text: prompt }];
  for (const photo of photos) {
    parts.push({ inline_data: { mime_type: photo.mimeType, data: photo.base64 } });
  }

  const response = await geminiRequest({
    system_instruction: { parts: [{ text: systemPrompt }] },
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
