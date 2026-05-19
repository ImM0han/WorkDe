import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius, shadow } from '../../../src/theme/tokens';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function JobReviewConfirm() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isPosting, setIsPosting] = useState(false);

  const workers = parseInt(params.workers as string) || 1;
  const rateType = params.rateType as string || 'DAILY';
  const baseRate = parseFloat(params.rate as string) || 0;
  const estimatedTotal = baseRate * workers;

  const handlePost = async () => {
    setIsPosting(true);
    try {
      // Mock API call: await axios.post('/jobs', { ...params });
      setTimeout(() => {
        setIsPosting(false);
        router.replace('/(client)/(modals)/job-posted-success');
      }, 1000);
    } catch (e) {
      setIsPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.stepText}>Step 2 of 2</Text>
      </View>

      <Text style={styles.title}>Review & Confirm</Text>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Category</Text>
            <Text style={styles.value}>{params.category}</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{params.date ? new Date(params.date as string).toLocaleDateString() : 'N/A'}</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.row}>
            <Text style={styles.label}>Workers</Text>
            <Text style={styles.value}>{workers}</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.row}>
            <Text style={styles.label}>Rate</Text>
            <Text style={styles.value}>₹{baseRate} / {rateType.toLowerCase()}</Text>
          </View>
          
          <Text style={[styles.label, { marginTop: spacing.md }]}>Description</Text>
          <Text style={styles.descValue}>{params.description}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Estimated Cost</Text>
          <Text style={styles.summaryAmount}>₹{estimatedTotal}{rateType === 'HOURLY' ? '/hr' : ''}</Text>
          <Text style={styles.summarySub}>({workers} workers × ₹{baseRate}/{rateType.toLowerCase()})</Text>
        </View>

        <TouchableOpacity onPress={handlePost} disabled={isPosting}>
          <LinearGradient colors={['#FF6B1A', '#F59E0B']} style={styles.postButton}>
            <Text style={styles.postButtonText}>{isPosting ? 'Posting...' : 'Confirm & Post Job'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md },
  backButton: { fontFamily: typography.fontBody, fontSize: 16, color: colors.primary, fontWeight: '600' },
  stepText: { fontFamily: typography.fontMono, fontSize: 14, color: colors.textSecondary },
  title: { fontFamily: typography.fontDisplay, fontSize: 24, fontWeight: '800', color: colors.textPrimary, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  content: { padding: spacing.md },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: 16, borderWidth: 1, borderColor: colors.border2, ...shadow.card, marginBottom: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  divider: { height: 1, backgroundColor: colors.border2 },
  label: { fontFamily: typography.fontBody, fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  value: { fontFamily: typography.fontBody, fontSize: 15, color: colors.textPrimary, fontWeight: '700' },
  descValue: { fontFamily: typography.fontBody, fontSize: 14, color: colors.textPrimary, marginTop: 4 },
  summaryCard: { backgroundColor: colors.primaryBg, borderRadius: radius.md, padding: 20, alignItems: 'center', marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border },
  summaryTitle: { fontFamily: typography.fontBody, fontSize: 14, color: colors.primaryDark, fontWeight: '600' },
  summaryAmount: { fontFamily: typography.fontMono, fontSize: 32, fontWeight: '800', color: colors.primary, marginVertical: 4 },
  summarySub: { fontFamily: typography.fontBody, fontSize: 13, color: colors.textSecondary },
  postButton: { borderRadius: radius.full, padding: 16, alignItems: 'center', ...shadow.card },
  postButtonText: { fontFamily: typography.fontDisplay, fontSize: 16, fontWeight: '800', color: 'white' }
});
