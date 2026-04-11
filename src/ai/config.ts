export const GEMINI_MODEL = 'gemini-2.5-flash';

const SB_URL = import.meta.env.VITE_SB_URL ?? '';
export const GEMINI_PROXY_URL = `${SB_URL}/functions/v1/gemini-proxy`;
