import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Modal, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import adminApi from '../../src/services/adminApiClient';
import Toast from 'react-native-toast-message';
import { getFriendlyErrorMessage } from '../../src/services/errorHelpers';

export default function PayoutProcessingScreen() {
  const [selectedStatus, setSelectedStatus] = useState<'PENDING' | 'PROCESSING' | 'PAID' | 'REJECTED' | 'ALL'>('PENDING');
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pay Modal State
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [utrNumber, setUtrNumber] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Reject Modal State
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchWithdrawals = async () => {
    try {
      let url = '/withdrawals';
      if (selectedStatus !== 'ALL') {
        url += `?status=${selectedStatus}`;
      }

      const res = await adminApi.get(url);
      setWithdrawals(res.data.withdrawals || []);
    } catch (error: any) {
      console.error('[Admin Payouts] Fetch error:', error);
      Toast.show({ type: 'error', text1: 'Failed to fetch withdrawal requests' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchWithdrawals();
  }, [selectedStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWithdrawals();
  };

  const handleMarkProcessing = async (id: string) => {
    try {
      setActionLoading(true);
      await adminApi.post(`/withdrawals/${id}/processing`);
      Toast.show({ type: 'success', text1: 'Withdrawal status set to PROCESSING' });
      fetchWithdrawals();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Failed to update status', text2: getFriendlyErrorMessage(error) });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPay = async () => {
    if (!utrNumber.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter the Bank UTR / Reference Number' });
      return;
    }

    try {
      setActionLoading(true);
      await adminApi.post(`/withdrawals/${selectedWithdrawal.id}/pay`, {
        utrNumber: utrNumber.trim()
      });
      Toast.show({ type: 'success', text1: 'Payout marked as PAID successfully!' });
      setPayModalVisible(false);
      setUtrNumber('');
      setSelectedWithdrawal(null);
      fetchWithdrawals();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Failed to process payment', text2: getFriendlyErrorMessage(error) });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter a rejection reason' });
      return;
    }

    try {
      setActionLoading(true);
      const res = await adminApi.post(`/withdrawals/${selectedWithdrawal.id}/reject`, {
        rejectionReason: rejectionReason.trim()
      });
      Toast.show({
        type: 'info',
        text1: 'Withdrawal Rejected',
        text2: `₹${selectedWithdrawal.amount} refunded to partner wallet`
      });
      setRejectModalVisible(false);
      setRejectionReason('');
      setSelectedWithdrawal(null);
      fetchWithdrawals();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Failed to reject request', text2: getFriendlyErrorMessage(error) });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { bg: '#FFE6D5', text: '#FF6B1A' };
      case 'PROCESSING':
        return { bg: '#FEF3C7', text: '#D97706' };
      case 'PAID':
        return { bg: '#D1FAE5', text: '#059669' };
      case 'REJECTED':
        return { bg: '#FEE2E2', text: '#DC2626' };
      default:
        return { bg: '#F3F4F6', text: '#4B5563' };
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const partnerUser = item.partner?.user || {};
    const bank = item.defaultBankAccount || {};
    const badge = getStatusBadgeStyle(item.status);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.partnerName}>{partnerUser.name || 'Partner User'}</Text>
            <Text style={styles.partnerPhone}>{partnerUser.phone || 'No Phone'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusText, { color: badge.text }]}>{item.status}</Text>
          </View>
        </View>

        {/* Amount Banner */}
        <View style={styles.amountBanner}>
          <Text style={styles.amountLabel}>Requested Payout</Text>
          <Text style={styles.amountValue}>₹{item.amount.toLocaleString('en-IN')}</Text>
        </View>

        {/* Bank & UPI Details Box */}
        <View style={styles.bankBox}>
          <Text style={styles.bankBoxTitle}>Linked Transfer Account:</Text>
          <Text style={styles.bankAccountStr}>{item.bankAccount || `${bank.holderName} (A/C: ${bank.accountNumber}, IFSC: ${bank.ifsc})`}</Text>
        </View>

        {/* Metadata Details */}
        {item.utrNumber && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>UTR Ref:</Text>
            <Text style={styles.metaValue}>{item.utrNumber}</Text>
          </View>
        )}
        {item.rejectionReason && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Reason:</Text>
            <Text style={[styles.metaValue, { color: '#DC2626' }]}>{item.rejectionReason}</Text>
          </View>
        )}
        <Text style={styles.dateText}>Requested on: {new Date(item.createdAt).toLocaleString()}</Text>

        {/* Action Buttons for Pending or Processing */}
        {(item.status === 'PENDING' || item.status === 'PROCESSING') && (
          <View style={styles.actionRow}>
            {item.status === 'PENDING' && (
              <TouchableOpacity 
                style={styles.procButton}
                onPress={() => handleMarkProcessing(item.id)}
                disabled={actionLoading}
              >
                <Feather name="clock" size={16} color="#D97706" />
                <Text style={styles.procButtonText}>Processing</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.payButton}
              onPress={() => {
                setSelectedWithdrawal(item);
                setPayModalVisible(true);
              }}
              disabled={actionLoading}
            >
              <Feather name="check-circle" size={16} color="#FFFFFF" />
              <Text style={styles.payButtonText}>Mark Paid</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.rejectButton}
              onPress={() => {
                setSelectedWithdrawal(item);
                setRejectModalVisible(true);
              }}
              disabled={actionLoading}
            >
              <Feather name="x-circle" size={16} color="#DC2626" />
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab Filter Bar */}
      <View style={styles.tabBar}>
        {(['PENDING', 'PROCESSING', 'PAID', 'REJECTED', 'ALL'] as const).map((st) => (
          <TouchableOpacity
            key={st}
            style={[styles.tabItem, selectedStatus === st && styles.tabItemActive]}
            onPress={() => setSelectedStatus(st)}
          >
            <Text style={[styles.tabText, selectedStatus === st && styles.tabTextActive]}>{st}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF6B1A" />
        </View>
      ) : withdrawals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="inbox" size={48} color="#C4B5A5" />
          <Text style={styles.emptyTitle}>No Withdrawal Requests</Text>
          <Text style={styles.emptySub}>No requests found for status "{selectedStatus}"</Text>
        </View>
      ) : (
        <FlatList
          data={withdrawals}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B1A" />}
        />
      )}

      {/* Pay Modal */}
      <Modal visible={payModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Manual Payment</Text>
            <Text style={styles.modalSub}>
              Enter the bank UTR / reference number after completing the transfer of ₹{selectedWithdrawal?.amount.toLocaleString('en-IN')}:
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. UTR1234567890"
              placeholderTextColor="#C4B5A5"
              value={utrNumber}
              onChangeText={setUtrNumber}
              autoCapitalize="characters"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelModalButton}
                onPress={() => {
                  setPayModalVisible(false);
                  setUtrNumber('');
                }}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.confirmPayButton}
                onPress={handleConfirmPay}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmPayText}>Confirm Paid</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: '#DC2626' }]}>Reject Withdrawal Request</Text>
            <Text style={styles.modalSub}>
              Please state why this request is rejected. ₹{selectedWithdrawal?.amount.toLocaleString('en-IN')} will be credited back to the partner's wallet:
            </Text>

            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              placeholder="e.g. Incorrect IFSC details"
              placeholderTextColor="#C4B5A5"
              multiline
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelModalButton}
                onPress={() => {
                  setRejectModalVisible(false);
                  setRejectionReason('');
                }}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.confirmRejectButton}
                onPress={handleConfirmReject}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmRejectText}>Reject & Refund</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF6EE',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  tabItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
  },
  tabItemActive: {
    backgroundColor: '#FF6B1A',
  },
  tabText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
    color: '#6B5C4E',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontFamily: 'Syne-Bold',
    fontSize: 18,
    color: '#1C1410',
    marginTop: 12,
  },
  emptySub: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: '#6B5C4E',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  partnerName: {
    fontFamily: 'Syne-Bold',
    fontSize: 16,
    color: '#1C1410',
  },
  partnerPhone: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 13,
    color: '#6B5C4E',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 11,
  },
  amountBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF0D6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  amountLabel: {
    fontFamily: 'Nunito-Bold',
    fontSize: 13,
    color: '#6B5C4E',
  },
  amountValue: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 20,
    color: '#FF6B1A',
  },
  bankBox: {
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  bankBoxTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  bankAccountStr: {
    fontFamily: 'Nunito-Bold',
    fontSize: 13,
    color: '#111827',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  metaLabel: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
    color: '#6B5C4E',
  },
  metaValue: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
    color: '#111827',
  },
  dateText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  procButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingVertical: 10,
    borderRadius: 10,
  },
  procButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 13,
    color: '#D97706',
  },
  payButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 10,
  },
  payButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    borderRadius: 10,
  },
  rejectButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 13,
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontFamily: 'Syne-Bold',
    fontSize: 18,
    color: '#1C1410',
    marginBottom: 6,
  },
  modalSub: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    color: '#6B5C4E',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontFamily: 'DMMono-Medium',
    fontSize: 15,
    color: '#111827',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelModalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  cancelModalText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: '#4B5563',
  },
  confirmPayButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#10B981',
  },
  confirmPayText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  confirmRejectButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#DC2626',
  },
  confirmRejectText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
