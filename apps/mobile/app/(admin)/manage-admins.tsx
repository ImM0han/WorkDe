import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Modal, TextInput, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import adminApi from '../../src/services/adminApiClient';
import Toast from 'react-native-toast-message';
import { getFriendlyErrorMessage } from '../../src/services/errorHelpers';
import { useAdminStore } from '../../src/stores/adminStore';

export default function ManageAdminsScreen() {
  const { adminUser } = useAdminStore();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Create Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'SUPERADMIN'>('ADMIN');
  const [customPassword, setCustomPassword] = useState('');
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createdTempPassword, setCreatedTempPassword] = useState<string | null>(null);

  const isSuperadmin = adminUser?.role === 'SUPERADMIN';

  const fetchAdmins = async () => {
    try {
      const res = await adminApi.get('/admins');
      setAdmins(res.data.admins || []);
    } catch (error: any) {
      console.error('[Manage Admins] Fetch error:', error);
      Toast.show({ type: 'error', text1: 'Failed to fetch admin accounts' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isSuperadmin) {
      setLoading(true);
      fetchAdmins();
    }
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdmins();
  };

  const handleCreateAdmin = async () => {
    if (!newUsername.trim() || newUsername.trim().length < 3) {
      Toast.show({ type: 'error', text1: 'Username must be at least 3 characters' });
      return;
    }

    try {
      setSubmittingCreate(true);
      const res = await adminApi.post('/admins', {
        username: newUsername.trim(),
        role: newRole,
        customPassword: customPassword.trim() || undefined
      });

      const tempPass = res.data.temporaryPassword;
      setCreatedTempPassword(tempPass);
      Toast.show({ type: 'success', text1: 'Admin created successfully!' });
      fetchAdmins();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Failed to create admin', text2: getFriendlyErrorMessage(error) });
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleToggleActive = async (adminId: string, currentActive: boolean) => {
    try {
      setActionLoadingId(adminId);
      await adminApi.put(`/admins/${adminId}`, {
        isActive: !currentActive
      });

      Toast.show({
        type: 'info',
        text1: !currentActive ? 'Admin Account Activated' : 'Admin Account Deactivated'
      });
      fetchAdmins();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Failed to update admin status', text2: getFriendlyErrorMessage(error) });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResetPassword = async (adminId: string, username: string) => {
    Alert.alert(
      "Reset Admin Password",
      `Are you sure you want to reset the password for ${username}? A new temporary password will be generated.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Password",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoadingId(adminId);
              const res = await adminApi.put(`/admins/${adminId}`, { resetPassword: true });
              const newPass = res.data.temporaryPassword;
              Alert.alert(
                "Password Reset Successful",
                `New Temporary Password for ${username}:\n\n${newPass}\n\nPlease copy and store this password safely.`,
                [{ text: "OK" }]
              );
              fetchAdmins();
            } catch (error: any) {
              Toast.show({ type: 'error', text1: 'Failed to reset password', text2: getFriendlyErrorMessage(error) });
            } finally {
              setActionLoadingId(null);
            }
          }
        }
      ]
    );
  };

  const handleDeleteAdmin = async (adminId: string, username: string) => {
    Alert.alert(
      "Deactivate Admin",
      `Deactivate admin account for "${username}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoadingId(adminId);
              await adminApi.delete(`/admins/${adminId}`);
              Toast.show({ type: 'info', text1: `Admin "${username}" deactivated` });
              fetchAdmins();
            } catch (error: any) {
              Toast.show({ type: 'error', text1: 'Failed to deactivate admin', text2: getFriendlyErrorMessage(error) });
            } finally {
              setActionLoadingId(null);
            }
          }
        }
      ]
    );
  };

  if (!isSuperadmin) {
    return (
      <View style={styles.centerContainer}>
        <Feather name="lock" size={48} color="#DC2626" />
        <Text style={styles.forbiddenTitle}>Access Restricted</Text>
        <Text style={styles.forbiddenSub}>Superadmin privileges are required to manage Admin accounts.</Text>
      </View>
    );
  }

  const renderAdminItem = ({ item }: { item: any }) => {
    const isSelf = item.id === adminUser?.id;
    const isSuper = item.role === 'SUPERADMIN';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.adminInfo}>
            <View style={[styles.avatarCircle, { backgroundColor: isSuper ? '#FF6B1A' : '#4B5563' }]}>
              <Text style={styles.avatarText}>{(item.username || 'A').charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.usernameText}>{item.username} {isSelf && '(You)'}</Text>
              <Text style={styles.createdText}>Created: {new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
          </View>

          <View style={[styles.roleBadge, { backgroundColor: isSuper ? '#FFF0D6' : '#F3F4F6' }]}>
            <Text style={[styles.roleText, { color: isSuper ? '#FF6B1A' : '#4B5563' }]}>{item.role}</Text>
          </View>
        </View>

        {/* Status Row */}
        <View style={styles.statusRow}>
          <View style={styles.statusBox}>
            <Text style={styles.statusLabel}>Account Status</Text>
            <Text style={[styles.statusValue, { color: item.isActive ? '#10B981' : '#DC2626' }]}>
              {item.isActive ? 'Active' : 'Inactive / Deactivated'}
            </Text>
          </View>

          <View style={styles.statusBox}>
            <Text style={styles.statusLabel}>Last Login</Text>
            <Text style={styles.statusValue}>
              {item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString() : 'Never'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        {!isSelf && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionBtn, item.isActive ? styles.btnDeactivate : styles.btnActivate]}
              onPress={() => handleToggleActive(item.id, item.isActive)}
              disabled={actionLoadingId === item.id}
            >
              <Feather name={item.isActive ? "user-x" : "user-check"} size={14} color={item.isActive ? "#DC2626" : "#10B981"} />
              <Text style={[styles.actionBtnText, { color: item.isActive ? "#DC2626" : "#10B981" }]}>
                {item.isActive ? 'Deactivate' : 'Activate'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtn, styles.btnReset]}
              onPress={() => handleResetPassword(item.id, item.username)}
              disabled={actionLoadingId === item.id}
            >
              <Feather name="key" size={14} color="#D97706" />
              <Text style={[styles.actionBtnText, { color: "#D97706" }]}>Reset Password</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.headerTitle}>Admin Accounts (CRUD)</Text>
          <Text style={styles.headerSub}>Manage system administrators & roles</Text>
        </View>

        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => {
            setCreatedTempPassword(null);
            setNewUsername('');
            setCustomPassword('');
            setCreateModalVisible(true);
          }}
        >
          <Feather name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Add Admin</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF6B1A" />
        </View>
      ) : admins.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="shield" size={48} color="#C4B5A5" />
          <Text style={styles.emptyTitle}>No Admin Accounts</Text>
        </View>
      ) : (
        <FlatList
          data={admins}
          keyExtractor={(item) => item.id}
          renderItem={renderAdminItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B1A" />}
        />
      )}

      {/* Create Admin Modal */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Issue New Admin Account</Text>
            <Text style={styles.modalSub}>Create a new Admin or Superadmin account credentials:</Text>

            {createdTempPassword ? (
              <View style={styles.successPassBox}>
                <Feather name="check-circle" size={24} color="#10B981" />
                <Text style={styles.successPassTitle}>Admin Created Successfully!</Text>
                <Text style={styles.successPassLabel}>Temporary Password (Save Now):</Text>
                <View style={styles.passCodeBox}>
                  <Text style={styles.passCodeText}>{createdTempPassword}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.doneModalBtn}
                  onPress={() => {
                    setCreateModalVisible(false);
                    setCreatedTempPassword(null);
                  }}
                >
                  <Text style={styles.doneModalText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.inputLabel}>Username *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. john_admin or 9876543210"
                  placeholderTextColor="#C4B5A5"
                  autoCapitalize="none"
                  value={newUsername}
                  onChangeText={setNewUsername}
                />

                <Text style={styles.inputLabel}>Role *</Text>
                <View style={styles.rolePickerRow}>
                  <TouchableOpacity
                    style={[styles.roleOption, newRole === 'ADMIN' && styles.roleOptionActive]}
                    onPress={() => setNewRole('ADMIN')}
                  >
                    <Text style={[styles.roleOptionText, newRole === 'ADMIN' && styles.roleOptionTextActive]}>ADMIN</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.roleOption, newRole === 'SUPERADMIN' && styles.roleOptionActive]}
                    onPress={() => setNewRole('SUPERADMIN')}
                  >
                    <Text style={[styles.roleOptionText, newRole === 'SUPERADMIN' && styles.roleOptionTextActive]}>SUPERADMIN</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Custom Password (Optional - min 8 chars)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Leave empty for auto-generated password"
                  placeholderTextColor="#C4B5A5"
                  secureTextEntry
                  value={customPassword}
                  onChangeText={setCustomPassword}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setCreateModalVisible(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleCreateAdmin}
                    disabled={submittingCreate}
                  >
                    {submittingCreate ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Create Admin</Text>
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
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontFamily: 'Syne-Bold',
    fontSize: 18,
    color: '#1C1410',
  },
  headerSub: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 12,
    color: '#6B5C4E',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF6B1A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  forbiddenTitle: {
    fontFamily: 'Syne-Bold',
    fontSize: 20,
    color: '#DC2626',
    marginTop: 12,
  },
  forbiddenSub: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    color: '#6B5C4E',
    textAlign: 'center',
    marginTop: 6,
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
    marginBottom: 12,
  },
  adminInfo: {
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
  usernameText: {
    fontFamily: 'Syne-Bold',
    fontSize: 16,
    color: '#1C1410',
  },
  createdText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: '#9CA3AF',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 11,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusBox: {
    flex: 1,
  },
  statusLabel: {
    fontFamily: 'Nunito-Bold',
    fontSize: 10,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  statusValue: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
    color: '#111827',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnDeactivate: {
    backgroundColor: '#FEE2E2',
  },
  btnActivate: {
    backgroundColor: '#D1FAE5',
  },
  btnReset: {
    backgroundColor: '#FEF3C7',
  },
  actionBtnText: {
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
    marginBottom: 6,
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
  input: {
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
    backgroundColor: '#FF6B1A',
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
});
