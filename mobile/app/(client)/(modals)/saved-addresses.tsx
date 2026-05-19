import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AddressCard from '../../../src/components/AddressCard';
import api from '../../../src/services/apiClient';

export default function SavedAddresses() {
  const queryClient = useQueryClient();

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['savedAddresses'],
    queryFn: () => api.get('/addresses').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/addresses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedAddresses'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/addresses/${id}/default`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedAddresses'] });
    },
  });

  const handleDelete = (id: string) => {
    Alert.alert(
      'Remove Address',
      'Are you sure you want to remove this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1A0C02', '#CC4A00', '#FF6B1A', '#FF8C42']}
        style={styles.header}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Addresses</Text>
        <Text style={styles.headerSub}>
          {addresses.length} address{addresses.length !== 1 ? 'es' : ''} saved
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.list}>
        {/* Add New Address button — always at the top */}
        <TouchableOpacity
          style={styles.addNewBtn}
          onPress={() => router.push('/(client)/(modals)/add-address')}
        >
          <Text style={styles.addNewIcon}>＋</Text>
          <View>
            <Text style={styles.addNewTitle}>Add New Address</Text>
            <Text style={styles.addNewSub}>
              Use GPS, search, or drop a pin on map
            </Text>
          </View>
        </TouchableOpacity>

        {/* Saved address cards */}
        {addresses.map((addr: any) => (
          <AddressCard
            key={addr.id}
            address={addr}
            mode="manage"
            onEdit={() => router.push(`/(client)/(modals)/add-address?addressId=${addr.id}`)}
            onDelete={() => handleDelete(addr.id)}
            onSetDefault={() => setDefaultMutation.mutate(addr.id)}
          />
        ))}

        {!isLoading && addresses.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyTitle}>No saved addresses yet</Text>
            <Text style={styles.emptySub}>
              Add an address to use it quickly when posting jobs
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE' },
  header: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20 },
  backBtn: { marginBottom: 12 },
  backBtnText: {
    fontFamily: 'Syne-Bold', fontSize: 14, color: 'rgba(255,255,255,0.8)',
  },
  headerTitle: {
    fontFamily: 'Syne-ExtraBold', fontSize: 26, color: '#FFFFFF', marginBottom: 4,
  },
  headerSub: {
    fontFamily: 'Syne-Bold', fontSize: 13, color: 'rgba(255,255,255,0.7)',
  },
  list: { padding: 16 },
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FF6B1A',
    borderStyle: 'dashed',
  },
  addNewIcon: {
    fontSize: 28, color: '#FF6B1A',
    width: 44, textAlign: 'center',
  },
  addNewTitle: {
    fontFamily: 'Syne-Bold', fontSize: 15, color: '#FF6B1A',
  },
  addNewSub: {
    fontFamily: 'Syne-Bold', fontSize: 12, color: '#6B5C4E',
  },
  empty: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontFamily: 'Syne-Bold', fontSize: 17, color: '#1C1410',
  },
  emptySub: {
    fontFamily: 'Syne-Bold', fontSize: 14,
    color: '#6B5C4E', textAlign: 'center',
  },
});
