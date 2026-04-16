import { createPortal } from 'react-dom';
import { useState } from 'react';
import { Loader } from 'lucide-react';
import { getUserId } from '../storage';
import { useTranslation } from 'react-i18next';

const SUPABASE_URL = 'https://qkraaygwvnwzotyqdnlx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gHQhjhxovzymM7ELtSyxrg_Lq3XQduP';

interface PaywallProps {
  onClose: () => void;
  onPurchased: () => void;
}

export function Paywall({ onClose, onPurchased }: PaywallProps) {
  const { t } = useTranslation();
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState('');

  const handleBuy = async () => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) { setError(t('paywall.openInTg')); return; }
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
          tg.showAlert(t('paywall.premiumActivated'));
          onPurchased();
        }
      });
    } catch (e) {
      setError('Error: ' + String(e));
    } finally {
      setBuying(false);
    }
  };

  return createPortal(
    <div className="paywall-overlay">
      <div className="paywall-card">
        <div className="paywall-icon">⭐</div>
        <h2 className="paywall-title font-typewriter">{t('paywall.title')}</h2>
        <p className="paywall-subtitle">{t('paywall.subtitle')}</p>

        <div className="paywall-features">
          <div className="paywall-feature">{t('paywall.features.nutrition')}</div>
          <div className="paywall-feature">{t('paywall.features.documents')}</div>
          <div className="paywall-feature">{t('paywall.features.vet')}</div>
          <div className="paywall-feature">{t('paywall.features.card')}</div>
        </div>

        <div className="paywall-price-block">
          <span className="paywall-price-old">600 ⭐</span>
          <span className="paywall-price-new">300 ⭐</span>
          <span className="paywall-price-badge font-typewriter">-50%</span>
        </div>
        <p className="paywall-period">{t('paywall.period')}</p>

        <button className="paywall-buy-btn font-typewriter" onClick={handleBuy} disabled={buying}>
          {buying ? <><Loader size={14} className="spin" /> {t('common.loading')}</> : t('paywall.buyBtn')}
        </button>
        {error && <p className="paywall-error">{error}</p>}

        <button className="paywall-close-btn" onClick={onClose}>{t('paywall.closeBtn')}</button>
      </div>
    </div>,
    document.body
  );
}
