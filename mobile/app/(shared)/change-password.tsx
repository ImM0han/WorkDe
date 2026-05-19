import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import * as SecureStore from 'expo-secure-store';
import { colors, typography, spacing, radius } from '../../src/theme/tokens';
import { Feather } from '@expo/vector-icons';

const checkStrength = (pass: string) => {
  let score = 0;
  if (!pass) return { score: 0, label: '', color: colors.border2 };
  if (pass.length >= 8) score += 1;
  if (/[A-Z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;

  if (score < 2) return { score, label: 'weak', color: '#EF4444' };
  if (score < 4) return { score, label: 'medium', color: '#F59E0B' };
  return { score, label: 'strong', color: '#10B981' };
};

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [loading, setLoading] = useState(false);

  const strength = checkStrength(newPassword);

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      return Toast.show({ type: 'error', text1: t('auth.errors.passwordTooShort') || 'Password too short' });
    }
    if (newPassword !== confirmPassword) {
      return Toast.show({ type: 'error', text1: t('auth.errors.passwordMismatch') || 'Passwords do not match' });
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to change password');

      Toast.show({ type: 'success', text1: 'Password updated successfully' });
      router.back();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="chevron-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.changePassword')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Current Password</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter current password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showCurrent}
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeButton}>
              {showCurrent ? <Feather name="eye-off" size={20} color={colors.textSecondary} /> : <Feather name="eye" size={20} color={colors.textSecondary} />}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('auth.newPasswordLabel')}</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t('auth.newPasswordPlaceholder')}
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showNew}
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeButton}>
              {showNew ? <Feather name="eye-off" size={20} color={colors.textSecondary} /> : <Feather name="eye" size={20} color={colors.textSecondary} />}
            </TouchableOpacity>
          </View>
          
          {newPassword.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={[styles.strengthBar, { backgroundColor: strength.score >= 1 ? strength.color : colors.border2 }]} />
              <View style={[styles.strengthBar, { backgroundColor: strength.score >= 2 ? strength.color : colors.border2 }]} />
              <View style={[styles.strengthBar, { backgroundColor: strength.score >= 4 ? strength.color : colors.border2 }]} />
              <Text style={[styles.strengthText, { color: strength.color }]}>
                {t(`auth.passwordStrength.${strength.label}`)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('auth.confirmPasswordLabel')}</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeButton}>
              {showConfirm ? <Feather name="eye-off" size={20} color={colors.textSecondary} /> : <Feather name="eye" size={20} color={colors.textSecondary} />}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, (!currentPassword || !newPassword || newPassword !== confirmPassword) && styles.saveButtonDisabled]}
          onPress={handleChangePassword}
          disabled={!currentPassword || !newPassword || newPassword !== confirmPassword || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>{t('common.save')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border2,
  },
  backButton: { padding: 8 },
  headerTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  content: { padding: spacing.xl },
  inputGroup: { marginBottom: 24 },
  label: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
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
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthText: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
    width: 60,
    textAlign: 'right',
  },
  saveButton: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: { backgroundColor: colors.border2 },
  saveButtonText: {
    fontFamily: typography.fontBody,
    fontSize: 18,
    color: '#FFF',
    fontWeight: '700',
  },
});
