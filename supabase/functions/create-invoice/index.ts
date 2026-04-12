import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const BOT_TOKEN = Deno.env.get('BOT_TOKEN')!;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const { user_id } = await req.json();

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'PetPath Premium',
      description: 'Доступ ко всем функциям на 30 дней',
      payload: JSON.stringify({ user_id, type: 'premium_30d' }),
      currency: 'XTR',
      prices: [{ label: 'Premium 30 дней', amount: 300 }],
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    return new Response(JSON.stringify({ error: data.description }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ link: data.result }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
