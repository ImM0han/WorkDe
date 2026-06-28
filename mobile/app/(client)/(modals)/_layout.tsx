import { Stack } from 'expo-router';

export default function ClientModalsLayout() {
  return (
    <Stack screenOptions={{ presentation: 'modal', headerShown: false }}>
      <Stack.Screen name="partner-profile" />
      <Stack.Screen name="search-filter" />
      <Stack.Screen name="reviews-detail" />
      <Stack.Screen name="job-review-confirm" />
      <Stack.Screen name="job-posted-success" />
      <Stack.Screen name="job-detail" />
      <Stack.Screen name="partner-matched" />
      <Stack.Screen name="daily-ops" />
      <Stack.Screen name="worker-detail" />
      <Stack.Screen name="end-work-confirm" />
      <Stack.Screen name="extend-work" />
      <Stack.Screen name="payment" />
      <Stack.Screen name="payment-method" />
      <Stack.Screen name="payment-processing" />
      <Stack.Screen name="payment-success" />
      <Stack.Screen name="payment-failed" />
    </Stack>
  );
}
