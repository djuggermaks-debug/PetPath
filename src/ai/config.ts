// Key stored in .env.local (local) and GitHub Secret (CI/CD)
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_KEY ?? '';
export const GEMINI_MODEL = 'gemini-2.5-flash';
export const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
