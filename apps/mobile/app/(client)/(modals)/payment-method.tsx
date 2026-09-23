import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  UIManager,
  LayoutAnimation,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { getApiBaseUrl } from '../../../src/services/apiClient';
import Toast from 'react-native-toast-message';
import { useQueryClient } from '@tanstack/react-query';
import RazorpayCheckout from 'react-native-razorpay';
import { Feather, Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function PaymentMethod() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [jobAmount, setJobAmount] = useState('6000.00');
  const [job, setJob] = useState<any>(null);
  const [isPaying, setIsPaying] = useState(false);

  // Accordion state
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('axis');

  // Input states
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [selectedBank, setSelectedBank] = useState('Axis Bank');

  // Details drawer toggle
  const [showDetails, setShowDetails] = useState(false);

  const [showInAppWebView, setShowInAppWebView] = useState<boolean>(false);
  const [embeddedCheckoutUrl, setEmbeddedCheckoutUrl] = useState<string>('');
  const [activeOrderId, setActiveOrderId] = useState<string>('');
  const [hasAutoLaunched, setHasAutoLaunched] = useState<boolean>(false);

  useEffect(() => {
    if (jobId) {
      router.replace({
        pathname: '/(client)/(modals)/payment-processing',
        params: { jobId }
      });
    } else {
      router.replace('/(client)/jobs');
    }
  }, [jobId]);

  const triggerDirectPayment = async (targetJobId: string, amountVal: number) => {
    if (isPaying) return;
    setIsPaying(true);

    try {
      // 1. Create payment order via backend
      const orderRes = await api.post('/payments/initiate', { jobId: targetJobId, amount: amountVal });
      const orderId = orderRes.data?.orderId || `order_${Date.now()}`;
      const razorpayKeyId = orderRes.data?.razorpayKeyId || 'rzp_test_TZtFjRx85UYAef';
      setActiveOrderId(orderId);

      let realPaymentId = null;
      let realSignature = null;
      let realOrderId = orderId;

      // 2. Try native Razorpay SDK if available
      if (RazorpayCheckout && typeof RazorpayCheckout.open === 'function') {
        try {
          const options: any = {
            description: `Job Payment #${targetJobId}`,
            currency: 'INR',
            key: razorpayKeyId,
            amount: Math.round(amountVal * 100),
            name: 'WrkUp',
            order_id: orderId,
            prefill: {
              contact: '9876543210',
              email: 'customer@wrkup.com',
              name: 'WrkUp Client'
            },
            readonly: {
              contact: true,
              email: true,
              name: true
            },
            theme: { color: '#0F172A', hide_topbar: true }
          };

          const data = await RazorpayCheckout.open(options);
          if (data && data.razorpay_payment_id) {
            realPaymentId = data.razorpay_payment_id;
            realSignature = data.razorpay_signature || '';
            realOrderId = data.razorpay_order_id || orderId;
          }
        } catch (nativeErr: any) {
          console.warn('[Payment Method] Native SDK error or user cancelled:', nativeErr?.message || nativeErr);
          if (nativeErr?.code === 0 || (typeof nativeErr === 'object' && nativeErr?.description?.includes('cancelled'))) {
            Toast.show({ type: 'info', text1: 'Payment Cancelled', text2: 'Payment checkout was cancelled.' });
            setIsPaying(false);
            router.back();
            return;
          }
        }
      }

      // If native SDK succeeded
      if (realPaymentId) {
        await handleConfirmPayment(realPaymentId, realOrderId, realSignature || '');
        return;
      }

      // 3. Fallback to Direct In-App Webview Secure Payment Gateway
      const checkoutUrl = `${getApiBaseUrl()}/payments/checkout-page?orderId=${encodeURIComponent(orderId)}&amount=${amountVal}&jobId=${encodeURIComponent(targetJobId)}&redirectUri=wrkup://payment-callback`;
      console.log('[Payment Method] Displaying Direct Razorpay Checkout WebView:', checkoutUrl);
      setEmbeddedCheckoutUrl(checkoutUrl);
      setShowInAppWebView(true);
    } catch (err: any) {
      console.error('[Payment Method] Direct payment launch error:', err.response?.data?.error || err.message);
      setIsPaying(false);
      Toast.show({
        type: 'error',
        text1: 'Payment Failed',
        text2: err.response?.data?.error || err.message || 'Payment processing failed'
      });
    }
  };

  const toggleSection = (section: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
      setSelectedMethod(section);
    }
  };

  const getDurationText = () => {
    if (!job) return 'N/A';
    const hours = job.billableHours;
    if (hours !== undefined && hours !== null) {
      if (job.rateType === 'HOURLY') {
        return `${hours} hour(s)`;
      } else {
        const days = parseFloat((hours / 8).toFixed(2));
        return `${days} day(s) (based on 8h/day)`;
      }
    }
    if (job.startedAt && job.completedAt) {
      const start = new Date(job.startedAt).getTime();
      const end = new Date(job.completedAt).getTime();
      const diffMs = end - start;
      const diffHours = diffMs / (1000 * 60 * 60);
      if (job.rateType === 'HOURLY') {
        return `${Math.max(1, parseFloat(diffHours.toFixed(2)))} hour(s)`;
      } else {
        const diffDays = diffHours / 8;
        return `${Math.max(1, parseFloat(diffDays.toFixed(2)))} day(s) (based on 8h/day)`;
      }
    }
    return 'N/A';
  };

  // Confirm payment with backend after real Razorpay payment confirmation
  const handleConfirmPayment = async (rzpPaymentId: string, rzpOrderId: string, rzpSig: string) => {
    try {
      const amountVal = parseFloat(jobAmount || '0');
      const confirmRes = await api.post('/payments/confirm', {
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPaymentId,
        razorpaySignature: rzpSig,
        jobId,
        method: selectedMethod || 'Razorpay'
      });

      console.log('[Payment Method] Razorpay payment confirmed:', confirmRes.data);
      queryClient.invalidateQueries({ queryKey: ['clientJobs'] });
      queryClient.invalidateQueries({ queryKey: ['activeOpsJobs'] });

      setShowInAppWebView(false);
      setIsPaying(false);

      router.replace({
        pathname: '/(client)/(modals)/payment-success',
        params: { jobId, rate: amountVal.toString() }
      });
    } catch (err: any) {
      console.error('[Payment Method] Confirmation error:', err.response?.data?.error || err.message);
      setIsPaying(false);
      setShowInAppWebView(false);
      Toast.show({
        type: 'error',
        text1: 'Payment Verification Failed',
        text2: err.response?.data?.error || 'Payment was not confirmed by Razorpay gateway'
      });
    }
  };

  // Launch Razorpay Payment Gateway directly
  const handlePayNow = async (specificMethod?: string) => {
    if (isPaying || !jobId) return;
    setIsPaying(true);

    const activeMethod = specificMethod || selectedMethod;

    try {
      const amountVal = parseFloat(jobAmount || '0');

      // 1. Create payment order via backend
      const orderRes = await api.post('/payments/initiate', { jobId, amount: amountVal });
      const orderId = orderRes.data?.orderId || `order_${Date.now()}`;
      const razorpayKeyId = orderRes.data?.razorpayKeyId || 'rzp_test_TZtFjRx85UYAef';
      setActiveOrderId(orderId);

      let realPaymentId = null;
      let realSignature = null;
      let realOrderId = orderId;

      // 2. Try native Razorpay SDK if available
      if (RazorpayCheckout && typeof RazorpayCheckout.open === 'function') {
        try {
          const options: any = {
            description: `Job Payment #${jobId}`,
            currency: 'INR',
            key: razorpayKeyId,
            amount: Math.round(amountVal * 100),
            name: 'WrkUp',
            order_id: orderId,
            theme: { color: '#0F172A', hide_topbar: true }
          };

          if (activeMethod === 'axis') {
            options.prefill = { method: 'netbanking', bank: 'UTIB' };
          } else if (activeMethod === 'upi') {
            options.prefill = { method: 'upi', vpa: upiId || undefined };
          } else if (activeMethod === 'card') {
            options.prefill = { method: 'card' };
          } else if (activeMethod === 'netbanking') {
            options.prefill = { method: 'netbanking' };
          }

          const data = await RazorpayCheckout.open(options);
          if (data && data.razorpay_payment_id) {
            realPaymentId = data.razorpay_payment_id;
            realSignature = data.razorpay_signature || '';
            realOrderId = data.razorpay_order_id || orderId;
          }
        } catch (nativeErr: any) {
          console.warn('[Payment Method] Native SDK error or user cancelled:', nativeErr?.message || nativeErr);
          if (nativeErr?.code === 0 || (typeof nativeErr === 'object' && nativeErr?.description?.includes('cancelled'))) {
            Toast.show({ type: 'info', text1: 'Payment Cancelled', text2: 'Payment checkout was cancelled.' });
            setIsPaying(false);
            return;
          }
        }
      }

      // If native SDK succeeded
      if (realPaymentId) {
        await handleConfirmPayment(realPaymentId, realOrderId, realSignature || '');
        return;
      }

      // 3. Fallback to In-App Webview Modal
      const checkoutUrl = `${getApiBaseUrl()}/payments/checkout-page?orderId=${encodeURIComponent(orderId)}&amount=${amountVal}&jobId=${encodeURIComponent(jobId)}&redirectUri=wrkup://payment-callback`;
      console.log('[Payment Method] Displaying Direct Razorpay Checkout WebView:', checkoutUrl);
      setEmbeddedCheckoutUrl(checkoutUrl);
      setShowInAppWebView(true);
    } catch (err: any) {
      console.error('[Payment Method] Payment error:', err.response?.data?.error || err.message);
      setIsPaying(false);
      Toast.show({
        type: 'error',
        text1: 'Payment Failed',
        text2: err.response?.data?.error || err.message || 'Payment processing failed'
      });
    }
  };

  const formattedAmount = parseFloat(jobAmount || '0').toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} disabled={isPaying}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Options</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* TOP HIGHLIGHT CARD: Pay Using Axis Bank */}
        <View style={styles.featuredCardBorder}>
          <Text style={styles.featuredCardTitle}>Pay Using Axis Bank</Text>
          
          {/* Option 1: Axis Bank Netbanking */}
          <TouchableOpacity
            style={styles.featuredOptionRow}
            activeOpacity={0.7}
            onPress={() => {
              setSelectedMethod('axis');
              handlePayNow('axis');
            }}
          >
            <View style={styles.optionLeft}>
              {/* Axis Bank Logo Badge */}
              <View style={styles.axisLogoBadge}>
                <View style={styles.axisTriangle} />
              </View>
              <Text style={styles.optionTitleText}>Axis Bank Netbanking</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.optionDivider} />

          {/* Option 2: Pay Via Card */}
          <TouchableOpacity
            style={styles.featuredOptionRow}
            activeOpacity={0.7}
            onPress={() => toggleSection('pay_via_card')}
          >
            <View style={styles.optionLeft}>
              <View style={styles.blueIconBadge}>
                <Feather name="credit-card" size={18} color="#2563EB" />
              </View>
              <Text style={styles.optionTitleText}>Pay Via Card</Text>
            </View>
            <Ionicons
              name={expandedSection === 'pay_via_card' ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#0F172A"
            />
          </TouchableOpacity>

          {/* Pay via card expandable content */}
          {expandedSection === 'pay_via_card' && (
            <View style={styles.expandedFormContainer}>
              <Text style={styles.formLabel}>Card Details</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Card Number (4532 .... .... ....)"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={cardNumber}
                onChangeText={setCardNumber}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <TextInput
                  style={[styles.formInput, { flex: 1 }]}
                  placeholder="MM / YY"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={cardExpiry}
                  onChangeText={setCardExpiry}
                />
                <TextInput
                  style={[styles.formInput, { flex: 1 }]}
                  placeholder="CVV"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                  value={cardCvv}
                  onChangeText={setCardCvv}
                />
              </View>
              <TouchableOpacity
                style={styles.payInlineBtn}
                onPress={() => handlePayNow('card')}
                disabled={isPaying}
              >
                <Text style={styles.payInlineBtnText}>Pay ₹{formattedAmount} via Card</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>


        {/* SECTION 2: All Payment Options */}
        <Text style={styles.sectionHeaderTitle}>All Payment Options</Text>

        <View style={styles.allOptionsContainer}>
          
          {/* 1. UPI */}
          <TouchableOpacity
            style={styles.optionRow}
            activeOpacity={0.7}
            onPress={() => toggleSection('upi')}
          >
            <View style={styles.optionLeft}>
              <View style={styles.blueIconBadge}>
                <MaterialCommunityIcons name="lightning-bolt-outline" size={20} color="#2563EB" />
              </View>
              <Text style={styles.optionTitleText}>UPI</Text>
              {/* Badges: GPay, PhonePe, Paytm */}
              <View style={styles.badgesRow}>
                <View style={styles.gpayBadge}>
                  <Text style={styles.gpayText}>GPay</Text>
                </View>
                <View style={styles.phonepeBadge}>
                  <Text style={styles.phonepeText}>पे</Text>
                </View>
                <View style={styles.paytmBadge}>
                  <Text style={styles.paytmText}>paytm</Text>
                </View>
              </View>
            </View>
            <Ionicons
              name={expandedSection === 'upi' ? 'chevron-up' : 'chevron-forward'}
              size={18}
              color="#0F172A"
            />
          </TouchableOpacity>

          {expandedSection === 'upi' && (
            <View style={styles.expandedFormContainer}>
              <Text style={styles.formLabel}>Enter VPA / UPI ID</Text>
              <TextInput
                style={styles.formInput}
                placeholder="username@upi / mobile@paytm"
                placeholderTextColor="#94A3B8"
                value={upiId}
                onChangeText={setUpiId}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.payInlineBtn}
                onPress={() => handlePayNow('upi')}
                disabled={isPaying}
              >
                <Text style={styles.payInlineBtnText}>Pay ₹{formattedAmount} via UPI</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.optionDivider} />

          {/* 2. Cards */}
          <TouchableOpacity
            style={styles.optionRow}
            activeOpacity={0.7}
            onPress={() => toggleSection('cards')}
          >
            <View style={styles.optionLeft}>
              <View style={styles.blueIconBadge}>
                <Feather name="credit-card" size={18} color="#2563EB" />
              </View>
              <Text style={styles.optionTitleText}>Cards</Text>
              {/* Badges: VISA, Mastercard, RuPay */}
              <View style={styles.badgesRow}>
                <View style={styles.visaBadge}>
                  <Text style={styles.visaText}>VISA</Text>
                </View>
                <View style={styles.mcBadge}>
                  <View style={styles.mcRed} />
                  <View style={styles.mcOrange} />
                </View>
                <View style={styles.rupayBadge}>
                  <Text style={styles.rupayText}>RuPay</Text>
                </View>
              </View>
            </View>
            <Ionicons
              name={expandedSection === 'cards' ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#0F172A"
            />
          </TouchableOpacity>

          {expandedSection === 'cards' && (
            <View style={styles.expandedFormContainer}>
              <Text style={styles.formLabel}>Credit or Debit Card</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Card Number"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={cardNumber}
                onChangeText={setCardNumber}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <TextInput
                  style={[styles.formInput, { flex: 1 }]}
                  placeholder="MM / YY"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={cardExpiry}
                  onChangeText={setCardExpiry}
                />
                <TextInput
                  style={[styles.formInput, { flex: 1 }]}
                  placeholder="CVV"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                  value={cardCvv}
                  onChangeText={setCardCvv}
                />
              </View>
              <TouchableOpacity
                style={styles.payInlineBtn}
                onPress={() => handlePayNow('card')}
                disabled={isPaying}
              >
                <Text style={styles.payInlineBtnText}>Pay ₹{formattedAmount} via Card</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.optionDivider} />

          {/* 3. Netbanking */}
          <TouchableOpacity
            style={styles.optionRow}
            activeOpacity={0.7}
            onPress={() => toggleSection('netbanking')}
          >
            <View style={styles.optionLeft}>
              <View style={styles.blueIconBadge}>
                <FontAwesome5 name="university" size={16} color="#2563EB" />
              </View>
              <Text style={styles.optionTitleText}>Netbanking</Text>
              {/* Badges: SBI, ICICI, Bank circle badges */}
              <View style={styles.badgesRow}>
                <View style={styles.sbiBadge}>
                  <View style={styles.sbiInnerDot} />
                </View>
                <View style={styles.iciciBadge}>
                  <Text style={styles.iciciText}>i</Text>
                </View>
                <View style={styles.axisMiniBadge}>
                  <View style={styles.axisMiniTriangle} />
                </View>
              </View>
            </View>
            <Ionicons
              name={expandedSection === 'netbanking' ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#0F172A"
            />
          </TouchableOpacity>

          {expandedSection === 'netbanking' && (
            <View style={styles.expandedFormContainer}>
              <Text style={styles.formLabel}>Select Bank</Text>
              <View style={styles.bankGrid}>
                {['Axis Bank', 'HDFC Bank', 'ICICI Bank', 'SBI', 'Kotak', 'PNB'].map(bank => (
                  <TouchableOpacity
                    key={bank}
                    style={[styles.bankChip, selectedBank === bank && styles.bankChipSelected]}
                    onPress={() => setSelectedBank(bank)}
                  >
                    <Text style={[styles.bankChipText, selectedBank === bank && styles.bankChipTextSelected]}>
                      {bank}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.payInlineBtn}
                onPress={() => handlePayNow('netbanking')}
                disabled={isPaying}
              >
                <Text style={styles.payInlineBtnText}>Pay via {selectedBank}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.optionDivider} />

          {/* 4. EMI */}
          <TouchableOpacity
            style={styles.optionRow}
            activeOpacity={0.7}
            onPress={() => toggleSection('emi')}
          >
            <View style={styles.optionLeft}>
              <View style={styles.blueIconBadge}>
                <Feather name="calendar" size={18} color="#2563EB" />
              </View>
              <Text style={styles.optionTitleText}>EMI</Text>
              {/* Badges: Zest, Amex, Bajaj */}
              <View style={styles.badgesRow}>
                <View style={styles.zestBadge}>
                  <Text style={styles.zestText}>Z</Text>
                </View>
                <View style={styles.amexBadge}>
                  <Text style={styles.amexText}>AMEX</Text>
                </View>
                <View style={styles.bajajBadge}>
                  <Text style={styles.bajajText}>B</Text>
                </View>
              </View>
            </View>
            <Ionicons
              name={expandedSection === 'emi' ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#0F172A"
            />
          </TouchableOpacity>

          {expandedSection === 'emi' && (
            <View style={styles.expandedFormContainer}>
              <Text style={styles.formLabel}>No Cost & Credit Card EMI Available</Text>
              <TouchableOpacity
                style={styles.payInlineBtn}
                onPress={() => handlePayNow('emi')}
                disabled={isPaying}
              >
                <Text style={styles.payInlineBtnText}>Proceed with EMI Options</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.optionDivider} />

          {/* 5. Wallet */}
          <TouchableOpacity
            style={styles.optionRow}
            activeOpacity={0.7}
            onPress={() => toggleSection('wallet')}
          >
            <View style={styles.optionLeft}>
              <View style={styles.blueIconBadge}>
                <Ionicons name="wallet-outline" size={18} color="#2563EB" />
              </View>
              <Text style={styles.optionTitleText}>Wallet</Text>
              {/* Badges: PhonePe, Mobikwik, Airtel */}
              <View style={styles.badgesRow}>
                <View style={styles.phonepeBadge}>
                  <Text style={styles.phonepeText}>पे</Text>
                </View>
                <View style={styles.mobiBadge}>
                  <Text style={styles.mobiText}>M</Text>
                </View>
                <View style={styles.airtelBadge}>
                  <Text style={styles.airtelText}>a</Text>
                </View>
              </View>
            </View>
            <Ionicons
              name={expandedSection === 'wallet' ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#0F172A"
            />
          </TouchableOpacity>

          {expandedSection === 'wallet' && (
            <View style={styles.expandedFormContainer}>
              <Text style={styles.formLabel}>Select Wallet</Text>
              <TouchableOpacity
                style={styles.payInlineBtn}
                onPress={() => handlePayNow('wallet')}
                disabled={isPaying}
              >
                <Text style={styles.payInlineBtnText}>Pay via Wallet</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* JOB DETAILS DRAWER / EXPANDABLE OVERLAY */}
      {showDetails && (
        <View style={styles.detailsOverlay}>
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsTitle}>Payment Breakdown</Text>
            <TouchableOpacity onPress={() => setShowDetails(false)}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.detailsRow}>
            <Text style={styles.detailsLabel}>Job Category</Text>
            <Text style={styles.detailsValue}>{job?.category || 'General Service'}</Text>
          </View>
          <View style={styles.detailsRow}>
            <Text style={styles.detailsLabel}>Rate</Text>
            <Text style={styles.detailsValue}>₹{job?.rate || jobAmount} / {job?.rateType?.toLowerCase() || 'job'}</Text>
          </View>
          <View style={styles.detailsRow}>
            <Text style={styles.detailsLabel}>Duration</Text>
            <Text style={styles.detailsValue}>{getDurationText()}</Text>
          </View>
          <View style={styles.detailsDivider} />
          <View style={styles.detailsRow}>
            <Text style={styles.detailsTotalLabel}>Total Amount</Text>
            <Text style={styles.detailsTotalValue}>₹{formattedAmount}</Text>
          </View>
        </View>
      )}

      {/* STICKY BOTTOM BAR */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomLeft}>
          <Text style={styles.amountText}>₹{formattedAmount}</Text>
          <TouchableOpacity
            style={styles.viewDetailsBtn}
            onPress={() => setShowDetails(!showDetails)}
            activeOpacity={0.7}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
            <Ionicons
              name={showDetails ? 'chevron-down' : 'chevron-up'}
              size={14}
              color="#64748B"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() => handlePayNow()}
          disabled={isPaying}
          activeOpacity={0.85}
        >
          {isPaying ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.continueBtnText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Embedded In-App Razorpay Gateway Modal */}
      <Modal
        visible={showInAppWebView}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowInAppWebView(false);
          setIsPaying(false);
        }}
      >
        <View style={styles.inAppWebViewContainer}>
          <View style={styles.inAppHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowInAppWebView(false);
                setIsPaying(false);
                Toast.show({ type: 'info', text1: 'Payment Cancelled', text2: 'Checkout closed without payment.' });
              }}
              style={styles.inAppCloseBtn}
            >
              <Ionicons name="arrow-back" size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.inAppHeaderTitle}>WrkUp Secure Payment</Text>
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
                  <Text style={styles.webViewLoaderText}>Opening Razorpay Gateway...</Text>
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
                    const rzpOrderId = urlObj.searchParams.get('razorpay_order_id') || activeOrderId;
                    const rzpSig = urlObj.searchParams.get('razorpay_signature');
                    const errorMsg = urlObj.searchParams.get('error');

                    if (status === 'success' && rzpPaymentId) {
                      handleConfirmPayment(rzpPaymentId, rzpOrderId, rzpSig || '');
                    } else if (status === 'cancelled') {
                      setShowInAppWebView(false);
                      setIsPaying(false);
                      Toast.show({ type: 'info', text1: 'Payment Cancelled', text2: 'Payment checkout was cancelled.' });
                    } else if (status === 'failed') {
                      setShowInAppWebView(false);
                      setIsPaying(false);
                      Toast.show({ type: 'error', text1: 'Payment Failed', text2: errorMsg || 'Payment declined by gateway.' });
                    }
                  } catch (e: any) {
                    console.error('[In-App WebView Callback Parse Error]:', e);
                    setShowInAppWebView(false);
                    setIsPaying(false);
                  }
                }
              }}
            />
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  // Featured Card: "Pay Using Axis Bank"
  featuredCardBorder: {
    borderWidth: 1.5,
    borderColor: '#F87171',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 24,
  },
  featuredCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 14,
  },
  featuredOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  axisLogoBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#97144D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  axisTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
  },
  blueIconBadge: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  optionDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },

  // Section Title
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 12,
  },

  // All Options Card
  allOptionsContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 6,
  },

  // GPay, PhonePe, Paytm Badges
  gpayBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  gpayText: { fontSize: 10, fontWeight: '800', color: '#2563EB' },

  phonepeBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#5F259F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phonepeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },

  paytmBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  paytmText: { fontSize: 10, fontWeight: '800', color: '#0284C7' },

  // VISA, Mastercard, RuPay Badges
  visaBadge: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  visaText: { fontSize: 10, fontWeight: '900', color: '#FFFFFF', fontStyle: 'italic' },

  mcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mcRed: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#EF4444', marginRight: -6 },
  mcOrange: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#F97316' },

  rupayBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  rupayText: { fontSize: 9, fontWeight: '800', color: '#047857' },

  // Bank badges
  sbiBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sbiInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  iciciBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#C2410C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iciciText: { fontSize: 11, fontWeight: '900', color: '#FFFFFF' },

  axisMiniBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#97144D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  axisMiniTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
  },

  // Zest, Amex, Bajaj
  zestBadge: {
    backgroundColor: '#84CC16',
    width: 16,
    height: 16,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zestText: { fontSize: 10, fontWeight: '900', color: '#FFFFFF' },
  amexBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  amexText: { fontSize: 8, fontWeight: '900', color: '#FFFFFF' },
  bajajBadge: {
    backgroundColor: '#1D4ED8',
    width: 16,
    height: 16,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bajajText: { fontSize: 10, fontWeight: '900', color: '#FFFFFF' },

  // Mobi & Airtel
  mobiBadge: {
    backgroundColor: '#2563EB',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobiText: { fontSize: 10, fontWeight: '900', color: '#FFFFFF' },
  airtelBadge: {
    backgroundColor: '#DC2626',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  airtelText: { fontSize: 11, fontWeight: '900', color: '#FFFFFF' },

  // Expanded Form
  expandedFormContainer: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  payInlineBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  payInlineBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Bank selector grid
  bankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  bankChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  bankChipSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  bankChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  bankChipTextSelected: {
    color: '#2563EB',
    fontWeight: '700',
  },

  // Job breakdown overlay
  detailsOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  detailsLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  detailsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  detailsDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  detailsTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailsTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#22C55E',
  },

  // STICKY BOTTOM BAR
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  bottomLeft: {
    flexDirection: 'column',
  },
  amountText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  continueBtn: {
    backgroundColor: '#090D16',
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // In-App WebView Modal Styles
  inAppWebViewContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  inAppHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  inAppCloseBtn: {
    padding: 6,
  },
  inAppHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  webViewLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webViewLoaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  }
});
