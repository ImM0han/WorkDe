import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadow } from '../../../src/theme/tokens';
import api from '../../../src/services/apiClient';
import Toast from 'react-native-toast-message';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';

export default function JobDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Editable fields
  const [description, setDescription] = useState('');
  const [workers, setWorkers] = useState('');
  const [rate, setRate] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    if (id) {
      fetchJobDetails();
    }
  }, [id]);

  const fetchJobDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/jobs/${id}`);
      setJob(res.data);
      setDescription(res.data.description);
      setWorkers(res.data.workerCount.toString());
      setRate(res.data.rate.toString());
      setDateStr(new Date(res.data.scheduledDate).toISOString().split('T')[0]);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch job details.'
      });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!description.trim()) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Description is required' });
      return;
    }
    const workersNum = parseInt(workers, 10);
    if (isNaN(workersNum) || workersNum <= 0) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter a valid workers count' });
      return;
    }
    const rateNum = parseFloat(rate);
    if (isNaN(rateNum) || rateNum <= 0) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter a valid rate' });
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.patch(`/jobs/${id}`, {
        description,
        workers: workersNum,
        rate: rateNum,
        scheduledDate: new Date(dateStr).toISOString()
      });
      setJob(res.data);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['clientJobs'] });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Job details updated successfully.'
      });
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to update job';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMsg
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Job',
      'Are you sure you want to cancel this job post? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel Job',
          style: 'destructive',
          onPress: performCancel
        }
      ]
    );
  };

  const performCancel = async () => {
    setIsCancelling(true);
    try {
      await api.delete(`/jobs/${id}`);
      queryClient.invalidateQueries({ queryKey: ['clientJobs'] });
      Toast.show({
        type: 'success',
        text1: 'Cancelled',
        text2: 'Job post was successfully cancelled.'
      });
      router.back();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to cancel job';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMsg
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Fetching details...</Text>
      </View>
    );
  }

  const isEditableStatus = ['POSTED', 'ACCEPTED'].includes(job?.status);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{job?.category}</Text>
            </View>
          </View>
          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={[
              styles.statusValue,
              job?.status === 'COMPLETED' ? { color: colors.success } : 
              job?.status === 'CANCELLED' ? { color: colors.danger } : { color: colors.warning }
            ]}>
              {job?.status?.replace('_', ' ')}
            </Text>
          </View>
          <View style={styles.divider} />

          {/* Description field */}
          <View style={styles.fieldBlock}>
            <Text style={styles.blockLabel}>Description</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInputMultiline}
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder="Job description"
              />
            ) : (
              <Text style={styles.descValue}>{job?.description}</Text>
            )}
          </View>
          <View style={styles.divider} />

          {/* Workers field */}
          <View style={styles.rowAlign}>
            <Text style={styles.label}>Workers Required</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInputInline}
                value={workers}
                onChangeText={setWorkers}
                keyboardType="numeric"
                placeholder="Workers count"
              />
            ) : (
              <Text style={styles.valueText}>{job?.workerCount}</Text>
            )}
          </View>
          <View style={styles.divider} />

          {/* Rate field */}
          <View style={styles.rowAlign}>
            <Text style={styles.label}>Rate (₹)</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInputInline}
                value={rate}
                onChangeText={setRate}
                keyboardType="numeric"
                placeholder="Rate"
              />
            ) : (
              <Text style={styles.valueText}>₹{job?.rate} / {job?.rateType?.toLowerCase()}</Text>
            )}
          </View>
          <View style={styles.divider} />

          {/* Date field */}
          <View style={styles.rowAlign}>
            <Text style={styles.label}>Scheduled Date</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInputInline}
                value={dateStr}
                onChangeText={setDateStr}
                placeholder="YYYY-MM-DD"
              />
            ) : (
              <Text style={styles.valueText}>{new Date(job?.scheduledDate).toLocaleDateString()}</Text>
            )}
          </View>
          <View style={styles.divider} />

          <View style={styles.fieldBlock}>
            <Text style={styles.blockLabel}>Work Address</Text>
            <Text style={styles.addressValue}>{job?.address}</Text>
          </View>
        </View>

        {isEditableStatus && (
          <View style={styles.actionSection}>
            {isEditing ? (
              <View style={styles.editActions}>
                <TouchableOpacity 
                  style={styles.cancelEditBtn} 
                  onPress={() => {
                    setIsEditing(false);
                    setDescription(job?.description);
                    setWorkers(job?.workerCount.toString());
                    setRate(job?.rate.toString());
                    setDateStr(new Date(job?.scheduledDate).toISOString().split('T')[0]);
                  }}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelEditText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleUpdate} disabled={isSaving}>
                  <LinearGradient colors={['#FF6B1A', '#F59E0B']} style={styles.saveBtn}>
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.saveBtnText}>Save</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.normalActions}>
                <TouchableOpacity 
                  style={styles.editToggleBtn} 
                  onPress={() => setIsEditing(true)}
                >
                  <Feather name="edit-2" size={16} color={colors.primary} />
                  <Text style={styles.editToggleText}>Edit Details</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.cancelJobBtn} 
                  onPress={handleCancel}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <ActivityIndicator size="small" color={colors.danger} />
                  ) : (
                    <>
                      <Feather name="trash-2" size={16} color={colors.danger} />
                      <Text style={styles.cancelJobText}>Cancel Job Post</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgPage,
  },
  loadingText: {
    marginTop: 10,
    fontFamily: typography.fontBody,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border2,
  },
  closeBtn: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border2,
    ...shadow.card,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowAlign: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  fieldBlock: {
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border2,
  },
  label: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  blockLabel: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  valueText: {
    fontFamily: typography.fontBody,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  descValue: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  addressValue: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  categoryBadge: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  categoryText: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  statusValue: {
    fontFamily: typography.fontMono,
    fontSize: 13,
    fontWeight: '800',
  },
  textInputInline: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: colors.textPrimary,
    width: '50%',
    textAlign: 'right',
    backgroundColor: '#FAFAFA',
  },
  textInputMultiline: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#FAFAFA',
  },
  actionSection: {
    marginTop: spacing.sm,
  },
  normalActions: {
    gap: 12,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 14,
    gap: 8,
  },
  editToggleText: {
    fontFamily: typography.fontBody,
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  cancelJobBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: radius.full,
    paddingVertical: 14,
    gap: 8,
    marginTop: 4,
  },
  cancelJobText: {
    fontFamily: typography.fontBody,
    fontSize: 15,
    fontWeight: '700',
    color: colors.danger,
  },
  cancelEditBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: radius.full,
    paddingVertical: 14,
    backgroundColor: '#FFF',
  },
  cancelEditText: {
    fontFamily: typography.fontBody,
    fontSize: 15,
    fontWeight: '700',
    color: '#4B5563',
  },
  saveBtn: {
    borderRadius: radius.full,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 150,
  },
  saveBtnText: {
    fontFamily: typography.fontDisplay,
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
  }
});
