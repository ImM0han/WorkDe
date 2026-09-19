import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../../src/stores/authStore';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../src/services/apiClient';

const { width } = Dimensions.get('window');

// ── Success Modal ──────────────────────────────────────────────────────────────
function WithdrawalSuccessModal({
  visible,
  amount,
  destination,
  onDone,
}: {
  visible: boolean;
  amount: string;
  destination: string;
  onDone: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
      checkAnim.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 14,
          stiffness: 180,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.spring(checkAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 10,
          stiffness: 200,
        }).start();
      });
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={successStyles.overlay}>
        <Animated.View
          style={[
            successStyles.card,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        >
          {/* Top glow circle */}
          <LinearGradient
            colors={['#FF6B1A', '#F59E0B']}
            style={successStyles.iconWrapper}
          >
            <Animated.Text
              style={[
                successStyles.checkIcon,
                { transform: [{ scale: checkAnim }] },
              ]}
            >
              ✓
            </Animated.Text>
          </LinearGradient>

          {/* Dotted ring decoration */}
          <View style={successStyles.decorRing} />

          <Text style={successStyles.heading}>Withdrawal{'\n'}Initiated!</Text>

          {/* Amount chip */}
          <LinearGradient
            colors={['#FFF4E6', '#FFE8C8']}
            style={successStyles.amountChip}
          >
            <Text style={successStyles.amountLabel}>Amount</Text>
            <Text style={successStyles.amountValue}>₹{amount}</Text>
          </LinearGradient>

          {/* Destination */}
          <View style={successStyles.destRow}>
            <View style={successStyles.destIcon}>
              <Text style={{ fontSize: 16 }}>🏦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={successStyles.destLabel}>Sending to</Text>
              <Text style={successStyles.destValue} numberOfLines={1}>
                {destination}
              </Text>
            </View>
          </View>

          {/* Divider + info */}
          <View style={successStyles.divider} />
          <Text style={successStyles.infoText}>
            Funds are typically processed within{' '}
            <Text style={{ color: '#FF6B1A', fontFamily: 'Nunito-Bold' }}>
              1–2 business days
            </Text>
            . You'll be notified once the transfer is complete.
          </Text>

          {/* CTA */}
          <TouchableOpacity onPress={onDone} style={successStyles.doneBtn} activeOpacity={0.85}>
            <LinearGradient colors={['#FF6B1A', '#F59E0B']} style={successStyles.doneBtnInner}>
              <Text style={successStyles.doneBtnText}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function WithdrawModal() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [isBankModalVisible, setBankModalVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successDestination, setSuccessDestination] = useState('');

  const partnerIdToUse = user?.partnerId || (user as any)?.partner?.id;

  const { data: partnerData, refetch } = useQuery({
    queryKey: ['partnerProfile', partnerIdToUse],
    queryFn: () => api.get(`/partner/${partnerIdToUse}`).then(r => r.data),
    enabled: !!partnerIdToUse,
  });

  useFocusEffect(
    useCallback(() => {
      if (partnerIdToUse) refetch();
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
      const res = await api.post('/wallet/withdraw', { amount: Number(amount), bankId: selectedBank?.id });
      queryClient.invalidateQueries({ queryKey: ['partnerProfile', partnerIdToUse] });
      queryClient.invalidateQueries({ queryKey: ['transactions', partnerIdToUse] });

      const dest =
        res.data?.bankAccount ||
        (selectedBank?.ifsc === 'UPI'
          ? `UPI: ${selectedBank?.accountNumber}`
          : `${selectedBank?.holderName} (****${selectedBank?.accountNumber?.slice(-4)})`);

      setSuccessDestination(dest);
      setSuccessVisible(true);
    } catch (error: any) {
      console.error('Withdrawal failed', error);
      const errMsg = error.response?.data?.error || 'Failed to process withdrawal. Please try again.';
      Alert.alert('Withdrawal Failed', errMsg);
    }
  };

  const isDisabled =
    !amount ||
    Number(amount) <= 0 ||
    Number(amount) > maxAmount ||
    !isAadhaarVerified ||
    !hasBankDetails;

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
            <Text style={styles.bankIcon}>{selectedBank?.ifsc === 'UPI' ? '📱' : '🏦'}</Text>
            <View>
              <Text style={styles.bankName}>
                {selectedBank?.ifsc === 'UPI' ? 'UPI ID' : selectedBank?.holderName || 'Saved Bank'}
              </Text>
              <Text style={styles.bankAcc}>
                {selectedBank?.ifsc === 'UPI'
                  ? selectedBank?.accountNumber
                  : `**** ${selectedBank?.accountNumber?.slice(-4) || 'XXXX'}`}
              </Text>
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

      <TouchableOpacity style={styles.submitBtnWrapper} disabled={isDisabled} onPress={handleWithdraw}>
        <LinearGradient
          colors={isDisabled ? ['#C4B5A5', '#C4B5A5'] : ['#FF6B1A', '#F59E0B']}
          style={styles.submitBtn}
        >
          <Text style={styles.submitText}>{t('wallet.withdraw') || 'Withdraw'}</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Bank Selection Modal */}
      <Modal visible={isBankModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setBankModalVisible(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Select Bank Account</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {banks.map((bank: any) => {
                const isBankUpi = bank.ifsc === 'UPI';
                return (
                  <TouchableOpacity
                    key={bank.id}
                    style={[styles.bankOption, selectedBank?.id === bank.id && styles.selectedBankOption]}
                    onPress={() => {
                      setSelectedBankId(bank.id);
                      setBankModalVisible(false);
                    }}
                  >
                    <View style={styles.bankLeft}>
                      <Text style={styles.bankIcon}>{isBankUpi ? '📱' : '🏦'}</Text>
                      <View>
                        <Text style={styles.bankName}>{isBankUpi ? 'UPI ID' : bank.holderName}</Text>
                        <Text style={styles.bankAcc}>
                          {isBankUpi ? bank.accountNumber : `**** ${bank.accountNumber?.slice(-4)}`}
                        </Text>
                      </View>
                    </View>
                    {selectedBank?.id === bank.id && <Text style={{ fontSize: 20 }}>✅</Text>}
                  </TouchableOpacity>
                );
              })}
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

      {/* ✅ Premium Success Modal */}
      <WithdrawalSuccessModal
        visible={successVisible}
        amount={amount}
        destination={successDestination}
        onDone={() => {
          setSuccessVisible(false);
          router.back();
        }}
      />
    </View>
  );
}

// ── Main Styles ────────────────────────────────────────────────────────────────
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
  addBankBtnText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#FF6B1A' },
});

// ── Success Modal Styles ───────────────────────────────────────────────────────
const successStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 8, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    width: width - 48,
    alignItems: 'center',
    shadowColor: '#FF6B1A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 20,
    overflow: 'hidden',
  },
  decorRing: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 22,
    borderColor: 'rgba(255,107,26,0.07)',
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FF6B1A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  checkIcon: {
    fontSize: 38,
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 44,
  },
  heading: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 26,
    color: '#1C1410',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 24,
  },
  amountChip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFD9A0',
  },
  amountLabel: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 13,
    color: '#8B6A3E',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  amountValue: {
    fontFamily: 'DMMono-Medium',
    fontSize: 22,
    color: '#FF6B1A',
    fontWeight: '700',
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#F8F4EF',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 20,
  },
  destIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  destLabel: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 11,
    color: '#9C856A',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  destValue: {
    fontFamily: 'Syne-Bold',
    fontSize: 14,
    color: '#1C1410',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#EEE0CC',
    marginBottom: 16,
  },
  infoText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 13,
    color: '#8B6A3E',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  doneBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  doneBtnInner: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  doneBtnText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
});
