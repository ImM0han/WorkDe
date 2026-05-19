import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

export default function TransactionDetailModal() {
  const { txnId } = useLocalSearchParams();

  // Mock
  const txn = {
    id: txnId as string,
    amount: 800,
    type: 'CREDIT',
    title: 'Payment for Job #1234',
    date: 'Oct 24, 2023, 14:30 PM',
    status: 'COMPLETED'
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(txn.id);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transaction Details</Text>

      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <Text style={styles.icon}>{txn.type === 'CREDIT' ? '↓' : '↑'}</Text>
        </View>
        <Text style={[styles.amount, { color: txn.type === 'CREDIT' ? '#166534' : '#1C1410' }]}>
          {txn.type === 'CREDIT' ? '+' : '-'}₹{Math.abs(txn.amount)}
        </Text>
        <Text style={styles.status}>{txn.status}</Text>
      </View>

      <View style={styles.detailsBox}>
        <View style={styles.row}>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.value}>{txn.title}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{txn.date}</Text>
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
  iconWrapper: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  icon: { fontSize: 32 },
  amount: { fontFamily: 'DMMono-Medium', fontSize: 40, fontWeight: '800', marginBottom: 8 },
  status: { fontFamily: 'Nunito-Bold', fontSize: 14, color: '#22C55E', backgroundColor: '#DCFCE7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  detailsBox: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#EEE0CC' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  divider: { height: 1, backgroundColor: '#EEE0CC', marginVertical: 16 },
  label: { fontFamily: 'Nunito-SemiBold', fontSize: 14, color: '#6B5C4E', flex: 1 },
  value: { fontFamily: 'Syne-Bold', fontSize: 14, color: '#1C1410', flex: 2, textAlign: 'right' },
  mono: { fontFamily: 'DMMono-Regular', color: '#FF6B1A' },
  closeBtn: { height: 56, backgroundColor: '#F5E8D5', justifyContent: 'center', alignItems: 'center', borderRadius: 14, marginTop: 'auto' },
  closeText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#6B5C4E' }
});
