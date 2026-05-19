import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../src/services/apiClient';
import { useSocketStore } from '../../../src/stores/socketStore';
import { useAuthStore } from '../../../src/stores/authStore';
import { useTranslation } from 'react-i18next';

export default function WalletScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { socket } = useSocketStore();
  const { user } = useAuthStore();

  const { data: partnerData } = useQuery({
    queryKey: ['partnerProfile', user?.partnerId],
    queryFn: () => api.get(`/partner/${user?.partnerId}`).then(r => r.data),
    enabled: !!user?.partnerId
  });

  const { data: txns } = useQuery({
    queryKey: ['transactions', user?.partnerId],
    queryFn: () => api.get('/wallet/transactions').then(r => r.data).catch(() => [])
  });

  useEffect(() => {
    socket?.on('payment:received', (data) => {
      queryClient.invalidateQueries({ queryKey: ['partnerProfile', user?.partnerId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.partnerId] });
    });
    return () => { socket?.off('payment:received'); };
  }, [socket, user?.partnerId, queryClient]);

  const transactions = txns || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('wallet.earnings') || 'Earnings & Wallet'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient colors={['#1A0C02', '#CC4A00', '#FF6B1A', '#FF8C42']} style={styles.walletCard}>
          <Text style={styles.balanceLabel}>{t('wallet.availableBalance') || 'Available Balance'}</Text>
          <Text style={styles.balanceAmount}>₹{partnerData?.walletBalance?.toFixed(2) || '0.00'}</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(partner)/(modals)/withdraw')}>
              <Text style={styles.actionText}>{t('wallet.withdrawFunds') || 'Withdraw Funds'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, {backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'}]} onPress={() => router.push('/(partner)/(modals)/add-bank')}>
              <Text style={styles.actionText}>{t('wallet.addBank') || 'Add Bank'}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <Text style={styles.sectionTitle}>{t('wallet.recentTransactions') || 'Recent Transactions'}</Text>
        
        {transactions.length === 0 ? (
          <Text style={{ fontFamily: 'Nunito-SemiBold', fontSize: 14, color: '#6B5C4E', textAlign: 'center', marginTop: 20 }}>
            {t('wallet.noTransactions') || 'No transactions yet.'}
          </Text>
        ) : (
          transactions.map((txn: any) => (
          <TouchableOpacity 
            key={txn.id} 
            style={styles.txnRow}
            onPress={() => router.push(`/(partner)/(modals)/transaction-detail?txnId=${txn.id}`)}
          >
            <View style={styles.txnLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: txn.type === 'CREDIT' ? '#DCFCE7' : '#FEE2E2' }]}>
                <Text style={styles.icon}>{txn.type === 'CREDIT' ? '↓' : '↑'}</Text>
              </View>
              <View>
                <Text style={styles.txnTitle}>{txn.title}</Text>
                <Text style={styles.txnDate}>{txn.date || new Date(txn.createdAt).toLocaleDateString()}</Text>
              </View>
            </View>
            <Text style={[styles.txnAmount, { color: txn.type === 'CREDIT' ? '#166534' : '#1C1410' }]}>
              {txn.type === 'CREDIT' ? '+' : '-'}₹{Math.abs(txn.amount || txn.netAmount)}
            </Text>
          </TouchableOpacity>
        )))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE' },
  header: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 24, backgroundColor: '#FFF0D6', borderBottomWidth: 1, borderBottomColor: '#EEE0CC' },
  headerTitle: { fontFamily: 'Syne-ExtraBold', fontSize: 26, color: '#1C1410' },
  content: { padding: 24 },
  walletCard: { borderRadius: 20, padding: 24, marginBottom: 32 },
  balanceLabel: { fontFamily: 'Nunito-SemiBold', fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  balanceAmount: { fontFamily: 'DMMono-Medium', fontSize: 34, fontWeight: '800', color: '#FFFFFF', marginBottom: 24 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  actionText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: '#FFFFFF' },
  sectionTitle: { fontFamily: 'Syne-Bold', fontSize: 18, color: '#1C1410', marginBottom: 16 },
  txnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#EEE0CC' },
  txnLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrapper: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 18 },
  txnTitle: { fontFamily: 'Nunito-Bold', fontSize: 14, color: '#1C1410' },
  txnDate: { fontFamily: 'DMMono-Regular', fontSize: 12, color: '#C4B5A5', marginTop: 2 },
  txnAmount: { fontFamily: 'DMMono-Medium', fontSize: 16, fontWeight: '800' }
});
