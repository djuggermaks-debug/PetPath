import { geminiRequest } from './config';
import type { Pet } from '../types';
import { appLang } from '../i18n';

const SPECIES_LABEL_RU: Record<string, string> = {
  cat: 'кошки', dog: 'собаки', bird: 'птицы', other: 'животного',
};
const SPECIES_LABEL_EN: Record<string, string> = {
  cat: 'cat', dog: 'dog', bird: 'bird', other: 'animal',
};

export interface PetPhotoInfo {
  breed: string;
  color: string;
}

export async function detectPetBreed(
  base64: string,
  mimeType: string,
  species: string,
): Promise<PetPhotoInfo> {
  const isRu = appLang === 'ru';
  const labelMap = isRu ? SPECIES_LABEL_RU : SPECIES_LABEL_EN;
  const label = labelMap[species] ?? (isRu ? 'животного' : 'animal');

  const prompt = isRu
    ? `Определи породу и окрас ${label} на фото. Ответь ТОЛЬКО валидным JSON без markdown:\n{"breed":"название породы на русском","color":"окрас на русском"}\nПорода: если не можешь определить точно — напиши "Метис", "Дворняга" или "Беспородный".\nОкрас: краткое описание цвета и рисунка, например "Рыжий", "Чёрно-белый", "Серый полосатый".`
    : `Identify the breed and colour of the ${label} in the photo. Reply ONLY with valid JSON, no markdown:\n{"breed":"breed name in English","color":"colour in English"}\nBreed: if you cannot determine precisely — write "Mixed breed" or "Unknown".\nColour: brief description, e.g. "Orange", "Black and white", "Grey tabby".`;

  const response = await geminiRequest({
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType, data: base64 } },
        { text: prompt },
      ],
    }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
  });
  const json = await response.json();
  const raw = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  try {
    return JSON.parse(raw);
  } catch {
    return { breed: raw, color: '' };
  }
}

export interface PetProfileDraft {
  name: string;
  species: Pet['species'];
  gender: Pet['gender'];
  breed: string;
  birthDate: string;
  color: string;
  weight: number;
}

export async function parsePetProfile(text: string): Promise<PetProfileDraft> {
  const today = new Date();
  const isRu = appLang === 'ru';

  const prompt = isRu
    ? `Ты разбираешь описание питомца от владельца и возвращаешь структурированные данные.

Сообщение: "${text}"

Верни ТОЛЬКО валидным JSON без markdown:
{
  "name": "кличка питомца или пустая строка",
  "species": "cat"|"dog"|"bird"|"other",
  "gender": "male"|"female",
  "breed": "порода или пустая строка",
  "birthDate": "YYYY-MM-DD или пустая строка",
  "color": "окрас или пустая строка",
  "weight": число в кг или 0
}

Правила:
- Если возраст указан в годах (например "3 года") — вычисли приблизительную дату рождения от ${today.toISOString().slice(0, 10)}
- Пол: "кот", "пёс", "мальчик", "самец" → male; "кошка", "собака", "девочка", "самка" → female
- Вид по умолчанию если не указан: "cat"
- Пол по умолчанию если не указан: "male"
- Вес: число в кг, если не указан — 0
- Пустые строки для строковых полей которые не упомянуты`
    : `You parse a pet description from the owner and return structured data.

Message: "${text}"

Return ONLY valid JSON, no markdown:
{
  "name": "pet name or empty string",
  "species": "cat"|"dog"|"bird"|"other",
  "gender": "male"|"female",
  "breed": "breed or empty string",
  "birthDate": "YYYY-MM-DD or empty string",
  "color": "colour or empty string",
  "weight": weight in kg as number or 0
}

Rules:
- If age is given in years (e.g. "3 years") — calculate approximate birth date from ${today.toISOString().slice(0, 10)}
- Gender: "male", "boy", "tom" → male; "female", "girl", "she" → female
- Default species if not specified: "cat"
- Default gender if not specified: "male"
- Weight: number in kg, if not specified — 0
- Empty strings for string fields not mentioned`;

  const response = await geminiRequest({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
  });
  const json = await response.json();
  const raw = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  try {
    return JSON.parse(raw);
  } catch {
    return { name: '', species: 'cat', gender: 'male', breed: '', birthDate: '', color: '', weight: 0 };
  }
}
