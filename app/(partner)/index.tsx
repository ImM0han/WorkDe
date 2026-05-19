import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Platform, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import JobCard, { Job } from '../../src/components/JobCard';
import { useAuthStore } from '../../src/stores/authStore';
import { Feather } from '@expo/vector-icons';
import api from '../../src/services/apiClient';
import { useSocketStore } from '../../src/stores/socketStore';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

export default function PartnerDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const [currentLocation, setCurrentLocation] = useState<string>('Detecting location...');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const { data: jobs, refetch, isFetching } = useQuery({
    queryKey: ['nearbyJobs'],
    queryFn: () => api.get('/jobs/nearby').then(r => r.data),
    staleTime: 30_000,
  });

  const { data: partnerData } = useQuery({
    queryKey: ['partnerProfile', user?.partnerId],
    queryFn: () => api.get(`/partner/${user?.partnerId}`).then(r => r.data),
    enabled: !!user?.partnerId,
  });

  useEffect(() => {
    if (!socket) return;
    
    // Auto-detect location and emit online
    (async () => {
      try {
        const Location = require('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setCurrentLocation('Location permission denied');
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        
        socket.emit('partner:online', { lat, lng });

        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { 'User-Agent': 'GigWork/1.0' } }
        );
        const data = await res.json();
        const addr = data.address;
        if (addr) {
          setCurrentLocation([addr.suburb || addr.neighbourhood || addr.road, addr.city || addr.town || addr.district].filter(Boolean).join(', '));
        } else {
          setCurrentLocation('Location found');
        }
      } catch (err) {
        setCurrentLocation('Location error');
      }
    })();

    socket.on('job:new', (payload: { job: any; distance: number; client: any }) => {
      queryClient.setQueryData(['nearbyJobs'], (old: any[] = []) => [
        { ...payload.job, distance: payload.distance, client: payload.client },
        ...old,
      ]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
    return () => { socket.off('job:new'); };
  }, [socket, queryClient]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleAcceptJob = async (job: Job) => {
    try {
      await api.post(`/jobs/${job.id}/accept`);
      queryClient.setQueryData(['nearbyJobs'], (oldData: Job[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter((j) => j.id !== job.id);
      });
      queryClient.setQueryData(['activeJobs'], (oldData: Job[] | undefined) => {
        return [...(oldData || []), job];
      });
      router.push('/(partner)/jobs');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#CC4A00', '#FF6B1A']} style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.userInfo}>
            <TouchableOpacity style={styles.avatarPlaceholder} onPress={pickImage}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={{ width: 44, height: 44, borderRadius: 22 }} />
              ) : (
                <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'P'}</Text>
              )}
            </TouchableOpacity>
            <View>
              <Text style={styles.greetingText}>{t('home.welcomeBack') || 'Welcome back,'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.greeting}>{user?.name?.split(' ')[0] || 'Partner'}</Text>
                {user?.aadhaarStatus === 'VERIFIED' && (
                  <Feather name="check-circle" size={18} color="#3B82F6" />
                )}
              </View>
            </View>
          </View>
          
          <View style={styles.onlineToggle}>
            <Feather name="map-pin" size={14} color="#FFFFFF" />
            <Text style={styles.onlineText} numberOfLines={1}>{currentLocation}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.walletBlock} 
          activeOpacity={0.8}
          onPress={() => router.push('/(partner)/(modals)/wallet')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="pocket" size={18} color="rgba(255,255,255,0.9)" />
            <Text style={styles.walletLabel}>{t('home.walletBalance') || 'Wallet Balance'}</Text>
          </View>
          <Text style={styles.walletAmount}>₹{partnerData?.walletBalance?.toFixed(2) || '0.00'}</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#FF6B1A" />}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.nearbyJobs') || 'Nearby Jobs'}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{jobs?.length || 0}</Text>
          </View>
        </View>
        
        {jobs?.length === 0 ? (
          <Text style={styles.emptyText}>{t('home.noJobsMessage') || 'No jobs nearby right now. We will notify you when a job matches your skills.'}</Text>
        ) : (
          jobs?.map((job: Job) => <JobCard key={job.id} job={job} onAccept={() => handleAcceptJob(job)} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, elevation: 8, shadowColor: '#CC4A00', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  avatarText: { fontFamily: 'Syne-Bold', fontSize: 18, color: '#FFFFFF' },
  greetingText: { fontFamily: 'Nunito-SemiBold', fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
  greeting: { fontFamily: 'Syne-ExtraBold', fontSize: 18, color: '#FFFFFF' },
  onlineToggle: { maxWidth: '50%', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  onlineText: { fontFamily: 'Nunito-SemiBold', fontSize: 12, color: '#FFFFFF' },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  walletBlock: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  walletLabel: { fontFamily: 'Nunito-SemiBold', fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  walletAmount: { fontFamily: 'DMMono-Medium', fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  content: { padding: 20, paddingTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  sectionTitle: { fontFamily: 'Nunito-Bold', fontSize: 18, color: '#111827' },
  countBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  countText: { fontFamily: 'Nunito-Bold', fontSize: 12, color: '#166534' },
  emptyText: { fontFamily: 'Nunito-SemiBold', fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 40 }
});
