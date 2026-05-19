import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import api from '../../../src/services/apiClient';

export default function JobInProgressModal() {
  const { jobId } = useLocalSearchParams();
  const [elapsed, setElapsed] = useState(0);

  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.get(`/jobs/${jobId}`).then(r => r.data),
    enabled: !!jobId
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      await Location.startLocationUpdatesAsync('BACKGROUND_LOCATION', {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 20,
        timeInterval: 15000,
        foregroundService: {
          notificationTitle: 'GigWork Active',
          notificationBody: 'Sharing your location with client',
          notificationColor: '#FF6B1A',
        },
      });
    };

    startTracking();

    return () => {
      clearInterval(timer);
      Location.stopLocationUpdatesAsync('BACKGROUND_LOCATION').catch(() => {});
    };
  }, []);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.activeCard}>
          <Text style={styles.jobId}>Job #{jobId}</Text>
          <Text style={styles.category}>{job?.category || 'Loading...'}</Text>
          <Text style={styles.address}>{job?.address || 'Loading...'}</Text>
        </View>

        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>Elapsed Time</Text>
          <Text style={styles.timerValue}>{formatTime(elapsed)}</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.step, styles.stepActive]}><Text style={styles.stepText}>1. Started</Text></View>
          <View style={[styles.step, elapsed > 5 ? styles.stepActive : {}]}><Text style={[styles.stepText, elapsed <= 5 && {color: '#C4B5A5'}]}>2. In Progress</Text></View>
          <View style={[styles.step, {backgroundColor: '#FFFFFF', borderColor: '#EEE0CC'}]}><Text style={[styles.stepText, {color: '#C4B5A5'}]}>3. Complete</Text></View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.chatBtn} onPress={() => router.push(`/(shared)/chat/${jobId}`)}>
          <Text style={styles.chatText}>💬 Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.completeBtn} onPress={() => router.push(`/(partner)/(modals)/job-completion?jobId=${jobId}`)}>
          <Text style={styles.completeText}>Mark as Complete ✓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE' },
  content: { padding: 24 },
  activeCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 14, borderLeftWidth: 4, borderLeftColor: '#FF6B1A', marginBottom: 32, elevation: 2, shadowColor: 'rgba(200,100,20,1)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  jobId: { fontFamily: 'DMMono-Medium', fontSize: 12, color: '#C4B5A5', marginBottom: 4 },
  category: { fontFamily: 'Syne-Bold', fontSize: 18, color: '#1C1410', marginBottom: 4 },
  address: { fontFamily: 'Nunito-SemiBold', fontSize: 14, color: '#6B5C4E' },
  timerContainer: { alignItems: 'center', marginBottom: 40 },
  timerLabel: { fontFamily: 'Nunito-SemiBold', fontSize: 14, color: '#6B5C4E', marginBottom: 8 },
  timerValue: { fontFamily: 'DMMono-Medium', fontSize: 38, fontWeight: '800', color: '#FF6B1A' },
  progressContainer: { gap: 12 },
  step: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#EEE0CC', backgroundColor: '#FFFFFF' },
  stepActive: { backgroundColor: '#FFF0D6', borderColor: '#FF6B1A' },
  stepText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: '#FF6B1A' },
  footer: { flexDirection: 'row', padding: 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EEE0CC', gap: 12 },
  chatBtn: { flex: 1, height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: '#FFF0D6' },
  chatText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#FF6B1A' },
  completeBtn: { flex: 2, height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: '#22C55E' },
  completeText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#FFFFFF' }
});
