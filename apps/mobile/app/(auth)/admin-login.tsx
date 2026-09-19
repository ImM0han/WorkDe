import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { Feather } from '@expo/vector-icons';
import { useAdminStore } from '../../src/stores/adminStore';
import { getFriendlyErrorMessage, parseResponseJson } from '../../src/services/errorHelpers';
import { getApiBaseUrl } from '../../src/services/apiClient';
import ScatteredJobIcons from '../../src/components/ScatteredJobIcons';

export default function AdminLoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAdmin } = useAdminStore();

  const handleAdminLogin = async () => {
    if (!identifier.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter your Admin username or phone' });
      return;
    }
    if (!password || password.length < 6) {
      Toast.show({ type: 'error', text1: 'Password is required' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/ops-console/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: identifier.trim(),
          password
        }),
      });

      const data = await parseResponseJson(res);

      if (!res.ok) {
        throw new Error(data.error || 'Admin login failed');
      }

      await setAdmin(data.admin, data.token);

      Toast.show({
        type: 'success',
        text1: `Welcome, ${data.admin.username}!`,
        text2: `Logged in as ${data.admin.role}`
      });

      router.replace('/(admin)' as any);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Admin Authentication Failed',
        text2: getFriendlyErrorMessage(err)
      });
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
        <View style={styles.badgeContainer}>
          <Feather name="shield" size={20} color="#FF6B1A" />
          <Text style={styles.badgeText}>OPERATIONS CONSOLE</Text>
        </View>

        <Text style={styles.title}>Admin Login</Text>
        <Text style={styles.subtitle}>
          Manage payouts, KYC verifications, and disputes
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Admin Username or Phone</Text>
          <View style={styles.inputContainer}>
            <Feather name="user" size={20} color="#6B5C4E" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. superadmin or 9999999999"
              placeholderTextColor="#C4B5A5"
              autoCapitalize="none"
              value={identifier}
              onChangeText={setIdentifier}
              editable={!loading}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputContainer, styles.passwordContainer]}>
            <Feather name="lock" size={20} color="#6B5C4E" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Enter admin password"
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

        <TouchableOpacity 
          style={styles.buttonWrapper}
          onPress={handleAdminLogin}
          disabled={!identifier || !password || loading}
          activeOpacity={0.8}
        >
          <LinearGradient 
            colors={identifier && password ? ['#FF6B1A', '#F59E0B'] : ['#C4B5A5', '#C4B5A5']} 
            style={styles.button}
          >
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Enter Admin Console →</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.footerLink}>← Back to User Login</Text>
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
    marginTop: -30
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF0D6',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.2)'
  },
  badgeText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
    color: '#FF6B1A',
    letterSpacing: 0.8
  },
  title: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 28,
    color: '#1C1410',
    marginBottom: 8
  },
  subtitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 15,
    color: '#6B5C4E',
    marginBottom: 32
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.25)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 56,
  },
  inputIcon: {
    marginRight: 10
  },
  input: {
    flex: 1,
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: '#1C1410'
  },
  passwordContainer: {
    gap: 0
  },
  eyeButton: {
    padding: 10
  },
  buttonWrapper: {
    marginTop: 16,
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
  footerLink: {
    fontFamily: 'Nunito-Bold',
    fontSize: 15,
    color: '#FF6B1A'
  }
});
