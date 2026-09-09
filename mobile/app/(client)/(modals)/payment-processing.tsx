import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, BackHandler } from 'react-native';
import { colors, typography, spacing } from '../../../src/theme/tokens';
import { useRouter, useLocalSearchParams } from 'expo-router';
import RazorpayCheckout from 'react-native-razorpay';
import * as WebBrowser from 'expo-web-browser';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../../src/services/apiClient';
import { useAuthStore } from '../../../src/stores/authStore';
import Toast from 'react-native-toast-message';

export default function PaymentProcessing() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { jobId, rate } = useLocalSearchParams<{ jobId: string; rate: string }>();

  const getQueryParam = (urlStr: string, param: string) => {
    const match = new RegExp('[?&]' + param + '=([^&]*)').exec(urlStr);
    return match ? decodeURIComponent(match[1]) : null;
  };

  useEffect(() => {
    const backAction = () => true;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    const processPayment = async () => {
      const currentUser = useAuthStore.getState().user;
      let rateVal = parseFloat(rate || '0');

      if (!jobId) {
        router.replace({
          pathname: '/(client)/(modals)/payment-failed',
          params: { error: 'Missing Job ID', jobId: jobId || '', rate: rate || '' }
        });
        return;
      }

      // Fallback: If rate is missing or 0, fetch actual rate/billableAmount from backend
      if (isNaN(rateVal) || rateVal <= 0) {
        try {
          console.log(`[Payment Processing] Rate is ${rate}, fetching job details for fallback...`);
          const jobRes = await api.get(`/jobs/${jobId}`);
          if (jobRes.data) {
            const fetchedRate = jobRes.data.billableAmount ?? jobRes.data.rate ?? 0;
            rateVal = parseFloat(fetchedRate.toString());
            console.log(`[Payment Processing] Retrieved fallback rate: ₹${rateVal}`);
          }
        } catch (jobErr: any) {
          console.error('[Payment Processing] Failed to fetch fallback job rate:', jobErr.message);
        }
      }

      if (isNaN(rateVal) || rateVal <= 0) {
        router.replace({
          pathname: '/(client)/(modals)/payment-failed',
          params: { error: 'Invalid Job ID or payment amount', jobId, rate: rate || '0' }
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

      const options = {
        description: `Payment for Job #${jobId}`,
        currency: currencyVal,
        key: rzpKey,
        amount: Math.round(rateVal * 100).toString(),
        name: 'WorkDe',
        order_id: fetchedOrderId,
        theme: { color: '#FF6B1A' },
        prefill: {
          email: currentUser?.email || 'test@example.com',
          contact: currentUser?.phone || '9999999999',
          name: currentUser?.name || 'Test User'
        }
      };

      // 2. Attempt Native Razorpay SDK checkout first
      try {
        if (!RazorpayCheckout || typeof (RazorpayCheckout as any).open !== 'function') {
          throw new TypeError("Native RazorpayCheckout module is unlinked in Expo Go environment.");
        }

        console.log('[Payment Processing] Opening Native Razorpay checkout SDK...');
        const paymentResult = await RazorpayCheckout.open(options);
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
        return;
      } catch (e: any) {
        const errStr = (e?.message || e?.description || '').toString();
        const isCancelled = e && (e.code === 2 || errStr.toLowerCase().includes('cancelled') || errStr.toLowerCase().includes('cancel'));

        if (isCancelled) {
          console.log('[Payment Processing] Payment cancelled by user.');
          Toast.show({
            type: 'info',
            text1: 'Payment Not Settled',
            text2: 'Job remains unsettled. Tap "Pay Now" to finalize payment anytime.'
          });
          router.replace({ pathname: '/(client)/(modals)/job-detail', params: { id: jobId } });
          return;
        }

        // If native checkout threw TypeError (e.g. module unlinked in Expo Go), launch Razorpay Web Gateway Checkout inside WebBrowser
        if (errStr.includes("Cannot read property 'open' of null") || errStr.includes("unlinked") || !RazorpayCheckout) {
          console.log('[Payment Processing] Native SDK unlinked in Expo Go. Launching Razorpay Web Gateway...');
          try {
            const apiBase = api.defaults.baseURL || '';
            const checkoutPageUrl = `${apiBase}/payments/checkout-page?orderId=${fetchedOrderId}&amount=${rateVal}&jobId=${jobId}&name=${encodeURIComponent(currentUser?.name || '')}&email=${encodeURIComponent(currentUser?.email || '')}&contact=${encodeURIComponent(currentUser?.phone || '')}`;

            const result = await WebBrowser.openAuthSessionAsync(checkoutPageUrl, 'workde://');

            if (result.type === 'success' && result.url) {
              if (result.url.includes('payment-cancelled')) {
                Toast.show({
                  type: 'info',
                  text1: 'Payment Not Settled',
                  text2: 'Job remains unsettled. Tap "Pay Now" to finalize payment anytime.'
                });
                router.replace({ pathname: '/(client)/(modals)/job-detail', params: { id: jobId } });
                return;
              }

              const rzpOrderId = getQueryParam(result.url, 'razorpay_order_id') || fetchedOrderId;
              const rzpPaymentId = getQueryParam(result.url, 'razorpay_payment_id');
              const rzpSig = getQueryParam(result.url, 'razorpay_signature');
              const failureErr = getQueryParam(result.url, 'error');

              if (failureErr) {
                router.replace({ pathname: '/(client)/(modals)/payment-failed', params: { error: failureErr, jobId, rate } });
                return;
              }

              if (rzpPaymentId && rzpSig) {
                await api.post('/payments/confirm', {
                  razorpayOrderId: rzpOrderId,
                  razorpayPaymentId: rzpPaymentId,
                  razorpaySignature: rzpSig,
                  jobId
                });

                queryClient.invalidateQueries({ queryKey: ['clientJobs'] });
                queryClient.invalidateQueries({ queryKey: ['activeOpsJobs'] });
                router.replace({ pathname: '/(client)/(modals)/payment-success', params: { jobId, rate } });
                return;
              }
            }

            // If browser modal closed without finishing payment
            Toast.show({
              type: 'info',
              text1: 'Payment Not Settled',
              text2: 'Job remains unsettled. Tap "Pay Now" to finalize payment anytime.'
            });
            router.replace({ pathname: '/(client)/(modals)/job-detail', params: { id: jobId } });
            return;
          } catch (webErr: any) {
            console.error('[Payment Processing] Web Checkout Error:', webErr.message || webErr);
            router.replace({
              pathname: '/(client)/(modals)/payment-failed',
              params: { error: webErr.message || 'Payment gateway failed', jobId, rate }
            });
            return;
          }
        }

        const errorMsg = e?.description || e?.message || 'Payment transaction failed';
        router.replace({
          pathname: '/(client)/(modals)/payment-failed',
          params: { error: errorMsg, jobId, rate }
        });
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
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
    alignItems: 'center',
    justify: 'center',
    padding: spacing.xl,
  },
  title: {
    fontFamily: typography.fontDisplay,
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
});


