import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface WelcomeScreenProps {
  onStart: () => void;
  onClose?: () => void; // если открыт через кнопку ? (не первый запуск)
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
            ⭐ Звёзды покупаются прямо в Telegram — Settings → Telegram Stars, или нажав на любой профиль → Отправить подарок
          </p>
        </div>

        <button className="welcome-start-btn font-typewriter" onClick={onStart}>
          {isFirstLaunch ? 'Начать бесплатно →' : 'Понятно'}
        </button>
      </div>
    </div>,
    document.body
  );
}
