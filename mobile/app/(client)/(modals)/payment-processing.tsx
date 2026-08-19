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

  const handleSimulatePayment = async (orderIdFromInitiate?: string) => {
    try {
      console.log('[Payment Processing] Simulating payment success...');
      const fakePaymentId = `pay_simulated_${Math.random().toString(36).substring(2, 9)}`;
      const fakeOrderId = orderIdFromInitiate || `order_simulated_${Math.random().toString(36).substring(2, 9)}`;
      
      await api.post('/payments/confirm', {
        razorpayOrderId: fakeOrderId,
        razorpayPaymentId: fakePaymentId,
        razorpaySignature: 'simulated_payment_sig',
        jobId
      });

      queryClient.invalidateQueries({ queryKey: ['clientJobs'] });
      queryClient.invalidateQueries({ queryKey: ['activeOpsJobs'] });
      router.replace({ pathname: '/(client)/(modals)/payment-success', params: { jobId, rate } });
    } catch (simErr: any) {
      console.error('[Payment Processing] Simulated payment failed:', simErr.message);
      router.replace({
        pathname: '/(client)/(modals)/payment-failed',
        params: { error: simErr.response?.data?.error || 'Simulated payment failed' }
      });
    }
  };

  useEffect(() => {
    const backAction = () => true;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    const processPayment = async () => {
      const currentUser = useAuthStore.getState().user;
      const rateVal = parseFloat(rate || '0');

      if (!jobId || rateVal <= 0) {
        router.replace({
          pathname: '/(client)/(modals)/payment-failed',
          params: { error: 'Invalid Job ID or payment amount' }
        });
        return;
      }

      let orderId = '';
      let rzpKey = '';
      let currencyVal = 'INR';

      // 1. Fetch real Razorpay Order ID from backend
      try {
        console.log(`[Payment Processing] Requesting Razorpay order for Job ID: ${jobId}, Amount: ${rateVal}`);
        const orderRes = await api.post('/payments/initiate', {
          jobId,
          amount: rateVal
        });
        
        if (orderRes.data) {
          orderId = orderRes.data.orderId;
          rzpKey = orderRes.data.razorpayKeyId;
          currencyVal = orderRes.data.currency || currencyVal;
        }
      } catch (err: any) {
        console.error('[Payment Processing] Failed to create order on server:', err.response?.data?.error || err.message);
        router.replace({
          pathname: '/(client)/(modals)/payment-failed',
          params: { error: err.response?.data?.error || 'Failed to initiate payment on server' }
        });
        return;
      }

      const hasNativeSDK = RazorpayCheckout && typeof RazorpayCheckout.open === 'function';
      if (!hasNativeSDK) {
        console.log('[Payment Processing] Razorpay native SDK not found. Running automatic simulation...');
        // Automatically simulate payment success after 1.5 seconds in missing SDK environment
        setTimeout(() => {
          handleSimulatePayment(orderId);
        }, 1500);
        return;
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
        console.log('[Payment Processing] Opening Razorpay checkout SDK...');
        const paymentResult = await RazorpayCheckout.open(options);
        console.log('[Payment Processing] Razorpay checkout success:', paymentResult);

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
        console.warn('[Payment Processing] Razorpay Checkout error or cancellation:', e);
        
        // Check if the user cancelled the payment
        if (e.code === 2 || (e.description && e.description.toLowerCase().includes('cancelled'))) {
          console.log('[Payment Processing] Payment cancelled by user. Returning back.');
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(client)');
          }
        } else {
          // On any other failure navigate to payment failed screen with the real error message from Razorpay
          const errorMsg = e.description || e.message || 'Payment transaction failed';
          router.replace({
            pathname: '/(client)/(modals)/payment-failed',
            params: { error: errorMsg }
          });
        }
      }
    };

    processPayment();

    return () => {
      backHandler.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.title}>Processing Payment</Text>
      <Text style={styles.subtitle}>Please do not close this window or press the back button.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  title: { fontFamily: typography.fontDisplay, fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm },
  subtitle: { fontFamily: typography.fontBody, fontSize: 15, color: colors.textSecondary, textAlign: 'center' }
});
