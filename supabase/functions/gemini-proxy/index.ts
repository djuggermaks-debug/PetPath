import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GEMINI_KEY = Deno.env.get('GEMINI_KEY')!;
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const { model, body } = await req.json();
  const geminiModel = model ?? 'gemini-2.5-flash';
  const url = `${BASE}/${geminiModel}:generateContent?key=${GEMINI_KEY}`;

  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await upstream.json();
  return new Response(JSON.stringify(data), {
    status: upstream.status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
