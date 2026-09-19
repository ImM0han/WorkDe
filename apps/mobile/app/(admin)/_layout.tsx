import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1C1410',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontFamily: 'Syne-Bold',
          fontSize: 18,
        },
        contentStyle: {
          backgroundColor: '#FDF6EE',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Ops Console',
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="withdrawals"
        options={{
          title: 'Payout Processing',
        }}
      />
      <Stack.Screen
        name="users"
        options={{
          title: 'Users & KYC',
        }}
      />
      <Stack.Screen
        name="disputes"
        options={{
          title: 'Dispute Resolution',
        }}
      />
      <Stack.Screen
        name="manage-admins"
        options={{
          title: 'Admin Accounts (CRUD)',
        }}
      />
      <Stack.Screen
        name="auth-console"
        options={{
          title: 'User Authentication Console',
        }}
      />
    </Stack>
  );
}
