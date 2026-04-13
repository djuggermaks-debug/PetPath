import { useState, useEffect } from 'react';
import { supabase } from '../storage/supabase';
import { getUserId } from '../storage';

export type UserStatus = 'loading' | 'trial' | 'trial_expired' | 'premium' | 'admin';

export interface UserInfo {
  status: UserStatus;
  trialDaysLeft: number;
  isPremium: boolean;
  isAdmin: boolean;
}

const TRIAL_DAYS = 7;

export function useUserStatus(): UserInfo {
  const [info, setInfo] = useState<UserInfo>({
    status: 'loading',
    trialDaysLeft: TRIAL_DAYS,
    isPremium: false,
    isAdmin: false,
  });

  useEffect(() => {
    const userId = getUserId();

    const load = async () => {
      // Загружаем или создаём запись пользователя
      let { data } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_user_id', userId)
        .single();

      if (!data) {
        // Первый вход — создаём запись с триалом
        const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
        const { data: created } = await supabase
          .from('users')
          .insert({
            telegram_user_id: userId,
            trial_started_at: new Date().toISOString(),
            username: tgUser?.username ?? null,
          })
          .select()
          .single();
        data = created;
      }

      if (!data) {
        setInfo({ status: 'trial', trialDaysLeft: TRIAL_DAYS, isPremium: false, isAdmin: false });
        return;
      }

      // Админ — всегда полный доступ
      if (data.is_admin) {
        setInfo({ status: 'admin', trialDaysLeft: TRIAL_DAYS, isPremium: true, isAdmin: true });
        return;
      }

      // Активный премиум
      const premiumActive = data.is_premium &&
        (!data.premium_until || new Date(data.premium_until) > new Date());
      if (premiumActive || data.is_gifted) {
        setInfo({ status: 'premium', trialDaysLeft: 0, isPremium: true, isAdmin: false });
        return;
      }

      // Считаем дни триала
      const trialStart = new Date(data.trial_started_at);
      const now = new Date();
      const daysPassed = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
      const daysLeft = Math.max(0, TRIAL_DAYS - daysPassed);

      if (daysLeft > 0) {
        setInfo({ status: 'trial', trialDaysLeft: daysLeft, isPremium: false, isAdmin: false });
      } else {
        setInfo({ status: 'trial_expired', trialDaysLeft: 0, isPremium: false, isAdmin: false });
      }
    };

    load();
  }, []);

  return info;
}
