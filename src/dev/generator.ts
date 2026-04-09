import { GEMINI_URL } from '../ai/config';
import type { Pet } from '../types';

const PROMPT = `Придумай одно короткое реалистичное сообщение от владельца питомца на русском языке.
Сообщение должно содержать факт о здоровье, лекарстве, прививке, аллергии, питании, поведении или документе питомца.
Иногда делай одно сообщение с несколькими фактами (например: дал лекарство и питомец плохо ел).
Пиши разговорно, с возможными опечатками. Без кавычек. Только само сообщение.`;

export async function generateTestPhrase(pet: Pet): Promise<string> {
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: `Питомец: ${pet.name} (${pet.species}${pet.breed ? ', ' + pet.breed : ''})\n\n${PROMPT}` }]
      }],
      generationConfig: { temperature: 0.9 },
    }),
  });

  const json = await response.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}
