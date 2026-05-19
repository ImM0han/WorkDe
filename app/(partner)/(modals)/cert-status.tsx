import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function CertStatusModal() {
  const certs = [
    { id: '1', skill: 'Electrician', name: 'Level 2 Wiring Certification', status: 'VERIFIED', date: 'Oct 20, 2023' },
    { id: '2', skill: 'Plumber', name: 'Advanced Pipe Fitting', status: 'PENDING', date: 'Oct 22, 2023' },
  ];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'VERIFIED': return '#22C55E';
      case 'REJECTED': return '#EF4444';
      default: return '#F59E0B';
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

      <ScrollView contentContainerStyle={styles.content}>
        {certs.map(cert => (
          <View key={cert.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.skill}>{cert.skill}</Text>
              <View style={[styles.statusBadge, { borderColor: getStatusColor(cert.status) }]}>
                <Text style={[styles.statusText, { color: getStatusColor(cert.status) }]}>{cert.status}</Text>
              </View>
            </View>
            <Text style={styles.name}>{cert.name}</Text>
            <Text style={styles.date}>Submitted on {cert.date}</Text>
          </View>
        ))}
      </ScrollView>
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
  date: { fontFamily: 'Nunito-SemiBold', fontSize: 12, color: '#C4B5A5' }
});
