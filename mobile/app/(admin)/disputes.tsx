import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Modal, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import adminApi from '../../src/services/adminApiClient';
import Toast from 'react-native-toast-message';
import { getFriendlyErrorMessage } from '../../src/services/errorHelpers';

export default function DisputeResolutionScreen() {
  const [selectedStatus, setSelectedStatus] = useState<'OPEN' | 'RESOLVED' | 'CLOSED' | 'ALL'>('OPEN');
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [resolution, setResolution] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDisputes = async () => {
    try {
      let url = '/transactions/disputes';
      if (selectedStatus !== 'ALL') {
        url += `?status=${selectedStatus}`;
      }

      const res = await adminApi.get(url);
      setDisputes(res.data.disputes || []);
    } catch (error: any) {
      console.error('[Admin Disputes] Fetch error:', error);
      Toast.show({ type: 'error', text1: 'Failed to fetch disputes' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchDisputes();
  }, [selectedStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDisputes();
  };

  const handleConfirmResolve = async () => {
    if (!resolution.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter resolution notes' });
      return;
    }

    try {
      setActionLoading(true);
      await adminApi.post(`/transactions/disputes/${selectedDispute.id}/resolve`, {
        resolution: resolution.trim(),
        status: 'RESOLVED'
      });

      Toast.show({ type: 'success', text1: 'Dispute ticket resolved successfully!' });
      setModalVisible(false);
      setResolution('');
      setSelectedDispute(null);
      fetchDisputes();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Failed to resolve dispute', text2: getFriendlyErrorMessage(error) });
    } finally {
      setActionLoading(false);
    }
  };

  const renderDisputeItem = ({ item }: { item: any }) => {
    const raisedUser = item.raisedBy || {};
    const isOpen = item.status === 'OPEN';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.ticketNumber}>Ticket #{item.ticketNumber}</Text>
            <Text style={styles.disputeType}>{item.type.replace('_', ' ')}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: isOpen ? '#FFE6D5' : '#D1FAE5' }]}>
            <Text style={[styles.statusText, { color: isOpen ? '#FF6B1A' : '#059669' }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.userRow}>
          <Feather name="user" size={14} color="#6B5C4E" />
          <Text style={styles.userText}>Raised by: {raisedUser.name || 'User'} ({raisedUser.phone || 'N/A'})</Text>
        </View>

        <Text style={styles.descText}>{item.description}</Text>

        {item.resolution && (
          <View style={styles.resolutionBox}>
            <Text style={styles.resolutionTitle}>Resolution:</Text>
            <Text style={styles.resolutionText}>{item.resolution}</Text>
          </View>
        )}

        <Text style={styles.dateText}>Created: {new Date(item.createdAt).toLocaleString()}</Text>

        {isOpen && (
          <TouchableOpacity
            style={styles.resolveButton}
            onPress={() => {
              setSelectedDispute(item);
              setModalVisible(true);
            }}
          >
            <Feather name="check-circle" size={16} color="#FFFFFF" />
            <Text style={styles.resolveButtonText}>Resolve Ticket</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {(['OPEN', 'RESOLVED', 'CLOSED', 'ALL'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.tabItem, selectedStatus === s && styles.tabItemActive]}
            onPress={() => setSelectedStatus(s)}
          >
            <Text style={[styles.tabText, selectedStatus === s && styles.tabTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF6B1A" />
        </View>
      ) : disputes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="shield" size={48} color="#C4B5A5" />
          <Text style={styles.emptyTitle}>No Disputes Found</Text>
          <Text style={styles.emptySub}>No dispute tickets found for status "{selectedStatus}"</Text>
        </View>
      ) : (
        <FlatList
          data={disputes}
          keyExtractor={(item) => item.id}
          renderItem={renderDisputeItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B1A" />}
        />
      )}

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Resolve Dispute #{selectedDispute?.ticketNumber}</Text>
            <Text style={styles.modalSub}>Enter the resolution decision or notes for this dispute ticket:</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Full refund processed or issue resolved amicably"
              placeholderTextColor="#C4B5A5"
              multiline
              value={resolution}
              onChangeText={setResolution}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  setResolution('');
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmResolve}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmText}>Submit Resolution</Text>
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
    paddingHorizontal: 14,
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
    padding: 14,
    gap: 14,
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
    marginBottom: 8,
  },
  ticketNumber: {
    fontFamily: 'Syne-Bold',
    fontSize: 16,
    color: '#1C1410',
  },
  disputeType: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
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
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  userText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 13,
    color: '#6B5C4E',
  },
  descText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: '#111827',
    marginBottom: 10,
    lineHeight: 20,
  },
  resolutionBox: {
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  resolutionTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
    color: '#047857',
    marginBottom: 2,
  },
  resolutionText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 13,
    color: '#064E3B',
  },
  dateText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 11,
    color: '#9CA3AF',
  },
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  resolveButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 13,
    color: '#FFFFFF',
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
    paddingTop: 10,
    height: 90,
    textAlignVertical: 'top',
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: '#111827',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  cancelText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: '#4B5563',
  },
  confirmButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#6366F1',
  },
  confirmText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
