import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { ru } from './ru';
const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('tl_lang') : null;
i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ru: { translation: ru } },
  lng: saved === 'ru' || saved === 'en' ? saved : 'en', fallbackLng: 'en', keySeparator: false, interpolation: { escapeValue: false },
  returnNull: false,
});
i18n.on('languageChanged', (l) => { document.documentElement.lang = l; });
export default i18n;
