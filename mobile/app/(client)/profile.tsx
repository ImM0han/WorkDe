import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import api from '../../src/services/apiClient';
import { colors, typography, spacing, radius, shadow } from '../../src/theme/tokens';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../src/i18n';
import { useLanguageStore } from '../../src/i18n/languageStore';

export default function ClientProfileScreen() {
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const { currentLang } = useLanguageStore();

  const { data: addresses = [] } = useQuery({
    queryKey: ['savedAddresses'],
    queryFn: () => api.get('/addresses').then(r => r.data),
  });
  const addressCount = addresses.length;

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/onboarding');
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FFF0D6', '#FDF6EE']} style={styles.header}>
        {user?.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'C'}</Text>
          </View>
        )}
        <Text style={styles.name}>{user?.name || 'Client Name'}</Text>
        <Text style={styles.phone}>{user?.phone || '+910000000000'}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>{t('profile.account') || 'Account'}</Text>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(client)/(modals)/edit-profile')}>
          <Text style={styles.menuText}>{t('profile.editProfile') || 'Edit Profile'}</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(client)/(modals)/payment-method')}>
          <Text style={styles.menuText}>{t('payment.method') || 'Payment Methods'}</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(client)/(modals)/saved-addresses')}>
          <View>
            <Text style={styles.menuText}>📍 {t('profile.savedAddresses') || 'Saved Addresses'}</Text>
            <Text style={{ fontFamily: 'Nunito-SemiBold', fontSize: 12, color: '#6B5C4E', marginTop: 2 }}>
              {addressCount} {t('profile.saved') || 'saved'}
            </Text>
          </View>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{t('profile.settings') || 'Settings'}</Text>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(shared)/language-settings')}>
          <Text style={styles.menuText}>🌐 {t('profile.language') || 'Language'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.menuArrow, { marginRight: 8, color: colors.primary }]}>
              {SUPPORTED_LANGUAGES.find(l => l.code === currentLang)?.nativeLabel}
            </Text>
            <Text style={styles.menuArrow}>→</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(shared)/change-password')}>
          <Text style={styles.menuText}>🔒 {t('profile.changePassword') || 'Change Password'}</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{t('profile.help') || 'Help & Support'}</Text>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push({ pathname: '/(client)/(modals)/coming-soon', params: { title: 'Help Center' } })}>
          <Text style={styles.menuText}>{t('profile.helpCenter') || 'Help Center'}</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push({ pathname: '/(client)/(modals)/coming-soon', params: { title: 'Terms of Service' } })}>
          <Text style={styles.menuText}>{t('profile.termsOfService') || 'Terms of Service'}</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t('profile.logout') || 'Logout'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  header: {
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center'
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: 'white'
  },
  avatarText: {
    fontFamily: typography.fontDisplay,
    fontSize: 36,
    color: '#FFFFFF'
  },
  name: {
    fontFamily: typography.fontDisplay,
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: 4,
    fontWeight: '800'
  },
  phone: {
    fontFamily: typography.fontMono,
    fontSize: 16,
    color: colors.textSecondary
  },
  content: {
    padding: spacing.md
  },
  sectionTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '800'
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    padding: 20,
    borderRadius: radius.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border2,
    ...shadow.card
  },
  menuText: {
    fontFamily: typography.fontBody,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary
  },
  menuArrow: {
    fontFamily: typography.fontBody,
    fontSize: 16,
    color: colors.textMuted
  },
  logoutButton: {
    backgroundColor: '#FEE2E2',
    padding: 20,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#FCA5A5'
  },
  logoutText: {
    fontFamily: typography.fontBody,
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444'
  }
});
