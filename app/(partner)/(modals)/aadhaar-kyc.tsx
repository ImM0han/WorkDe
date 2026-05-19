import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

export default function AadhaarKycModal() {
  const [step, setStep] = useState(1);
  const [aadhaar, setAadhaar] = useState('');
  const [otp, setOtp] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleInitiate = () => {
    // API: POST /partner/aadhaar/initiate
    setStep(2);
  };

  const handleVerify = () => {
    // API: POST /partner/aadhaar/verify
    setStep(3);
  };

  const handleDone = () => {
    router.back();
  };

  const onChangeDate = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      setDob(selectedDate);
    } else if (event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aadhaar KYC</Text>
      <Text style={styles.subtitle}>Verify your identity to build trust with clients.</Text>

      {step === 1 && (
        <View style={styles.form}>
          <Text style={styles.label}>Aadhaar Number</Text>
          <TextInput
            style={styles.input}
            placeholder="1234 5678 9012"
            placeholderTextColor="#C4B5A5"
            keyboardType="numeric"
            maxLength={12}
            value={aadhaar}
            onChangeText={setAadhaar}
          />
          <Text style={styles.helper}>We will send an OTP to your Aadhaar-linked mobile number.</Text>

          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => setShowDatePicker(true)}
            style={[styles.input, { justifyContent: 'center', marginBottom: 32 }]}
          >
            <Text style={{ fontFamily: 'Nunito-SemiBold', fontSize: 16, color: dob ? '#1C1410' : '#C4B5A5', letterSpacing: 0 }}>
              {dob ? dob.toLocaleDateString('en-GB') : 'enter date of birth as per adhaar'}
            </Text>
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={dob || new Date(2000, 0, 1)}
              mode="date"
              display="default"
              onChange={onChangeDate}
              maximumDate={new Date()}
            />
          )}

          <TouchableOpacity style={styles.submitBtnWrapper} disabled={aadhaar.length !== 12 || !dob} onPress={handleInitiate}>
            <LinearGradient colors={aadhaar.length !== 12 || !dob ? ['#C4B5A5', '#C4B5A5'] : ['#FF6B1A', '#F59E0B']} style={styles.submitBtn}>
              <Text style={styles.submitText}>Send OTP</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View style={styles.form}>
          <Text style={styles.label}>Enter OTP</Text>
          <TextInput
            style={styles.input}
            placeholder="6-digit OTP"
            placeholderTextColor="#C4B5A5"
            keyboardType="numeric"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
          />
          <Text style={styles.helper}>OTP sent to Aadhaar-linked number.</Text>

          <TouchableOpacity style={styles.submitBtnWrapper} disabled={otp.length !== 6} onPress={handleVerify}>
            <LinearGradient colors={otp.length !== 6 ? ['#C4B5A5', '#C4B5A5'] : ['#FF6B1A', '#F59E0B']} style={styles.submitBtn}>
              <Text style={styles.submitText}>Verify & Complete KYC</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {step === 3 && (
        <View style={styles.successForm}>
          <View style={styles.iconWrapper}><Text style={styles.icon}>✅</Text></View>
          <Text style={styles.successTitle}>Verification Successful!</Text>
          <Text style={styles.successSubtitle}>Your Aadhaar KYC is now complete. The Verified badge will appear on your profile.</Text>

          <TouchableOpacity style={styles.submitBtnWrapper} onPress={handleDone}>
            <LinearGradient colors={['#FF6B1A', '#F59E0B']} style={styles.submitBtn}>
              <Text style={styles.submitText}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE', padding: 24, paddingTop: 60 },
  title: { fontFamily: 'Syne-ExtraBold', fontSize: 24, color: '#1C1410', marginBottom: 8 },
  subtitle: { fontFamily: 'Nunito-SemiBold', fontSize: 16, color: '#6B5C4E', marginBottom: 32 },
  form: { flex: 1 },
  successForm: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontFamily: 'Syne-Bold', fontSize: 14, color: '#1C1410', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEE0CC', borderRadius: 14, paddingHorizontal: 16, height: 56, fontFamily: 'DMMono-Medium', fontSize: 20, color: '#1C1410', marginBottom: 8, letterSpacing: 2 },
  helper: { fontFamily: 'Nunito-SemiBold', fontSize: 12, color: '#C4B5A5', marginBottom: 32 },
  iconWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  icon: { fontSize: 40 },
  successTitle: { fontFamily: 'Syne-ExtraBold', fontSize: 22, color: '#166534', marginBottom: 8, textAlign: 'center' },
  successSubtitle: { fontFamily: 'Nunito-SemiBold', fontSize: 16, color: '#6B5C4E', textAlign: 'center', marginBottom: 40 },
  submitBtnWrapper: { marginTop: 'auto', width: '100%' },
  submitBtn: { height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  submitText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#FFFFFF' }
});
