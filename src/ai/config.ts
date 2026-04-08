// TODO: move to Supabase Edge Functions before production
export const GEMINI_API_KEY = 'AIzaSyAT_JfaEDflfMLKOq8jhqCTw4atmGR0mGU';
export const GEMINI_MODEL = 'gemini-2.0-flash';
export const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
