import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_ID = '5336274403';
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const { admin_id, target_user_id, days } = await req.json();

  // Только админ может выдавать доступ
  if (String(admin_id) !== ADMIN_ID) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const premiumUntil = new Date();
  premiumUntil.setDate(premiumUntil.getDate() + (days ?? 30));

  const { error } = await supabase.from('users').upsert({
    telegram_user_id: String(target_user_id),
    is_gifted: true,
    is_premium: true,
    premium_until: premiumUntil.toISOString(),
    trial_started_at: new Date().toISOString(),
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, premium_until: premiumUntil.toISOString() }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
