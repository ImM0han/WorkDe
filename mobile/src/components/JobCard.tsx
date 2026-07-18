import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, shadow, typography, skillBadgeColors, gradients } from '../theme/tokens';

export interface Job {
  id: string;
  category: string;
  address: string;
  rate: number;
  rateType: string;
  distance?: number;
  description: string;
  workerCount?: number;
  acceptedCount?: number;
  femaleOnly?: boolean;
  seasonLabel?: string;
  materialsIncluded?: boolean;
  materialCost?: number;
  status?: string;
  startedAt?: string;
  completedAt?: string;
  billableHours?: number;
  billableAmount?: number;
  payment?: {
    id: string;
    amount: number;
    status: string;
  };
}

interface JobCardProps {
  job: Job;
  onAccept?: () => void;
  showAcceptButton?: boolean;
  variant?: 'new' | 'active';
  userRole?: 'CLIENT' | 'PARTNER';
  onStart?: () => void;
}

const JobCard = ({ 
  job, 
  onAccept, 
  showAcceptButton = true, 
  variant = 'new', 
  userRole = 'PARTNER', 
  onStart
}: JobCardProps) => {

  const workerCount = job.workerCount || 1;
  const acceptedCount = job.acceptedCount || 0;
  const isGroup = workerCount > 1;
  const spotsLeft = workerCount - acceptedCount;

  const baseRate = job.rate || 0;
  let priceDisplay = `₹${baseRate}/${job.rateType === 'DAILY' ? 'day' : 'hr'}`;
  
  if (isGroup) {
    priceDisplay = `₹${baseRate * workerCount} for ${workerCount} workers`;
  } else if (job.materialsIncluded && job.materialCost) {
    priceDisplay = `₹${baseRate + job.materialCost} incl. materials`;
  }

  const acceptText = isGroup ? `Join (${spotsLeft} left)` : 'Accept';
  const badgeStyle = skillBadgeColors[job.category] || { bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB' };

  const isDone = ['COMPLETED', 'COMPLETED_PENDING_PAYMENT'].includes(job.status || '') || job.payment?.status === 'COMPLETED';

  const getDurationText = () => {
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
    return null;
  };

  const totalAmount = job.billableAmount !== undefined && job.billableAmount !== null ? job.billableAmount : (job.payment?.amount !== undefined && job.payment?.amount !== null ? job.payment.amount : null);

  return (
    <View style={styles.card}>
      {/* Tap target for job details - covers all top text info */}
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => {
          if (userRole === 'CLIENT') {
            router.push({
              pathname: '/(client)/(modals)/job-detail',
              params: { id: job.id }
            });
          } else if (['IN_PROGRESS', 'EXTENDED'].includes(job.status || '')) {
            router.push(`/(partner)/(modals)/job-in-progress?jobId=${job.id}`);
          } else {
            router.push(`/(partner)/(modals)/job-detail?jobId=${job.id}${job.distance !== undefined ? `&distance=${job.distance}` : ''}`);
          }
        }}
      >
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border, borderWidth: 1 }]}>
            <Text style={[styles.badgeText, { color: badgeStyle.text }]}>{job.category}</Text>
          </View>
          <Text style={styles.price}>{priceDisplay}</Text>
        </View>

        {/* Badges Row */}
        <View style={styles.badgesRow}>
          {isGroup && (
            <View style={styles.groupBadge}>
              <Text style={styles.groupBadgeText}>👥 {spotsLeft} spot(s) left of {workerCount}</Text>
            </View>
          )}
          {job.femaleOnly && (
            <View style={styles.femaleBadge}>
              <Text style={styles.femaleBadgeText}>♀ Female only</Text>
            </View>
          )}
          {job.seasonLabel && job.seasonLabel !== 'Year-round' && (
            <View style={styles.seasonBadge}>
              <Text style={styles.seasonBadgeText}>🌾 {job.seasonLabel}</Text>
            </View>
          )}
          {job.materialsIncluded && (
            <View style={styles.materialsBadge}>
              <Text style={styles.materialsBadgeText}>📦 Materials incl.</Text>
            </View>
          )}
        </View>

        <Text style={styles.title} numberOfLines={1}>{job.description.split('.')[0]}</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📍</Text>
          <Text style={styles.infoText}>{job.distance?.toFixed(1) || '1.0'} km away</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.infoIcon}>📅</Text>
          <Text style={styles.infoText}>
            {job.category === 'Plumber' ? 'Tomorrow' : job.category === 'Electrician' ? 'Friday' : 'Monday'}
          </Text>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {job.description.substring(job.description.indexOf('.') + 1).trim() || job.description}
        </Text>

        {isDone && (
          <View style={styles.doneSummaryContainer}>
            <View style={styles.doneRow}>
              <View style={styles.doneIconLabel}>
                <Text style={styles.doneIcon}>⏱️</Text>
                <Text style={styles.doneLabel}>Total Duration</Text>
              </View>
              <Text style={styles.doneValue}>{getDurationText() || 'N/A'}</Text>
            </View>
            <View style={styles.doneRow}>
              <View style={styles.doneIconLabel}>
                <Text style={styles.doneIcon}>💰</Text>
                <Text style={styles.doneLabel}>Total Amount</Text>
              </View>
              <Text style={styles.doneValueAmount}>
                ₹{totalAmount !== undefined && totalAmount !== null ? Number(totalAmount).toFixed(2) : 'N/A'}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>


      
      {/* Actions Row - Outside details TouchableOpacity to prevent bubbling */}
      {showAcceptButton && variant === 'new' && (
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.acceptButtonWrapper} 
            activeOpacity={0.8}
            onPress={onAccept}
          >
            <LinearGradient colors={gradients.button as any} style={styles.acceptButton}>
              <Text style={styles.acceptButtonText}>{acceptText}</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.rejectButton} 
            activeOpacity={0.8}
            onPress={() => {
              router.push(`/(partner)/(modals)/reject-reason?jobId=${job.id}`);
            }}
          >
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {showAcceptButton && variant === 'active' && (
        <View>
          {job.status === 'START_REQUESTED' ? (
            <View style={styles.buttonRow}>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>Awaiting Start Approval</Text>
              </View>
            </View>
          ) : ['ACCEPTED', 'POSTED'].includes(job.status || '') ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.startJobButton} 
                activeOpacity={0.8}
                onPress={onStart}
              >
                <LinearGradient colors={gradients.button as any} style={styles.startJobGradientButton}>
                  <Text style={styles.startJobButtonText}>Start Job</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : job.status === 'COMPLETED_PENDING_PAYMENT' ? (
            <View style={styles.buttonRow}>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>Awaiting Client Payment</Text>
              </View>
            </View>
          ) : (
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.inProgressBadge}
                activeOpacity={0.8}
                onPress={() => {
                  router.push(`/(partner)/(modals)/job-in-progress?jobId=${job.id}`);
                }}
              >
                <Text style={styles.inProgressText}>Job in Progress →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default React.memo(JobCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border2,
    ...shadow.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeText: {
    fontFamily: typography.fontBody + '-Bold',
    fontSize: 12,
  },
  price: {
    fontFamily: typography.fontBody + '-Bold',
    fontSize: 15,
    color: colors.success,
  },
  title: {
    fontFamily: typography.fontDisplay + '-Bold',
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 8
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  infoIcon: {
    fontSize: 12,
    marginRight: 4
  },
  infoText: {
    fontFamily: typography.fontBody + '-SemiBold',
    fontSize: 13,
    color: colors.textSecondary,
  },
  dot: {
    marginHorizontal: 6,
    color: colors.textMuted,
    fontSize: 14
  },
  description: {
    fontFamily: typography.fontBody + '-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8
  },
  groupBadge: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full
  },
  groupBadgeText: {
    color: '#3730A3',
    fontFamily: typography.fontBody + '-Bold',
    fontSize: 11
  },
  femaleBadge: {
    backgroundColor: '#FFF0F7',
    borderColor: '#FDB5D9',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full
  },
  femaleBadgeText: {
    color: '#9B2C6A',
    fontFamily: typography.fontBody + '-Bold',
    fontSize: 11
  },
  seasonBadge: {
    backgroundColor: '#F0FBEB',
    borderColor: '#BBF7A3',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full
  },
  seasonBadgeText: {
    color: '#2D6A1A',
    fontFamily: typography.fontBody + '-Bold',
    fontSize: 11
  },
  materialsBadge: {
    backgroundColor: '#FFF5EB',
    borderColor: '#FDD0A2',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full
  },
  materialsBadgeText: {
    color: '#C05621',
    fontFamily: typography.fontBody + '-Bold',
    fontSize: 11
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12
  },
  acceptButtonWrapper: {
    flex: 1,
    height: 40,
  },
  acceptButton: {
    width: '100%',
    height: '100%',
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center'
  },
  acceptButtonText: {
    fontFamily: typography.fontBody + '-Bold',
    fontSize: 15,
    color: '#FFFFFF'
  },
  rejectButton: {
    flex: 1,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center'
  },
  rejectButtonText: {
    fontFamily: typography.fontBody + '-Bold',
    fontSize: 15,
    color: colors.danger,
  },
  completeButton: {
    flex: 1,
    height: 40,
    backgroundColor: colors.success,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center'
  },
  completeButtonText: {
    fontFamily: typography.fontBody + '-Bold',
    fontSize: 15,
    color: '#FFFFFF'
  },
  extendButton: {
    flex: 1,
    height: 40,
    backgroundColor: colors.bgPage,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center'
  },
  extendButtonText: {
    fontFamily: typography.fontBody + '-Bold',
    fontSize: 15,
    color: colors.textSecondary,
  },
  extendContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  extendLabel: {
    fontFamily: typography.fontBody + '-SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  extendInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.bgPage,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  extendInput: {
    width: 48,
    height: 36,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    textAlign: 'center',
    fontFamily: typography.fontBody + '-Bold',
    fontSize: 16,
    color: colors.textPrimary,
  },
  extendSubmitBtn: {
    flex: 1,
    height: 36,
    backgroundColor: colors.success,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  extendSubmitText: {
    fontFamily: typography.fontBody + '-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  extensionBanner: {
    flexDirection: 'row',
    backgroundColor: colors.warningLight,
    padding: 12,
    borderRadius: radius.sm,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  extensionText: {
    fontFamily: typography.fontBody + '-SemiBold',
    fontSize: 14,
    color: colors.textSecondary,
  },
  extensionActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  extensionDeclineBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  extensionDeclineText: {
    fontFamily: typography.fontBody + '-Bold',
    fontSize: 13,
    color: colors.textSecondary,
  },
  extensionAcceptBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.success,
    borderRadius: radius.sm,
  },
  extensionAcceptText: {
    fontFamily: typography.fontBody + '-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  startJobButton: {
    flex: 1,
    height: 40,
  },
  startJobGradientButton: {
    width: '100%',
    height: '100%',
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center'
  },
  startJobButtonText: {
    fontFamily: typography.fontBody + '-Bold',
    fontSize: 15,
    color: '#FFFFFF'
  },
  inProgressBadge: {
    flex: 1,
    height: 40,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center'
  },
  inProgressText: {
    fontFamily: typography.fontBody + '-Bold',
    fontSize: 15,
    color: '#D97706'
  },
  pendingBadge: {
    flex: 1,
    height: 40,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center'
  },
  pendingText: {
    fontFamily: typography.fontBody + '-Bold',
    fontSize: 14,
    color: '#D97706'
  },
  doneSummaryContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border2,
    gap: 8,
  },
  doneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  doneIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  doneIcon: {
    fontSize: 14,
  },
  doneLabel: {
    fontFamily: typography.fontBody + '-SemiBold',
    fontSize: 13,
    color: colors.textSecondary,
  },
  doneValue: {
    fontFamily: typography.fontBody + '-Bold',
    fontSize: 13,
    color: colors.textPrimary,
  },
  doneValueAmount: {
    fontFamily: typography.fontBody + '-Bold',
    fontSize: 14,
    color: colors.success,
  }
});
