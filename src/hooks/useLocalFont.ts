import { useTranslation } from 'react-i18next';

export function useLocalFont() {
  const { i18n } = useTranslation();
  const devanagariLangs = ['hi', 'mr'];

  return {
    displayFont: devanagariLangs.includes(i18n.language) ? 'TiroDevanagariHindi-Regular' : 'Syne-ExtraBold',
    bodyFont:    i18n.language === 'bn' ? 'HindSiliguri-Regular' :
                 i18n.language === 'te' ? 'NotoSansTelugu-Regular' :
                 i18n.language === 'ta' ? 'HindMadurai-Regular'   : 'Nunito-Regular',
  };
}
