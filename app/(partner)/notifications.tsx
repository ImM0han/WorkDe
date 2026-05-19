import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useNotificationStore, NotificationItem } from '../../src/store/notificationStore';
import { Swipeable } from 'react-native-gesture-handler';

const NotificationRow = React.memo(({ item, onRead, onRemove }: { item: NotificationItem; onRead: (id: string) => void; onRemove: (id: string) => void }) => {
  const renderRightActions = (progress: any, dragX: any) => {
    const scale = dragX.interpolate({ inputRange: [-80, 0], outputRange: [1, 0], extrapolate: 'clamp' });
    return (
      <TouchableOpacity onPress={() => onRemove(item.id)} style={styles.deleteAction}>
        <Animated.Text style={[styles.deleteText, { transform: [{ scale }] }]}>Delete</Animated.Text>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <TouchableOpacity 
        style={[styles.row, !item.isRead && styles.rowUnread]} 
        onPress={() => onRead(item.id)}
      >
        <View style={[styles.dot, !item.isRead ? styles.dotUnread : styles.dotRead]} />
        <View style={styles.rowContent}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
          <Text style={styles.timestamp}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
});

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, markAsRead, removeNotification, markAllAsRead } = useNotificationStore();
  const [filter, setFilter] = useState<'All' | 'Jobs' | 'Payments' | 'KYC'>('All');

  const filtered = notifications.filter(n => {
    if (filter === 'All') return true;
    if (filter === 'Jobs') return n.type === 'NEW_JOB';
    if (filter === 'Payments') return n.type === 'PAYMENT';
    if (filter === 'KYC') return n.type === 'KYC';
    return true;
  });

  const TabButton = ({ title }: { title: any }) => {
    const active = filter === title;
    return (
      <TouchableOpacity onPress={() => setFilter(title)} style={{ flex: 1 }}>
        {active ? (
          <LinearGradient colors={['#FF6B1A', '#F59E0B']} style={styles.tabActive}>
            <Text style={styles.tabTextActive}>{title}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.tabInactive}>
            <Text style={styles.tabTextInactive}>{title}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
          <Text style={styles.markAllText}>Read All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        <TabButton title="All" />
        <TabButton title="Jobs" />
        <TabButton title="Payments" />
        <TabButton title="KYC" />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <NotificationRow item={item} onRead={markAsRead} onRemove={removeNotification} />
        )}
        getItemLayout={(_, index) => ({ length: 80, offset: 80 * index, index })}
        windowSize={5}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
        initialNumToRender={8}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No notifications here yet.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE0CC' },
  backBtn: { width: 70 },
  backText: { fontFamily: 'Nunito-Bold', color: '#6B5C4E' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'Syne-Bold', fontSize: 18, color: '#1C1410' },
  markAllBtn: { width: 70, alignItems: 'flex-end' },
  markAllText: { fontFamily: 'Nunito-SemiBold', fontSize: 12, color: '#FF6B1A' },
  tabsContainer: { flexDirection: 'row', padding: 16, gap: 8 },
  tabActive: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, alignItems: 'center' },
  tabInactive: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEE0CC' },
  tabTextActive: { fontFamily: 'Nunito-Bold', color: '#FFFFFF', fontSize: 12 },
  tabTextInactive: { fontFamily: 'Nunito-SemiBold', color: '#6B5C4E', fontSize: 12 },
  row: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#EEE0CC', gap: 12, alignItems: 'flex-start' },
  rowUnread: { backgroundColor: '#FFF0D6', borderColor: '#F5E8D5' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  dotUnread: { backgroundColor: '#FF6B1A' },
  dotRead: { borderWidth: 1, borderColor: '#C4B5A5', backgroundColor: 'transparent' },
  rowContent: { flex: 1 },
  title: { fontFamily: 'Syne-Bold', fontSize: 16, color: '#1C1410', marginBottom: 4 },
  body: { fontFamily: 'Nunito-Regular', fontSize: 14, color: '#6B5C4E', marginBottom: 8 },
  timestamp: { fontFamily: 'DMMono-Regular', fontSize: 10, color: '#C4B5A5' },
  deleteAction: { backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', width: 80, borderRadius: 12, marginLeft: 8 },
  deleteText: { color: 'white', fontFamily: 'Nunito-Bold' },
  emptyText: { textAlign: 'center', fontFamily: 'Nunito-SemiBold', color: '#C4B5A5', marginTop: 40 }
});
