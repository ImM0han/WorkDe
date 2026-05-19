import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../src/stores/authStore';
import api from '../../../src/services/apiClient';

export default function AddBankModal() {
  const [activeMethod, setActiveMethod] = useState<'BANK' | 'UPI'>('BANK');
  const [accName, setAccName] = useState('');
  const [accNumber, setAccNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');

  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const payload = activeMethod === 'BANK' 
        ? { accountNumber: accNumber, ifsc, holderName: accName } 
        : { accountNumber: upiId, ifsc: 'UPI', holderName: 'UPI ID' };
      
      await api.post('/wallet/bank-account', payload);
      queryClient.invalidateQueries({ queryKey: ['partnerProfile', user?.partnerId] });
      
      Toast.show({ type: 'success', text1: 'Success', text2: 'Withdrawal details saved successfully.' });
      router.back();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to save bank details. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBankValid = accName && accNumber.length > 5 && ifsc.length > 4;
  const isUpiValid = upiId.includes('@') && upiId.length > 3;
  const isValid = activeMethod === 'BANK' ? isBankValid : isUpiValid;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Withdrawal Details</Text>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeMethod === 'BANK' && styles.activeTab]}
          onPress={() => setActiveMethod('BANK')}
        >
          <Text style={[styles.tabText, activeMethod === 'BANK' && styles.activeTabText]}>Bank Account</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeMethod === 'UPI' && styles.activeTab]}
          onPress={() => setActiveMethod('UPI')}
        >
          <Text style={[styles.tabText, activeMethod === 'UPI' && styles.activeTabText]}>UPI ID</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeMethod === 'BANK' ? (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Holder Name</Text>
              <TextInput
                style={styles.input}
                placeholder="As per bank records"
                placeholderTextColor="#C4B5A5"
                value={accName}
                onChangeText={setAccName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter account number"
                placeholderTextColor="#C4B5A5"
                keyboardType="numeric"
                value={accNumber}
                onChangeText={setAccNumber}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>IFSC Code</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. HDFC0001234"
                placeholderTextColor="#C4B5A5"
                autoCapitalize="characters"
                maxLength={11}
                value={ifsc}
                onChangeText={setIfsc}
              />
            </View>
          </>
        ) : (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>UPI ID</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. yourname@okhdfcbank"
              placeholderTextColor="#C4B5A5"
              autoCapitalize="none"
              value={upiId}
              onChangeText={setUpiId}
            />
            <Text style={styles.helperText}>Enter your valid UPI ID linked to your bank account.</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity 
        style={styles.submitBtnWrapper} 
        disabled={!isValid}
        onPress={handleSubmit}
      >
        <LinearGradient 
          colors={!isValid ? ['#C4B5A5', '#C4B5A5'] : ['#FF6B1A', '#F59E0B']} 
          style={styles.submitBtn}
        >
          <Text style={styles.submitText}>Save Details</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE', padding: 24, paddingTop: 60 },
  title: { fontFamily: 'Syne-ExtraBold', fontSize: 24, color: '#1C1410', marginBottom: 24 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 999, padding: 4, marginBottom: 24, borderWidth: 1, borderColor: '#EEE0CC' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 999 },
  activeTab: { backgroundColor: '#FFF0D6' },
  tabText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: '#6B5C4E' },
  activeTabText: { color: '#FF6B1A' },
  content: { paddingBottom: 24 },
  inputGroup: { marginBottom: 20 },
  label: { fontFamily: 'Syne-Bold', fontSize: 14, color: '#1C1410', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEE0CC', borderRadius: 14, paddingHorizontal: 16, height: 56, fontFamily: 'Nunito-SemiBold', fontSize: 16, color: '#1C1410' },
  helperText: { fontFamily: 'Nunito-SemiBold', fontSize: 12, color: '#C4B5A5', marginTop: 8 },
  submitBtnWrapper: { marginTop: 'auto' },
  submitBtn: { height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  submitText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#FFFFFF' }
});
