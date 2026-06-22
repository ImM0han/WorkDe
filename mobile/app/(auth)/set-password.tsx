import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '../../src/stores/authStore';
import { colors, typography, spacing, radius } from '../../src/theme/tokens';
import { Feather } from '@expo/vector-icons';
import { getFriendlyErrorMessage } from '../../src/services/errorHelpers';

const checkStrength = (pass: string) => {
  let score = 0;
  if (!pass) return { score: 0, label: '', color: colors.border2 };
  if (pass.length >= 8) score += 1;
  if (/[A-Z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;

  if (score < 2) return { score, label: 'weak', color: '#EF4444' }; // Red
  if (score < 4) return { score, label: 'medium', color: '#F59E0B' }; // Orange
  return { score, label: 'strong', color: '#10B981' }; // Green
};

export default function SetPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { pendingAuth, setUser, clearPendingAuth } = useAuthStore();
  
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = checkStrength(password);

  const handleSetPassword = async () => {
    if (password.length < 8) {
      return Toast.show({ type: 'error', text1: t('auth.errors.passwordTooShort') || 'Password too short' });
    }
    if (password !== confirm) {
      return Toast.show({ type: 'error', text1: t('auth.errors.passwordMismatch') || 'Passwords do not match' });
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/set-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pendingAuth?.otpToken}`
        },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to set password');

      if (data.isNewUser) {
        router.replace({ pathname: '/(auth)/register', params: { token: data.token } });
      } else {
        await setUser(data.user, data.token);
        clearPendingAuth();
        if (data.user.role === 'PARTNER') router.replace('/(partner)');
        else router.replace('/(client)');
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: getFriendlyErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="chevron-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{t('auth.newPasswordLabel')}</Text>
        <Text style={styles.subtitle}>{t('auth.newPasswordPlaceholder')}</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={t('auth.newPasswordPlaceholder')}
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
            {showPassword ? <Feather name="eye-off" size={20} color={colors.textSecondary} /> : <Feather name="eye" size={20} color={colors.textSecondary} />}
          </TouchableOpacity>
        </View>

        {password.length > 0 && (
          <View style={styles.strengthContainer}>
            <View style={[styles.strengthBar, { backgroundColor: strength.score >= 1 ? strength.color : colors.border2 }]} />
            <View style={[styles.strengthBar, { backgroundColor: strength.score >= 2 ? strength.color : colors.border2 }]} />
            <View style={[styles.strengthBar, { backgroundColor: strength.score >= 4 ? strength.color : colors.border2 }]} />
            <Text style={[styles.strengthText, { color: strength.color }]}>
              {t(`auth.passwordStrength.${strength.label}`)}
            </Text>
          </View>
        )}

        <View style={[styles.inputContainer, { marginTop: 16 }]}>
          <TextInput
            style={styles.input}
            placeholder={t('auth.confirmPasswordPlaceholder')}
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!showConfirm}
            value={confirm}
            onChangeText={setConfirm}
          />
          <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeButton}>
            {showConfirm ? <Feather name="eye-off" size={20} color={colors.textSecondary} /> : <Feather name="eye" size={20} color={colors.textSecondary} />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.loginButton, (!password || password !== confirm) && styles.loginButtonDisabled]}
          onPress={handleSetPassword}
          disabled={!password || password !== confirm || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.loginButtonText}>{t('common.continue')} →</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  header: { padding: spacing.md },
  backButton: { padding: 8 },
  content: { padding: spacing.xl },
  title: {
    fontFamily: typography.fontDisplay,
    fontSize: 28,
    color: colors.textPrimary,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: typography.fontBody,
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: colors.border2,
    borderRadius: radius.md,
    height: 56,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    fontFamily: typography.fontBody,
    fontSize: 16,
    color: colors.textPrimary,
  },
  eyeButton: { padding: 16 },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
    width: 60,
    textAlign: 'right',
  },
  loginButton: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  loginButtonDisabled: {
    backgroundColor: colors.border2,
  },
  loginButtonText: {
    fontFamily: typography.fontBody,
    fontSize: 18,
    color: '#FFF',
    fontWeight: '700',
  },
});
