import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import api from '../../../src/services/apiClient';

export default function JobAcceptedModal() {
  const { jobId } = useLocalSearchParams();
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.get(`/jobs/${jobId}`).then(r => r.data),
    enabled: !!jobId
  });

  useEffect(() => {
    scale.value = withTiming(1, { duration: 500 });
    opacity.value = withTiming(1, { duration: 500 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const openNavigation = (lat: number, lng: number) => {
    const url = Platform.select({
      ios: `maps://app?daddr=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}`,
    });
    Linking.canOpenURL(url!).then(supported => {
      if (supported) {
        Linking.openURL(url!);
      } else {
        // Fallback to OSM web
        Linking.openURL(
          `https://www.openstreetmap.org/directions?to=${lat},${lng}`
        );
      }
      // Navigate to the next screen after opening maps
      router.replace(`/(partner)/(modals)/job-in-progress?jobId=${jobId}`);
    });
  };

  const handleNavigate = () => {
    if (job?.lat && job?.lng) {
      openNavigation(job.lat, job.lng);
    } else {
      // Fallback if coordinates are not available yet
      router.replace(`/(partner)/(modals)/job-in-progress?jobId=${jobId}`);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.circle, animatedStyle]}>
        <Text style={styles.checkIcon}>✓</Text>
      </Animated.View>
      
      <Text style={styles.title}>Job Accepted!</Text>
      <Text style={styles.subtitle}>The client has been notified. Start heading to the location.</Text>

      <TouchableOpacity 
        style={styles.navBtnWrapper} 
        onPress={handleNavigate}
      >
        <LinearGradient colors={['#FF6B1A', '#F59E0B']} style={styles.navBtn}>
          <Text style={styles.navBtnText}>Navigate to Job →</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE', justifyContent: 'center', alignItems: 'center', padding: 24 },
  circle: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#FFF0D6', borderWidth: 3, borderColor: '#FF6B1A', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  checkIcon: { fontSize: 40, color: '#FF6B1A' },
  title: { fontFamily: 'Syne-ExtraBold', fontSize: 28, color: '#1C1410', marginBottom: 8 },
  subtitle: { fontFamily: 'Nunito-SemiBold', fontSize: 16, color: '#6B5C4E', textAlign: 'center', marginBottom: 48 },
  navBtnWrapper: { width: '100%' },
  navBtn: { height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  navBtnText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#FFFFFF' }
});
