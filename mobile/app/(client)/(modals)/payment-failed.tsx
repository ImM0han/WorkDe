import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, radius } from '../../../src/theme/tokens';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PaymentFailed() {
  const router = useRouter();
  const { error, jobId, rate } = useLocalSearchParams<{ error?: string; jobId?: string; rate?: string }>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.iconCircle}>
        <Text style={styles.crossIcon}>✕</Text>
      </View>

      <Text style={styles.title}>Payment Not Completed</Text>
      <Text style={styles.subtitle}>
        {error || "The payment was not completed. The job remains unsettled until payment is finalized."}
      </Text>

      <TouchableOpacity 
        style={styles.retryBtn} 
        onPress={() => {
          if (jobId) {
            router.replace({ pathname: '/(client)/(modals)/payment-method', params: { jobId, rate } });
          } else {
            router.replace('/(client)/jobs');
          }
        }}
      >
        <Text style={styles.retryText}>Pay Now to Settle Job</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.cancelBtn} 
        onPress={() => {
          if (jobId) {
            router.replace({ pathname: '/(client)/(modals)/job-detail', params: { id: jobId } });
          } else {
            router.replace('/(client)/jobs');
          }
        }}
      >
        <Text style={styles.cancelText}>View Job Details</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage, padding: spacing.xl, justifyContent: 'center' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.dangerLight, borderWidth: 2, borderColor: colors.danger, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.xl },
  crossIcon: { fontSize: 40, color: colors.danger, fontWeight: '800' },
  title: { fontFamily: typography.fontDisplay, fontSize: 28, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { fontFamily: typography.fontBody, fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xxl, paddingHorizontal: 10 },
  retryBtn: { padding: 16, backgroundColor: colors.primary, borderRadius: radius.full, alignItems: 'center', marginBottom: 16 },
  retryText: { fontFamily: typography.fontDisplay, fontSize: 16, fontWeight: '800', color: 'white' },
  cancelBtn: { padding: 16, borderWidth: 1, borderColor: colors.border2, borderRadius: radius.full, alignItems: 'center' },
  cancelText: { fontFamily: typography.fontBody, fontSize: 16, fontWeight: '600', color: colors.textPrimary }
});
