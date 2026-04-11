import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BOT_TOKEN = Deno.env.get('BOT_TOKEN')!;
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

serve(async (req) => {
  const update = await req.json();

  // Успешная оплата Stars
  if (update.pre_checkout_query) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pre_checkout_query_id: update.pre_checkout_query.id, ok: true }),
    });
    return new Response('ok');
  }

  if (update.message?.successful_payment) {
    const payment = update.message.successful_payment;
    const payload = JSON.parse(payment.invoice_payload);
    const userId = String(payload.user_id);

    const premiumUntil = new Date();
    premiumUntil.setDate(premiumUntil.getDate() + 30);

    await supabase.from('users').upsert({
      telegram_user_id: userId,
      is_premium: true,
      premium_until: premiumUntil.toISOString(),
    });

    // Отправляем сообщение пользователю
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: update.message.chat.id,
        text: '✅ Оплата прошла! Premium активирован на 30 дней. Возвращайтесь в PetPath 🐾',
      }),
    });
  }

  return new Response('ok');
});
