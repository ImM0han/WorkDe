import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, typography, spacing, radius } from '../../../src/theme/tokens';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../../src/services/apiClient';
import Toast from 'react-native-toast-message';

export default function EndWorkConfirm() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (jobId) {
        await api.post(`/jobs/${jobId}/finalize-work`);
      }
      router.replace({
        pathname: '/(client)/(modals)/payment-processing',
        params: { jobId }
      });
    } catch (err: any) {
      console.error('Error finalizing work:', err);
      Toast.show({ type: 'error', text1: 'Failed to complete work', text2: err.response?.data?.error || err.message });
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>End Work?</Text>
      <Text style={styles.subtitle}>Are you sure you want to end work? This will generate the final invoice and proceed directly to payment.</Text>

      <View style={styles.buttonsRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} disabled={loading}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmText}>Yes, End Work</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage, padding: spacing.xl, justifyContent: 'center' },
  title: { fontFamily: typography.fontDisplay, fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.sm, textAlign: 'center' },
  subtitle: { fontFamily: typography.fontBody, fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xxl },
  buttonsRow: { flexDirection: 'row', gap: 16 },
  cancelBtn: { flex: 1, padding: 16, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border2, alignItems: 'center' },
  cancelText: { fontFamily: typography.fontBody, fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  confirmBtn: { flex: 1, padding: 16, borderRadius: radius.full, backgroundColor: colors.danger, alignItems: 'center' },
  confirmText: { fontFamily: typography.fontBody, fontSize: 16, fontWeight: '700', color: 'white' }
});
