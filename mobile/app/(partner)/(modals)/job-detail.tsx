import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker } from 'react-native-maps';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../src/services/apiClient';
import { useSocketStore } from '../../../src/stores/socketStore';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '../../../src/stores/authStore';

export default function JobDetailModal() {
  const { jobId, distance } = useLocalSearchParams<{ jobId: string; distance?: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: job, isLoading, error, refetch } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.get(`/jobs/${jobId}`).then(r => r.data),
    enabled: !!jobId
  });





  const handleStart = async () => {
    try {
      await api.post(`/jobs/${jobId}/start`);
      Toast.show({
        type: 'success',
        text1: 'Job Started',
        text2: 'The job is now in progress.'
      });
      queryClient.invalidateQueries({ queryKey: ['partnerJobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      router.replace(`/(partner)/(modals)/job-in-progress?jobId=${jobId}`);
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

  const handleAccept = async () => {
    try {
      await api.post(`/jobs/${jobId}/accept`);
      queryClient.invalidateQueries({ queryKey: ['nearbyJobs'] });
      router.replace(`/(partner)/(modals)/job-accepted?jobId=${jobId}`);
    } catch (e: any) {
      console.error(e);
      const errorMsg = e.response?.data?.error || e.message || 'Failed to accept job';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMsg
      });
    }
  };

  const handleReject = () => {
    router.push(`/(partner)/(modals)/reject-reason?jobId=${jobId}`);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FF6B1A" />
        <Text style={{ marginTop: 12, fontFamily: 'Nunito-SemiBold', color: '#6B5C4E' }}>Loading job details...</Text>
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ fontFamily: 'Syne-Bold', fontSize: 18, color: '#EF4444', marginBottom: 12 }}>Error</Text>
        <Text style={{ fontFamily: 'Nunito-SemiBold', color: '#6B5C4E', textAlign: 'center', marginBottom: 20 }}>
          {error ? 'Failed to fetch job details. Please try again.' : 'Job not found.'}
        </Text>
        <TouchableOpacity style={styles.rejectBtn as any} onPress={() => router.back()}>
          <Text style={styles.rejectBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const jobLat = job.lat || 12.9716;
  const jobLng = job.lng || 77.5946;
  const hasAccepted = job?.partnerIds?.includes(user?.partnerId || '');

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.mapContainer}>
          <MapView 
            style={styles.map} 
            liteMode={true}
            initialRegion={{
              latitude: jobLat,
              longitude: jobLng,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker
              coordinate={{
                latitude: jobLat,
                longitude: jobLng,
              }}
              pinColor="#FF6B1A"
            />
          </MapView>
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{job.category}</Text>
            </View>
            <Text style={styles.price}>₹{job.rate}/{job.rateType === 'DAILY' ? 'day' : 'hr'}</Text>
          </View>

          <Text style={styles.address}>{job.address}</Text>
          <Text style={styles.distance}>
            {distance ? `${parseFloat(distance).toFixed(1)} km away` : '1.0 km away'}
          </Text>
          
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{job.description}</Text>

          <View style={styles.clientCard}>
            <View style={styles.clientAvatar}>
              {job.client?.avatarUrl ? (
                <Image source={{ uri: job.client.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} />
              ) : (
                <Text style={styles.clientAvatarText}>{(job.client?.name || 'Client').charAt(0)}</Text>
              )}
            </View>
            <View>
              <Text style={styles.clientName}>{job.client?.name || 'Client'}</Text>
              <Text style={styles.clientSub}>Client</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {(job.status === 'POSTED' && !hasAccepted) ? (
          <>
            <TouchableOpacity style={styles.rejectBtn as any} onPress={handleReject}>
              <Text style={styles.rejectBtnText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtnWrapper} onPress={handleAccept}>
              <LinearGradient colors={['#FF6B1A', '#F59E0B']} style={styles.acceptBtn}>
                <Text style={styles.acceptBtnText}>Accept Job →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (job.status === 'ACCEPTED' || (job.status === 'POSTED' && hasAccepted)) ? (
          <TouchableOpacity style={{ flex: 1 }} onPress={handleStart}>
            <LinearGradient colors={['#FF6B1A', '#F59E0B']} style={styles.acceptBtn}>
              <Text style={styles.acceptBtnText}>Start Job</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : job.status === 'START_REQUESTED' ? (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>Awaiting Start Acceptance...</Text>
          </View>
        ) : ['IN_PROGRESS', 'EXTENDED'].includes(job.status) ? (
          <TouchableOpacity 
            style={styles.inProgressBadge}
            activeOpacity={0.8}
            onPress={() => router.replace(`/(partner)/(modals)/job-in-progress?jobId=${jobId}`)}
          >
            <Text style={styles.inProgressText}>Job in Progress →</Text>
          </TouchableOpacity>
        ) : job.status === 'COMPLETED_PENDING_PAYMENT' ? (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>Awaiting Client Payment...</Text>
          </View>
        ) : job.status === 'COMPLETED' ? (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>Job Completed ✓</Text>
          </View>
        ) : (
          <View style={styles.cancelledBadge}>
            <Text style={styles.cancelledText}>Job Cancelled</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE' },
  mapContainer: { height: 200, width: '100%' },
  map: { flex: 1 },
  content: { padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontFamily: 'DM Mono', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', color: '#B45309' },
  price: { fontFamily: 'DMMono-Medium', fontSize: 20, fontWeight: '800', color: '#FF6B1A' },
  address: { fontFamily: 'Syne-ExtraBold', fontSize: 22, color: '#1C1410', marginBottom: 4 },
  distance: { fontFamily: 'DMMono-Regular', fontSize: 14, color: '#C4B5A5', marginBottom: 24 },
  sectionTitle: { fontFamily: 'Syne-Bold', fontSize: 15, color: '#1C1410', marginBottom: 8 },
  description: { fontFamily: 'Nunito-SemiBold', fontSize: 16, color: '#6B5C4E', lineHeight: 24, marginBottom: 24 },
  clientCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#EEE0CC', gap: 12 },
  clientAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF0D6', justifyContent: 'center', alignItems: 'center' },
  clientAvatarText: { fontFamily: 'Syne-Bold', fontSize: 16, color: '#FF6B1A' },
  clientName: { fontFamily: 'Syne-Bold', fontSize: 16, color: '#1C1410' },
  clientSub: { fontFamily: 'Nunito-SemiBold', fontSize: 12, color: '#6B5C4E' },
  footer: { flexDirection: 'row', padding: 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EEE0CC', gap: 16 },
  rejectBtn: { flex: 1, height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: '#EF4444' },
  rejectBtnText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#EF4444' },
  acceptBtnWrapper: { flex: 2 },
  acceptBtn: { height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  acceptBtnText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#FFFFFF' },
  completedBadge: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  completedText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: '#15803D',
  },
  cancelledBadge: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  cancelledText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: '#B91C1C',
  },
  inProgressBadge: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  inProgressText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: '#D97706',
  },
  pendingBadge: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  pendingText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: '#D97706',
  }
});
