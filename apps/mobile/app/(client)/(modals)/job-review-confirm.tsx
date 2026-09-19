import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius, shadow } from '../../../src/theme/tokens';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import api, { getApiBaseUrl } from '../../../src/services/apiClient';
import Toast from 'react-native-toast-message';
import { useQueryClient } from '@tanstack/react-query';

export default function JobReviewConfirm() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isPosting, setIsPosting] = useState(false);
  const queryClient = useQueryClient();

  const workers = parseInt(params.workers as string) || 1;
  const rateType = params.rateType as string || 'DAILY';
  const baseRate = parseFloat(params.rate as string) || 0;
  const estimatedTotal = baseRate * workers;

  // Parse the JSON array of image URIs passed from post-job
  const imageUris: string[] = (() => {
    try {
      const raw = params.imageUris as string;
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const handlePost = async () => {
    setIsPosting(true);
    try {
      let resData: any;

      if (imageUris.length > 0) {
        // Send as multipart/form-data via native fetch so React Native handles FormData & boundary natively
        const formData = new FormData();
        formData.append('category', params.category as string);
        formData.append('description', params.description as string);
        formData.append('scheduledDate', params.date as string);
        formData.append('workers', String(parseInt(params.workers as string, 10) || 1));
        formData.append('femaleOnly', String(params.femaleOnly === 'true'));
        formData.append('seasonLabel', (params.seasonLabel as string) || '');
        formData.append('materialsIncluded', String(params.materialsIncluded === 'true'));
        if (params.materialCost) formData.append('materialCost', params.materialCost as string);
        formData.append('rateType', params.rateType as string);
        formData.append('rate', String(parseFloat(params.rate as string) || 0));
        formData.append('lat', params.lat as string);
        formData.append('lng', params.lng as string);
        formData.append('address', params.address as string);
        if (params.contactName) formData.append('contactName', params.contactName as string);
        if (params.contactPhone) formData.append('contactPhone', params.contactPhone as string);

        // Attach all selected photos
        imageUris.forEach((uri) => {
          const filename = uri.split('/').pop() || 'photo.jpg';
          const match = /\.([a-zA-Z]+)$/.exec(filename);
          const mimeType = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';
          formData.append('photos', {
            uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
            name: filename,
            type: mimeType,
          } as any);
        });

        const token = await SecureStore.getItemAsync('auth_token');
        const baseUrl = getApiBaseUrl();

        const response = await fetch(`${baseUrl}/jobs`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            // Do NOT set Content-Type header when passing FormData to fetch in RN.
            // Fetch automatically sets 'multipart/form-data; boundary=...'
          },
          body: formData,
        });

        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(json.error || `Server returned status ${response.status}`);
        }
        resData = json;
      } else {
        // No photo — regular JSON post
        const res = await api.post('/jobs', {
          category: params.category,
          description: params.description,
          scheduledDate: params.date,
          workers: parseInt(params.workers as string, 10) || 1,
          femaleOnly: params.femaleOnly === 'true',
          seasonLabel: params.seasonLabel,
          materialsIncluded: params.materialsIncluded === 'true',
          materialCost: params.materialCost ? parseFloat(params.materialCost as string) : null,
          rateType: params.rateType,
          rate: parseFloat(params.rate as string) || 0,
          lat: parseFloat(params.lat as string),
          lng: parseFloat(params.lng as string),
          address: params.address,
          contactName: params.contactName || undefined,
          contactPhone: params.contactPhone || undefined,
        });
        resData = res.data;
      }

      queryClient.invalidateQueries({ queryKey: ['clientJobs'] });
      setIsPosting(false);

      router.replace({
        pathname: '/(client)/(modals)/job-posted-success',
        params: {
          jobId: resData.id,
          workerCount: resData.workerCount?.toString() || '1',
        },
      });
    } catch (e: any) {
      setIsPosting(false);
      const errorMsg = e.response?.data?.error || e.message || 'Failed to post job';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMsg,
      });
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

          {imageUris.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={[styles.label, { marginTop: spacing.md }]}>Attached Photos ({imageUris.length})</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.reviewPhotosRow}
              >
                {imageUris.map((uri, idx) => (
                  <Image key={idx} source={{ uri }} style={styles.reviewPhotoThumb} resizeMode="cover" />
                ))}
              </ScrollView>
            </>
          )}
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
  photoPreview: { width: '100%', height: 160, borderRadius: radius.sm, marginTop: 8, backgroundColor: colors.border2 },
  reviewPhotosRow: { flexDirection: 'row', gap: 8, paddingTop: 8, paddingBottom: 4 },
  reviewPhotoThumb: { width: 100, height: 80, borderRadius: radius.sm, backgroundColor: colors.border2 },
  summaryCard: { backgroundColor: colors.primaryBg, borderRadius: radius.md, padding: 20, alignItems: 'center', marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border },
  summaryTitle: { fontFamily: typography.fontBody, fontSize: 14, color: colors.primaryDark, fontWeight: '600' },
  summaryAmount: { fontFamily: typography.fontMono, fontSize: 32, fontWeight: '800', color: colors.primary, marginVertical: 4 },
  summarySub: { fontFamily: typography.fontBody, fontSize: 13, color: colors.textSecondary },
  postButton: { borderRadius: radius.full, padding: 16, alignItems: 'center', ...shadow.card },
  postButtonText: { fontFamily: typography.fontDisplay, fontSize: 16, fontWeight: '800', color: 'white' }
});
