import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, BackHandler } from 'react-native';
import { colors, typography, spacing } from '../../../src/theme/tokens';
import { useRouter } from 'expo-router';
import RazorpayCheckout from 'react-native-razorpay';

export default function PaymentProcessing() {
  const router = useRouter();

  useEffect(() => {
    const backAction = () => true;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    const processPayment = async () => {
      const options = {
        description: 'GigWork Payment',
        currency: 'INR',
        key: 'rzp_test_mock',
        amount: '125000',
        name: 'GigWork',
        order_id: 'order_mock',
        theme: { color: '#FF6B1A' }, // Spec: Razorpay SDK theme color #FF6B1A
        prefill: { email: 'test@example.com', contact: '9999999999', name: 'Test User' }
      };

      try {
        await RazorpayCheckout.open(options);
        router.replace('/(client)/(modals)/payment-success');
      } catch (e) {
        // Fallback for Expo Go where native module might not be present
        setTimeout(() => {
          router.replace('/(client)/(modals)/payment-success');
        }, 1500);
      }
    };

    processPayment();

    return () => backHandler.remove();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.title}>Processing Payment</Text>
      <Text style={styles.subtitle}>Please do not close this window or press the back button.</Text>
      <Text style={[styles.subtitle, { marginTop: 20, fontWeight: 'bold' }]}>Test Card: 4111 1111 1111 1111</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  title: { fontFamily: typography.fontDisplay, fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm },
  subtitle: { fontFamily: typography.fontBody, fontSize: 15, color: colors.textSecondary, textAlign: 'center' }
});
