import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAdminStore } from '../../src/stores/adminStore';
import adminApi from '../../src/services/adminApiClient';
import Toast from 'react-native-toast-message';

export default function AdminDashboardScreen() {
  const { adminUser, logoutAdmin } = useAdminStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    pendingPayoutsCount: 0,
    pendingPayoutsTotal: 0,
    pendingKycCount: 0,
    openDisputesCount: 0,
    totalUsersCount: 0,
  });

  const fetchStats = async () => {
    try {
      const [withdrawalsRes, usersRes, disputesRes] = await Promise.all([
        adminApi.get('/withdrawals?status=PENDING'),
        adminApi.get('/users?aadhaarStatus=PENDING'),
        adminApi.get('/transactions/disputes?status=OPEN'),
      ]);

      const pendingWithdrawals = withdrawalsRes.data.withdrawals || [];
      const pendingTotal = pendingWithdrawals.reduce((sum: number, w: any) => sum + (w.amount || 0), 0);

      setStats({
        pendingPayoutsCount: withdrawalsRes.data.pagination?.total || pendingWithdrawals.length,
        pendingPayoutsTotal: pendingTotal,
        pendingKycCount: usersRes.data.pagination?.total || 0,
        openDisputesCount: disputesRes.data.pagination?.total || 0,
        totalUsersCount: usersRes.data.pagination?.total || 0,
      });
    } catch (error: any) {
      console.error('[Admin Dashboard] Fetch stats error:', error);
      Toast.show({ type: 'error', text1: 'Failed to load dashboard metrics' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const handleLogout = async () => {
    await logoutAdmin();
    Toast.show({ type: 'info', text1: 'Logged out of Admin Console' });
    router.replace('/(auth)/login');
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B1A" />
        <Text style={styles.loadingText}>Loading Ops Console...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B1A" />}
    >
      {/* Header Profile Banner */}
      <View style={styles.profileBanner}>
        <View style={styles.profileInfo}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{adminUser?.username.charAt(0).toUpperCase() || 'A'}</Text>
          </View>
          <View>
            <Text style={styles.adminUsername}>{adminUser?.username}</Text>
            <View style={styles.roleBadge}>
              <Feather name="shield" size={12} color="#FF6B1A" />
              <Text style={styles.roleText}>{adminUser?.role}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Feather name="log-out" size={18} color="#FF4D4D" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Operational Action Center</Text>

      {/* Main Feature Cards */}
      <View style={styles.grid}>
        {/* Payout Processing Tile */}
        <TouchableOpacity 
          style={[styles.tileCard, { borderLeftColor: '#FF6B1A' }]}
          onPress={() => router.push('/(admin)/withdrawals')}
          activeOpacity={0.8}
        >
          <View style={styles.tileHeader}>
            <View style={[styles.iconBox, { backgroundColor: '#FFF0D6' }]}>
              <Feather name="dollar-sign" size={24} color="#FF6B1A" />
            </View>
            {stats.pendingPayoutsCount > 0 && (
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>{stats.pendingPayoutsCount} PENDING</Text>
              </View>
            )}
          </View>
          <Text style={styles.tileTitle}>Manual Payout Processing</Text>
          <Text style={styles.tileSub}>
            {stats.pendingPayoutsCount > 0 
              ? `₹${stats.pendingPayoutsTotal.toLocaleString('en-IN')} pending approval`
              : 'All withdrawal requests processed'}
          </Text>
          <View style={styles.tileFooter}>
            <Text style={styles.actionText}>Process Payouts →</Text>
          </View>
        </TouchableOpacity>

        {/* KYC & User Verification Tile */}
        <TouchableOpacity 
          style={[styles.tileCard, { borderLeftColor: '#10B981' }]}
          onPress={() => router.push('/(admin)/users')}
          activeOpacity={0.8}
        >
          <View style={styles.tileHeader}>
            <View style={[styles.iconBox, { backgroundColor: '#E6F4EA' }]}>
              <Feather name="user-check" size={24} color="#10B981" />
            </View>
            {stats.pendingKycCount > 0 && (
              <View style={[styles.alertBadge, { backgroundColor: '#D1FAE5' }]}>
                <Text style={[styles.alertBadgeText, { color: '#047857' }]}>{stats.pendingKycCount} PENDING</Text>
              </View>
            )}
          </View>
          <Text style={styles.tileTitle}>User & KYC Verification</Text>
          <Text style={styles.tileSub}>Verify partner Aadhaar & profiles</Text>
          <View style={styles.tileFooter}>
            <Text style={[styles.actionText, { color: '#10B981' }]}>Manage Users →</Text>
          </View>
        </TouchableOpacity>

        {/* Dispute Resolution Tile */}
        <TouchableOpacity 
          style={[styles.tileCard, { borderLeftColor: '#6366F1' }]}
          onPress={() => router.push('/(admin)/disputes')}
          activeOpacity={0.8}
        >
          <View style={styles.tileHeader}>
            <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
              <Feather name="alert-circle" size={24} color="#6366F1" />
            </View>
            {stats.openDisputesCount > 0 && (
              <View style={[styles.alertBadge, { backgroundColor: '#E0E7FF' }]}>
                <Text style={[styles.alertBadgeText, { color: '#4338CA' }]}>{stats.openDisputesCount} OPEN</Text>
              </View>
            )}
          </View>
          <Text style={styles.tileTitle}>Dispute Resolution</Text>
          <Text style={styles.tileSub}>Resolve open job dispute tickets</Text>
          <View style={styles.tileFooter}>
            <Text style={[styles.actionText, { color: '#6366F1' }]}>Resolve Tickets →</Text>
          </View>
        </TouchableOpacity>

        {/* User Authentication Console Tile */}
        <TouchableOpacity 
          style={[styles.tileCard, { borderLeftColor: '#D97706' }]}
          onPress={() => router.push('/(admin)/auth-console' as any)}
          activeOpacity={0.8}
        >
          <View style={styles.tileHeader}>
            <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
              <Feather name="key" size={24} color="#D97706" />
            </View>
            <View style={[styles.alertBadge, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.alertBadgeText, { color: '#B45309' }]}>MANUAL AUTH QUEUE</Text>
            </View>
          </View>
          <Text style={styles.tileTitle}>User Authentication Console</Text>
          <Text style={styles.tileSub}>Process pending/processing auth & edit verified user passwords</Text>
          <View style={styles.tileFooter}>
            <Text style={[styles.actionText, { color: '#D97706' }]}>Open Auth Queue →</Text>
          </View>
        </TouchableOpacity>

        {/* Superadmin Only: Manage Admins Tile */}
        {adminUser?.role === 'SUPERADMIN' && (
          <TouchableOpacity 
            style={[styles.tileCard, { borderLeftColor: '#EC4899' }]}
            onPress={() => router.push('/(admin)/manage-admins' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.tileHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#FCE7F3' }]}>
                <Feather name="shield" size={24} color="#EC4899" />
              </View>
              <View style={[styles.alertBadge, { backgroundColor: '#FCE7F3' }]}>
                <Text style={[styles.alertBadgeText, { color: '#BE185D' }]}>SUPERADMIN ONLY</Text>
              </View>
            </View>
            <Text style={styles.tileTitle}>Manage Admin Accounts (CRUD)</Text>
            <Text style={styles.tileSub}>Issue, list, reset password & deactivate Admins</Text>
            <View style={styles.tileFooter}>
              <Text style={[styles.actionText, { color: '#EC4899' }]}>Manage Admins →</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF6EE',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF6EE',
  },
  loadingText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: '#6B5C4E',
    marginTop: 12,
  },
  profileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.15)',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontFamily: 'Syne-Bold',
    fontSize: 20,
    color: '#FFFFFF',
  },
  adminUsername: {
    fontFamily: 'Syne-Bold',
    fontSize: 18,
    color: '#1C1410',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  roleText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
    color: '#FF6B1A',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFF0F0',
  },
  logoutText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 13,
    color: '#FF4D4D',
  },
  sectionTitle: {
    fontFamily: 'Syne-Bold',
    fontSize: 20,
    color: '#1C1410',
    marginBottom: 16,
  },
  grid: {
    gap: 16,
  },
  tileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  tileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBadge: {
    backgroundColor: '#FFE6D5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alertBadgeText: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 11,
    color: '#FF6B1A',
  },
  tileTitle: {
    fontFamily: 'Syne-Bold',
    fontSize: 18,
    color: '#1C1410',
    marginBottom: 4,
  },
  tileSub: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    color: '#6B5C4E',
    marginBottom: 16,
  },
  tileFooter: {
    alignSelf: 'flex-end',
  },
  actionText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: '#FF6B1A',
  },
});
