import { createPortal } from 'react-dom';
import { useState } from 'react';
import { Loader } from 'lucide-react';
import { getUserId } from '../storage';

const SUPABASE_URL = 'https://qkraaygwvnwzotyqdnlx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gHQhjhxovzymM7ELtSyxrg_Lq3XQduP';

interface PaywallProps {
  onClose: () => void;
  onPurchased: () => void;
}

export function Paywall({ onClose, onPurchased }: PaywallProps) {
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState('');

  const handleBuy = async () => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) { setError('Откройте в Telegram'); return; }
    setBuying(true);
    setError('');
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ user_id: getUserId() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      tg.openInvoice(data.link, (status: string) => {
        if (status === 'paid') {
          tg.showAlert('✅ Premium активирован на 30 дней!');
          onPurchased();
        }
      });
    } catch (e) {
      setError('Ошибка: ' + String(e));
    } finally {
      setBuying(false);
    }
  };

  return createPortal(
    <div className="paywall-overlay">
      <div className="paywall-card">
        <div className="paywall-icon">⭐</div>
        <h2 className="paywall-title font-typewriter">Premium доступ</h2>
        <p className="paywall-subtitle">Пробный период закончился. Для доступа ко всем функциям нужна подписка.</p>

        <div className="paywall-features">
          <div className="paywall-feature">📊 Питание и привычки</div>
          <div className="paywall-feature">📄 Документы и медиабанк</div>
          <div className="paywall-feature">🩺 Ветеринарный анализ</div>
          <div className="paywall-feature">📋 Показать врачу</div>
        </div>

        <div className="paywall-price-block">
          <span className="paywall-price-old">1300 ⭐</span>
          <span className="paywall-price-new">650 ⭐</span>
          <span className="paywall-price-badge font-typewriter">-50%</span>
        </div>
        <p className="paywall-period">/ 30 дней</p>

        <button className="paywall-buy-btn font-typewriter" onClick={handleBuy} disabled={buying}>
          {buying ? <><Loader size={14} className="spin" /> Загрузка...</> : '⭐ Купить Premium'}
        </button>
        {error && <p className="paywall-error">{error}</p>}

        <button className="paywall-close-btn" onClick={onClose}>Закрыть</button>
      </div>
    </div>,
    document.body
  );
}
