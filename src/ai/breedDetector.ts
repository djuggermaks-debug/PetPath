import { geminiRequest } from './config';
import type { Pet } from '../types';

const SPECIES_LABEL: Record<string, string> = {
  cat: 'кошки', dog: 'собаки', bird: 'птицы', other: 'животного',
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
  const label = SPECIES_LABEL[species] ?? 'животного';
  const response = await geminiRequest({
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType, data: base64 } },
        { text: `Определи породу и окрас ${label} на фото. Ответь ТОЛЬКО валидным JSON без markdown:\n{"breed":"название породы на русском","color":"окрас на русском"}\nПорода: если не можешь определить точно — напиши "Метис", "Дворняга" или "Беспородный".\nОкрас: краткое описание цвета и рисунка, например "Рыжий", "Чёрно-белый", "Серый полосатый".` },
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
  const response = await geminiRequest({
    contents: [{
      parts: [{ text: `Ты разбираешь описание питомца от владельца и возвращаешь структурированные данные.

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
- Пустые строки для строковых полей которые не упомянуты` }],
    }],
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
