import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '../../src/stores/authStore';
import { getFriendlyErrorMessage } from '../../src/services/errorHelpers';
import ScatteredJobIcons from '../../src/components/ScatteredJobIcons';
import auth from '../../src/services/firebaseAuth';
import * as SecureStore from 'expo-secure-store';

export default function OTPVerifyScreen() {
  const { phone, mode } = useLocalSearchParams<{ phone: string, mode?: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const inputs = useRef<Array<TextInput | null>>([]);
  const { role, setUser, setOtpToken, clearPendingAuth, pendingAuth } = useAuthStore();

  useEffect(() => {
    let interval = setInterval(() => {
      setTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
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
      // 1. Retrieve the saved Firebase verificationId
      const verificationId = await SecureStore.getItemAsync('firebase_verification_id');
      if (!verificationId) {
        throw new Error('Verification session has expired. Please request a new OTP.');
      }

      // 2. Perform real SMS OTP verification with Firebase Auth SDK
      console.log('[OTP Verify] Verifying OTP credential with Firebase...');
      const credential = auth.PhoneAuthProvider.credential(verificationId, otpString);
      const userCredential = await auth().signInWithCredential(credential);
      
      // 4. Retrieve the Firebase ID Token
      const idToken = await userCredential.user.getIdToken();
      console.log('[OTP Verify] Firebase ID token retrieved. Exchanging for app JWT...');

      // 5. Send only the Firebase ID Token to our backend
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, role })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Backend verification failed');
      
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
        router.replace('/(auth)/set-password');
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

  const handleResend = async () => {
    if (timer > 0) return;
    setTimer(60);
    
    try {
      console.log(`[OTP Verify] Resending Firebase OTP to: ${phone}`);
      if (!phone) throw new Error('Phone number is missing');
      
      const confirmation = await auth().signInWithPhoneNumber(phone);
      await SecureStore.setItemAsync('firebase_verification_id', confirmation.verificationId);
      Toast.show({ type: 'success', text1: 'OTP Resent successfully' });
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
        <Text style={styles.title}>Verify your number</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to {phone}
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
  }
});
