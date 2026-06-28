import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import api from '../../src/services/apiClient';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../src/i18n';
import { useLanguageStore } from '../../src/i18n/languageStore';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const { currentLang } = useLanguageStore();

  useFocusEffect(
    useCallback(() => {
      api.get('/auth/me')
        .then(res => {
          if (res.data?.user) {
            useAuthStore.setState({ user: res.data.user });
          }
        })
        .catch(err => {
          console.warn('[Profile] Failed to fetch current user:', err);
        });
    }, [])
  );

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/onboarding');
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FFF0D6', '#FDF6EE']} style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'P'}</Text>
        </View>
        <Text style={styles.name}>{user?.name || 'Partner Name'}</Text>
        <Text style={styles.phone}>{user?.phone || '+910000000000'}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={() => router.push('/(partner)/(modals)/reviews')}>
            <Text style={styles.statValue}>{user?.partner?.rating?.toFixed(1) || '0'}</Text>
            <Text style={styles.statLabel}>{t('profile.rating') || 'Rating'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={() => router.push('/(partner)/jobs')}>
            <Text style={styles.statValue}>{user?.partner?.totalJobs || '0'}</Text>
            <Text style={styles.statLabel}>{t('profile.jobsDone') || 'Jobs Done'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={() => router.push('/(partner)/(modals)/manage-skills')}>
            <Text style={styles.statValue}>{user?.partner?.skills?.length || '0'}</Text>
            <Text style={styles.statLabel}>{t('profile.skillsCount') || 'Skills'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>{t('profile.settings') || 'Settings'}</Text>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(shared)/language-settings')}>
          <Text style={styles.menuText}>🌐 {t('profile.language')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.menuArrow, { marginRight: 8, color: '#FF6B1A' }]}>
              {SUPPORTED_LANGUAGES.find(l => l.code === currentLang)?.nativeLabel}
            </Text>
            <Text style={styles.menuArrow}>→</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(shared)/change-password')}>
          <Text style={styles.menuText}>🔒 {t('profile.changePassword')}</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{t('profile.manageProfile') || 'Manage Profile'}</Text>



        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(partner)/(modals)/edit-profile')}>
          <Text style={styles.menuText}>{t('profile.editProfile')}</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(partner)/(modals)/manage-skills')}>
          <Text style={styles.menuText}>{t('profile.manageSkills') || 'Manage Skills'}</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(partner)/(modals)/cert-status')}>
          <Text style={styles.menuText}>{t('profile.certificates')}</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(partner)/(modals)/aadhaar-kyc')}>
          <Text style={styles.menuText}>{t('profile.kyc')}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{user?.aadhaarStatus || 'PENDING'}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(partner)/(modals)/wallet')}>
          <Text style={styles.menuText}>{t('wallet.title')}</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF6EE',
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
    backgroundColor: '#FF6B1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  avatarText: {
    fontFamily: 'Syne-Bold',
    fontSize: 36,
    color: '#FFFFFF'
  },
  name: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 24,
    color: '#1C1410',
    marginBottom: 4
  },
  phone: {
    fontFamily: 'DMMono-Medium',
    fontSize: 16,
    color: '#6B5C4E'
  },
  content: {
    padding: 24
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF0D6',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center'
  },
  statValue: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 18,
    color: '#FF6B1A',
    marginBottom: 4
  },
  statLabel: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 12,
    color: '#6B5C4E'
  },
  sectionTitle: {
    fontFamily: 'Syne-Bold',
    fontSize: 15,
    color: '#1C1410',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEE0CC'
  },
  menuText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: '#1C1410'
  },
  menuArrow: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: '#C4B5A5'
  },
  badge: {
    backgroundColor: '#FFF0D6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  badgeText: {
    fontFamily: 'DMMono-Medium',
    fontSize: 11,
    color: '#FF6B1A'
  },
  logoutButton: {
    backgroundColor: '#FEE2E2',
    padding: 20,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 24
  },
  logoutText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: '#EF4444'
  }
});
