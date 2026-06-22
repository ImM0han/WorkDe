import { Stack } from 'expo-router';

export default function SharedLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="change-password" />
      <Stack.Screen name="help" />
      <Stack.Screen name="language-settings" />
      <Stack.Screen name="chat/[jobId]" />
    </Stack>
  );
}
