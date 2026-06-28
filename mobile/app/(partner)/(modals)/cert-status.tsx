import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../src/stores/authStore';
import api from '../../../src/services/apiClient';

export default function CertStatusModal() {
  const { user } = useAuthStore();
  const partnerIdToUse = user?.partnerId || (user as any)?.partner?.id;

  const { data: partnerData, isLoading, refetch } = useQuery({
    queryKey: ['partnerProfile', partnerIdToUse],
    queryFn: () => api.get(`/partner/${partnerIdToUse}`).then(r => r.data),
    enabled: !!partnerIdToUse
  });

  useFocusEffect(
    useCallback(() => {
      if (partnerIdToUse) {
        refetch();
      }
    }, [partnerIdToUse, refetch])
  );

  const certs = partnerData?.certificates || [];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'VERIFIED': return '#22C55E';
      case 'REJECTED': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Certificates & Docs</Text>
        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => router.push('/(partner)/(modals)/add-certificate')}
        >
          <LinearGradient colors={['#FF6B1A', '#F59E0B']} style={styles.addBtnInner}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#FF6B1A" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {certs.length > 0 ? (
            certs.map((cert: any) => (
              <View key={cert.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.skill}>{cert.skill}</Text>
                  <View style={[styles.statusBadge, { borderColor: getStatusColor(cert.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(cert.status) }]}>{cert.status}</Text>
                  </View>
                </View>
                <Text style={styles.name}>{cert.name}</Text>
                {cert.rejectionReason && cert.status === 'REJECTED' && (
                  <Text style={styles.rejectionReason}>Reason: {cert.rejectionReason}</Text>
                )}
                <Text style={styles.date}>Submitted on {formatDate(cert.createdAt)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No certificates submitted yet.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE', padding: 24, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontFamily: 'Syne-ExtraBold', fontSize: 24, color: '#1C1410' },
  addBtn: { borderRadius: 10, overflow: 'hidden' },
  addBtnInner: { paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: '#FFFFFF' },
  content: { paddingBottom: 24 },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#EEE0CC', marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  skill: { fontFamily: 'DMMono-Medium', fontSize: 12, color: '#6B5C4E', textTransform: 'uppercase' },
  statusBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontFamily: 'Nunito-Bold', fontSize: 10 },
  name: { fontFamily: 'Syne-Bold', fontSize: 16, color: '#1C1410', marginBottom: 8 },
  date: { fontFamily: 'Nunito-SemiBold', fontSize: 12, color: '#C4B5A5' },
  rejectionReason: { fontFamily: 'Nunito-SemiBold', fontSize: 13, color: '#EF4444', marginBottom: 8 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  emptyText: { fontFamily: 'Nunito-SemiBold', fontSize: 14, color: '#C4B5A5', textAlign: 'center' }
});
