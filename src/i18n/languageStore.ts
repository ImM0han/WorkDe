import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { changeLanguage } from './index';

interface LanguageStore {
  currentLang: string;
  isLanguageSelected: boolean;
  setLanguage: (code: string) => Promise<void>;
  markLanguageSelected: () => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      currentLang: 'en',
      isLanguageSelected: false,
      setLanguage: async (code) => {
        await changeLanguage(code);
        set({ currentLang: code });
      },
      markLanguageSelected: () => set({ isLanguageSelected: true }),
    }),
    {
      name: 'gigwork-language',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
