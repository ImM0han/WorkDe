import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

export default function RejectReasonModal() {
  const { jobId } = useLocalSearchParams();
  const [reason, setReason] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const reasons = [
    'Too far away',
    'Rate is too low',
    'Schedule conflict',
    'Not my expertise',
    'Other'
  ];

  const handleConfirm = () => {
    if (!reason) return;
    // API: POST /jobs/:id/reject { reason }
    
    // Remove the job from the UI cache so it disappears instantly
    queryClient.setQueryData(['nearbyJobs'], (oldData: any[]) => {
      if (!oldData) return [];
      return oldData.filter((job) => job.id !== jobId);
    });

    router.replace('/(partner)');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Why are you declining this job?</Text>
      
      {reasons.map((r, idx) => (
        <TouchableOpacity 
          key={idx} 
          style={[styles.option, reason === r && styles.selectedOption]}
          onPress={() => setReason(r)}
        >
          <View style={[styles.radio, reason === r && styles.selectedRadio]}>
            {reason === r && <View style={styles.radioInner} />}
          </View>
          <Text style={styles.optionText}>{r}</Text>
        </TouchableOpacity>
      ))}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.confirmBtn, !reason && styles.disabledBtn]} 
          disabled={!reason}
          onPress={handleConfirm}
        >
          <Text style={styles.confirmText}>Confirm Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 24 },
  title: { fontFamily: 'Syne-Bold', fontSize: 20, color: '#1C1410', marginBottom: 24 },
  option: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#EEE0CC', marginBottom: 12 },
  selectedOption: { borderColor: '#FF6B1A', backgroundColor: '#FFF0D6' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#C4B5A5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  selectedRadio: { borderColor: '#FF6B1A' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF6B1A' },
  optionText: { fontFamily: 'Nunito-SemiBold', fontSize: 16, color: '#1C1410' },
  footer: { flexDirection: 'row', marginTop: 'auto', gap: 16 },
  cancelBtn: { flex: 1, height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: '#F5E8D5' },
  cancelText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#6B5C4E' },
  confirmBtn: { flex: 1, height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: '#EF4444' },
  disabledBtn: { opacity: 0.5 },
  confirmText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#FFFFFF' }
});
