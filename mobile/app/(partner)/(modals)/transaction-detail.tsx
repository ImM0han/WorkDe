import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useQuery } from '@tanstack/react-query';
import api from '../../../src/services/apiClient';

export default function TransactionDetailModal() {
  const { txnId } = useLocalSearchParams();

  const { data: txn, isLoading, error } = useQuery({
    queryKey: ['transactionDetail', txnId],
    queryFn: () => api.get(`/wallet/transactions/${txnId}`).then(r => r.data),
    enabled: !!txnId
  });

  const copyToClipboard = async () => {
    if (txn?.id) {
      await Clipboard.setStringAsync(txn.id);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FF6B1A" />
      </View>
    );
  }

  if (error || !txn) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontFamily: 'Nunito-Bold', fontSize: 16, color: '#EF4444', marginBottom: 20 }}>
          Failed to load transaction details.
        </Text>
        <TouchableOpacity style={[styles.closeBtn, { width: '80%', marginTop: 0 }]} onPress={() => router.back()}>
          <Text style={styles.closeText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transaction Details</Text>

      <View style={styles.card}>
        <View style={[styles.iconWrapper, { backgroundColor: txn.type === 'CREDIT' ? '#DCFCE7' : '#FEE2E2' }]}>
          <Text style={styles.icon}>{txn.type === 'CREDIT' ? '↓' : '↑'}</Text>
        </View>
        <Text style={[styles.amount, { color: txn.type === 'CREDIT' ? '#166534' : '#1C1410' }]}>
          {txn.type === 'CREDIT' ? '+' : '-'}₹{Math.abs(txn.amount)}
        </Text>
        <Text style={[styles.status, { 
          color: txn.status === 'COMPLETED' ? '#22C55E' : '#EF4444',
          backgroundColor: txn.status === 'COMPLETED' ? '#DCFCE7' : '#FEE2E2'
        }]}>
          {txn.status}
        </Text>
      </View>

      <View style={styles.detailsBox}>
        <View style={styles.row}>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.value}>{txn.title}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{txn.date || new Date(txn.createdAt).toLocaleString()}</Text>
        </View>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.row} onLongPress={copyToClipboard} onPress={copyToClipboard}>
          <Text style={styles.label}>Transaction ID</Text>
          <Text style={[styles.value, styles.mono]}>{txn.id} 📋</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Text style={styles.closeText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE', padding: 24 },
  title: { fontFamily: 'Syne-ExtraBold', fontSize: 24, color: '#1C1410', marginBottom: 32 },
  card: { alignItems: 'center', marginBottom: 32 },
  iconWrapper: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  icon: { fontSize: 32 },
  amount: { fontFamily: 'DMMono-Medium', fontSize: 40, fontWeight: '800', marginBottom: 8 },
  status: { fontFamily: 'Nunito-Bold', fontSize: 14, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  detailsBox: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#EEE0CC' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  divider: { height: 1, backgroundColor: '#EEE0CC', marginVertical: 16 },
  label: { fontFamily: 'Nunito-SemiBold', fontSize: 14, color: '#6B5C4E', flex: 1 },
  value: { fontFamily: 'Syne-Bold', fontSize: 14, color: '#1C1410', flex: 2, textAlign: 'right' },
  mono: { fontFamily: 'DMMono-Regular', color: '#FF6B1A' },
  closeBtn: { height: 56, backgroundColor: '#F5E8D5', justifyContent: 'center', alignItems: 'center', borderRadius: 14, marginTop: 'auto' },
  closeText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#6B5C4E' }
});
