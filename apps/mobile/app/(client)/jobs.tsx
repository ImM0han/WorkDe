import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius, shadow } from '../../src/theme/tokens';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import api from '../../src/services/apiClient';
import { useSocketStore } from '../../src/stores/socketStore';

const fetchClientJobs = async () => {
  const res = await api.get('/jobs/client');
  return res.data;
};

export default function ClientJobs() {
  const { t } = useTranslation();
  const { tab } = useLocalSearchParams<{ tab?: 'Active' | 'Completed' | 'Cancelled' }>();
  const [activeTab, setActiveTab] = useState<'Active' | 'Completed' | 'Cancelled'>(tab || 'Active');

  useEffect(() => {
    if (tab) {
      setActiveTab(tab);
    }
  }, [tab]);

  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: jobs, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['clientJobs'],
    queryFn: fetchClientJobs,
  });

  const { socket } = useSocketStore();



  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );



  const getFilteredJobs = () => {
    if (!jobs) return [];
    if (activeTab === 'Active') return jobs.filter((j: any) => ['POSTED', 'ACCEPTED', 'START_REQUESTED', 'IN_PROGRESS', 'EXTENDED', 'COMPLETED_PENDING_PAYMENT'].includes(j.status));
    return jobs.filter((j: any) => j.status === activeTab.toUpperCase());
  };

  const renderJobCard = ({ item }: { item: any }) => (
    <View style={styles.cardContainer}>
      <TouchableOpacity 
        style={styles.cardClickable} 
        activeOpacity={0.7}
        onPress={() => {
          if (['POSTED', 'ACCEPTED', 'START_REQUESTED', 'IN_PROGRESS', 'EXTENDED', 'COMPLETED_PENDING_PAYMENT'].includes(item.status)) {
            router.push({
              pathname: '/(client)/(modals)/job-detail',
              params: { id: item.id }
            });
          } else if (item.status === 'COMPLETED') {
            router.push({
              pathname: '/(client)/(modals)/payment',
              params: { jobId: item.id, rate: item.rate.toString() }
            });
          }
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          <Text style={[
            styles.statusText,
            item.status === 'COMPLETED' ? { color: colors.success } : 
            item.status === 'CANCELLED' ? { color: colors.danger } : { color: colors.warning }
          ]}>
            {item.status.replace('_', ' ')}
          </Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.dateText}>{new Date(item.scheduledDate || item.createdAt).toLocaleDateString()}</Text>
          <Text style={styles.priceText}>₹{item.rate}</Text>
        </View>
      </TouchableOpacity>

      {/* Actions section for client outside the TouchableOpacity */}
      {['IN_PROGRESS', 'EXTENDED'].includes(item.status) && (
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.actionBtnFinish}
            onPress={async () => {
              try {
                await api.post(`/jobs/${item.id}/finalize-work`);
                queryClient.invalidateQueries({ queryKey: ['clientJobs'] });
                router.push({
                  pathname: '/(client)/(modals)/payment-method',
                  params: { jobId: item.id }
                });
              } catch (e: any) {
                const errorMsg = e.response?.data?.error || e.message || 'Failed to stop job';
                Toast.show({ type: 'error', text1: 'Error', text2: errorMsg });
              }
            }}
          >
            <Text style={styles.actionBtnText}>Stop / Finish Job</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'COMPLETED_PENDING_PAYMENT' && (
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.actionBtnPay}
            onPress={() => {
              router.push({
                pathname: '/(client)/(modals)/payment-method',
                params: { jobId: item.id }
              });
            }}
          >
            <Text style={styles.actionBtnText}>Pay Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'COMPLETED' && !item.feedback && (
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.actionBtnRate}
            onPress={() => {
              router.push({
                pathname: '/(client)/(modals)/payment',
                params: { jobId: item.id, rate: item.rate.toString() }
              });
            }}
          >
            <Text style={styles.actionBtnText}>Rate Partner</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.headerTitle}>{t('jobs.title') || 'Job History'}</Text>
      
      <View style={styles.tabContainer}>
        {[{ key: 'Active', label: t('jobs.active') || 'Active' }, { key: 'Completed', label: t('jobs.completed') || 'Completed' }, { key: 'Cancelled', label: t('jobs.cancelled') || 'Cancelled' }].map((tab) => (
          <TouchableOpacity 
            key={tab.key} 
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <Text style={styles.loadingText}>{t('common.loading') || 'Loading jobs...'}</Text>
      ) : (
        <FlatList
          data={getFilteredJobs()}
          renderItem={renderJobCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={<Text style={styles.emptyText}>{t(`jobs.no${activeTab}Jobs`) || `No ${activeTab.toLowerCase()} jobs found.`}</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  headerTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    backgroundColor: colors.border2,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  activeTab: {
    backgroundColor: colors.bgCard,
    ...shadow.card,
  },
  tabText: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
  },
  cardContainer: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border2,
    ...shadow.card,
  },
  cardClickable: {
    width: '100%',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border2,
    justifyContent: 'flex-end',
  },
  actionBtnFinish: {
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
  },
  actionBtnPay: {
    backgroundColor: colors.success,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
  },
  actionBtnRate: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
  },
  actionBtnText: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  categoryText: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  statusText: {
    fontFamily: typography.fontMono,
    fontSize: 12,
    fontWeight: '800',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontFamily: typography.fontMono,
    fontSize: 13,
    color: colors.textMuted,
  },
  priceText: {
    fontFamily: typography.fontMono,
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  loadingText: {
    fontFamily: typography.fontBody,
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 20,
  },
  emptyText: {
    fontFamily: typography.fontBody,
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 40,
    fontSize: 15,
  },
  extensionBanner: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: radius.md,
    marginTop: -4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  extensionText: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  extensionActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  extensionDeclineBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: radius.sm,
  },
  extensionDeclineText: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  extensionAcceptBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  extensionAcceptText: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  }
});
