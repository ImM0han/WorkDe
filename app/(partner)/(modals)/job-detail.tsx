import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MapView from 'react-native-maps';

export default function JobDetailModal() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  // Mock job details
  const job = {
    id: jobId,
    category: 'Electrician',
    address: 'Block C, Whitefield',
    rate: 1200,
    rateType: 'DAILY',
    distance: 3.5,
    description: 'Install new AC wiring and main switchboard.',
    lat: 12.9716,
    lng: 77.5946,
    clientName: 'Rahul M.',
    scheduledDate: '2023-11-15T10:00:00Z'
  };

  const handleAccept = () => {
    // API call: POST /jobs/:id/accept
    router.replace(`/(partner)/(modals)/job-accepted?jobId=${jobId}`);
  };

  const handleReject = () => {
    router.push(`/(partner)/(modals)/reject-reason?jobId=${jobId}`);
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.mapContainer}>
          <MapView 
            style={styles.map} 
            liteMode={true}
            initialRegion={{
              latitude: job.lat,
              longitude: job.lng,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          />
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{job.category}</Text>
            </View>
            <Text style={styles.price}>₹{job.rate}/{job.rateType === 'DAILY' ? 'day' : 'hr'}</Text>
          </View>

          <Text style={styles.address}>{job.address}</Text>
          <Text style={styles.distance}>{job.distance} km away</Text>
          
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{job.description}</Text>

          <View style={styles.clientCard}>
            <View style={styles.clientAvatar}>
              <Text style={styles.clientAvatarText}>{job.clientName.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.clientName}>{job.clientName}</Text>
              <Text style={styles.clientSub}>Client</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.rejectBtn} onPress={handleReject}>
          <Text style={styles.rejectBtnText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtnWrapper} onPress={handleAccept}>
          <LinearGradient colors={['#FF6B1A', '#F59E0B']} style={styles.acceptBtn}>
            <Text style={styles.acceptBtnText}>Accept Job →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE' },
  mapContainer: { height: 200, width: '100%' },
  map: { flex: 1 },
  content: { padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontFamily: 'DM Mono', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', color: '#B45309' },
  price: { fontFamily: 'DMMono-Medium', fontSize: 20, fontWeight: '800', color: '#FF6B1A' },
  address: { fontFamily: 'Syne-ExtraBold', fontSize: 22, color: '#1C1410', marginBottom: 4 },
  distance: { fontFamily: 'DMMono-Regular', fontSize: 14, color: '#C4B5A5', marginBottom: 24 },
  sectionTitle: { fontFamily: 'Syne-Bold', fontSize: 15, color: '#1C1410', marginBottom: 8 },
  description: { fontFamily: 'Nunito-SemiBold', fontSize: 16, color: '#6B5C4E', lineHeight: 24, marginBottom: 24 },
  clientCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#EEE0CC', gap: 12 },
  clientAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF0D6', justifyContent: 'center', alignItems: 'center' },
  clientAvatarText: { fontFamily: 'Syne-Bold', fontSize: 16, color: '#FF6B1A' },
  clientName: { fontFamily: 'Syne-Bold', fontSize: 16, color: '#1C1410' },
  clientSub: { fontFamily: 'Nunito-SemiBold', fontSize: 12, color: '#6B5C4E' },
  footer: { flexDirection: 'row', padding: 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EEE0CC', gap: 16 },
  rejectBtn: { flex: 1, height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: '#EF4444' },
  rejectBtnText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#EF4444' },
  acceptBtnWrapper: { flex: 2 },
  acceptBtn: { height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  acceptBtnText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#FFFFFF' }
});
