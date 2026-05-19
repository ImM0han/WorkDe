import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../../src/stores/authStore';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../../../src/services/apiClient';

export default function WithdrawModal() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [isBankModalVisible, setBankModalVisible] = useState(false);
  
  const partnerIdToUse = user?.partnerId || (user as any)?.partner?.id;
  
  const { data: partnerData, refetch } = useQuery({
    queryKey: ['partnerProfile', partnerIdToUse],
    queryFn: () => api.get(`/partner/${partnerIdToUse}`).then(r => r.data),
    enabled: !!partnerIdToUse
  });

  useFocusEffect(
    useCallback(() => {
      if (partnerIdToUse) {
        refetch();
      }
    }, [partnerIdToUse, refetch])
  );

  const maxAmount = partnerData?.walletBalance || 0;
  const isAadhaarVerified = user?.aadhaarStatus === 'VERIFIED';
  
  const banks = partnerData?.bankAccounts || [];
  const defaultBank = banks.find((b: any) => b.isDefault) || banks[0];
  const selectedBank = banks.find((b: any) => b.id === selectedBankId) || defaultBank;
  const hasBankDetails = !!selectedBank;

  const handleWithdraw = async () => {
    try {
      await api.post('/wallet/withdraw', { amount: Number(amount), bankId: selectedBank?.id });
      router.back();
    } catch (error) {
      console.error('Withdrawal failed', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('wallet.withdrawFunds') || 'Withdraw Funds'}</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.currencySymbol}>₹</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor="#C4B5A5"
          value={amount}
          onChangeText={setAmount}
        />
      </View>

      <Text style={styles.helperText}>{t('wallet.available') || 'Available:'} ₹{maxAmount.toFixed(2)}</Text>

      {hasBankDetails ? (
        <View style={styles.bankCard}>
          <View style={styles.bankLeft}>
            <Text style={styles.bankIcon}>🏦</Text>
            <View>
              <Text style={styles.bankName}>{selectedBank?.holderName || 'Saved Bank'}</Text>
              <Text style={styles.bankAcc}>**** {selectedBank?.accountNumber?.slice(-4) || 'XXXX'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setBankModalVisible(true)}>
            <Text style={styles.changeText}>{t('wallet.changeBank') || 'Change'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.bankCard}>
          <View style={styles.bankLeft}>
            <Text style={styles.bankIcon}>🏦</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.bankName}>{t('wallet.noBankAdded') || 'No bank account added'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push('/(partner)/(modals)/add-bank')}>
            <Text style={styles.changeText}>{t('wallet.addBank') || 'Add'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isAadhaarVerified && (
        <Text style={{ fontFamily: 'Nunito-SemiBold', fontSize: 14, color: '#EF4444', textAlign: 'center', marginBottom: 20 }}>
          {t('wallet.aadhaarRequired') || 'Aadhaar KYC verification is required to withdraw funds.'}
        </Text>
      )}

      <TouchableOpacity 
        style={styles.submitBtnWrapper} 
        disabled={!amount || Number(amount) <= 0 || Number(amount) > maxAmount || !isAadhaarVerified || !hasBankDetails}
        onPress={handleWithdraw}
      >
        <LinearGradient 
          colors={(!amount || Number(amount) <= 0 || Number(amount) > maxAmount || !isAadhaarVerified || !hasBankDetails) ? ['#C4B5A5', '#C4B5A5'] : ['#FF6B1A', '#F59E0B']} 
          style={styles.submitBtn}
        >
          <Text style={styles.submitText}>{t('wallet.withdraw') || 'Withdraw'}</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={isBankModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setBankModalVisible(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Select Bank Account</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {banks.map((bank: any) => (
                <TouchableOpacity 
                  key={bank.id} 
                  style={[styles.bankOption, selectedBank?.id === bank.id && styles.selectedBankOption]}
                  onPress={() => {
                    setSelectedBankId(bank.id);
                    setBankModalVisible(false);
                  }}
                >
                  <View style={styles.bankLeft}>
                    <Text style={styles.bankIcon}>🏦</Text>
                    <View>
                      <Text style={styles.bankName}>{bank.holderName}</Text>
                      <Text style={styles.bankAcc}>**** {bank.accountNumber?.slice(-4)}</Text>
                    </View>
                  </View>
                  {selectedBank?.id === bank.id && <Text style={{ fontSize: 20 }}>✅</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.addBankBtn}
              onPress={() => {
                setBankModalVisible(false);
                router.push('/(partner)/(modals)/add-bank');
              }}
            >
              <Text style={styles.addBankBtnText}>+ Add New Account</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE', padding: 24, paddingTop: 60 },
  title: { fontFamily: 'Syne-ExtraBold', fontSize: 24, color: '#1C1410', marginBottom: 32 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginBottom: 12 },
  currencySymbol: { fontFamily: 'DMMono-Medium', fontSize: 40, color: '#1C1410', marginRight: 8 },
  input: { fontFamily: 'DMMono-Medium', fontSize: 48, fontWeight: '800', color: '#1C1410', minWidth: 100, textAlign: 'left' },
  helperText: { fontFamily: 'Nunito-SemiBold', fontSize: 14, color: '#6B5C4E', textAlign: 'center', marginBottom: 40 },
  bankCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#EEE0CC', marginBottom: 32 },
  bankLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  bankIcon: { fontSize: 24 },
  bankName: { fontFamily: 'Syne-Bold', fontSize: 16, color: '#1C1410' },
  bankAcc: { fontFamily: 'DMMono-Regular', fontSize: 14, color: '#6B5C4E' },
  changeText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: '#FF6B1A' },
  submitBtnWrapper: { marginTop: 'auto' },
  submitBtn: { height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  submitText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#FFFFFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontFamily: 'Syne-Bold', fontSize: 18, color: '#1C1410', marginBottom: 20 },
  bankOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#EEE0CC', marginBottom: 12 },
  selectedBankOption: { borderColor: '#FF6B1A', backgroundColor: '#FFF0D6' },
  addBankBtn: { padding: 16, alignItems: 'center', marginTop: 12 },
  addBankBtnText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#FF6B1A' }
});
