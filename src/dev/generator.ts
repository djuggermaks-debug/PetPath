import { GEMINI_URL } from '../ai/config';
import { devLogger } from './logger';
import type { Pet } from '../types';

const EXAMPLES = [
  'дал барсику таблетку энтерофурил 200мг утром',
  'сходили к ветеринару, поставили диагноз отит, назначили капли отипакс 3 раза в день',
  'мурка чихает уже 2 дня, вялая и плохо ест',
  'сделали прививку нобивак от бешенства, следующая через год',
  'барсик ест роял канин сухой 80г 2 раза в день',
  'научился команде сидеть',
  'оформили ветеринарный паспорт серия AB 123456',
  'после прогулки чешется и краснеет кожа, похоже аллергия на траву',
  'дали глистогонное дронтал 1 таблетка, вес 4.5 кг',
  'сегодня очень активный, бегал час на улице',
];

const PROMPT = `Придумай одно короткое реалистичное сообщение от владельца питомца на русском языке.
Сообщение должно содержать факт о здоровье, лекарстве, прививке, аллергии, питании, поведении или документе питомца.
Иногда одно сообщение с несколькими фактами. Пиши разговорно. Только само сообщение, без кавычек и пояснений.`;

export async function generateTestPhrase(pet: Pet): Promise<string> {
  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Питомец: ${pet.name} (${pet.species}${pet.breed ? ', ' + pet.breed : ''})\n\n${PROMPT}` }]
        }],
        generationConfig: { temperature: 0.95 },
      }),
    });

    const json = await response.json();
    devLogger.log('generate', 'Полный ответ Gemini', json);

    const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      // Fallback to random example
      const fallback = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)];
      devLogger.log('generate', 'Gemini вернул пустоту, используем fallback', fallback);
      return fallback;
    }

    return text;
  } catch (e) {
    devLogger.log('error', 'Ошибка генератора', String(e));
    return EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)];
  }
}
