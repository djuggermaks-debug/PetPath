import { GEMINI_URL } from './config';
import type { Pet } from '../types';

export interface ParsedAtom {
  module: 'health' | 'medications' | 'vaccines' | 'allergies' | 'nutrition' | 'habits' | 'documents';
  confidence: number;
  data: Record<string, unknown>;
}

const TODAY = new Date().toISOString().slice(0, 10);

const SYSTEM_PROMPT = `Ты — система распознавания записей о питомцах. Получаешь сообщение от владельца питомца и разбиваешь его на атомы — отдельные факты. Каждый факт идёт в свой модуль.

МОДУЛИ И ИХ ПОЛЯ:

health (здоровье, симптомы, визиты, диагнозы):
{ "module": "health", "confidence": 0.9, "data": { "date": "YYYY-MM-DD", "type": "symptom"|"visit"|"diagnosis", "description": "текст", "severity": "mild"|"moderate"|"severe", "vet": "имя врача", "clinic": "клиника", "reason": "причина визита", "result": "результат", "diagnosis": "диагноз", "nextVisitDate": "YYYY-MM-DD", "nextVisitNotify": true|false } }

medications (лекарства, таблетки, капли, уколы):
{ "module": "medications", "confidence": 0.9, "data": { "name": "название", "dose": "5", "unit": "мг"|"мл"|"таб"|"кап"|"другое", "frequency": "раз в день", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "reason": "причина", "prescribedBy": "vet"|"self", "notify": true|false } }

vaccines (прививки, вакцинация):
{ "module": "vaccines", "confidence": 0.9, "data": { "name": "название прививки", "date": "YYYY-MM-DD", "drug": "препарат", "manufacturer": "производитель", "vet": "врач", "clinic": "клиника", "nextDate": "YYYY-MM-DD", "notify": true|false } }

allergies (аллергия, реакция, непереносимость):
{ "module": "allergies", "confidence": 0.9, "data": { "allergen": "на что", "allergenType": "food"|"plant"|"drug"|"other", "reaction": "как проявляется", "severity": "mild"|"moderate"|"severe", "firstDate": "YYYY-MM-DD", "confirmedByVet": true|false } }

nutrition (питание, корм, еда, кормление):
{ "module": "nutrition", "confidence": 0.9, "data": { "date": "YYYY-MM-DD", "feedType": "dry"|"wet"|"natural"|"mixed", "brand": "бренд", "portionSize": "порция", "frequency": "частота", "restrictions": "ограничения", "favorites": "любит", "dislikes": "не ест", "reaction": "реакция" } }

habits (поведение, активность, команды, игры, сон):
{ "module": "habits", "confidence": 0.9, "data": { "date": "YYYY-MM-DD", "category": "activity"|"sleep"|"play"|"command"|"behavior"|"change", "description": "описание", "activityLevel": "low"|"medium"|"high" } }

documents (паспорт, чип, страховка, родословная):
{ "module": "documents", "confidence": 0.9, "data": { "type": "passport"|"chip"|"insurance"|"pedigree"|"other", "title": "название", "number": "номер", "date": "YYYY-MM-DD", "expiry": "YYYY-MM-DD", "notes": "заметки" } }

ПРИМЕРЫ:

Сообщение: "дал барсику таблетку энтерофурил 200мг утром"
Ответ: [{"module":"medications","confidence":0.95,"data":{"name":"Энтерофурил","dose":"200","unit":"мг","frequency":"утром","startDate":"${TODAY}","prescribedBy":"self","notify":false}}]

Сообщение: "сходили к ветеринару, доктор Иванов поставил диагноз отит, назначил отипакс капли 3 раза в день 7 дней"
Ответ: [{"module":"health","confidence":0.95,"data":{"date":"${TODAY}","type":"visit","description":"Визит к ветеринару","vet":"Иванов","result":"Поставлен диагноз отит"}},{"module":"health","confidence":0.95,"data":{"date":"${TODAY}","type":"diagnosis","description":"Отит","diagnosis":"Отит"}},{"module":"medications","confidence":0.95,"data":{"name":"Отипакс","dose":"3","unit":"кап","frequency":"3 раза в день","startDate":"${TODAY}","endDate":"","reason":"Отит","prescribedBy":"vet","notify":false}}]

Сообщение: "мурка чихает уже 3 дня, вялая, плохо ест"
Ответ: [{"module":"health","confidence":0.9,"data":{"date":"${TODAY}","type":"symptom","description":"Чихает 3 дня","severity":"mild"}},{"module":"health","confidence":0.85,"data":{"date":"${TODAY}","type":"symptom","description":"Вялость"}},{"module":"health","confidence":0.85,"data":{"date":"${TODAY}","type":"symptom","description":"Плохой аппетит"}}]

Сообщение: "сделали прививку от бешенства нобивак, следующая через год"
Ответ: [{"module":"vaccines","confidence":0.95,"data":{"name":"Бешенство","date":"${TODAY}","drug":"Нобивак","nextDate":"","notify":true}}]

Сообщение: "барсик ест роял канин сухой 80г 2 раза в день, курицу не переносит"
Ответ: [{"module":"nutrition","confidence":0.95,"data":{"date":"${TODAY}","feedType":"dry","brand":"Royal Canin","portionSize":"80г","frequency":"2 раза в день","dislikes":"курица"}},{"module":"allergies","confidence":0.85,"data":{"allergen":"курица","allergenType":"food","reaction":"непереносимость","severity":"mild","firstDate":"${TODAY}","confirmedByVet":false}}]

Сообщение: "научился команде сидеть"
Ответ: [{"module":"habits","confidence":0.95,"data":{"date":"${TODAY}","category":"command","description":"Выучил команду Сидеть"}}]

Сообщение: "оформили ветеринарный паспорт серия AB 123456"
Ответ: [{"module":"documents","confidence":0.95,"data":{"type":"passport","title":"Ветеринарный паспорт","number":"AB 123456","date":"${TODAY}"}}]

ПРАВИЛА:
- Если уверенность < 0.7 — не включай в ответ
- Дата если не указана = ${TODAY}
- Отвечай ТОЛЬКО JSON массивом, без markdown, без пояснений
- Если совсем непонятно — верни пустой массив []`;

export async function parseUserText(text: string, pet: Pet): Promise<ParsedAtom[]> {
  const prompt = `Питомец: ${pet.name} (${pet.species}${pet.breed ? ', ' + pet.breed : ''})
Сообщение: "${text}"

Верни JSON массив атомов.`;

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    }),
  });

  const json = await response.json();
  const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return [];

  try {
    const atoms = JSON.parse(raw);
    return Array.isArray(atoms) ? atoms.filter((a: ParsedAtom) => a.confidence >= 0.7) : [];
  } catch {
    return [];
  }
}
