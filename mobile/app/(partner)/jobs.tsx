import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import Toast from 'react-native-toast-message';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import JobCard, { Job } from '../../src/components/JobCard';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, router } from 'expo-router';
import api from '../../src/services/apiClient';
import { useSocketStore } from '../../src/stores/socketStore';

export default function MyJobsScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const queryClient = useQueryClient();

  const fetchPartnerJobs = async () => {
    const res = await api.get('/jobs/partner');
    return res.data;
  };

  const { data: jobs, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['partnerJobs'],
    queryFn: fetchPartnerJobs,
  });

  const { socket } = useSocketStore();



  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const activeJobs = jobs ? jobs.filter((j: any) => ['POSTED', 'ACCEPTED', 'START_REQUESTED', 'IN_PROGRESS', 'EXTENDED', 'COMPLETED_PENDING_PAYMENT'].includes(j.status) && j.payment?.status !== 'COMPLETED') : [];
  const completedJobs = jobs ? jobs.filter((j: any) => j.status === 'COMPLETED' || j.payment?.status === 'COMPLETED') : [];
  const displayJobs = activeTab === 'ACTIVE' ? activeJobs : completedJobs;

  const handleStartJob = async (jobId: string) => {
    try {
      await api.post(`/jobs/${jobId}/start`);
      Toast.show({
        type: 'info',
        text1: 'Start Request Sent',
        text2: 'Awaiting client approval to start the job.'
      });
      queryClient.invalidateQueries({ queryKey: ['partnerJobs'] });
    } catch (e: any) {
      console.error(e);
      const errorMsg = e.response?.data?.error || e.message || 'Failed to start job';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMsg
      });
    }
  };



  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('jobs.title') || 'My Jobs'}</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'ACTIVE' && styles.activeTab]}
          onPress={() => setActiveTab('ACTIVE')}
        >
          <Text style={[styles.tabText, activeTab === 'ACTIVE' && styles.activeTabText]}>{t('jobs.active') || 'Active'}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'COMPLETED' && styles.activeTab]}
          onPress={() => setActiveTab('COMPLETED')}
        >
          <Text style={[styles.tabText, activeTab === 'COMPLETED' && styles.activeTabText]}>{t('jobs.completed') || 'Completed'}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Text style={styles.loadingText}>{t('common.loading') || 'Loading jobs...'}</Text>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF6B1A" />
          }
        >
          {displayJobs.map((job: any) => (
            <JobCard 
              key={job.id} 
              job={job as any} 
              showAcceptButton={activeTab === 'ACTIVE'}
              variant={activeTab === 'ACTIVE' ? 'active' : 'new'}
              onStart={() => handleStartJob(job.id)}
            />
          ))}
          {displayJobs.length === 0 && (
            <Text style={styles.emptyText}>{activeTab === 'ACTIVE' ? (t('jobs.noActiveJobs') || 'No active jobs') : (t('jobs.noCompletedJobs') || 'No completed jobs')}</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF6EE',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    backgroundColor: '#FFF0D6',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE0CC'
  },
  headerTitle: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 26,
    color: '#1C1410'
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 24,
    gap: 12
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F5E8D5'
  },
  activeTab: {
    backgroundColor: '#FF6B1A',
    borderColor: '#FF6B1A'
  },
  tabText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: '#6B5C4E'
  },
  activeTabText: {
    color: '#FFFFFF'
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24
  },
  emptyText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    color: '#C4B5A5',
    textAlign: 'center',
    marginTop: 40
  },
  loadingText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    color: '#C4B5A5',
    textAlign: 'center',
    marginTop: 40
  }
});
