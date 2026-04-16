import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './locales/ru.json';
import en from './locales/en.json';

// Кириллические locale коды → русский язык
const CYRILLIC_LOCALES = ['ru', 'uk', 'be', 'bg', 'mk', 'sr', 'kk', 'ky', 'tg', 'mn'];

function detectLanguage(): string {
  // URL override for testing: ?lang=en or ?lang=ru
  const urlLang = new URLSearchParams(window.location.search).get('lang');
  if (urlLang === 'en' || urlLang === 'ru') return urlLang;

  try {
    const tg = (window as any).Telegram?.WebApp;
    const code = tg?.initDataUnsafe?.user?.language_code ?? navigator.language?.split('-')[0] ?? 'en';
    return CYRILLIC_LOCALES.includes(code) ? 'ru' : 'en';
  } catch {
    return 'ru';
  }
}

export const appLang = detectLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      en: { translation: en },
    },
    lng: appLang,
    fallbackLng: 'ru',
    interpolation: { escapeValue: false },
  });

export default i18n;
