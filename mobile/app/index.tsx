import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { useLanguageStore } from '../src/i18n/languageStore';

export default function Index() {
  const { user, role } = useAuthStore();
  const { isLanguageSelected } = useLanguageStore();

  if (!isLanguageSelected) return <Redirect href="/(auth)/language-select" />;

  if (!user) return <Redirect href="/(auth)/onboarding" />;
  if (role === 'PARTNER') return <Redirect href="/(partner)" />;
  return <Redirect href="/(client)" />;
}
