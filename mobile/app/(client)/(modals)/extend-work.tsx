import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, typography, spacing, radius, shadow } from '../../../src/theme/tokens';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../../src/services/apiClient';
import Toast from 'react-native-toast-message';

export default function ExtendWork() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { jobId, rate, rateType } = useLocalSearchParams<{ jobId: string; rate?: string; rateType?: string }>();
  const [extraHours, setExtraHours] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hourlyRate = rate ? parseFloat(rate) : 200;
  const label = rateType === 'DAILY' ? 'Extra Days' : 'Extra Hours';

  const handleSendRequest = async () => {
    setIsSubmitting(true);
    const additionalCost = extraHours * hourlyRate;
    try {
      await api.post(`/jobs/${jobId}/extend`, { extraHours, additionalCost });
      Toast.show({
        type: 'success',
        text1: 'Extension Request Sent',
        text2: `Requested extension of +${extraHours} ${rateType === 'DAILY' ? 'Days' : 'Hours'}.`
      });
      queryClient.invalidateQueries({ queryKey: ['clientJobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      router.back();
    } catch (e: any) {
      console.error(e);
      const errorMsg = e.response?.data?.error || e.message || 'Failed to send request';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMsg
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Extend Work</Text>
      <Text style={styles.subtitle}>Request worker to stay longer. The additional cost will be added to the final payment.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.stepper}>
          <TouchableOpacity onPress={() => setExtraHours(Math.max(1, extraHours - 1))} style={styles.stepBtn}>
            <Text style={styles.stepBtnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.stepperValue}>{extraHours}</Text>
          <TouchableOpacity onPress={() => setExtraHours(extraHours + 1)} style={styles.stepBtn}>
            <Text style={styles.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.costLabel}>Additional Cost</Text>
          <Text style={styles.costValue}>₹{extraHours * hourlyRate}</Text>
        </View>
      </View>

      <TouchableOpacity onPress={handleSendRequest} disabled={isSubmitting}>
        <LinearGradient colors={['#FF6B1A', '#F59E0B']} style={styles.sendButton}>
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Send Extension Request</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage, padding: spacing.md },
  header: { alignItems: 'flex-end', marginBottom: spacing.xl },
  closeText: { fontFamily: typography.fontBody, fontSize: 16, color: colors.primary, fontWeight: '600' },
  title: { fontFamily: typography.fontDisplay, fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  subtitle: { fontFamily: typography.fontBody, fontSize: 15, color: colors.textSecondary, marginBottom: spacing.xl },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: 20, borderWidth: 1, borderColor: colors.border2, ...shadow.card, marginBottom: spacing.xl },
  label: { fontFamily: typography.fontDisplay, fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 12, textAlign: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontFamily: typography.fontDisplay, fontSize: 24, color: colors.primaryDark, marginTop: -2 },
  stepperValue: { fontFamily: typography.fontMono, fontSize: 24, fontWeight: '800', width: 60, textAlign: 'center' },
  divider: { height: 1, backgroundColor: colors.border2, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  costLabel: { fontFamily: typography.fontBody, fontSize: 16, color: colors.textSecondary },
  costValue: { fontFamily: typography.fontMono, fontSize: 20, fontWeight: '800', color: colors.primary },
  sendButton: { borderRadius: radius.full, padding: 16, alignItems: 'center', ...shadow.card },
  sendButtonText: { fontFamily: typography.fontDisplay, fontSize: 16, fontWeight: '800', color: 'white' }
});
