import { GEMINI_PROXY_URL } from '../ai/config';
import { devLogger } from './logger';
import type { Pet } from '../types';

// One fallback per topic so variety is maintained even without Gemini
const TOPIC_EXAMPLES: Record<string, string> = {
  health:       'мурка чихает уже 2 дня, вялая и плохо ест',
  medications:  'дал барсику таблетку энтерофурил 200мг утром',
  vaccines:     'сделали прививку нобивак от бешенства, следующая через год',
  allergies:    'после прогулки чешется и краснеет кожа, похоже аллергия на траву',
  nutrition:    'барсик ест роял канин сухой 80г 2 раза в день',
  habits:       'сегодня очень активный, бегал час на улице',
  documents:    'оформили ветеринарный паспорт серия AB 123456',
  multi:        'сходили к ветеринару, поставили диагноз отит, назначили капли отипакс 3 раза в день',
};

const TOPIC_HINTS: Record<string, string> = {
  health:      'симптом, болезнь или визит к ветеринару (НЕ про лекарства и НЕ про прививки)',
  medications: 'лекарство — таблетка, капли, укол, мазь (конкретное название и доза)',
  vaccines:    'прививка которую уже сделали сегодня (НЕ "завтра" и НЕ "надо записаться")',
  allergies:   'аллергическая реакция — на что и как проявляется',
  nutrition:   'питание — какой корм, порция, реакция на еду (НЕ про аллергию)',
  habits:      'поведение или активность — игры, сон, команды, изменения в поведении',
  documents:   'документ — паспорт, чип, страховка или родословная',
  multi:       'одно сообщение с двумя разными фактами (например симптом + лекарство, или визит + диагноз)',
};

const TOPICS = Object.keys(TOPIC_HINTS);
let lastTopicIndex = -1;

function pickTopic(): string {
  // Pick a random topic, but not the same as last time
  const available = TOPICS.filter((_, i) => i !== lastTopicIndex);
  const idx = Math.floor(Math.random() * available.length);
  const topic = available[idx];
  lastTopicIndex = TOPICS.indexOf(topic);
  return topic;
}

export async function generateTestPhrase(pet: Pet): Promise<string> {
  const topic = pickTopic();
  const hint = TOPIC_HINTS[topic];
  const prompt = `Придумай одно короткое реалистичное сообщение от владельца питомца на русском языке.
Тема: ${hint}.
Пиши разговорно, как в мессенджере. Только само сообщение, без кавычек и пояснений.`;

  try {
    const response = await fetch(GEMINI_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body: {
          contents: [{
            parts: [{ text: `Питомец: ${pet.name} (${pet.species}${pet.breed ? ', ' + pet.breed : ''})\n\n${prompt}` }]
          }],
          generationConfig: { temperature: 0.95 },
        },
      }),
    });

    const json = await response.json();
    devLogger.log('generate', 'Полный ответ Gemini', json);

    const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      devLogger.log('generate', 'Gemini вернул пустоту, используем fallback', TOPIC_EXAMPLES[topic]);
      return TOPIC_EXAMPLES[topic];
    }

    devLogger.log('generate', `Сгенерирована фраза [тема: ${topic}]`, text);
    return text;
  } catch (e) {
    devLogger.log('error', 'Ошибка генератора', String(e));
    return TOPIC_EXAMPLES[topic];
  }
}
