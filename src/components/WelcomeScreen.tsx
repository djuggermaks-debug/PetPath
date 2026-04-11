import { createPortal } from 'react-dom';
import { useState } from 'react';
import { X, Loader } from 'lucide-react';
import { getUserId } from '../storage';

const SUPABASE_URL = 'https://qkraaygwvnwzotyqdnlx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gHQhjhxovzymM7ELtSyxrg_Lq3XQduP';

interface WelcomeScreenProps {
  onStart: () => void;
  onClose?: () => void;
  isFirstLaunch: boolean;
}

const FEATURES = [
  { icon: '🎙️', title: 'Говори или пиши', desc: 'ИИ сам понимает и раскладывает по разделам' },
  { icon: '📸', title: 'Фото лекарств и корма', desc: 'Сфотографируй упаковку — название и доза определятся автоматически' },
  { icon: '🩺', title: 'Анализ от ветеринарного ИИ', desc: 'Смотрит всю историю и даёт рекомендации' },
  { icon: '📋', title: 'Показать врачу', desc: 'Одна кнопка — и вся карта питомца готова к отправке' },
  { icon: '💉', title: 'Прививки, лекарства, аллергии', desc: 'Всё в одном месте, всегда под рукой' },
];

export function WelcomeScreen({ onStart, onClose, isFirstLaunch }: WelcomeScreenProps) {
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState('');

  const handleBuy = async () => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) {
      setBuyError('Откройте приложение в Telegram');
      return;
    }
    setBuying(true);
    setBuyError('');
    try {
      const userId = getUserId();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      tg.openInvoice(data.link, (status: string) => {
        if (status === 'paid') {
          tg.showAlert('✅ Оплата прошла! Premium активирован на 30 дней.');
          onClose?.();
        }
      });
    } catch (e) {
      setBuyError('Ошибка: ' + String(e));
    } finally {
      setBuying(false);
    }
  };

  return createPortal(
    <div className="welcome-overlay">
      <div className="welcome-card">
        {!isFirstLaunch && onClose && (
          <button className="welcome-close" onClick={onClose}>
            <X size={18} />
          </button>
        )}

        <div className="welcome-header">
          <div className="welcome-logo font-typewriter">🐾 PetPath</div>
          <h2 className="welcome-title">Медкарта вашего питомца</h2>
          <p className="welcome-subtitle">Всё о здоровье питомца — в одном месте</p>
        </div>

        <div className="welcome-features">
          {FEATURES.map(f => (
            <div key={f.icon} className="welcome-feature">
              <span className="welcome-feature-icon">{f.icon}</span>
              <div>
                <div className="welcome-feature-title">{f.title}</div>
                <div className="welcome-feature-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="welcome-trial">
          <span className="welcome-trial-badge font-typewriter">7 ДНЕЙ БЕСПЛАТНО</span>
          <p className="welcome-trial-text">После пробного периода — Premium подписка</p>
        </div>

        <div className="welcome-pricing">
          <div className="welcome-price-block">
            <span className="welcome-price-old">1300 ⭐</span>
            <span className="welcome-price-new">650 ⭐</span>
            <span className="welcome-price-badge font-typewriter">-50% только сейчас</span>
          </div>
          <p className="welcome-price-hint">
            ⭐ Звёзды покупаются в Telegram — Settings → Telegram Stars
          </p>

          <button className="welcome-buy-btn font-typewriter" onClick={handleBuy} disabled={buying}>
            {buying ? <><Loader size={14} className="spin" /> Загрузка...</> : '⭐ Купить Premium — 650 Stars'}
          </button>
          {buyError && <p className="welcome-buy-error">{buyError}</p>}
        </div>

        <button className="welcome-start-btn font-typewriter" onClick={onStart}>
          {isFirstLaunch ? 'Начать бесплатно →' : 'Закрыть'}
        </button>
      </div>
    </div>,
    document.body
  );
}
