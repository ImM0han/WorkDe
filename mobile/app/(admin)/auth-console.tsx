import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Modal, TextInput, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import adminApi from '../../src/services/adminApiClient';
import Toast from 'react-native-toast-message';
import { getFriendlyErrorMessage } from '../../src/services/errorHelpers';

type AuthStatusTab = 'ALL' | 'PENDING' | 'PROCESSING' | 'VERIFIED' | 'DELETED';

export default function AuthConsoleScreen() {
  const [activeTab, setActiveTab] = useState<AuthStatusTab>('PENDING');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [counts, setCounts] = useState({ pending: 0, processing: 0, verified: 0, deleted: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Edit Verified Password Modal State
  const [editPassModalUser, setEditPassModalUser] = useState<any>(null);
  const [editPassInput, setEditPassInput] = useState('');
  const [submittingEditPass, setSubmittingEditPass] = useState(false);
  const [issuedTempPass, setIssuedTempPass] = useState<string | null>(null);

  // Reject Modal State
  const [rejectModalUser, setRejectModalUser] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  // Delete & Ban 30-Day Modal State
  const [deleteModalUser, setDeleteModalUser] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const fetchAuthQueue = async () => {
    try {
      let url = `/auth-console/users?status=${activeTab}&limit=50`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

      const res = await adminApi.get(url);
      setUsers(res.data.users || []);
      if (res.data.counts) setCounts(res.data.counts);
    } catch (error: any) {
      console.error('[Auth Console] Fetch error:', error);
      Toast.show({ type: 'error', text1: 'Failed to load user authentication queue' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAuthQueue();
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAuthQueue();
  };

  const handleMarkProcessing = async (userId: string, userName: string) => {
    try {
      setActionLoadingId(userId);
      await adminApi.post(`/auth-console/users/${userId}/mark-processing`);
      Toast.show({ type: 'info', text1: `${userName} moved to Processing queue` });
      fetchAuthQueue();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Failed to move to processing', text2: getFriendlyErrorMessage(error) });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDirectVerifyAuth = async (userId: string, userName: string) => {
    try {
      setActionLoadingId(userId);
      await adminApi.post(`/auth-console/users/${userId}/verify-auth`);
      Toast.show({ type: 'success', text1: `User ${userName} verified successfully!` });
      fetchAuthQueue();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Verification failed', text2: getFriendlyErrorMessage(error) });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmEditPassword = async () => {
    if (!editPassModalUser) return;
    try {
      setSubmittingEditPass(true);
      const res = await adminApi.post(`/auth-console/users/${editPassModalUser.id}/edit-password`, {
        newPassword: editPassInput.trim() || undefined
      });

      setIssuedTempPass(res.data.temporaryPassword);
      Toast.show({ type: 'success', text1: `Password updated for ${editPassModalUser.name}` });
      fetchAuthQueue();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Password update failed', text2: getFriendlyErrorMessage(error) });
    } finally {
      setSubmittingEditPass(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalUser) return;
    try {
      setSubmittingReject(true);
      await adminApi.post(`/auth-console/users/${rejectModalUser.id}/reject-auth`, {
        reason: rejectReason.trim()
      });

      Toast.show({ type: 'info', text1: `Auth rejected for ${rejectModalUser.name}` });
      setRejectModalUser(null);
      fetchAuthQueue();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Rejection failed', text2: getFriendlyErrorMessage(error) });
    } finally {
      setSubmittingReject(false);
    }
  };

  const handleConfirmDeleteAndBan = async () => {
    if (!deleteModalUser) return;
    try {
      setSubmittingDelete(true);
      await adminApi.post(`/auth-console/users/${deleteModalUser.id}/delete-and-ban`, {
        reason: deleteReason.trim()
      });

      Toast.show({
        type: 'info',
        text1: `User ${deleteModalUser.name} deleted`,
        text2: `Phone ${deleteModalUser.phone || ''} banned from login/registration for 30 days.`
      });
      setDeleteModalUser(null);
      fetchAuthQueue();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Delete & Ban failed', text2: getFriendlyErrorMessage(error) });
    } finally {
      setSubmittingDelete(false);
    }
  };

  const handleRevokeDelete = async (userId: string, userName: string) => {
    Alert.alert(
      "Revoke Deletion",
      `Revoke deletion for "${userName}"? This will restore their account to simple user status and allow registration and login with their phone number immediately.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke Delete",
          onPress: async () => {
            try {
              setActionLoadingId(userId);
              await adminApi.post(`/auth-console/users/${userId}/revoke-delete`);
              Toast.show({
                type: 'success',
                text1: `Deletion Revoked for ${userName}`,
                text2: 'Account restored as simple user. Phone unbanned for login/registration.'
              });
              fetchAuthQueue();
            } catch (error: any) {
              Toast.show({ type: 'error', text1: 'Revoke deletion failed', text2: getFriendlyErrorMessage(error) });
            } finally {
              setActionLoadingId(null);
            }
          }
        }
      ]
    );
  };

  const renderUserCard = ({ item }: { item: any }) => {
    const isPending = item.authStatus === 'PENDING';
    const isProcessing = item.authStatus === 'PROCESSING';
    const isVerified = item.authStatus === 'VERIFIED';
    const isDeleted = item.authStatus === 'DELETED';
    const isLoading = actionLoadingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={[styles.avatarCircle, { backgroundColor: isDeleted ? '#6B7280' : item.role === 'PARTNER' ? '#FF6B1A' : '#3B82F6' }]}>
              <Text style={styles.avatarText}>{(item.name || 'U').charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={[styles.userName, isDeleted && { textDecorationLine: 'line-through', color: '#6B7280' }]}>{item.name}</Text>
              <Text style={styles.userPhone}>{item.phone || 'No phone'}</Text>
            </View>
          </View>

          <View style={[
            styles.statusBadge,
            isPending && { backgroundColor: '#FEF3C7' },
            isProcessing && { backgroundColor: '#DBEAFE' },
            isVerified && { backgroundColor: '#D1FAE5' },
            isDeleted && { backgroundColor: '#FEE2E2' }
          ]}>
            <Text style={[
              styles.statusText,
              isPending && { color: '#D97706' },
              isProcessing && { color: '#2563EB' },
              isVerified && { color: '#059669' },
              isDeleted && { color: '#DC2626' }
            ]}>
              {item.authStatus}
            </Text>
          </View>
        </View>

        {/* Info Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoValue}>{item.role}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Login Mode</Text>
            <Text style={styles.infoValue}>{item.loginMethod || 'OTP'}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.infoValue, { color: isDeleted ? '#DC2626' : item.hasPassword ? '#10B981' : '#F59E0B' }]}>
              {isDeleted ? 'Banned (30d)' : item.hasPassword ? 'Password Set' : 'OTP Mode'}
            </Text>
          </View>
        </View>

        {/* Touch Action Buttons */}
        <View style={styles.actionRow}>
          {isDeleted ? (
            <TouchableOpacity
              style={[styles.btn, styles.btnRevoke]}
              onPress={() => handleRevokeDelete(item.id, item.name)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#059669" size="small" />
              ) : (
                <>
                  <Feather name="rotate-ccw" size={13} color="#059669" />
                  <Text style={[styles.btnText, { color: '#059669' }]}>Revoke Delete</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <>
              {isPending && (
                <TouchableOpacity
                  style={[styles.btn, styles.btnProcess]}
                  onPress={() => handleMarkProcessing(item.id, item.name)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#2563EB" size="small" />
                  ) : (
                    <>
                      <Feather name="arrow-right-circle" size={13} color="#2563EB" />
                      <Text style={[styles.btnText, { color: '#2563EB' }]}>Process</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {(isPending || isProcessing) && (
                <TouchableOpacity
                  style={[styles.btn, styles.btnVerify]}
                  onPress={() => handleDirectVerifyAuth(item.id, item.name)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Feather name="check-circle" size={13} color="#FFFFFF" />
                      <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Verify Auth</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {isVerified && (
                <TouchableOpacity
                  style={[styles.btn, styles.btnEditPass]}
                  onPress={() => {
                    setEditPassModalUser(item);
                    setEditPassInput('');
                    setIssuedTempPass(null);
                  }}
                >
                  <Feather name="key" size={13} color="#D97706" />
                  <Text style={[styles.btnText, { color: '#D97706' }]}>Edit Pass</Text>
                </TouchableOpacity>
              )}

              {!isVerified && (
                <TouchableOpacity
                  style={[styles.btn, styles.btnReject]}
                  onPress={() => {
                    setRejectModalUser(item);
                    setRejectReason('');
                  }}
                  disabled={isLoading}
                >
                  <Feather name="x-circle" size={13} color="#DC2626" />
                  <Text style={[styles.btnText, { color: '#DC2626' }]}>Reject</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.btn, styles.btnDelete]}
                onPress={() => {
                  setDeleteModalUser(item);
                  setDeleteReason('');
                }}
                disabled={isLoading}
              >
                <Feather name="trash-2" size={13} color="#DC2626" />
                <Text style={[styles.btnText, { color: '#DC2626' }]}>Delete & Ban</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Feather name="search" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search user name or phone..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={fetchAuthQueue}
        />
      </View>

      {/* Auth Status Tabs */}
      <View style={styles.tabBar}>
        {(['PENDING', 'PROCESSING', 'VERIFIED', 'DELETED', 'ALL'] as const).map((tab) => {
          const count = tab === 'PENDING' ? counts.pending
            : tab === 'PROCESSING' ? counts.processing
            : tab === 'VERIFIED' ? counts.verified
            : tab === 'DELETED' ? counts.deleted
            : counts.total;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF6B1A" />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="shield" size={48} color="#C4B5A5" />
          <Text style={styles.emptyTitle}>No Auth Requests</Text>
          <Text style={styles.emptySub}>No users found in {activeTab} status queue</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUserCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B1A" />}
        />
      )}

      {/* Edit Verified User Password Modal */}
      <Modal visible={!!editPassModalUser} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Verified User Password</Text>
            <Text style={styles.modalSub}>
              Update password for verified user {editPassModalUser?.name} ({editPassModalUser?.phone}):
            </Text>

            {issuedTempPass ? (
              <View style={styles.successPassBox}>
                <Feather name="check-circle" size={24} color="#10B981" />
                <Text style={styles.successPassTitle}>Password Updated Successfully!</Text>
                <Text style={styles.successPassLabel}>New Password:</Text>
                <View style={styles.passCodeBox}>
                  <Text style={styles.passCodeText}>{issuedTempPass}</Text>
                </View>
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => {
                    setEditPassModalUser(null);
                    setIssuedTempPass(null);
                  }}
                >
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.inputLabel}>New Password *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter new password (min 6 chars)"
                  placeholderTextColor="#C4B5A5"
                  secureTextEntry
                  value={editPassInput}
                  onChangeText={setEditPassInput}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditPassModalUser(null)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#D97706' }]} onPress={handleConfirmEditPassword} disabled={submittingEditPass}>
                    {submittingEditPass ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitBtnText}>Save Password</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal visible={!!rejectModalUser} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Authentication</Text>
            <Text style={styles.modalSub}>Reject auth attempt for {rejectModalUser?.name}:</Text>

            <Text style={styles.inputLabel}>Rejection Reason</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Phone number mismatch"
              placeholderTextColor="#C4B5A5"
              value={rejectReason}
              onChangeText={setRejectReason}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setRejectModalUser(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#DC2626' }]} onPress={handleConfirmReject} disabled={submittingReject}>
                {submittingReject ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitBtnText}>Confirm Reject</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete & Ban Modal */}
      <Modal visible={!!deleteModalUser} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderWarning}>
              <Feather name="alert-triangle" size={24} color="#DC2626" />
              <Text style={styles.modalTitleWarning}>Delete User & Ban Phone</Text>
            </View>

            <Text style={styles.modalSub}>
              Are you sure you want to delete <Text style={{ fontWeight: 'bold', color: '#111827' }}>{deleteModalUser?.name}</Text> ({deleteModalUser?.phone || 'No Phone'})?
            </Text>

            <View style={styles.banWarningBox}>
              <Feather name="shield-off" size={16} color="#DC2626" />
              <Text style={styles.banWarningText}>
                This phone number ({deleteModalUser?.phone || 'registered number'}) will be strictly banned from login and new registration for 30 days.
              </Text>
            </View>

            <Text style={styles.inputLabel}>Reason (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Fraudulent activity / Removal requested"
              placeholderTextColor="#C4B5A5"
              value={deleteReason}
              onChangeText={setDeleteReason}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteModalUser(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#DC2626' }]}
                onPress={handleConfirmDeleteAndBan}
                disabled={submittingDelete}
              >
                {submittingDelete ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Confirm Delete & Ban</Text>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    margin: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: '#111827',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  tabItemActive: {
    backgroundColor: '#FF6B1A',
  },
  tabText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 11,
    color: '#4B5563',
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
    padding: 12,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: 'Syne-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  userName: {
    fontFamily: 'Syne-Bold',
    fontSize: 15,
    color: '#1C1410',
  },
  userPhone: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 12,
    color: '#6B5C4E',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 10,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 10,
    marginBottom: 10,
  },
  infoBox: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: 'Nunito-Bold',
    fontSize: 10,
    color: '#9CA3AF',
  },
  infoValue: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
    color: '#111827',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnProcess: {
    backgroundColor: '#DBEAFE',
  },
  btnVerify: {
    backgroundColor: '#10B981',
  },
  btnEditPass: {
    backgroundColor: '#FEF3C7',
  },
  btnReject: {
    backgroundColor: '#FEE2E2',
  },
  btnDelete: {
    backgroundColor: '#FEE2E2',
  },
  btnRevoke: {
    backgroundColor: '#D1FAE5',
  },
  modalHeaderWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modalTitleWarning: {
    fontFamily: 'Syne-Bold',
    fontSize: 18,
    color: '#DC2626',
  },
  banWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: 14,
  },
  banWarningText: {
    flex: 1,
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
    color: '#991B1B',
  },
  btnText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
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
    marginBottom: 4,
  },
  modalSub: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    color: '#6B5C4E',
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: 'Nunito-Bold',
    fontSize: 13,
    color: '#1C1410',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontFamily: 'Nunito-Bold',
    fontSize: 15,
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  cancelBtnText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: '#4B5563',
  },
  submitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#10B981',
  },
  submitBtnText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  successPassBox: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
  },
  successPassTitle: {
    fontFamily: 'Syne-Bold',
    fontSize: 16,
    color: '#047857',
    marginTop: 8,
  },
  successPassLabel: {
    fontFamily: 'Nunito-Bold',
    fontSize: 13,
    color: '#065F46',
    marginTop: 12,
  },
  passCodeBox: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 6,
    marginBottom: 16,
  },
  passCodeText: {
    fontFamily: 'DMMono-Medium',
    fontSize: 18,
    color: '#047857',
    letterSpacing: 1,
  },
  doneBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  doneBtnText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
