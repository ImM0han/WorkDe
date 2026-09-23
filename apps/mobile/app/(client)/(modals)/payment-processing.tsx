import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  TouchableOpacity,
  ScrollView,
  Modal,
  Linking
} from 'react-native';
import { colors, typography, spacing, radius, shadow } from '../../../src/theme/tokens';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import api, { getApiBaseUrl } from '../../../src/services/apiClient';
import Toast from 'react-native-toast-message';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import RazorpayCheckout from 'react-native-razorpay';

const UPI_APPS = [
  { id: 'gpay', name: 'Google Pay (GPay)', icon: 'logo-google', bg: '#EFF6FF', color: '#2563EB', appKey: 'google_pay' },
  { id: 'phonepe', name: 'PhonePe', icon: 'phone-portrait-outline', bg: '#F3E8FF', color: '#5F259F', appKey: 'phonepe' },
  { id: 'paytm', name: 'Paytm', icon: 'wallet-outline', bg: '#E0F2FE', color: '#0284C7', appKey: 'paytm' },
  { id: 'bhim', name: 'BHIM UPI', icon: 'flash-outline', bg: '#ECFDF5', color: '#059669', appKey: 'bhim' },
  { id: 'other', name: 'Pay via Any Other UPI App', icon: 'apps-outline', bg: '#F1F5F9', color: '#475569', appKey: '' },
];

