import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors, typography, spacing, radius, shadow } from '../../../src/theme/tokens';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../../src/services/apiClient';

export default function PaymentMethod() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [method, setMethod] = useState('UPI');
  const [jobAmount, setJobAmount] = useState('0.00');
  const [job, setJob] = useState<any>(null);

  useEffect(() => {
    if (jobId) {
      api.get(`/jobs/${jobId}`).then(res => {
        setJob(res.data);
        if (res.data?.billableAmount !== undefined && res.data?.billableAmount !== null) {
          setJobAmount(Number(res.data.billableAmount).toFixed(2));
        } else if (res.data?.rate) {
          setJobAmount(Number(res.data.rate).toFixed(2));
        }
      }).catch(err => {
        console.error('Failed to fetch job rate in PaymentMethod:', err);
      });
    }
  }, [jobId]);

  const getDurationText = () => {
    if (!job) return 'N/A';
    const hours = job.billableHours;
    if (hours !== undefined && hours !== null) {
      if (job.rateType === 'HOURLY') {
        return `${hours} hour(s)`;
      } else {
        const days = parseFloat((hours / 8).toFixed(2));
        return `${days} day(s) (based on 8h/day)`;
      }
    }
    if (job.startedAt && job.completedAt) {
      const start = new Date(job.startedAt).getTime();
      const end = new Date(job.completedAt).getTime();
      const diffMs = end - start;
      const diffHours = diffMs / (1000 * 60 * 60);
      if (job.rateType === 'HOURLY') {
        return `${Math.max(1, parseFloat(diffHours.toFixed(2)))} hour(s)`;
      } else {
        const diffDays = diffHours / 8;
        return `${Math.max(1, parseFloat(diffDays.toFixed(2)))} day(s) (based on 8h/day)`;
      }
    }
    return 'N/A';
  };

  const methods = ['UPI', 'Credit/Debit Card', 'Net Banking'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Payment Method</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {job && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{job.category} Job Summary</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Base Rate</Text>
              <Text style={styles.summaryValue}>₹{job.rate} / {job.rateType?.toLowerCase()}</Text>
            </View>
            <View style={styles.divider} />
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Duration</Text>
              <Text style={styles.summaryValue}>{getDurationText()}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount to Pay</Text>
              <Text style={styles.summaryValueAmount}>₹{parseFloat(jobAmount).toFixed(2)}</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Select Payment Method</Text>

        {methods.map(m => (
          <TouchableOpacity 
            key={m} 
            style={[styles.methodCard, method === m && styles.methodCardActive]}
            onPress={() => setMethod(m)}
            activeOpacity={0.7}
          >
            <View style={styles.radio}>
              {method === m && <View style={styles.radioInner} />}
            </View>
            <Text style={[styles.methodText, method === m && styles.methodTextActive]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => router.replace({
          pathname: '/(client)/(modals)/payment-processing',
          params: { jobId, rate: jobAmount }
        })}>
          <LinearGradient colors={['#FF6B1A', '#F59E0B']} style={styles.payButton}>
            <Text style={styles.payButtonText}>Pay ₹{parseFloat(jobAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { fontFamily: typography.fontBody, fontSize: 16, color: colors.primary, fontWeight: '600' },
  title: { fontFamily: typography.fontDisplay, fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  content: { padding: spacing.md },
  sectionTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  summaryCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border2,
    ...shadow.card,
  },
  summaryTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  summaryValueAmount: {
    fontFamily: typography.fontDisplay,
    fontSize: 18,
    fontWeight: '800',
    color: colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border2,
    marginVertical: 10,
  },
  methodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, padding: 20, borderRadius: radius.md, marginBottom: 12, borderWidth: 1, borderColor: colors.border2 },
  methodCardActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary, borderLeftWidth: 4 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  methodText: { fontFamily: typography.fontBody, fontSize: 16, color: colors.textPrimary, fontWeight: '600' },
  methodTextActive: { color: colors.primaryDark, fontWeight: '800' },
  footer: { padding: spacing.md, backgroundColor: colors.bgCard, borderTopWidth: 1, borderTopColor: colors.border, ...shadow.card },
  payButton: { borderRadius: radius.full, padding: 16, alignItems: 'center' },
  payButtonText: { fontFamily: typography.fontDisplay, fontSize: 18, fontWeight: '800', color: 'white' }
});
