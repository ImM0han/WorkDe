import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

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
  extensionRequest?: {
    requestedBy: 'CLIENT' | 'PARTNER';
    amount: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  };
}

interface JobCardProps {
  job: Job;
  onAccept?: () => void;
  showAcceptButton?: boolean;
  variant?: 'new' | 'active';
  userRole?: 'CLIENT' | 'PARTNER';
  onExtendRequest?: (amount: string) => void;
  onAcceptExtension?: () => void;
  onDeclineExtension?: () => void;
}

const JobCard = ({ job, onAccept, showAcceptButton = true, variant = 'new', userRole = 'PARTNER', onExtendRequest, onAcceptExtension, onDeclineExtension }: JobCardProps) => {
  const [showExtendInput, setShowExtendInput] = useState(false);
  const [extendAmount, setExtendAmount] = useState('1');

  const handleExtendSubmit = () => {
    if (onExtendRequest) {
      onExtendRequest(extendAmount);
    } else {
      alert(`Extension request sent for ${extendAmount} ${job.rateType === 'DAILY' ? 'Days' : 'Hours'}`);
    }
    setShowExtendInput(false);
  };

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

  const acceptText = isGroup ? `Join (${spotsLeft} left)` : 'View Job';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{job.category}</Text>
        </View>
        <Text style={styles.price}>{priceDisplay}</Text>
      </View>

      {/* Badges Row */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {isGroup && (
          <View style={{ backgroundColor: '#EEF2FF', borderColor: '#C7D2FE', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
            <Text style={{ color: '#3730A3', fontFamily: 'Nunito-Bold', fontSize: 11 }}>👥 {spotsLeft} spot(s) left of {workerCount}</Text>
          </View>
        )}
        {job.femaleOnly && (
          <View style={{ backgroundColor: '#FFF0F7', borderColor: '#FDB5D9', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
            <Text style={{ color: '#9B2C6A', fontFamily: 'Nunito-Bold', fontSize: 11 }}>♀ Female only</Text>
          </View>
        )}
        {job.seasonLabel && job.seasonLabel !== 'Year-round' && (
          <View style={{ backgroundColor: '#F0FBEB', borderColor: '#BBF7A3', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
            <Text style={{ color: '#2D6A1A', fontFamily: 'Nunito-Bold', fontSize: 11 }}>🌾 {job.seasonLabel}</Text>
          </View>
        )}
        {job.materialsIncluded && (
          <View style={{ backgroundColor: '#FFF5EB', borderColor: '#FDD0A2', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
            <Text style={{ color: '#C05621', fontFamily: 'Nunito-Bold', fontSize: 11 }}>📦 Materials incl.</Text>
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
        {job.description.substring(job.description.indexOf('.') + 1).trim()}
      </Text>

      {/* Extension Request Banner */}
      {job.extensionRequest && job.extensionRequest.status === 'PENDING' && (
        <View style={styles.extensionBanner}>
          <Feather name="clock" size={16} color="#B45309" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            {job.extensionRequest.requestedBy === userRole ? (
              <Text style={styles.extensionText}>
                Pending client approval for +{job.extensionRequest.amount} {job.rateType === 'DAILY' ? 'Days' : 'Hours'}.
              </Text>
            ) : (
              <View>
                <Text style={styles.extensionText}>
                  Client requested to extend for +{job.extensionRequest.amount} {job.rateType === 'DAILY' ? 'Days' : 'Hours'}.
                </Text>
                <View style={styles.extensionActionRow}>
                  <TouchableOpacity style={styles.extensionDeclineBtn} onPress={onDeclineExtension}>
                    <Text style={styles.extensionDeclineText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.extensionAcceptBtn} onPress={onAcceptExtension}>
                    <Text style={styles.extensionAcceptText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      )}
      
      {showAcceptButton && variant === 'new' && (
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.acceptButton} 
            activeOpacity={0.8}
            onPress={() => {
              if (onAccept) onAccept();
              else router.push(`/(partner)/(modals)/job-detail?jobId=${job.id}`);
            }}
          >
            <Text style={styles.acceptButtonText}>{acceptText}</Text>
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
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.completeButton} 
              activeOpacity={0.8}
              onPress={() => {
                router.push(`/(partner)/(modals)/job-completion?jobId=${job.id}`);
              }}
            >
              <Text style={styles.completeButtonText}>Completed</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.extendButton} 
              activeOpacity={0.8}
              onPress={() => setShowExtendInput(!showExtendInput)}
            >
              <Text style={styles.extendButtonText}>{showExtendInput ? 'Cancel' : 'Extend'}</Text>
            </TouchableOpacity>
          </View>

          {showExtendInput && (
            <View style={styles.extendContainer}>
              <Text style={styles.extendLabel}>
                Request extra {job.rateType === 'DAILY' ? 'days' : 'hours'}:
              </Text>
              <View style={styles.extendInputRow}>
                <TouchableOpacity 
                  style={styles.counterBtn} 
                  onPress={() => setExtendAmount(prev => Math.max(1, parseInt(prev || '1') - 1).toString())}
                >
                  <Feather name="minus" size={20} color="#6B7280" />
                </TouchableOpacity>
                <TextInput
                  style={styles.extendInput}
                  value={extendAmount}
                  onChangeText={setExtendAmount}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <TouchableOpacity 
                  style={styles.counterBtn} 
                  onPress={() => setExtendAmount(prev => (parseInt(prev || '0') + 1).toString())}
                >
                  <Feather name="plus" size={20} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.extendSubmitBtn} onPress={handleExtendSubmit}>
                  <Text style={styles.extendSubmitText}>Request</Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  badge: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
    color: '#1D4ED8',
  },
  price: {
    fontFamily: 'Nunito-Bold',
    fontSize: 15,
    color: '#16A34A'
  },
  title: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: '#111827',
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
    fontFamily: 'Nunito-SemiBold',
    fontSize: 13,
    color: '#6B7280',
  },
  dot: {
    marginHorizontal: 6,
    color: '#9CA3AF',
    fontSize: 14
  },
  description: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12
  },
  acceptButton: {
    flex: 1,
    height: 40,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  acceptButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 15,
    color: '#FFFFFF'
  },
  rejectButton: {
    flex: 1,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  rejectButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 15,
    color: '#DC2626'
  },
  completeButton: {
    flex: 1,
    height: 40,
    backgroundColor: '#0EA5E9', // Sky Blue for complete
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  completeButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 15,
    color: '#FFFFFF'
  },
  extendButton: {
    flex: 1,
    height: 40,
    backgroundColor: '#F3F4F6', // Gray for extend
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  extendButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 15,
    color: '#4B5563'
  },
  extendContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  extendLabel: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    color: '#374151',
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
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  extendInput: {
    width: 48,
    height: 36,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    textAlign: 'center',
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: '#111827',
  },
  extendSubmitBtn: {
    flex: 1,
    height: 36,
    backgroundColor: '#16A34A',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  extendSubmitText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  extensionBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  extensionText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    color: '#92400E',
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
    borderColor: '#D1D5DB',
    borderRadius: 6,
  },
  extensionDeclineText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 13,
    color: '#374151',
  },
  extensionAcceptBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#16A34A',
    borderRadius: 6,
  },
  extensionAcceptText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  }
});
