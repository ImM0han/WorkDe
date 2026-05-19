import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius, shadow } from '../../src/theme/tokens';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

const fetchClientJobs = async () => {
  // Mock data
  return [
    { 
      id: 'j1', category: 'Electrician', status: 'IN_PROGRESS', rate: 1200, date: new Date().toISOString(),
      extensionRequest: { requestedBy: 'PARTNER', amount: '2', status: 'PENDING' }
    },
    { id: 'j2', category: 'Plumber', status: 'COMPLETED', rate: 800, date: new Date().toISOString() },
    { id: 'j3', category: 'Carpenter', status: 'CANCELLED', rate: 1500, date: new Date().toISOString() },
  ];
};

export default function ClientJobs() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'Active' | 'Completed' | 'Cancelled'>('Active');
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['clientJobs'],
    queryFn: fetchClientJobs,
    staleTime: Infinity,
  });

  const handleAcceptExtension = (jobId: string) => {
    queryClient.setQueryData(['clientJobs'], (oldData: any[] | undefined) => {
      if (!oldData) return [];
      return oldData.map(j => {
        if (j.id === jobId) {
          const updated = { ...j };
          delete updated.extensionRequest;
          return updated;
        }
        return j;
      });
    });
    Toast.show({ type: 'success', text1: 'Extension Accepted', text2: 'The partner has been notified that you accepted the extra time.' });
  };

  const handleDeclineExtension = (jobId: string) => {
    queryClient.setQueryData(['clientJobs'], (oldData: any[] | undefined) => {
      if (!oldData) return [];
      return oldData.map(j => {
        if (j.id === jobId) {
          const updated = { ...j };
          delete updated.extensionRequest;
          return updated;
        }
        return j;
      });
    });
    Toast.show({ type: 'info', text1: 'Extension Declined', text2: 'The partner has been notified that you rejected the request.' });
  };

  const getFilteredJobs = () => {
    if (!jobs) return [];
    if (activeTab === 'Active') return jobs.filter(j => ['POSTED', 'ACCEPTED', 'IN_PROGRESS', 'EXTENDED'].includes(j.status));
    return jobs.filter(j => j.status === activeTab.toUpperCase());
  };

  const renderJobCard = ({ item }: { item: any }) => (
    <View style={{ marginBottom: 12 }}>
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.7}
        onPress={() => {
          if (item.status === 'IN_PROGRESS') {
            router.push('/(client)/(modals)/daily-ops');
          } else if (item.status === 'COMPLETED') {
            router.push('/(client)/(modals)/payment');
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
          <Text style={styles.dateText}>{new Date(item.date).toLocaleDateString()}</Text>
          <Text style={styles.priceText}>₹{item.rate}</Text>
        </View>
      </TouchableOpacity>
      
      {item.extensionRequest && item.extensionRequest.status === 'PENDING' && (
        <View style={styles.extensionBanner}>
          <View style={{ flex: 1 }}>
            {item.extensionRequest.requestedBy === 'CLIENT' ? (
              <Text style={styles.extensionText}>
                Pending partner approval for +{item.extensionRequest.amount} {item.rate > 1000 ? 'Days' : 'Hours'}.
              </Text>
            ) : (
              <View>
                <Text style={styles.extensionText}>
                  Partner requested to extend for +{item.extensionRequest.amount} {item.rate > 1000 ? 'Days' : 'Hours'}.
                </Text>
                <View style={styles.extensionActionRow}>
                  <TouchableOpacity style={styles.extensionDeclineBtn} onPress={() => handleDeclineExtension(item.id)}>
                    <Text style={styles.extensionDeclineText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.extensionAcceptBtn} onPress={() => handleAcceptExtension(item.id)}>
                    <Text style={styles.extensionAcceptText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
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
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border2,
    ...shadow.card,
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
