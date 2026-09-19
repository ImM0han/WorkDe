import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing } from '../../../src/theme/tokens';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSocketStore } from '../../../src/stores/socketStore';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';

export default function JobPostedSuccess() {
  const router = useRouter();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);

  const { socket } = useSocketStore();
  const { jobId, workerCount } = useLocalSearchParams<{ jobId: string, workerCount?: string }>();
  const totalNeeded = parseInt(workerCount || '1', 10);
  const isGroup = totalNeeded > 1;

  const [joined, setJoined] = useState<any[]>([]);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    scale.value = withRepeat(withTiming(1.5, { duration: 1500 }), -1, true);
    opacity.value = withRepeat(withTiming(0, { duration: 1500 }), -1, true);

    if (!socket) return;

    socket.on('job:worker:joined', async (payload) => {
      if (payload.jobId !== jobId) return;
      const Haptics = await import('expo-haptics');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setJoined(prev => [...prev, payload.partner]);
      if (payload.isFilled) setFilled(true);
    });

    socket.on('job:accepted', async (payload) => {
      if (payload.jobId !== jobId) return;
      
      const Haptics = await import('expo-haptics');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (isGroup) {
        setFilled(true);
      } else {
        router.replace({
          pathname: '/(client)/(modals)/partner-matched',
          params: { 
            partnerId: payload.partner.id,
            name: payload.partner.name,
            avatar: payload.partner.avatar,
            phone: payload.partner.phone,
            rating: payload.partner.rating
          }
        });
      }
    });

    return () => { 
      socket.off('job:accepted'); 
      socket.off('job:worker:joined');
    };
  }, [socket, jobId]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.animationContainer}>
        <Animated.View style={[styles.ring, ringStyle]} />
        <View style={styles.circle}>
          <Text style={styles.emoji}>📡</Text>
        </View>
      </View>
      
      <Text style={styles.title}>Job Posted!</Text>
      
      {isGroup ? (
        <View style={{ width: '100%', marginBottom: spacing.xxl, alignItems: 'center' }}>
          <Text style={styles.subtitle}>
            {filled ? `All ${totalNeeded} workers confirmed! 🎉` : `Searching for ${totalNeeded} professionals...`}
          </Text>
          
          <Text style={styles.groupCountText}>{joined.length} of {totalNeeded} workers confirmed</Text>
          
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(100, (joined.length / totalNeeded) * 100)}%` }]} />
          </View>

          <View style={styles.avatarRow}>
            {Array.from({ length: totalNeeded }).map((_, i) => {
              const partner = joined[i];
              if (partner) {
                return (
                  <View key={i} style={styles.avatarFilled}>
                    <Text style={{ fontSize: 20 }}>{partner.name?.charAt(0) || '👤'}</Text>
                  </View>
                );
              }
              return <View key={i} style={styles.avatarEmpty} />;
            })}
          </View>

          {filled && <Text style={styles.successText}>All {totalNeeded} workers confirmed! 🎉</Text>}
        </View>
      ) : (
        <Text style={styles.subtitle}>Searching for nearby professionals...\nWe will keep searching for up to 48 hours.</Text>
      )}

      <TouchableOpacity style={styles.backgroundButton} onPress={() => {
        router.dismissAll();
        router.replace('/(client)/jobs');
      }}>
        <Text style={styles.backgroundText}>Search in Background</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={() => router.dismissAll()}>
        <Text style={styles.cancelText}>Cancel Search</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  animationContainer: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  ring: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.primaryLight },
  circle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', elevation: 10, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  emoji: { fontSize: 36 },
  title: { fontFamily: typography.fontDisplay, fontSize: 28, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.sm },
  subtitle: { fontFamily: typography.fontBody, fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xxl, lineHeight: 24 },
  backgroundButton: { backgroundColor: colors.primary, padding: 16, borderRadius: 100, width: '100%', alignItems: 'center', marginBottom: spacing.md, elevation: 2, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  backgroundText: { fontFamily: typography.fontBody, fontSize: 16, color: 'white', fontWeight: '800' },
  cancelButton: { padding: 16, borderWidth: 1, borderColor: colors.danger, borderRadius: 100, width: '100%', alignItems: 'center' },
  cancelText: { fontFamily: typography.fontBody, fontSize: 16, color: colors.danger, fontWeight: '700' },
  groupCountText: { fontFamily: 'Nunito-SemiBold', fontSize: 15, color: colors.textSecondary, marginBottom: 8 },
  progressBar: { height: 8, backgroundColor: '#EEE0CC', borderRadius: 999, width: '100%', marginBottom: 16, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#FF6B1A' },
  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  avatarFilled: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF0D6', borderWidth: 2, borderColor: '#FF6B1A', justifyContent: 'center', alignItems: 'center' },
  avatarEmpty: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5F5F5', borderWidth: 1, borderStyle: 'dashed', borderColor: '#EEE0CC' },
  successText: { fontFamily: 'Syne-ExtraBold', fontSize: 17, color: '#22C55E', marginTop: 16 }
});
