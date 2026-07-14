import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadow } from '../../../src/theme/tokens';
import api from '../../../src/services/apiClient';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';

export default function PaymentScreen() {
  const router = useRouter();
  const { jobId, rate, transactionId } = useLocalSearchParams<{ jobId: string; rate?: string; transactionId?: string }>();
  const [rating, setRating] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [jobAmount, setJobAmount] = useState(rate || '0.00');
  const [txnId] = useState(transactionId || `TXN-${Math.floor(Math.random() * 1000000000)}`);
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
        console.error('Failed to fetch job rate in PaymentScreen:', err);
      });
    }
  }, [jobId]);

  const handleSave = async () => {
    if (rating === 0) {
      Toast.show({ type: 'error', text1: 'Please provide a rating' });
      return;
    }
    
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('notes', `Rating: ${rating} stars | TXN: ${txnId} | Amount: ₹${jobAmount} | Method: UPI`);
      
      await api.patch(`/jobs/${jobId}/complete`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      Toast.show({ type: 'success', text1: 'Rating Saved!', text2: 'Work has been finalized.' });
      router.replace('/(client)/jobs');
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to save rating' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment & Review</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Completed Payment Transaction Card */}
        <View style={styles.transactionCard}>
          <Text style={styles.transactionHeader}>Completed Payment Transaction</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Transaction ID</Text>
            <Text style={styles.value}>{txnId}</Text>
          </View>
          
          {job?.startedAt && job?.completedAt && (
            <>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.label}>Total Duration</Text>
                <Text style={styles.value}>
                  {job?.billableHours !== undefined && job?.billableHours !== null ? (
                    job.rateType === 'HOURLY' 
                      ? `${job.billableHours} hour(s)`
                      : `${parseFloat((job.billableHours / 8).toFixed(2))} day(s) (based on 8h/day)`
                  ) : (() => {
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
                  })()}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.label}>Base Rate</Text>
                <Text style={styles.value}>₹{job?.rate} / {job?.rateType?.toLowerCase()}</Text>
              </View>
            </>
          )}

          <View style={styles.divider} />
          
          <View style={styles.row}>
            <Text style={styles.label}>Amount Paid</Text>
            <Text style={styles.valueAmount}>₹{jobAmount}</Text>
          </View>
          
          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Payment Method</Text>
            <Text style={styles.value}>UPI</Text>
          </View>
        </View>

        {/* Rate your Worker */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingTitle}>Rate your Worker</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Feather 
                  name="star" 
                  size={40} 
                  color={star <= rating ? '#FFB800' : colors.textMuted} 
                  style={{ marginHorizontal: 8 }}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleSave} disabled={isSaving}>
          <LinearGradient colors={['#FF6B1A', '#F59E0B']} style={styles.saveBtn}>
            {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border2,
    backgroundColor: colors.bgPage
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary
  },
  content: {
    padding: spacing.md,
    paddingBottom: 40
  },
  transactionCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border2,
    ...shadow.card,
    marginTop: spacing.md
  },
  transactionHeader: {
    fontFamily: typography.fontDisplay,
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 16,
    textAlign: 'center'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  label: {
    fontFamily: typography.fontBody,
    fontSize: 15,
    color: colors.textSecondary
  },
  value: {
    fontFamily: typography.fontBody,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary
  },
  valueAmount: {
    fontFamily: typography.fontDisplay,
    fontSize: 20,
    fontWeight: '800',
    color: '#FF6B1A'
  },
  divider: {
    height: 1,
    backgroundColor: colors.border2,
    marginVertical: 8
  },
  ratingSection: {
    marginTop: 40,
    alignItems: 'center'
  },
  ratingTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 20
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center'
  },
  footer: {
    padding: 24,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.border2
  },
  saveBtn: {
    padding: 16,
    borderRadius: radius.full,
    alignItems: 'center'
  },
  saveBtnText: {
    fontFamily: 'Syne-Bold',
    fontSize: 18,
    color: '#fff'
  }
});
