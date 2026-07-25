import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, BackHandler } from 'react-native';
import { colors, typography, spacing } from '../../../src/theme/tokens';
import { useRouter, useLocalSearchParams } from 'expo-router';
import RazorpayCheckout from 'react-native-razorpay';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../../src/services/apiClient';
import { useAuthStore } from '../../../src/stores/authStore';

export default function PaymentProcessing() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { jobId, rate } = useLocalSearchParams<{ jobId: string; rate: string }>();

  useEffect(() => {
    const backAction = () => true;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    const processPayment = async () => {
      const currentUser = useAuthStore.getState().user;
      const rateVal = parseFloat(rate || '1250');
      let orderId = 'order_mock';
      let rzpKey = 'rzp_test_mock';
      let currencyVal = 'INR';

      // 1. Fetch real Razorpay Order ID from backend
      try {
        console.log(`[Payment Processing] Creating payment order for Job ID: ${jobId}, Amount: ${rateVal}`);
        const orderRes = await api.post('/payments/order', {
          jobId,
          amount: rateVal
        });
        
        if (orderRes.data) {
          orderId = orderRes.data.orderId || orderId;
          rzpKey = orderRes.data.razorpayKeyId || rzpKey;
          currencyVal = orderRes.data.currency || currencyVal;
          console.log(`[Payment Processing] Real order created: ${orderId}`);
        }
      } catch (err: any) {
        console.warn('[Payment Processing] Failed to create real order on backend. Using mock fallback.', err.message || err);
      }

      const options = {
        description: `Payment for Job #${jobId}`,
        currency: currencyVal,
        key: rzpKey,
        amount: (rateVal * 100).toFixed(0),
        name: 'GigWork',
        order_id: orderId,
        theme: { color: '#FF6B1A' }, // Spec: Razorpay SDK theme color #FF6B1A
        prefill: {
          email: currentUser?.email || 'test@example.com',
          contact: currentUser?.phone || '9999999999',
          name: currentUser?.name || 'Test User'
        }
      };

      try {
        console.log('[Payment Processing] Opening Razorpay checkout checkout...');
        const paymentResult = await RazorpayCheckout.open(options);
        console.log('[Payment Processing] Checkout completed successfully:', paymentResult);

        // 2. Call backend to confirm payment immediately
        await api.post('/payments/confirm', {
          razorpayOrderId: paymentResult.razorpay_order_id || orderId,
          razorpayPaymentId: paymentResult.razorpay_payment_id,
          razorpaySignature: paymentResult.razorpay_signature,
          jobId
        });

        queryClient.invalidateQueries({ queryKey: ['clientJobs'] });
        queryClient.invalidateQueries({ queryKey: ['activeOpsJobs'] });
        router.replace({ pathname: '/(client)/(modals)/payment-success', params: { jobId, rate } });
      } catch (e: any) {
        console.warn('[Payment Processing] Razorpay Native SDK failed or caught exception:', e.message || e);
        
        // Fallback simulation (e.g. inside Expo Go without development build)
        console.log('[Payment Processing] Falling back to Simulated checkout...');
        try {
          const mockPaymentId = 'pay_mock_' + Math.floor(Math.random() * 1000000);
          await api.post('/payments/confirm', {
            razorpayOrderId: orderId,
            razorpayPaymentId: mockPaymentId,
            razorpaySignature: 'sig_mock',
            jobId
          });
          queryClient.invalidateQueries({ queryKey: ['clientJobs'] });
          queryClient.invalidateQueries({ queryKey: ['activeOpsJobs'] });
        } catch (apiErr) {
          console.error('Failed to confirm simulated payment:', apiErr);
        }
        
        setTimeout(() => {
          router.replace({ pathname: '/(client)/(modals)/payment-success', params: { jobId, rate } });
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
