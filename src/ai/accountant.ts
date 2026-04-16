import { geminiRequest } from './config';
import type { Pet } from '../types';
import { devLogger } from '../dev/logger';
import { appLang } from '../i18n';

export interface ParsedAtom {
  module: 'health' | 'medications' | 'vaccines' | 'allergies' | 'nutrition' | 'habits' | 'documents' | 'items' | 'expenses' | 'profile';
  confidence: number;
  data: Record<string, unknown>;
}

const TODAY = new Date().toISOString().slice(0, 10);

const SYSTEM_PROMPT_RU = `Ты — система распознавания записей о питомцах. Получаешь сообщение от владельца питомца и разбиваешь его на атомы — отдельные факты. Каждый факт идёт в свой модуль.

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

expenses (расходы на питомца: оплата корма, визита, груминга, покупки):
{ "module": "expenses", "confidence": 0.9, "data": { "date": "YYYY-MM-DD", "amount": 500, "currency": "₽", "category": "food"|"health"|"grooming"|"items"|"other", "description": "описание", "shop": "магазин или клиника" } }

items (вещи питомца: игрушки, лежанки, миски, поводки, одежда, клетки, переноски, любые предметы — в т.ч. с чеков):
{ "module": "items", "confidence": 0.9, "data": { "name": "название", "category": "toy"|"bed"|"feeder"|"leash"|"clothing"|"cage"|"other", "condition": "new"|"used"|"worn", "reaction": "loves"|"likes"|"ignores"|"afraid", "purchaseDate": "YYYY-MM-DD", "notes": "заметки" } }

profile (обновление данных профиля питомца: порода, вес, дата рождения, окрас, пол):
{ "module": "profile", "confidence": 0.9, "data": { "breed": "порода", "weight": 4.5, "birthDate": "YYYY-MM-DD", "color": "окрас", "gender": "male"|"female" } }
Включай только те поля profile, которые явно упомянуты.

ПРИМЕРЫ:

Сообщение: "дал барсику таблетку энтерофурил 200мг утром"
Ответ: [{"module":"medications","confidence":0.95,"data":{"name":"Энтерофурил","dose":"200","unit":"мг","frequency":"утром","startDate":"${TODAY}","prescribedBy":"self","notify":false}}]

Сообщение: "сходили к ветеринару, доктор Иванов поставил диагноз отит, назначил отипакс капли 3 раза в день 7 дней"
Ответ: [{"module":"health","confidence":0.95,"data":{"date":"${TODAY}","type":"visit","description":"Визит к ветеринару","vet":"Иванов","result":"Поставлен диагноз отит"}},{"module":"health","confidence":0.95,"data":{"date":"${TODAY}","type":"diagnosis","description":"Отит","diagnosis":"Отит"}},{"module":"medications","confidence":0.95,"data":{"name":"Отипакс","dose":"3","unit":"кап","frequency":"3 раза в день","startDate":"${TODAY}","endDate":"","reason":"Отит","prescribedBy":"vet","notify":false}}]

ПРАВИЛА:
- Записывай только ФАКТЫ, не намерения. "Надо дать", "надо записать", "собираюсь" — игнорируй.
- БУДУЩИЕ СОБЫТИЯ — игнорируй. "Завтра прививку делаем" — это план, не факт, верни [].
- ПОВЕЛИТЕЛЬНОЕ НАКЛОНЕНИЕ ("дай таблетку") — считай фактом, записывай как выполненное.
- Если уверенность < 0.7 — не включай в ответ
- Дата если не указана = ${TODAY}
- Отвечай ТОЛЬКО JSON массивом, без markdown, без пояснений
- Если совсем непонятно — верни пустой массив []`;

