const SB_URL = 'https://qkraaygwvnwzotyqdnlx.supabase.co';
const SB_ANON_KEY = 'sb_publishable_gHQhjhxovzymM7ELtSyxrg_Lq3XQduP';

export const GEMINI_PROXY_URL = `${SB_URL}/functions/v1/gemini-proxy`;

export function geminiRequest(body: unknown): Promise<Response> {
  return fetch(GEMINI_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SB_ANON_KEY },
    body: JSON.stringify({ body }),
  });
}
