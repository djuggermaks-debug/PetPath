// Key stored in .env.local (local) and GitHub Secret (CI/CD)
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_KEY ?? '';
export const GEMINI_MODEL = 'gemini-2.0-flash-lite';
export const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
