import { createPortal } from 'react-dom';
import { useState } from 'react';
import { X, Loader } from 'lucide-react';
import { getUserId } from '../storage';
import { useTranslation } from 'react-i18next';

const SUPABASE_URL = 'https://qkraaygwvnwzotyqdnlx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gHQhjhxovzymM7ELtSyxrg_Lq3XQduP';

interface WelcomeScreenProps {
  onStart: () => void;
  onClose?: () => void;
  isFirstLaunch: boolean;
}

export function WelcomeScreen({ onStart, onClose, isFirstLaunch }: WelcomeScreenProps) {
  const { t } = useTranslation();
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState('');

  const FEATURES = [
    { icon: '🎙️', title: t('welcome.features.voice.title'), desc: t('welcome.features.voice.desc') },
    { icon: '📸', title: t('welcome.features.photo.title'), desc: t('welcome.features.photo.desc') },
    { icon: '🩺', title: t('welcome.features.vet.title'), desc: t('welcome.features.vet.desc') },
    { icon: '📋', title: t('welcome.features.card.title'), desc: t('welcome.features.card.desc') },
    { icon: '💉', title: t('welcome.features.records.title'), desc: t('welcome.features.records.desc') },
  ];

  const handleBuy = async () => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) {
      setBuyError(t('welcome.openInTg'));
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
          tg.showAlert(t('welcome.paymentSuccess'));
          onClose?.();
        }
      });
    } catch (e) {
      setBuyError('Error: ' + String(e));
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
          <h2 className="welcome-title">{t('welcome.title')}</h2>
          <p className="welcome-subtitle">{t('welcome.subtitle')}</p>
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
          <span className="welcome-trial-badge font-typewriter">{t('welcome.trialBadge')}</span>
          <p className="welcome-trial-text">{t('welcome.trialText')}</p>
        </div>

        {!isFirstLaunch && (
          <div className="welcome-pricing">
            <div className="welcome-price-block">
              <span className="welcome-price-old">600 ⭐</span>
              <span className="welcome-price-new">300 ⭐</span>
              <span className="welcome-price-badge font-typewriter">{t('welcome.discountBadge')}</span>
            </div>
            <p className="welcome-price-hint">{t('welcome.starsHint')}</p>

            <button className="welcome-buy-btn font-typewriter" onClick={handleBuy} disabled={buying}>
              {buying ? <><Loader size={14} className="spin" /> {t('common.loading')}</> : t('welcome.buyBtn')}
            </button>
            {buyError && <p className="welcome-buy-error">{buyError}</p>}
          </div>
        )}

        <button className="welcome-start-btn font-typewriter" onClick={onStart}>
          {isFirstLaunch ? t('welcome.startFree') : t('welcome.closeBtn')}
        </button>
      </div>
    </div>,
    document.body
  );
}
