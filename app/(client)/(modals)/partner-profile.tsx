import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { colors, typography, spacing, radius, shadow } from '../../../src/theme/tokens';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import api from '../../../src/services/apiClient';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

export default function PartnerProfile() {
  const router = useRouter();
  const { partnerId } = useLocalSearchParams();
  const { t } = useTranslation();

  const { data: partner, isLoading } = useQuery({
    queryKey: ['partnerProfile', partnerId],
    queryFn: () => api.get(`/partner/${partnerId}`).then(r => r.data),
    enabled: !!partnerId
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!partner) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontFamily: typography.fontBody }}>{t('profile.notFound') || 'Partner not found.'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <Image source={{ uri: partner.avatarUrl || 'https://via.placeholder.com/150' }} style={styles.avatar} contentFit="cover" />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.name}>{partner.name}</Text>
            {partner.aadhaarStatus === 'VERIFIED' && (
              <Ionicons name="checkmark-circle" size={24} color="#3B82F6" style={{ marginLeft: 6, marginBottom: 4 }} />
            )}
          </View>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color={colors.warning} />
            <Text style={styles.ratingText}>{partner.rating || 0} ({partner.reviewsCount || 0} {t('profile.reviews') || 'reviews'})</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{partner.jobsDone || 0}</Text>
            <Text style={styles.statLabel}>{t('profile.jobsDone') || 'Jobs Done'}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{partner.createdAt ? new Date(partner.createdAt).getFullYear() : 'New'}</Text>
            <Text style={styles.statLabel}>{t('profile.joined') || 'Joined'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('profile.skillsCount') || 'Skills'}</Text>
        <View style={styles.skillsRow}>
          {(partner.skills || []).map((skill: string, idx: number) => (
            <View key={idx} style={styles.skillBadge}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t('profile.certificates') || 'Certificates'}</Text>
        {(partner.certificates || []).map((cert: any) => (
          <View key={cert.id} style={styles.certRow}>
            <Ionicons name={cert.verified ? "checkmark-circle" : "time"} size={20} color={cert.verified ? colors.success : colors.warning} />
            <Text style={styles.certTitle}>{cert.title}</Text>
          </View>
        ))}

        <View style={styles.reviewsHeader}>
          <Text style={styles.sectionTitle}>{t('profile.recentReviews') || 'Recent Reviews'}</Text>
          <TouchableOpacity onPress={() => router.push(`/(client)/(modals)/reviews-detail?partnerId=${partner.id}`)}>
            <Text style={styles.viewAllText}>{t('profile.viewAll') || 'View All'}</Text>
          </TouchableOpacity>
        </View>
        
        {(partner.recentReviews || []).map((review: any) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewClient}>{review.client}</Text>
              <Text style={styles.reviewDate}>{review.date}</Text>
            </View>
            <View style={styles.ratingRowSm}>
              {[...Array(5)].map((_, i) => (
                <Ionicons key={i} name="star" size={12} color={i < review.rating ? colors.warning : colors.border} />
              ))}
            </View>
            <Text style={styles.reviewText}>{review.text}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={() => router.push('/(client)/post-job')}>
          <LinearGradient colors={['#FF6B1A', '#F59E0B']} style={styles.hireButton}>
            <Text style={styles.hireButtonText}>{t('profile.hire') || 'Hire'} {partner.name?.split(' ')[0]}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  header: { flexDirection: 'row', justifyContent: 'flex-end', padding: spacing.md },
  backButton: { padding: 8, backgroundColor: colors.bgCard, borderRadius: 20, ...shadow.card },
  content: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  profileHeader: { alignItems: 'center', marginBottom: spacing.lg },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: spacing.md, borderWidth: 3, borderColor: colors.primaryBg },
  name: { fontFamily: typography.fontDisplay, fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontFamily: typography.fontBody, fontSize: 15, color: colors.textSecondary, fontWeight: '600', marginLeft: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg, ...shadow.card, borderWidth: 1, borderColor: colors.border2 },
  statBox: { alignItems: 'center' },
  statValue: { fontFamily: typography.fontMono, fontSize: 20, fontWeight: '800', color: colors.primary },
  statLabel: { fontFamily: typography.fontBody, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontFamily: typography.fontDisplay, fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.sm, marginTop: spacing.sm },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.lg },
  skillBadge: { backgroundColor: colors.primaryBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm },
  skillText: { fontFamily: typography.fontMono, fontSize: 13, color: colors.primaryDark, fontWeight: '700' },
  certRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, padding: 12, borderRadius: radius.sm, marginBottom: 8, borderWidth: 1, borderColor: colors.border2 },
  certTitle: { fontFamily: typography.fontBody, fontSize: 14, color: colors.textPrimary, fontWeight: '600', marginLeft: 8 },
  reviewsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  viewAllText: { fontFamily: typography.fontBody, fontSize: 14, color: colors.primary, fontWeight: '700' },
  reviewCard: { backgroundColor: colors.bgCard, padding: 16, borderRadius: radius.md, marginBottom: 12, borderWidth: 1, borderColor: colors.border2 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  reviewClient: { fontFamily: typography.fontBody, fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  reviewDate: { fontFamily: typography.fontMono, fontSize: 11, color: colors.textMuted },
  ratingRowSm: { flexDirection: 'row', marginBottom: 8 },
  reviewText: { fontFamily: typography.fontBody, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.bgCard, padding: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, ...shadow.lg },
  hireButton: { borderRadius: radius.full, padding: 16, alignItems: 'center' },
  hireButtonText: { fontFamily: typography.fontDisplay, fontSize: 16, fontWeight: '800', color: 'white' }
});
