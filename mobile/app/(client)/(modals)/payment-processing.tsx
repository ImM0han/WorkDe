import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, BackHandler, TouchableOpacity } from 'react-native';
import { colors, typography } from '../../../src/theme/tokens';
import { useRouter, useLocalSearchParams } from 'expo-router';
import RazorpayCheckout from 'react-native-razorpay';
import { WebView } from 'react-native-webview';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../../src/services/apiClient';
import { useAuthStore } from '../../../src/stores/authStore';
import Toast from 'react-native-toast-message';
import { Feather } from '@expo/vector-icons';

export default function PaymentProcessing() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { jobId, rate } = useLocalSearchParams<{ jobId: string; rate: string }>();

  const [webViewHtml, setWebViewHtml] = useState<string>('');
  const [loadingOrder, setLoadingOrder] = useState<boolean>(true);
  const [resolvedRate, setResolvedRate] = useState<number>(parseFloat(rate || '0'));

  const handleClose = () => {
    Toast.show({
      type: 'info',
      text1: 'Payment Not Settled',
      text2: 'Job remains unsettled. Tap "Pay Now" to finalize payment anytime.'
    });
    router.replace({ pathname: '/(client)/(modals)/job-detail', params: { id: jobId } });
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('[Payment Processing] In-App WebView message:', data);

      if (data.type === 'PAYMENT_SUCCESS') {
        await api.post('/payments/confirm', {
          razorpayOrderId: data.razorpay_order_id,
          razorpayPaymentId: data.razorpay_payment_id,
          razorpaySignature: data.razorpay_signature,
          jobId
        });

        queryClient.invalidateQueries({ queryKey: ['clientJobs'] });
        queryClient.invalidateQueries({ queryKey: ['activeOpsJobs'] });
        router.replace({ pathname: '/(client)/(modals)/payment-success', params: { jobId, rate: resolvedRate.toString() } });
      } else if (data.type === 'PAYMENT_CANCELLED') {
        handleClose();
      } else if (data.type === 'PAYMENT_FAILED') {
        router.replace({
          pathname: '/(client)/(modals)/payment-failed',
          params: { error: data.error || 'Payment failed', jobId, rate: resolvedRate.toString() }
        });
      }
    } catch (err) {
      console.error('[Payment Processing] Error parsing WebView message:', err);
    }
  };

  useEffect(() => {
    const backAction = () => {
      handleClose();
      return true;
    };
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

      // Fallback: If rate is missing or 0, fetch actual rate from backend
      if (isNaN(rateVal) || rateVal <= 0) {
        try {
          console.log(`[Payment Processing] Fetching job fallback rate for Job ID: ${jobId}...`);
          const jobRes = await api.get(`/jobs/${jobId}`);
          if (jobRes.data) {
            const fetchedRate = jobRes.data.billableAmount ?? jobRes.data.rate ?? 0;
            rateVal = parseFloat(fetchedRate.toString());
          }
        } catch (jobErr: any) {
          console.error('[Payment Processing] Failed to fetch fallback job rate:', jobErr.message);
        }
      }

      setResolvedRate(rateVal);

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

      // 1. Initiate Razorpay Order from backend
      try {
        console.log(`[Payment Processing] Creating Razorpay order for Job ID: ${jobId}, Amount: ${rateVal}`);
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

      // 2. Try Native Razorpay SDK first
      try {
        if (!RazorpayCheckout || typeof (RazorpayCheckout as any).open !== 'function') {
          throw new TypeError("Native RazorpayCheckout module is unlinked in Expo Go environment.");
        }

        console.log('[Payment Processing] Opening Native Razorpay checkout SDK...');
        const paymentResult = await RazorpayCheckout.open(options);

        await api.post('/payments/confirm', {
          razorpayOrderId: paymentResult.razorpay_order_id || fetchedOrderId,
          razorpayPaymentId: paymentResult.razorpay_payment_id,
          razorpaySignature: paymentResult.razorpay_signature,
          jobId
        });

        queryClient.invalidateQueries({ queryKey: ['clientJobs'] });
        queryClient.invalidateQueries({ queryKey: ['activeOpsJobs'] });
        router.replace({ pathname: '/(client)/(modals)/payment-success', params: { jobId, rate: rateVal.toString() } });
        return;
      } catch (e: any) {
        const errStr = (e?.message || e?.description || '').toString();
        const isCancelled = e && (e.code === 2 || errStr.toLowerCase().includes('cancelled') || errStr.toLowerCase().includes('cancel'));

        if (isCancelled) {
          handleClose();
          return;
        }

        // Load In-App Gateway WebView inside Bottom Sheet
        console.log('[Payment Processing] Launching In-App Bottom Sheet Gateway WebView...');
        const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { box-sizing: border-box; }
    html, body {
      background-color: #F8FAFC;
      color: #0F172A;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    .loading-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      padding: 24px;
      text-align: center;
    }
    .spinner {
      border: 3.5px solid #E2E8F0;
      border-top-color: #FF6B1A;
      border-radius: 50%;
      width: 42px;
      height: 42px;
      animation: spin 0.8s linear infinite;
      margin-bottom: 14px;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    h3 { font-size: 16px; font-weight: 700; color: #0F172A; margin: 0 0 6px 0; }
    p { font-size: 13px; color: #64748B; margin: 0; }
  </style>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
  <div class="loading-wrap">
    <div class="spinner"></div>
    <h3>Loading Razorpay Gateway</h3>
    <p>Please wait while we connect securely...</p>
  </div>

  <script>
    var options = {
      "key": "${rzpKey}",
      "amount": "${Math.round(rateVal * 100)}",
      "currency": "INR",
      "name": "WorkDe",
      "description": "Payment for Job #${jobId}",
      "order_id": "${fetchedOrderId}",
      "prefill": {
        "name": ${JSON.stringify(currentUser?.name || 'Test User')},
        "email": ${JSON.stringify(currentUser?.email || 'test@example.com')},
        "contact": ${JSON.stringify(currentUser?.phone || '9999999999')}
      },
      "theme": { "color": "#FF6B1A" },
      "handler": function (response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'PAYMENT_SUCCESS',
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        }));
      },
      "modal": {
        "ondismiss": function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PAYMENT_CANCELLED'
          }));
        }
      }
    };

    var rzp = new Razorpay(options);
    rzp.on('payment.failed', function (resp) {
      var err = (resp.error && resp.error.description) ? resp.error.description : 'Payment Failed';
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'PAYMENT_FAILED',
        error: err
      }));
    });

    window.onload = function() {
      rzp.open();
    };
  </script>
