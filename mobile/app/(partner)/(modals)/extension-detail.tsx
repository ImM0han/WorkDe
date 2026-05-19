import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

export default function ExtensionDetailModal() {
  const { jobId } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Extension Request</Text>
      <Text style={styles.subtitle}>The client has requested to extend the job duration.</Text>
      
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Extra Time</Text>
          <Text style={styles.value}>+ 1 Day</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Additional Pay</Text>
          <Text style={[styles.value, {color: '#22C55E'}]}>+ ₹1,200</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => router.back()}>
          <Text style={styles.rejectText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={() => router.back()}>
          <Text style={styles.acceptText}>Accept Extension</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE', padding: 24, justifyContent: 'center' },
  title: { fontFamily: 'Syne-ExtraBold', fontSize: 24, color: '#1C1410', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontFamily: 'Nunito-SemiBold', fontSize: 16, color: '#6B5C4E', textAlign: 'center', marginBottom: 32 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#EEE0CC', marginBottom: 32 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: 1, backgroundColor: '#EEE0CC', marginVertical: 16 },
  label: { fontFamily: 'Nunito-SemiBold', fontSize: 16, color: '#6B5C4E' },
  value: { fontFamily: 'Syne-Bold', fontSize: 18, color: '#1C1410' },
  footer: { flexDirection: 'row', gap: 16 },
  rejectBtn: { flex: 1, height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: '#F5E8D5' },
  rejectText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#6B5C4E' },
  acceptBtn: { flex: 2, height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: '#22C55E' },
  acceptText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#FFFFFF' }
});
