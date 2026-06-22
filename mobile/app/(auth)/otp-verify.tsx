import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '../../src/stores/authStore';
import { getFriendlyErrorMessage } from '../../src/services/errorHelpers';

export default function OTPVerifyScreen() {
  const { sessionInfo, phone, mode } = useLocalSearchParams<{ sessionInfo: string, phone: string, mode?: string }>();
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
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionInfo, phone, otp: otpString, role })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Invalid OTP');
      
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
        if (role === 'PARTNER') router.replace('/(partner)/');
        else router.replace('/(client)/');
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: getFriendlyErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setTimer(60);
    // Call send-otp again logic here in a real app
    Toast.show({ type: 'success', text1: 'OTP Resent' });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Verify your number</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to {phone}
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => inputs.current[index] = ref}
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
