import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import hi from './locales/hi.json';
import bn from './locales/bn.json';
import te from './locales/te.json';
import mr from './locales/mr.json';
import ta from './locales/ta.json';

const LANGUAGE_STORAGE_KEY = 'gigwork_language';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English',        nativeLabel: 'English',   flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi',          nativeLabel: 'हिंदी',       flag: '🇮🇳' },
  { code: 'bn', label: 'Bengali',        nativeLabel: 'বাংলা',       flag: '🇮🇳' },
  { code: 'te', label: 'Telugu',         nativeLabel: 'తెలుగు',      flag: '🇮🇳' },
  { code: 'mr', label: 'Marathi',        nativeLabel: 'मराठी',       flag: '🇮🇳' },
  { code: 'ta', label: 'Tamil',          nativeLabel: 'தமிழ்',       flag: '🇮🇳' },
];

export const initI18n = async () => {
  const savedLang = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

  await i18n
    .use(initReactI18next)
    .init({
      resources: { 
        en: { translation: en }, 
        hi: { translation: hi },
        bn: { translation: bn }, 
        te: { translation: te },
        mr: { translation: mr }, 
        ta: { translation: ta } 
      },
      lng: savedLang || 'en',
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      compatibilityJSON: 'v4',
    });

  return i18n;
};

export const changeLanguage = async (code: string) => {
  await i18n.changeLanguage(code);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, code);
};

export default i18n;
