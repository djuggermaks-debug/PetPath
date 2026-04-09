import { GEMINI_URL } from './config';

const SPECIES_LABEL: Record<string, string> = {
  cat: 'кошки', dog: 'собаки', bird: 'птицы', other: 'животного',
};

export async function detectPetBreed(
  base64: string,
  mimeType: string,
  species: string,
): Promise<string> {
  const label = SPECIES_LABEL[species] ?? 'животного';
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: base64 } },
          { text: `Определи породу ${label} на фото. Ответь ТОЛЬКО названием породы на русском языке, одно-три слова. Если не можешь определить точную породу — напиши "Метис" или "Дворняга" или "Беспородный". Без пояснений, только порода.` },
        ],
      }],
      generationConfig: { temperature: 0.1 },
    }),
  });
  const json = await response.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  return text;
}