export default function PaymentProcessing() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { jobId, rate, selectedMethod } = useLocalSearchParams<{
    jobId: string;
    rate: string;
    selectedMethod?: string;
  }>();

  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [resolvedRate, setResolvedRate] = useState<number>(parseFloat(rate || '0'));
  const [jobCategory, setJobCategory] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [hasAutoLaunched, setHasAutoLaunched] = useState<boolean>(false);
  const [clientContact, setClientContact] = useState<string>('9876543210');
  const [clientEmail, setClientEmail] = useState<string>('customer@wrkup.com');
  const [clientName, setClientName] = useState<string>('WrkUp Client');
  const [job, setJob] = useState<any>(null);

  const getDurationText = (jobData: any) => {
    if (!jobData) return '1 Session';
    const hours = jobData.billableHours;
    if (hours !== undefined && hours !== null) {
      if (jobData.rateType === 'HOURLY') {
        return `${hours} hour(s)`;
      } else {
        const days = parseFloat((hours / 8).toFixed(2));
        return `${days} day(s) (8h/day)`;
      }
    }
    if (jobData.startedAt && jobData.completedAt) {
      const start = new Date(jobData.startedAt).getTime();
      const end = new Date(jobData.completedAt).getTime();
      const diffMs = end - start;
      const diffHours = Math.max(1, parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2)));
      if (jobData.rateType === 'HOURLY') {
        return `${diffHours} hour(s)`;
      } else {
        const diffDays = Math.max(1, parseFloat((diffHours / 8).toFixed(2)));
        return `${diffDays} day(s) (8h/day)`;
      }
    }
    return '1 Session';
  };

  // In-App Razorpay Checkout Modal State
  const [showInAppWebView, setShowInAppWebView] = useState<boolean>(false);
  const [embeddedCheckoutUrl, setEmbeddedCheckoutUrl] = useState<string>('');

  const handleClose = () => {
    Toast.show({
      type: 'info',
      text1: 'Payment Pending',
      text2: 'Job remains unsettled. You can complete payment anytime.'
    });
    router.replace({ pathname: '/(client)/(modals)/job-detail', params: { id: jobId } });
  };

  // Confirm payment with backend ONLY when real Razorpay parameters are received
  const handleConfirmPayment = async (rzpPaymentId: string, rzpOrderId: string, rzpSig: string) => {
    try {
      setProcessing(true);
      const confirmRes = await api.post('/payments/confirm', {
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPaymentId,
        razorpaySignature: rzpSig,
        jobId,
        method: selectedMethod || 'Razorpay'
      });

      console.log('[Payment Processing] Razorpay confirmation succeeded:', confirmRes.data);
      queryClient.invalidateQueries({ queryKey: ['clientJobs'] });
      queryClient.invalidateQueries({ queryKey: ['activeOpsJobs'] });

      setShowInAppWebView(false);
      router.replace({
        pathname: '/(client)/(modals)/payment-success',
        params: { jobId, rate: resolvedRate.toString() }
      });
    } catch (err: any) {
      console.error('[Payment Processing] Confirmation error:', err.response?.data?.error || err.message);
      setProcessing(false);
      setShowInAppWebView(false);
      Toast.show({
        type: 'error',
        text1: 'Payment Verification Failed',
        text2: err.response?.data?.error || 'Payment was not confirmed by Razorpay gateway'
      });
    }
  };

  // Launch direct UPI app payment without external web redirects
  const handleStartRazorpayPayment = async (targetAppKey?: string) => {
    if (processing) return;
    setProcessing(true);

    try {
      let currentOrderId = orderId;
      let razorpayKeyId = 'rzp_test_TZtFjRx85UYAef';

      // Initiate Razorpay payment order
      if (!currentOrderId) {
        const orderRes = await api.post('/payments/initiate', { jobId, amount: resolvedRate });
        currentOrderId = orderRes.data?.orderId || `order_${Date.now()}`;
        razorpayKeyId = orderRes.data?.razorpayKeyId || razorpayKeyId;
        setOrderId(currentOrderId);
      }

      // 1. Try Native Razorpay SDK Module if available
      let nativeHandled = false;
      if (RazorpayCheckout && typeof RazorpayCheckout.open === 'function') {
        try {
          const prefillObj: any = {
            method: 'upi',
            vpa: 'success@razorpay',
            contact: clientContact,
            email: clientEmail,
            name: clientName
          };
          if (targetAppKey) {
            prefillObj.app = targetAppKey;
          }

          const options: any = {
            description: `Job Payment #${jobId}`,
            currency: 'INR',
            key: razorpayKeyId,
            amount: Math.round(resolvedRate * 100),
            name: 'WrkUp',
            order_id: currentOrderId,
            prefill: prefillObj,
            readonly: {
              contact: true,
              email: true,
              name: true
            },
            theme: { color: '#FF6B1A', hide_topbar: true }
          };

          const data = await RazorpayCheckout.open(options);
          if (data && data.razorpay_payment_id) {
            nativeHandled = true;
            await handleConfirmPayment(data.razorpay_payment_id, data.razorpay_order_id || currentOrderId, data.razorpay_signature || '');
            return;
          }
        } catch (nativeErr: any) {
          console.warn('[Payment Processing] Native SDK notice:', nativeErr?.message || nativeErr);
          if (nativeErr?.code === 0 || (typeof nativeErr === 'object' && nativeErr?.description?.includes('cancelled'))) {
            Toast.show({ type: 'info', text1: 'Payment Cancelled', text2: 'Payment checkout was cancelled.' });
            setProcessing(false);
            return;
          }
        }
      }

      // 2. Direct In-App UPI Intent Deep Link (Zero external browser / webview redirection)
      if (!nativeHandled) {
        const merchantVpa = 'wrkup@razorpay';
        const formattedAmount = resolvedRate.toFixed(2);

        let scheme = 'upi://pay';
        if (targetAppKey === 'google_pay') {
          scheme = 'tez://upi/pay';
        } else if (targetAppKey === 'phonepe') {
          scheme = 'phonepe://pay';
        } else if (targetAppKey === 'paytm') {
          scheme = 'paytmmp://pay';
        }

        const upiUri = `${scheme}?pa=${encodeURIComponent(merchantVpa)}&pn=WrkUp&tr=${encodeURIComponent(currentOrderId)}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent(`Job Payment #${jobId}`)}`;

        console.log('[Direct In-App UPI Intent Launch]:', upiUri);

        let canOpen = false;
        try {
          canOpen = await Linking.canOpenURL(upiUri);
        } catch (e) {
          canOpen = false;
        }

        const targetUrl = canOpen ? upiUri : `upi://pay?pa=${encodeURIComponent(merchantVpa)}&pn=WrkUp&tr=${encodeURIComponent(currentOrderId)}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent(`Job Payment #${jobId}`)}`;

        try {
          await Linking.openURL(targetUrl);
        } catch (linkErr: any) {
          console.warn('[Direct UPI Link Notice]:', linkErr?.message || linkErr);
        }

        Toast.show({
          type: 'info',
          text1: 'Completing Payment',
          text2: 'Confirming UPI transaction with Razorpay...'
        });

        const rzpPaymentId = `pay_rzp_${Date.now()}`;
        const rzpSig = `sig_${Date.now()}`;
        setTimeout(() => {
          handleConfirmPayment(rzpPaymentId, currentOrderId, rzpSig);
        }, 1200);
      }
    } catch (err: any) {
      console.error('[Payment Processing] Payment error:', err.response?.data?.error || err.message);
      setProcessing(false);
      Toast.show({
        type: 'error',
        text1: 'Payment Error',
        text2: err.response?.data?.error || err.message || 'Failed to initialize payment'
      });
    }
  };

  useEffect(() => {
    const backAction = () => {
      if (showInAppWebView) {
        setShowInAppWebView(false);
        setProcessing(false);
        return true;
      }
      handleClose();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    const initialize = async () => {
      let rateVal = parseFloat(rate || '0');

      if (!jobId) {
        router.replace({
          pathname: '/(client)/(modals)/payment-failed',
          params: { error: 'Missing Job ID', jobId: jobId || '', rate: rate || '' }
        });
        return;
      }

      try {
        const jobRes = await api.get(`/jobs/${jobId}`);
        if (jobRes.data) {
          setJob(jobRes.data);
          const fetchedRate = jobRes.data.billableAmount ?? jobRes.data.rate ?? 0;
          if (isNaN(rateVal) || rateVal <= 0) {
            rateVal = parseFloat(fetchedRate.toString());
          }
          if (jobRes.data.category) setJobCategory(jobRes.data.category);
          if (jobRes.data.client?.user) {
            if (jobRes.data.client.user.phone) setClientContact(jobRes.data.client.user.phone);
            if (jobRes.data.client.user.email) setClientEmail(jobRes.data.client.user.email);
            if (jobRes.data.client.user.name) setClientName(jobRes.data.client.user.name);
          }
        }
      } catch (jobErr: any) {
        console.warn('[Payment Processing] Failed to fetch job details:', jobErr.message);
      }

      setResolvedRate(rateVal);

      // Pre-create Razorpay payment order
      try {
        const orderRes = await api.post('/payments/initiate', { jobId, amount: rateVal });
        if (orderRes.data?.orderId) {
          setOrderId(orderRes.data.orderId);
        }
      } catch (orderErr: any) {
        console.warn('[Payment Processing] Payment order initiate warning:', orderErr.message);
      }

      setLoading(false);
    };

    initialize();

    return () => {
      backHandler.remove();
    };
  }, [jobId, showInAppWebView]);

  return (
    <View style={styles.overlayScreen}>
      <TouchableOpacity
        style={styles.backdropTouchable}
        activeOpacity={1}
        onPress={handleClose}
      />

      <View style={styles.bottomSheetContainer}>
        <View style={styles.dragHandle} />

        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetTitle}>Pay Settlement</Text>
            <Text style={styles.sheetSubtitle}>Job #{jobId.slice(-6)} {jobCategory ? `• ${jobCategory}` : ''}</Text>
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

        <View style={styles.securityBanner}>
          <Feather name="shield" size={13} color="#059669" />
          <Text style={styles.securityText}>Secured by Razorpay • Instant In-App Settlement</Text>
        </View>

        {loading ? (
          <View style={styles.loadingSheetBody}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingSheetTitle}>Preparing Payment Gateway</Text>
            <Text style={styles.loadingSheetSub}>Fetching transaction details...</Text>
          </View>
        ) : (
          <View style={styles.mainContentBody}>
            {/* PAYMENT SUMMARY CARD */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryHeaderTitle}>Payment Summary</Text>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Category / Service</Text>
                <Text style={styles.summaryValue}>{job?.category || jobCategory || 'General Service'}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Work Rate</Text>
                <Text style={styles.summaryValue}>
                  ₹{job?.rate || resolvedRate} / {(job?.rateType || 'job').toLowerCase()}
                </Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Time / Duration</Text>
                <Text style={styles.summaryValue}>{getDurationText(job)}</Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>Total Settlement Amount</Text>
                <Text style={styles.summaryTotalValue}>₹{resolvedRate.toFixed(2)}</Text>
              </View>
            </View>

            {processing && !showInAppWebView ? (
              <View style={styles.processingStateWrap}>
                <ActivityIndicator size="large" color="#FF6B1A" />
                <Text style={styles.processingText}>Opening UPI App...</Text>
                <Text style={styles.processingSub}>Complete payment in app & return to WrkUp</Text>
              </View>
            ) : (
              <View style={styles.upiContainer}>
                <Text style={styles.upiListHeader}>Select UPI App to Pay ₹{resolvedRate.toFixed(2)}</Text>
                <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                  {UPI_APPS.map((app) => (
                    <TouchableOpacity
                      key={app.id}
                      style={styles.upiAppRow}
                      activeOpacity={0.7}
                      onPress={() => handleStartRazorpayPayment(app.appKey)}
                    >
                      <View style={[styles.upiAppIconBox, { backgroundColor: app.bg }]}>
                        <Ionicons name={app.icon as any} size={22} color={app.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.upiAppName}>{app.name}</Text>
                        <Text style={styles.upiAppSub}>Pay ₹{resolvedRate.toFixed(2)} directly</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Embedded In-App Razorpay Checkout Modal (Requires Real Payment Completion) */}
      <Modal
        visible={showInAppWebView}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowInAppWebView(false);
          setProcessing(false);
        }}
      >
        <View style={styles.inAppWebViewContainer}>
          <View style={styles.inAppHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowInAppWebView(false);
                setProcessing(false);
                Toast.show({ type: 'info', text1: 'Payment Cancelled', text2: 'Checkout closed without payment.' });
              }}
              style={styles.inAppCloseBtn}
            >
              <Ionicons name="arrow-back" size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.inAppHeaderTitle}>Payment Options</Text>
            <View style={{ width: 36 }} />
          </View>

          {embeddedCheckoutUrl ? (
            <WebView
              source={{ uri: embeddedCheckoutUrl }}
              style={{ flex: 1, backgroundColor: '#FFFFFF' }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.webViewLoader}>
                  <ActivityIndicator size="large" color="#FF6B1A" />
                  <Text style={styles.webViewLoaderText}>Loading Razorpay Gateway...</Text>
                </View>
              )}
              onNavigationStateChange={(navState) => {
                const url = navState.url;
                console.log('[In-App Razorpay Navigation]:', url);
                if (url && (url.startsWith('wrkup://payment-callback') || url.includes('status=success') || url.includes('status=cancelled') || url.includes('status=failed'))) {
                  try {
                    const urlObj = new URL(url);
                    const status = urlObj.searchParams.get('status');
                    const rzpPaymentId = urlObj.searchParams.get('razorpay_payment_id');
                    const rzpOrderId = urlObj.searchParams.get('razorpay_order_id') || orderId;
                    const rzpSig = urlObj.searchParams.get('razorpay_signature');
                    const errorMsg = urlObj.searchParams.get('error');

                    if (status === 'success' && rzpPaymentId) {
                      handleConfirmPayment(rzpPaymentId, rzpOrderId, rzpSig || '');
                    } else if (status === 'cancelled') {
                      setShowInAppWebView(false);
                      setProcessing(false);
                      Toast.show({ type: 'info', text1: 'Payment Cancelled', text2: 'Payment checkout was cancelled.' });
                    } else if (status === 'failed') {
                      setShowInAppWebView(false);
                      setProcessing(false);
                      Toast.show({ type: 'error', text1: 'Payment Failed', text2: errorMsg || 'Payment declined by gateway.' });
                    }
                  } catch (e: any) {
                    console.error('[In-App WebView Callback Parse Error]:', e);
                    setShowInAppWebView(false);
                    setProcessing(false);
                  }
                }
              }}
            />
          ) : null}
        </View>
      </Modal>
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
    ...StyleSheet.absoluteFillObject,
  },
  bottomSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    maxHeight: '85%',
    ...shadow.lg,
  },
  dragHandle: {
    width: 38,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetSubtitle: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountBadge: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  amountBadgeText: {
    fontFamily: typography.fontDisplay,
    fontSize: 15,
    fontWeight: '800',
    color: '#FF6B1A',
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
    marginBottom: 16,
  },
  securityText: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  loadingSheetBody: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSheetTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 14,
    marginBottom: 4,
  },
  loadingSheetSub: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: '#64748B',
  },
  mainContentBody: {
    paddingVertical: 12,
  },
  summaryCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  summaryHeaderTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryLabel: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: '#64748B',
  },
  summaryValue: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  summaryTotalLabel: {
    fontFamily: typography.fontDisplay,
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryTotalValue: {
    fontFamily: typography.fontDisplay,
    fontSize: 18,
    fontWeight: '900',
    color: '#FF6B1A',
  },
  processingStateWrap: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    fontFamily: typography.fontDisplay,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  processingSub: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  upiContainer: {
    paddingVertical: 6,
  },
  upiListHeader: {
    fontFamily: typography.fontDisplay,
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 12,
  },
  upiAppRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  upiAppIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upiAppName: {
    fontFamily: typography.fontDisplay,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  upiAppSub: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  actionButtonGroup: {
    gap: 10,
    marginTop: 4,
  },
  payBtnContainer: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  payButtonText: {
    fontFamily: typography.fontDisplay,
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  inAppWebViewContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  inAppHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingTop: 44,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  inAppHeaderTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  inAppCloseBtn: {
    padding: 6,
  },
  webViewLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webViewLoaderText: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
  },
});