const SYSTEM_PROMPT_EN = `You are a pet record recognition system. You receive a message from a pet owner and break it into atoms — individual facts. Each fact goes to its module.

MODULES AND THEIR FIELDS:

health (health, symptoms, vet visits, diagnoses):
{ "module": "health", "confidence": 0.9, "data": { "date": "YYYY-MM-DD", "type": "symptom"|"visit"|"diagnosis", "description": "text", "severity": "mild"|"moderate"|"severe", "vet": "vet name", "clinic": "clinic", "reason": "reason for visit", "result": "result", "diagnosis": "diagnosis", "nextVisitDate": "YYYY-MM-DD", "nextVisitNotify": true|false } }

medications (medications, pills, drops, injections):
{ "module": "medications", "confidence": 0.9, "data": { "name": "name", "dose": "5", "unit": "mg"|"ml"|"tab"|"drop"|"other", "frequency": "once a day", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "reason": "reason", "prescribedBy": "vet"|"self", "notify": true|false } }

vaccines (vaccines, vaccinations):
{ "module": "vaccines", "confidence": 0.9, "data": { "name": "vaccine name", "date": "YYYY-MM-DD", "drug": "drug", "manufacturer": "manufacturer", "vet": "vet", "clinic": "clinic", "nextDate": "YYYY-MM-DD", "notify": true|false } }

allergies (allergy, reaction, intolerance):
{ "module": "allergies", "confidence": 0.9, "data": { "allergen": "allergen", "allergenType": "food"|"plant"|"drug"|"other", "reaction": "how it manifests", "severity": "mild"|"moderate"|"severe", "firstDate": "YYYY-MM-DD", "confirmedByVet": true|false } }

nutrition (food, diet, feeding):
{ "module": "nutrition", "confidence": 0.9, "data": { "date": "YYYY-MM-DD", "feedType": "dry"|"wet"|"natural"|"mixed", "brand": "brand", "portionSize": "portion", "frequency": "frequency", "restrictions": "restrictions", "favorites": "likes", "dislikes": "dislikes", "reaction": "reaction" } }

habits (behaviour, activity, commands, play, sleep):
{ "module": "habits", "confidence": 0.9, "data": { "date": "YYYY-MM-DD", "category": "activity"|"sleep"|"play"|"command"|"behavior"|"change", "description": "description", "activityLevel": "low"|"medium"|"high" } }

documents (passport, microchip, insurance, pedigree):
{ "module": "documents", "confidence": 0.9, "data": { "type": "passport"|"chip"|"insurance"|"pedigree"|"other", "title": "title", "number": "number", "date": "YYYY-MM-DD", "expiry": "YYYY-MM-DD", "notes": "notes" } }

expenses (pet expenses: food, vet visits, grooming, purchases):
{ "module": "expenses", "confidence": 0.9, "data": { "date": "YYYY-MM-DD", "amount": 500, "currency": "€", "category": "food"|"health"|"grooming"|"items"|"other", "description": "description", "shop": "shop or clinic" } }

items (pet items: toys, beds, bowls, leashes, clothing, cages, carriers, any objects):
{ "module": "items", "confidence": 0.9, "data": { "name": "name", "category": "toy"|"bed"|"feeder"|"leash"|"clothing"|"cage"|"other", "condition": "new"|"used"|"worn", "reaction": "loves"|"likes"|"ignores"|"afraid", "purchaseDate": "YYYY-MM-DD", "notes": "notes" } }

profile (update pet profile: breed, weight, date of birth, colour, gender):
{ "module": "profile", "confidence": 0.9, "data": { "breed": "breed", "weight": 4.5, "birthDate": "YYYY-MM-DD", "color": "colour", "gender": "male"|"female" } }
Only include profile fields that are explicitly mentioned.

RULES:
- Record only FACTS, not intentions. "Need to give", "planning to", "will" — ignore these.
- FUTURE EVENTS — ignore. "Tomorrow we're getting a vaccine" — that's a plan, return [].
- IMPERATIVE mood ("give the pill") — treat as a fact, record as already done.
- If confidence < 0.7 — do not include in response
- Date if not specified = ${TODAY}
- Reply ONLY with a JSON array, no markdown, no explanations
- If unclear — return empty array []`;

function getSystemPrompt() {
  return appLang === 'ru' ? SYSTEM_PROMPT_RU : SYSTEM_PROMPT_EN;
}

async function parseRawResponse(raw: string | undefined, json: unknown): Promise<ParsedAtom[]> {
  if (!raw) {
    devLogger.log('error', 'Gemini returned no response', json);
    return [];
  }
  devLogger.log('parse', 'Raw Gemini response', raw);
  try {
    const atoms = JSON.parse(raw);
    const filtered = Array.isArray(atoms) ? atoms.filter((a: ParsedAtom) => a.confidence >= 0.7) : [];
    devLogger.log('parse', `Atoms recognised: ${filtered.length} of ${Array.isArray(atoms) ? atoms.length : 0}`, filtered);
    return filtered;
  } catch (e) {
    devLogger.log('error', 'JSON parse error', { raw, error: String(e) });
    return [];
  }
}

export async function parseUserText(text: string, pet: Pet): Promise<ParsedAtom[]> {
  const prompt = appLang === 'ru'
    ? `Питомец: ${pet.name} (${pet.species}${pet.breed ? ', ' + pet.breed : ''})\nСообщение: "${text}"\n\nВерни JSON массив атомов.`
    : `Pet: ${pet.name} (${pet.species}${pet.breed ? ', ' + pet.breed : ''})\nMessage: "${text}"\n\nReturn a JSON array of atoms.`;

  devLogger.log('parse', 'Sending request to Gemini', { text, pet: pet.name });

  const response = await geminiRequest({
    system_instruction: { parts: [{ text: getSystemPrompt() }] },
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
  });

  const json = await response.json();
  return parseRawResponse(json.candidates?.[0]?.content?.parts?.[0]?.text, json);
}

export async function parseImageData(
  base64: string,
  mimeType: string,
  caption: string,
  pet: Pet,
): Promise<ParsedAtom[]> {
  const prompt = appLang === 'ru'
    ? `Питомец: ${pet.name} (${pet.species}${pet.breed ? ', ' + pet.breed : ''})\nНа фото — упаковка лекарства, корма, этикетка или чек.${caption ? `\nПодпись владельца: "${caption}"` : ''}\n\nВАЖНО: читай информацию с фото. Подпись — контекст, не намерение.\n\nВерни JSON массив атомов.`
    : `Pet: ${pet.name} (${pet.species}${pet.breed ? ', ' + pet.breed : ''})\nThe photo shows a medication package, food package, label or receipt.${caption ? `\nOwner's caption: "${caption}"` : ''}\n\nIMPORTANT: read information from the photo. The caption is context, not intention.\n\nReturn a JSON array of atoms.`;

  devLogger.log('parse', 'Sending request to Gemini (photo)', { mimeType, caption, pet: pet.name });

  const response = await geminiRequest({
    system_instruction: { parts: [{ text: getSystemPrompt() }] },
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType, data: base64 } },
        { text: prompt },
      ],
    }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
  });

  const json = await response.json();
  return parseRawResponse(json.candidates?.[0]?.content?.parts?.[0]?.text, json);
}
