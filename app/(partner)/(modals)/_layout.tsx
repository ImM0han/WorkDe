import { Stack } from 'expo-router';

export default function PartnerModalsLayout() {
  return (
    <Stack screenOptions={{ presentation: 'modal', headerShown: false }}>
      <Stack.Screen name="job-detail" />
      <Stack.Screen name="job-accepted" />
      <Stack.Screen name="job-in-progress" />
      <Stack.Screen name="job-completion" />
      <Stack.Screen name="reject-reason" />
      <Stack.Screen name="wallet" />
      <Stack.Screen name="withdraw" />
      <Stack.Screen name="transaction-detail" />
      <Stack.Screen name="add-bank" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="manage-skills" />
      <Stack.Screen name="add-certificate" />
      <Stack.Screen name="cert-status" />
      <Stack.Screen name="aadhaar-kyc" />
      <Stack.Screen name="extension-detail" />
      <Stack.Screen name="dispute-report" />
    </Stack>
  );
}