</body>
</html>`;

        setWebViewHtml(html);
        setLoadingOrder(false);
      }
    };

    processPayment();

    return () => {
      backHandler.remove();
    };
  }, []);

  return (
    <View style={styles.overlayScreen}>
      {/* Semi-transparent backdrop to blur background page */}
      <TouchableOpacity 
        style={styles.backdropTouchable} 
        activeOpacity={1} 
        onPress={handleClose}
      />

      {/* Bottom Sheet Gateway Container */}
      <View style={styles.bottomSheetContainer}>
        {/* Top Drag Indicator */}
        <View style={styles.dragHandle} />

        {/* Bottom Sheet Header */}
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetTitle}>Payment Gateway</Text>
            <Text style={styles.sheetSubtitle}>Job #{jobId}</Text>
          </View>

          <View style={styles.headerRightGroup}>
            <View style={styles.amountBadge}>
              <Text style={styles.amountBadgeText}>₹{resolvedRate > 0 ? resolvedRate.toFixed(2) : '0.00'}</Text>
            </View>
            <TouchableOpacity 
              onPress={handleClose}
              style={styles.closeIconBtn}
              activeOpacity={0.7}
            >
              <Feather name="x" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Trust Banner */}
        <View style={styles.securityBanner}>
          <Feather name="shield" size={13} color="#059669" />
          <Text style={styles.securityText}>256-Bit Encrypted & Secure Payment</Text>
        </View>

        {/* Sheet Content: Spinner while fetching Order or In-App WebView */}
        {loadingOrder || !webViewHtml ? (
          <View style={styles.loadingSheetBody}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingSheetTitle}>Initiating Payment Gateway</Text>
            <Text style={styles.loadingSheetSub}>Please wait a moment...</Text>
          </View>
        ) : (
          <WebView
            source={{ html: webViewHtml, baseUrl: 'https://checkout.razorpay.com' }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingSheetBody}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
            style={styles.webViewStyle}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayScreen: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  bottomSheetContainer: {
    height: '84%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 24,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border2,
    backgroundColor: '#FFFFFF',
  },
  sheetTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sheetSubtitle: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  amountBadge: {
    backgroundColor: '#FFF0D6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  amountBadgeText: {
    fontFamily: typography.fontDisplay,
    fontSize: 14,
    fontWeight: '800',
    color: '#D97706',
  },
  closeIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    backgroundColor: '#ECFDF5',
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  securityText: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  loadingSheetBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  loadingSheetTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 14,
    marginBottom: 4,
  },
  loadingSheetSub: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: colors.textSecondary,
  },
  webViewStyle: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  }
});
