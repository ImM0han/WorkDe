import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="role-select" />
      <Stack.Screen name="phone-login" />
      <Stack.Screen name="otp-verify" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
