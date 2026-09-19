import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, radius, shadow } from '../../../src/theme/tokens';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

export default function WorkerDetail() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(15795); // e.g. 04:23:15
  
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Worker Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <Image source={{ uri: 'https://i.pravatar.cc/150?u=ramesh' }} style={styles.avatar} contentFit="cover" />
            <View>
              <Text style={styles.name}>Ramesh Kumar</Text>
              <Text style={styles.category}>Electrician</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.timerBox}>
            <Text style={styles.timerLabel}>Time on task</Text>
            <Text style={styles.timerValue}>{formatTime(seconds)}</Text>
          </View>
          
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>On Task</Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => router.push('/(client)/(modals)/extend-work')}>
          <LinearGradient colors={['#FF6B1A', '#F59E0B']} style={styles.extendButton}>
            <Text style={styles.extendButtonText}>Extend Work</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.endButton} onPress={() => router.push('/(client)/(modals)/end-work-confirm')}>
          <Text style={styles.endButtonText}>End Work</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontFamily: typography.fontDisplay, fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  content: { padding: spacing.md },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: 16, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border2, ...shadow.card },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 60, height: 60, borderRadius: 30, marginRight: 16 },
  name: { fontFamily: typography.fontDisplay, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  category: { fontFamily: typography.fontBody, fontSize: 14, color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.border2, marginBottom: 16 },
  timerBox: { alignItems: 'center', marginBottom: 16 },
  timerLabel: { fontFamily: typography.fontBody, fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  timerValue: { fontFamily: typography.fontMono, fontSize: 36, fontWeight: '800', color: colors.primary },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success, marginRight: 8 },
  statusText: { fontFamily: typography.fontBody, fontSize: 14, fontWeight: '700', color: colors.success },
  extendButton: { borderRadius: radius.full, padding: 16, alignItems: 'center', marginBottom: spacing.md, ...shadow.card },
  extendButtonText: { fontFamily: typography.fontDisplay, fontSize: 16, fontWeight: '800', color: 'white' },
  endButton: { padding: 16, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.full, alignItems: 'center' },
  endButtonText: { fontFamily: typography.fontBody, fontSize: 16, color: colors.danger, fontWeight: '700' }
});
