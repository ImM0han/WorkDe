import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import JobCard, { Job } from '../../src/components/JobCard';
import { useTranslation } from 'react-i18next';

export default function MyJobsScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const queryClient = useQueryClient();

  // Load dynamically accepted jobs from cache
  const { data: activeJobs } = useQuery({
    queryKey: ['activeJobs'],
    queryFn: () => [
      {
        id: 'job_active_1', category: 'Electrician', address: 'Block C, Whitefield',
        rate: 1200, rateType: 'DAILY', distance: 3.5, description: 'Install new AC wiring and main switchboard.',
        extensionRequest: { requestedBy: 'CLIENT', amount: '2', status: 'PENDING' }
      }
    ] as Job[],
    staleTime: Infinity,
  });

  const mockCompletedJobs: Job[] = [
    {
      id: 'job_comp_1', category: 'Plumber', address: '123 Tech Park, Bengaluru',
      rate: 850, rateType: 'DAILY', distance: 1.2, description: 'Fix leaking pipe in main office washroom. Completed successfully.'
    }
  ];

  const displayJobs = activeTab === 'ACTIVE' ? (activeJobs || []) : mockCompletedJobs;

  const handleAcceptExtension = (jobId: string) => {
    queryClient.setQueryData(['activeJobs'], (oldData: Job[] | undefined) => {
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
    Toast.show({ type: 'success', text1: 'Extension Accepted', text2: 'The job duration has been successfully extended.' });
  };

  const handleDeclineExtension = (jobId: string) => {
    queryClient.setQueryData(['activeJobs'], (oldData: Job[] | undefined) => {
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
    Toast.show({ type: 'info', text1: 'Extension Declined', text2: 'The extension request was rejected.' });
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

      <ScrollView contentContainerStyle={styles.content}>
        {displayJobs.map(job => (
          <JobCard 
            key={job.id} 
            job={job} 
            showAcceptButton={activeTab === 'ACTIVE'}
            variant={activeTab === 'ACTIVE' ? 'active' : 'new'}
            onAcceptExtension={() => handleAcceptExtension(job.id)}
            onDeclineExtension={() => handleDeclineExtension(job.id)}
          />
        ))}
        {displayJobs.length === 0 && (
          <Text style={styles.emptyText}>{activeTab === 'ACTIVE' ? (t('jobs.noActiveJobs') || 'No active jobs') : (t('jobs.noCompletedJobs') || 'No completed jobs')}</Text>
        )}
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
  }
});
