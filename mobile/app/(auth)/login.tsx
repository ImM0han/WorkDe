import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { getFriendlyErrorMessage } from '../../src/services/errorHelpers';
import ScatteredJobIcons from '../../src/components/ScatteredJobIcons';
import supabase from '../../src/services/supabaseClient';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { role, setUser, setPendingAuth } = useAuthStore();

  const handlePhoneBlocked = () => {
    Alert.alert(
      "Service Unavailable",
      "Mobile authentication is not serviceable. An update is on the way.",
      [{ text: "OK" }]
    );
  };

  const handlePhonePasswordLogin = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      Toast.show({ type: 'error', text1: 'Please enter a valid 10-digit phone number' });
      return;
    }
    if (!password || password.length < 8) {
      Toast.show({ type: 'error', text1: 'Password must be at least 8 characters' });
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `+91${cleanPhone}`;
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/login-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, password, role }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Login failed');

      await setUser(data.user, data.token);
      
      Toast.show({ type: 'success', text1: 'Welcome back!', text2: 'Logged in successfully.' });
      
      if (data.user.role === 'PARTNER') {
        router.replace('/(partner)');
      } else {
        router.replace('/(client)');
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Login Failed', text2: getFriendlyErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneForgot = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      Toast.show({ type: 'error', text1: 'Please enter a valid 10-digit phone number first.' });
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `+91${cleanPhone}`;
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, role }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to verify account');

      // Trigger Supabase OTP for password reset (Bypassed for mock verification)
      console.log(`[Forgot Password] Bypassing Supabase OTP trigger for: ${fullPhone}`);

      setPendingAuth({
        phone: fullPhone,
        sessionId: '',
        isExistingUser: true
      });

      Toast.show({ type: 'success', text1: 'Verification code sent (Mock)', text2: 'Please use mock code 123456.' });
      router.push({
        pathname: '/(auth)/otp-verify',
        params: { phone: fullPhone, mode: 'forgot' }
      });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Verification Failed', text2: getFriendlyErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScatteredJobIcons zones={[
        { top: 0.0, bottom: 0.15 },
        { top: 0.85, bottom: 1.0 },
        { top: 0.15, bottom: 0.85, left: 0.0, right: 0.09 },
        { top: 0.15, bottom: 0.85, left: 0.91, right: 1.0 }
      ]} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="chevron-left" size={24} color="#1C1410" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>
          Log in to your {role?.toLowerCase()} account
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputContainer}>
            <View style={styles.countryPicker}>
              <Text style={styles.countryText}>+91</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="00000 00000"
              placeholderTextColor="#C4B5A5"
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              editable={!loading}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputContainer, styles.passwordContainer]}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Enter your password"
              placeholderTextColor="#C4B5A5"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              {showPassword ? <Feather name="eye-off" size={20} color="#C4B5A5" /> : <Feather name="eye" size={20} color="#C4B5A5" />}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={handlePhoneForgot} style={styles.forgotButton}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.buttonWrapper}
          onPress={handlePhonePasswordLogin}
          disabled={!phone || password.length < 8 || loading}
          activeOpacity={0.8}
        >
          <LinearGradient 
            colors={phone && password.length >= 8 ? ['#FF6B1A', '#F59E0B'] : ['#C4B5A5', '#C4B5A5']} 
            style={styles.button}
          >
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Login →</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.footerLink}>Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF6EE',
  },
  header: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF0D6',
    borderRadius: 20,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    marginTop: -40
  },
  title: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 28,
    color: '#1C1410',
    marginBottom: 8
  },
  subtitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
    color: '#6B5C4E',
    marginBottom: 32
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF0D6',
    borderRadius: 14,
    padding: 4,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.15)'
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10
  },
  tabButtonActive: {
    backgroundColor: '#FF6B1A',
  },
  tabButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: '#6B5C4E'
  },
  tabButtonTextActive: {
    color: '#FFFFFF'
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: '#1C1410',
    marginBottom: 8
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  countryPicker: {
    backgroundColor: '#FFF0D6',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.25)',
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  countryText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: '#1C1410'
  },
  input: {
    flex: 1,
    height: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.25)',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontFamily: 'DMMono-Medium',
    fontSize: 18,
    color: '#1C1410'
  },
  passwordContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.25)',
    borderRadius: 14,
    gap: 0
  },
  eyeButton: {
    padding: 16
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 32
  },
  forgotText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: '#FF6B1A'
  },
  buttonWrapper: {
    marginBottom: 24
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  footerText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 15,
    color: '#6B5C4E'
  },
  footerLink: {
    fontFamily: 'Nunito-Bold',
    fontSize: 15,
    color: '#FF6B1A'
  }
});
