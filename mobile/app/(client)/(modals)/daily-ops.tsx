import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, typography, spacing, radius, shadow } from '../../../src/theme/tokens';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WorkerRow } from '../../../src/components/WorkerRow';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../src/services/apiClient';
import { useSocketStore } from '../../../src/stores/socketStore';
import Toast from 'react-native-toast-message';

function ActiveTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    
    const update = () => {
      const now = new Date().getTime();
      setElapsed(Math.max(0, Math.floor((now - start) / 1000)));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const format = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Text style={styles.timerText}>⏱️ Active Duration: {format(elapsed)}</Text>
  );
}

export default function DailyOps() {
  const router = useRouter();
  const { socket } = useSocketStore();
  
  const { data: allJobs } = useQuery({
    queryKey: ['activeOpsJobs'],
    queryFn: () => api.get('/jobs/client').then(r => r.data)
  });

  const jobs = allJobs ? allJobs.filter((j: any) => ['IN_PROGRESS', 'EXTENDED'].includes(j.status)) : [];

  const queryClient = useQueryClient();
  const [partnerLocation, setPartnerLocation] = React.useState<{ lat: number; lng: number } | null>(null);
  const [isFinalizing, setIsFinalizing] = React.useState<Record<string, boolean>>({});

  const handleExtend = async (jobId: string) => {
    try {
      await api.post(`/jobs/${jobId}/extend`, { extraHours: 1 });
      Toast.show({ type: 'success', text1: 'Work extended successfully!' });
      queryClient.invalidateQueries({ queryKey: ['activeOpsJobs'] });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to extend work' });
    }
  };

  const handleEndWork = async (jobId: string) => {
    setIsFinalizing(prev => ({ ...prev, [jobId]: true }));
    try {
      await api.post(`/jobs/${jobId}/finalize-work`);
      queryClient.invalidateQueries({ queryKey: ['activeOpsJobs'] });
      queryClient.invalidateQueries({ queryKey: ['clientJobs'] });
      router.push({
        pathname: '/(client)/(modals)/payment-method',
        params: { jobId }
      });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to complete work' });
    } finally {
      setIsFinalizing(prev => ({ ...prev, [jobId]: false }));
    }
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('partner:location', (payload: { lat: number; lng: number }) => {
      setPartnerLocation(payload);
      // This updates the MapView marker in real time
    });

    return () => { socket.off('partner:location'); };
  }, [socket]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Daily Operations</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Active Workers</Text>
        {(!jobs || jobs.length === 0) && <Text style={{ fontFamily: typography.fontBody, color: colors.textSecondary }}>No active operations.</Text>}
        {jobs?.map((job: any) => (
          <View key={job.id} style={styles.workerCardContainer}>
            <WorkerRow worker={{
              id: job.partner?.id || job.id,
              name: job.partner?.user?.name || 'Worker',
              avatarUrl: job.partner?.user?.avatarUrl || 'https://ui-avatars.com/api/?name=Worker',
              status: 'On Task',
              jobCategory: job.category
            }} onPress={() => router.push(`/(client)/(modals)/worker-detail?workerId=${job.partner?.id}`)} />
            
            <ActiveTimer startedAt={job.startedAt || job.createdAt} />

            <View style={styles.workerActions}>
              <TouchableOpacity style={styles.extendBtn} onPress={() => handleExtend(job.id)}>
                <Text style={styles.extendBtnText}>Extend Work</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.endBtn} 
                onPress={() => handleEndWork(job.id)}
                disabled={isFinalizing[job.id]}
              >
                {isFinalizing[job.id] ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.endBtnText}>End Work</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border2 },
  title: { fontFamily: typography.fontDisplay, fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  content: { padding: spacing.md },
  sectionTitle: { fontFamily: typography.fontDisplay, fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.md },
  workerCardContainer: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border2,
    ...shadow.card
  },
  workerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: colors.border2,
    paddingTop: 12
  },
  extendBtn: {
    flex: 1,
    backgroundColor: colors.bgPage,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radius.full,
    alignItems: 'center',
    marginRight: 8
  },
  extendBtnText: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700'
  },
  endBtn: {
    flex: 1,
    backgroundColor: colors.danger,
    paddingVertical: 10,
    borderRadius: radius.full,
    alignItems: 'center',
    marginLeft: 8
  },
  endBtnText: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: '#fff',
    fontWeight: '700'
  },
  timerText: {
    fontFamily: typography.fontMono,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
  }
});
