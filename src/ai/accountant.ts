import { GEMINI_URL } from './config';
import type { Pet } from '../types';

export interface ParsedAtom {
  module: 'health' | 'medications' | 'vaccines' | 'allergies' | 'nutrition' | 'habits' | 'documents';
  confidence: number;
  data: Record<string, unknown>;
}

const SYSTEM_PROMPT = `Ты — счетовод. Твоя задача: разбить сообщение владельца питомца на атомы и распределить по модулям.

Модули:
- health: симптомы, визиты к врачу, диагнозы
- medications: лекарства, дозы, курс лечения
- vaccines: прививки, вакцинация
- allergies: аллергические реакции
- nutrition: питание, корм, диета
- habits: поведение, активность, команды, привычки
- documents: паспорт, чип, страховка

Правила:
1. Одно сообщение может содержать несколько атомов
2. Дата если не указана = сегодня (${new Date().toISOString().slice(0, 10)})
3. Confidence от 0 до 1. Если < 0.7 — не включай атом
4. Отвечай ТОЛЬКО валидным JSON массивом, без markdown, без пояснений

Схемы данных для каждого модуля:
health: { date, type("symptom"|"visit"|"diagnosis"), description, vet?, clinic?, reason?, result?, diagnosis?, severity?("mild"|"moderate"|"severe"), nextVisitDate? }
medications: { name, dose, unit("мг"|"мл"|"таб"|"кап"|"другое"), frequency?, startDate, endDate?, reason?, prescribedBy("vet"|"self") }
vaccines: { name, date, drug?, manufacturer?, vet?, clinic?, nextDate? }
allergies: { allergen, allergenType("food"|"plant"|"drug"|"other"), reaction?, severity("mild"|"moderate"|"severe"), firstDate?, confirmedByVet(bool) }
nutrition: { date, feedType("dry"|"wet"|"natural"|"mixed"), brand?, portionSize?, frequency?, restrictions?, favorites?, dislikes?, reaction? }
habits: { date, category("activity"|"sleep"|"play"|"command"|"behavior"|"change"), description, activityLevel?("low"|"medium"|"high") }
documents: { type("passport"|"chip"|"insurance"|"pedigree"|"other"), title, number?, date?, expiry?, notes? }`;

export async function parseUserText(text: string, pet: Pet): Promise<ParsedAtom[]> {
  const prompt = `Питомец: ${pet.name} (${pet.species}, ${pet.breed || 'порода не указана'})
Сообщение владельца: "${text}"

Разбей на атомы и верни JSON массив.`;

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
