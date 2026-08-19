import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { getFriendlyErrorMessage } from '../../src/services/errorHelpers';
import ScatteredJobIcons from '../../src/components/ScatteredJobIcons';
import supabase from '../../src/services/supabaseClient';
import * as SecureStore from 'expo-secure-store';

export default function OTPVerifyScreen() {
  const { phone, email, mode } = useLocalSearchParams<{ phone?: string, email?: string, mode?: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [showMockOtpModal, setShowMockOtpModal] = useState(false);
  const [showManualVerifyModal, setShowManualVerifyModal] = useState(false);
  
  const inputs = useRef<Array<TextInput | null>>([]);
  const manualVerifyResolver = useRef<(() => void) | null>(null);
  const { role, setUser, setOtpToken, clearPendingAuth, pendingAuth } = useAuthStore();

  useEffect(() => {
    let interval = setInterval(() => {
      setTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    // Show beautiful custom Mock OTP Modal on mount
    setShowMockOtpModal(true);

    return () => clearInterval(interval);
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) return;

    setLoading(true);
    try {
      if (!phone && !email) {
        throw new Error('Verification identifier is missing. Please try again.');
      }

      // Bypassing real OTP verification. Using mock authentication token.
      console.log('[OTP Verify] Using mock authentication token...');
      const idToken = `mock-supabase-access-token:${phone || email}`;

      console.log('[OTP Verify] verification token retrieved. Exchanging for app JWT...');

      // 5. Send only the ID Token to our backend
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, role })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Backend verification failed');

      if (mode !== 'forgot') {
        // Show confirmation alert and wait for user to click OK
        await new Promise<void>((resolve) => {
          manualVerifyResolver.current = resolve;
          setShowManualVerifyModal(true);
        });
      }
      
      if (mode === 'register') {
        // Automatically set password using the password stored during the register step
        const pwdRes = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/set-password`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.otpToken}`
          },
          body: JSON.stringify({ password: pendingAuth?.password })
        });
        const pwdData = await pwdRes.json();
        
        if (!pwdRes.ok) throw new Error(pwdData.error || 'Failed to complete registration');
        
        clearPendingAuth();
        router.replace({
          pathname: '/(auth)/complete-profile',
          params: { token: pwdData.token }
        });
      } else if (mode === 'forgot') {
        setOtpToken(data.otpToken);
        router.replace('/(auth)/verify-questions');
      } else {
        await setUser(data.user, data.token);
        clearPendingAuth();
        if (role === 'PARTNER') router.replace('/(partner)');
        else router.replace('/(client)');
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Verification Failed', text2: getFriendlyErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleManualVerifyConfirm = () => {
    setShowManualVerifyModal(false);
    if (manualVerifyResolver.current) {
      manualVerifyResolver.current();
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setTimer(60);
    
    try {
      console.log(`[OTP Verify] Bypassing Resending Supabase OTP to: ${phone || email}`);
      if (!phone && !email) throw new Error('Verification identifier is missing');
      
      Toast.show({ type: 'success', text1: 'Mock OTP code resent: 123456' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Resend Failed', text2: getFriendlyErrorMessage(e) });
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScatteredJobIcons zones={[
        { top: 0.0, bottom: 0.18 },
        { top: 0.62, bottom: 0.78 },
        { top: 0.92, bottom: 1.0 },
        { top: 0.18, bottom: 0.92, left: 0.0, right: 0.08 },
        { top: 0.18, bottom: 0.92, left: 0.92, right: 1.0 }
      ]} />
      <View style={styles.content}>
        <Text style={styles.title}>Verify your account</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to {phone || email}
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => { inputs.current[index] = ref; }}
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : null
              ]}
              maxLength={1}
              keyboardType="number-pad"
              value={digit}
              onChangeText={val => handleOtpChange(val, index)}
              onKeyPress={e => handleKeyPress(e, index)}
              editable={!loading}
            />
          ))}
        </View>

        <TouchableOpacity onPress={handleResend} disabled={timer > 0}>
          <Text style={[styles.resendText, timer > 0 && styles.resendDisabled]}>
            {timer > 0 ? `Resend code in ${timer}s` : 'Resend OTP'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.buttonWrapper}
        onPress={handleVerify}
        disabled={otp.join('').length !== 6 || loading}
        activeOpacity={0.8}
      >
        <LinearGradient 
          colors={otp.join('').length === 6 ? ['#FF6B1A', '#F59E0B'] : ['#C4B5A5', '#C4B5A5']} 
          style={styles.button}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Verify →</Text>}
        </LinearGradient>
      </TouchableOpacity>

      {/* Mock OTP Announcement Modal */}
      <Modal
        visible={showMockOtpModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMockOtpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconContainer, { backgroundColor: '#FFF0D6' }]}>
              <Feather name="shield" size={32} color="#FF6B1A" />
            </View>
            
            <Text style={styles.modalTitle}>Mock Verification Mode</Text>
            
            <Text style={styles.modalDescription}>
              For testing convenience, use the following mock verification code:
            </Text>

            <View style={styles.otpBadge}>
              <Text style={styles.otpBadgeText}>123 456</Text>
            </View>

            <TouchableOpacity 
              style={styles.modalButtonWrapper}
              onPress={() => setShowMockOtpModal(false)}
              activeOpacity={0.8}
            >
              <LinearGradient 
                colors={['#FF6B1A', '#F59E0B']} 
                style={styles.modalButton}
              >
                <Text style={styles.modalButtonText}>Got it, Let's verify</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Manual Verification Success Modal */}
      <Modal
        visible={showManualVerifyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleManualVerifyConfirm}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconContainer, { backgroundColor: '#E1FCEF' }]}>
              <Ionicons name="checkmark-circle-outline" size={36} color="#00C853" />
            </View>
            
            <Text style={styles.modalTitle}>Verification Successful</Text>
            
            <Text style={styles.modalDescription}>
              your number is verified manually by whatsapp or call
            </Text>

            <TouchableOpacity 
              style={styles.modalButtonWrapper}
              onPress={handleManualVerifyConfirm}
              activeOpacity={0.8}
            >
              <LinearGradient 
                colors={['#00C853', '#00E676']} 
                style={styles.modalButton}
              >
                <Text style={styles.modalButtonText}>Continue →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF6EE',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center'
  },
  title: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 26,
    color: '#1C1410',
    marginBottom: 12
  },
  subtitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
    color: '#6B5C4E',
    marginBottom: 40
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32
  },
  otpInput: {
    width: 44,
    height: 52,
    borderWidth: 2,
    borderColor: '#EEE0CC',
    borderRadius: 12,
    textAlign: 'center',
    fontFamily: 'DMMono-Medium',
    fontSize: 22,
    color: '#1C1410',
    backgroundColor: '#FFFFFF'
  },
  otpInputFilled: {
    borderColor: '#FF6B1A',
    backgroundColor: '#FFF0D6',
    color: '#FF6B1A'
  },
  resendText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: '#FF6B1A',
    textAlign: 'center'
  },
  resendDisabled: {
    color: '#C4B5A5'
  },
  buttonWrapper: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24
  },
  button: {
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  buttonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: '#FFFFFF'
  },
  // Custom Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 20, 16, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalContainer: {
    backgroundColor: '#FFFDFB',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#1C1410',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 26, 0.08)'
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 22,
    color: '#1C1410',
    textAlign: 'center',
    marginBottom: 12
  },
  modalDescription: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 15,
    color: '#6B5C4E',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24
  },
  otpBadge: {
    backgroundColor: '#FFF0D6',
    borderWidth: 1.5,
    borderColor: '#FF6B1A',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 28,
    marginBottom: 24
  },
  otpBadgeText: {
    fontFamily: 'DMMono-Medium',
    fontSize: 24,
    color: '#FF6B1A',
    letterSpacing: 2
  },
  modalButtonWrapper: {
    width: '100%'
  },
  modalButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%'
  },
  modalButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: '#FFFFFF'
  }
});
