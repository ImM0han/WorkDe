import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, ActivityIndicator, RefreshControl, Modal, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import adminApi from '../../src/services/adminApiClient';
import Toast from 'react-native-toast-message';
import { getFriendlyErrorMessage } from '../../src/services/errorHelpers';
import { useAdminStore } from '../../src/stores/adminStore';

export default function UserKycScreen() {
  const { adminUser } = useAdminStore();
  const isSuperadmin = adminUser?.role === 'SUPERADMIN';

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'PARTNER' | 'CLIENT'>('ALL');
  const [kycFilter, setKycFilter] = useState<'ALL' | 'PENDING' | 'PROCESSING' | 'VERIFIED'>('ALL');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Superadmin Create User Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'PARTNER' | 'CLIENT'>('PARTNER');
  const [submittingUser, setSubmittingUser] = useState(false);

  // Reset User Password Modal State
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [selectedResetUser, setSelectedResetUser] = useState<any>(null);
  const [customResetPass, setCustomResetPass] = useState('');
  const [submittingReset, setSubmittingReset] = useState(false);
  const [generatedTempPass, setGeneratedTempPass] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      let url = `/users?limit=50`;
      if (roleFilter !== 'ALL') url += `&role=${roleFilter}`;
      if (kycFilter !== 'ALL') url += `&kycStatus=${kycFilter}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

      const res = await adminApi.get(url);
      setUsers(res.data.users || []);
    } catch (error: any) {
      console.error('[Admin Users] Fetch error:', error);
      Toast.show({ type: 'error', text1: 'Failed to load users list' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchUsers();
  }, [roleFilter, kycFilter]);

  const handleSearchSubmit = () => {
    setLoading(true);
    fetchUsers();
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleCreateUser = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      Toast.show({ type: 'error', text1: 'Name and phone number are required' });
      return;
    }

    try {
      setSubmittingUser(true);
      const cleanPhone = newPhone.replace(/\D/g, '');
      const fullPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : newPhone.trim();

      await adminApi.post('/users', {
        name: newName.trim(),
        phone: fullPhone,
        role: newRole
      });

      Toast.show({ type: 'success', text1: `${newRole} account created successfully!` });
      setCreateModalVisible(false);
      setNewName('');
      setNewPhone('');
      fetchUsers();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Failed to create user', text2: getFriendlyErrorMessage(error) });
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleConfirmResetUserPassword = async () => {
    if (!selectedResetUser) return;
    try {
      setSubmittingReset(true);
      const res = await adminApi.post(`/users/${selectedResetUser.id}/reset-password`, {
        password: customResetPass.trim() || undefined
      });

      setGeneratedTempPass(res.data.temporaryPassword);
      Toast.show({ type: 'success', text1: `Password reset for ${selectedResetUser.name}` });
      fetchUsers();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Failed to reset password', text2: getFriendlyErrorMessage(error) });
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleProcessAuth = async (userId: string, userName: string) => {
    try {
      setActionLoadingId(userId);
      await adminApi.post(`/auth-console/users/${userId}/mark-processing`);
      Toast.show({
        type: 'info',
        text1: `User ${userName} sent to Auth Console Processing queue!`,
        text2: 'Open User Authentication Console to complete manual verification.'
      });
      fetchUsers();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Failed to process auth', text2: getFriendlyErrorMessage(error) });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    Alert.alert(
      "Deactivate User",
      `Deactivate user "${userName}"? This will soft-delete their account.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoadingId(userId);
              await adminApi.delete(`/users/${userId}`);
              Toast.show({ type: 'info', text1: `User "${userName}" deactivated` });
              fetchUsers();
            } catch (error: any) {
              Toast.show({ type: 'error', text1: 'Failed to deactivate user', text2: getFriendlyErrorMessage(error) });
            } finally {
              setActionLoadingId(null);
            }
          }
        }
      ]
    );
  };

  const handleVerifyKyc = async (userId: string, currentVerified: boolean) => {
    try {
      setActionLoadingId(userId);
      await adminApi.put(`/users/${userId}`, {
        isVerified: !currentVerified,
        aadhaarStatus: !currentVerified ? 'VERIFIED' : 'PENDING'
      });

      Toast.show({
        type: 'success',
        text1: !currentVerified ? 'User Verified Successfully!' : 'User Verification Revoked'
      });

      fetchUsers();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Failed to update KYC status', text2: getFriendlyErrorMessage(error) });
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderUserItem = ({ item }: { item: any }) => {
    const isPartner = item.role === 'PARTNER';
    const partnerInfo = item.partner || {};

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={[styles.avatarCircle, { backgroundColor: isPartner ? '#FF6B1A' : '#3B82F6' }]}>
              <Text style={styles.avatarText}>{(item.name || 'U').charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.userName}>{item.name || 'User'}</Text>
              <Text style={styles.userPhone}>{item.phone || 'No Phone'}</Text>
            </View>
          </View>

          <View style={[styles.roleBadge, { backgroundColor: isPartner ? '#FFF0D6' : '#EFF6FF' }]}>
            <Text style={[styles.roleBadgeText, { color: isPartner ? '#FF6B1A' : '#2563EB' }]}>{item.role}</Text>
          </View>
        </View>

        {/* Status Grid */}
        <View style={styles.statusGrid}>
          <View style={styles.statusBox}>
            <Text style={styles.statusBoxLabel}>Account Status</Text>
            <Text style={[styles.statusBoxValue, { color: item.isVerified ? '#10B981' : '#F59E0B' }]}>
              {item.isVerified ? '✓ Verified' : '⏳ Unverified'}
            </Text>
          </View>

          <View style={styles.statusBox}>
            <Text style={styles.statusBoxLabel}>Aadhaar KYC</Text>
            <Text style={[
              styles.statusBoxValue,
              {
                color: item.isVerified || item.aadhaarStatus === 'VERIFIED'
                  ? '#10B981'
                  : item.isAuthProcessing
                  ? '#2563EB'
                  : '#F59E0B'
              }
            ]}>
              {item.isVerified || item.aadhaarStatus === 'VERIFIED'
                ? 'VERIFIED'
                : item.isAuthProcessing
                ? 'PROCESSING'
                : (item.aadhaarStatus || 'PENDING')}
            </Text>
          </View>

          {isPartner && (
            <View style={styles.statusBox}>
              <Text style={styles.statusBoxLabel}>Wallet Balance</Text>
              <Text style={[styles.statusBoxValue, { color: '#FF6B1A', fontFamily: 'DMMono-Medium' }]}>
                ₹{(partnerInfo.walletBalance || 0).toLocaleString('en-IN')}
              </Text>
            </View>
          )}
        </View>

        {/* Operation 1: Aadhaar & KYC Verification */}
        <View style={styles.opHeaderRow}>
          <Text style={styles.opHeaderLabel}>OPERATIONS</Text>
        </View>

        <View style={styles.actionRow}>
          {/* Operation 1 Button: Aadhaar Verification */}
          <TouchableOpacity
            style={[styles.opButton, item.isVerified ? styles.opButtonVerified : styles.opButtonUnverified]}
            onPress={() => handleVerifyKyc(item.id, item.isVerified)}
            disabled={actionLoadingId === item.id}
          >
            {actionLoadingId === item.id ? (
              <ActivityIndicator color={item.isVerified ? '#DC2626' : '#FFFFFF'} size="small" />
            ) : (
              <>
                <Feather name={item.isVerified ? "shield-off" : "shield"} size={14} color={item.isVerified ? "#DC2626" : "#FFFFFF"} />
                <Text style={[styles.opButtonText, item.isVerified && styles.opButtonTextVerified]}>
                  {item.isVerified ? 'Revoke Aadhaar' : 'Verify Aadhaar'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Operation 2 Button: Move to Auth Console Processing (Only if NOT verified) */}
          {!item.isVerified && item.aadhaarStatus !== 'VERIFIED' && (
            item.isAuthProcessing ? (
              <View style={[styles.opButtonAuth, { backgroundColor: '#DBEAFE' }]}>
                <Feather name="clock" size={14} color="#2563EB" />
                <Text style={[styles.opButtonTextAuth, { color: '#2563EB' }]}>Processing...</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.opButtonAuth}
                onPress={() => handleProcessAuth(item.id, item.name)}
                disabled={actionLoadingId === item.id}
              >
                {actionLoadingId === item.id ? (
                  <ActivityIndicator color="#D97706" size="small" />
                ) : (
                  <>
                    <Feather name="arrow-right-circle" size={14} color="#D97706" />
                    <Text style={styles.opButtonTextAuth}>Process Auth</Text>
                  </>
                )}
              </TouchableOpacity>
            )
          )}

          {isSuperadmin && (
            <TouchableOpacity
              style={styles.deleteUserButton}
              onPress={() => handleDeleteUser(item.id, item.name)}
            >
              <Feather name="trash-2" size={14} color="#DC2626" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Superadmin Add User Header */}
      {isSuperadmin && (
        <View style={styles.superHeader}>
          <Text style={styles.superTitle}>User Management</Text>
          <TouchableOpacity 
            style={styles.addUserButton}
            onPress={() => {
              setNewName('');
              setNewPhone('');
              setCreateModalVisible(true);
            }}
          >
            <Feather name="user-plus" size={16} color="#FFFFFF" />
            <Text style={styles.addUserText}>Add User</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <Feather name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone number..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); fetchUsers(); }}>
            <Feather name="x" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Role Filter Tabs (Row 1) */}
      <View style={styles.tabBar}>
        {(['ALL', 'PARTNER', 'CLIENT'] as const).map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.tabItem, roleFilter === r && styles.tabItemActive]}
            onPress={() => setRoleFilter(r)}
          >
            <Text style={[styles.tabText, roleFilter === r && styles.tabTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* KYC Status Filter Tabs (Row 2 - Second Column/Bar) */}
      <View style={[styles.tabBar, styles.kycTabBar]}>
        {(['ALL', 'PENDING', 'PROCESSING', 'VERIFIED'] as const).map((k) => {
          const isActive = kycFilter === k;
          let activeColor = '#FF6B1A';
          if (k === 'PENDING') activeColor = '#D97706';
          if (k === 'PROCESSING') activeColor = '#2563EB';
          if (k === 'VERIFIED') activeColor = '#10B981';

          return (
            <TouchableOpacity
              key={k}
              style={[
                styles.tabItem,
                isActive && { backgroundColor: activeColor }
              ]}
              onPress={() => setKycFilter(k)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{k}</Text>
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
          <Feather name="users" size={48} color="#C4B5A5" />
          <Text style={styles.emptyTitle}>No Users Found</Text>
          <Text style={styles.emptySub}>No user matching current search criteria</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B1A" />}
        />
      )}

      {/* Superadmin Create User Modal */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New App User</Text>
            <Text style={styles.modalSub}>Create a new Partner or Client account directly:</Text>

            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Ramesh Kumar"
              placeholderTextColor="#C4B5A5"
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={styles.inputLabel}>Phone Number *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 9876543210"
              placeholderTextColor="#C4B5A5"
              keyboardType="phone-pad"
              maxLength={10}
              value={newPhone}
              onChangeText={setNewPhone}
            />

            <Text style={styles.inputLabel}>Account Role *</Text>
            <View style={styles.rolePickerRow}>
              <TouchableOpacity
                style={[styles.roleOption, newRole === 'PARTNER' && styles.roleOptionActive]}
                onPress={() => setNewRole('PARTNER')}
              >
                <Text style={[styles.roleOptionText, newRole === 'PARTNER' && styles.roleOptionTextActive]}>PARTNER (Worker)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleOption, newRole === 'CLIENT' && styles.roleOptionActive]}
                onPress={() => setNewRole('CLIENT')}
              >
                <Text style={[styles.roleOptionText, newRole === 'CLIENT' && styles.roleOptionTextActive]}>CLIENT (Employer)</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreateUser}
                disabled={submittingUser}
              >
                {submittingUser ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reset User Password Modal */}
      <Modal visible={resetModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manual User Password Reset</Text>
            <Text style={styles.modalSub}>
              Set a new login password for {selectedResetUser?.name || 'User'} ({selectedResetUser?.phone}):
            </Text>

            {generatedTempPass ? (
              <View style={styles.successPassBox}>
                <Feather name="check-circle" size={24} color="#10B981" />
                <Text style={styles.successPassTitle}>Password Reset Successful!</Text>
                <Text style={styles.successPassLabel}>New Temporary Password (Share with User):</Text>
                <View style={styles.passCodeBox}>
                  <Text style={styles.passCodeText}>{generatedTempPass}</Text>
                </View>
                <TouchableOpacity
                  style={styles.doneModalBtn}
                  onPress={() => {
                    setResetModalVisible(false);
                    setGeneratedTempPass(null);
                  }}
                >
                  <Text style={styles.doneModalText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.inputLabel}>New Password (Optional - min 6 chars)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Leave empty for auto-generated password"
                  placeholderTextColor="#C4B5A5"
                  secureTextEntry
                  value={customResetPass}
                  onChangeText={setCustomResetPass}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setResetModalVisible(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: '#D97706' }]}
                    onPress={handleConfirmResetUserPassword}
                    disabled={submittingReset}
                  >
                    {submittingReset ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Reset Password</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    backgroundColor: '#FFFFFF',
    margin: 14,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.2)',
  },
  searchIcon: {
    marginRight: 8,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  kycTabBar: {
    paddingTop: 4,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
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
    alignItems: 'center',
    marginBottom: 14,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: 'Syne-Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  userName: {
    fontFamily: 'Syne-Bold',
    fontSize: 16,
    color: '#1C1410',
  },
  userPhone: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 13,
    color: '#6B5C4E',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 11,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  statusBox: {
    flex: 1,
  },
  statusBoxLabel: {
    fontFamily: 'Nunito-Bold',
    fontSize: 10,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  statusBoxValue: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
  },
  opHeaderRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginBottom: 6,
  },
  opHeaderLabel: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 10,
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  opButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  opButtonUnverified: {
    backgroundColor: '#10B981',
  },
  opButtonVerified: {
    backgroundColor: '#FEE2E2',
  },
  opButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  opButtonTextVerified: {
    color: '#DC2626',
  },
  opButtonAuth: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  opButtonTextAuth: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
    color: '#D97706',
  },
  deleteUserButton: {
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
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
  doneModalBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  doneModalText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  superHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  superTitle: {
    fontFamily: 'Syne-Bold',
    fontSize: 18,
    color: '#1C1410',
  },
  addUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addUserText: {
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
    marginTop: 10,
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
  rolePickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  roleOptionActive: {
    backgroundColor: '#FF6B1A',
  },
  roleOptionText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 13,
    color: '#4B5563',
  },
  roleOptionTextActive: {
    color: '#FFFFFF',
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
});
