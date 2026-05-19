import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

export default function DisputeReportModal() {
  const { jobId } = useLocalSearchParams();
  const [description, setDescription] = useState('');
  const [type, setType] = useState('PAYMENT_ISSUE');

  const disputeTypes = [
    { id: 'PAYMENT_ISSUE', label: 'Payment Issue' },
    { id: 'CLIENT_NO_SHOW', label: 'Client No Show' },
    { id: 'UNSAFE_CONDITIONS', label: 'Unsafe Conditions' },
    { id: 'OTHER', label: 'Other' },
  ];

  const handleSubmit = () => {
    // API: POST /disputes
    // Alert success and go back
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Report an Issue</Text>
      <Text style={styles.subtitle}>Job #{jobId}</Text>

      <Text style={styles.label}>Issue Type</Text>
      <View style={styles.typeContainer}>
        {disputeTypes.map(t => (
          <TouchableOpacity 
            key={t.id} 
            style={[styles.typeBtn, type === t.id && styles.typeBtnActive]}
            onPress={() => setType(t.id)}
          >
            <Text style={[styles.typeText, type === t.id && styles.typeTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.input}
        multiline
        numberOfLines={6}
        placeholder="Please describe the issue in detail..."
        placeholderTextColor="#C4B5A5"
        value={description}
        onChangeText={setDescription}
      />

      <TouchableOpacity 
        style={[styles.submitBtn, !description && styles.disabledBtn]} 
        disabled={!description}
        onPress={handleSubmit}
      >
        <Text style={styles.submitText}>Submit Report</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE' },
  content: { padding: 24 },
  title: { fontFamily: 'Syne-ExtraBold', fontSize: 24, color: '#1C1410', marginBottom: 4 },
  subtitle: { fontFamily: 'DMMono-Regular', fontSize: 14, color: '#C4B5A5', marginBottom: 32 },
  label: { fontFamily: 'Syne-Bold', fontSize: 16, color: '#1C1410', marginBottom: 12 },
  typeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  typeBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: '#EEE0CC', backgroundColor: '#FFFFFF' },
  typeBtnActive: { borderColor: '#FF6B1A', backgroundColor: '#FFF0D6' },
  typeText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: '#6B5C4E' },
  typeTextActive: { color: '#FF6B1A' },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEE0CC', borderRadius: 14, padding: 16, fontFamily: 'Nunito-SemiBold', fontSize: 16, color: '#1C1410', minHeight: 150, textAlignVertical: 'top', marginBottom: 32 },
  submitBtn: { height: 56, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  disabledBtn: { opacity: 0.5 },
  submitText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#FFFFFF' }
});
