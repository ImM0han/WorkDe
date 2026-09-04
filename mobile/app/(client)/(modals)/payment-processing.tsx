import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, BackHandler, NativeModules, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, radius } from '../../../src/theme/tokens';
import { useRouter, useLocalSearchParams } from 'expo-router';
import RazorpayCheckout from 'react-native-razorpay';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../../src/services/apiClient';
import { useAuthStore } from '../../../src/stores/authStore';
import Toast from 'react-native-toast-message';
import { Feather } from '@expo/vector-icons';

export default function PaymentProcessing() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { jobId, rate } = useLocalSearchParams<{ jobId: string; rate: string }>();

  const [orderId, setOrderId] = useState('');
  const [showDevFallback, setShowDevFallback] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSimulatePayment = async (orderIdFromInitiate?: string) => {
    setIsProcessing(true);
    try {
      console.log('[Payment Processing] Explicitly simulating payment success...');
      const targetOrderId = orderIdFromInitiate || orderId || `order_simulated_${Math.random().toString(36).substring(2, 9)}`;
      const fakePaymentId = `pay_simulated_${Math.random().toString(36).substring(2, 9)}`;
      
      await api.post('/payments/confirm', {
        razorpayOrderId: targetOrderId,
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
        params: { error: simErr.response?.data?.error || 'Simulated payment failed', jobId, rate }
      });
    } finally {
      setIsProcessing(false);
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
          params: { error: 'Invalid Job ID or payment amount', jobId, rate }
        });
        return;
      }

      let fetchedOrderId = '';
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
          fetchedOrderId = orderRes.data.orderId;
          setOrderId(fetchedOrderId);
          rzpKey = orderRes.data.razorpayKeyId;
          currencyVal = orderRes.data.currency || currencyVal;
        }
      } catch (err: any) {
        console.error('[Payment Processing] Failed to create order on server:', err.response?.data?.error || err.message);
        router.replace({
          pathname: '/(client)/(modals)/payment-failed',
          params: { error: err.response?.data?.error || 'Failed to initiate payment on server', jobId, rate }
        });
        return;
      }

      // Check if native Razorpay C++/Java module is linked in binary
      const hasNativeRazorpay = !!(
        NativeModules?.RazorpayCheckout ||
        NativeModules?.RazorpayCheckoutModule ||
        NativeModules?.Razorpay
      );

      let rzpModule: any = null;
      try {
        if (hasNativeRazorpay && RazorpayCheckout && typeof (RazorpayCheckout as any).open === 'function') {
          rzpModule = RazorpayCheckout;
        } else if (hasNativeRazorpay && (RazorpayCheckout as any)?.default && typeof (RazorpayCheckout as any).default.open === 'function') {
          rzpModule = (RazorpayCheckout as any).default;
        }
      } catch (checkErr) {
        rzpModule = null;
      }

      if (!rzpModule) {
        console.log('[Payment Processing] Native Razorpay SDK not linked in build. Showing fallback option...');
        setShowDevFallback(true);
        return;
      }

      const options = {
        description: `Payment for Job #${jobId}`,
        currency: currencyVal,
        key: rzpKey,
        amount: (rateVal * 100).toFixed(0),
        name: 'GigWork',
        order_id: fetchedOrderId,
        theme: { color: '#FF6B1A' },
        prefill: {
          email: currentUser?.email || 'test@example.com',
          contact: currentUser?.phone || '9999999999',
          name: currentUser?.name || 'Test User'
        }
      };

      try {
        console.log('[Payment Processing] Opening Razorpay checkout SDK...');
        const paymentResult = await rzpModule.open(options);
        console.log('[Payment Processing] Razorpay checkout success:', paymentResult);

        // Confirm payment on backend
        await api.post('/payments/confirm', {
          razorpayOrderId: paymentResult.razorpay_order_id || fetchedOrderId,
          razorpayPaymentId: paymentResult.razorpay_payment_id,
          razorpaySignature: paymentResult.razorpay_signature,
          jobId
        });

        queryClient.invalidateQueries({ queryKey: ['clientJobs'] });
        queryClient.invalidateQueries({ queryKey: ['activeOpsJobs'] });
        router.replace({ pathname: '/(client)/(modals)/payment-success', params: { jobId, rate } });
      } catch (e: any) {
        console.warn('[Payment Processing] Razorpay Checkout error or cancellation:', e);
        
        const errStr = (e?.message || e?.description || '').toString().toLowerCase();

        if (e && (e.code === 2 || errStr.includes('cancelled') || errStr.includes('cancel'))) {
          console.log('[Payment Processing] Payment cancelled by user.');
          Toast.show({
            type: 'info',
            text1: 'Payment Not Settled',
            text2: 'Job remains unsettled. Tap "Pay Now" to finalize payment anytime.'
          });
          router.replace({
            pathname: '/(client)/(modals)/job-detail',
            params: { id: jobId }
          });
        } else {
          const errorMsg = e?.description || e?.message || 'Payment transaction failed';
          router.replace({
            pathname: '/(client)/(modals)/payment-failed',
            params: { error: errorMsg, jobId, rate }
          });
        }
      }
    };

    processPayment();

    return () => {
      backHandler.remove();
    };
  }, []);

  if (showDevFallback) {
    return (
      <View style={styles.container}>
        <View style={styles.previewCard}>
          <View style={styles.iconCircle}>
            <Feather name="credit-card" size={36} color="#FF6B1A" />
          </View>
          <Text style={styles.title}>Razorpay Gateway Preview</Text>
          <Text style={styles.subtitle}>
            Razorpay Native Checkout is unavailable in Expo Go preview mode. Select an option below to proceed:
          </Text>

          <TouchableOpacity 
            style={styles.simulateBtn} 
            onPress={() => handleSimulatePayment(orderId)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.simulateBtnText}>Simulate Test Payment (Dev)</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cancelBtn} 
            onPress={() => {
              Toast.show({
                type: 'info',
                text1: 'Payment Cancelled',
                text2: 'Job remains unsettled until payment is finalized.'
              });
              router.replace({ pathname: '/(client)/(modals)/job-detail', params: { id: jobId } });
            }}
            disabled={isProcessing}
          >
            <Text style={styles.cancelBtnText}>Cancel & Pay Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
  title: { fontFamily: typography.fontDisplay, fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.sm, textAlign: 'center' },
  subtitle: { fontFamily: typography.fontBody, fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 20 },
  previewCard: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 20, borderWidth: 1, borderColor: '#EEE0CC', width: '100%', alignItems: 'center' },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFF0D6', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  simulateBtn: { backgroundColor: '#FF6B1A', width: '100%', paddingVertical: 14, borderRadius: radius.full, alignItems: 'center', marginBottom: 12 },
  simulateBtnText: { fontFamily: typography.fontDisplay, fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  cancelBtn: { borderWidth: 1, borderColor: colors.border2, width: '100%', paddingVertical: 14, borderRadius: radius.full, alignItems: 'center' },
  cancelBtnText: { fontFamily: typography.fontBody, fontSize: 15, fontWeight: '700', color: colors.textPrimary }
});
