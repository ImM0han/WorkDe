import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/stores/authStore';
import api from '../../../src/services/apiClient';

export default function EditProfileModal() {
  const { user } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatarUrl(result.assets[0].uri);
    }
  };

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', { name, email, avatarUrl });
      if (res.data?.user) {
        useAuthStore.setState({ user: res.data.user });
      }
      router.back();
    } catch (err) {
      console.error('[EditProfile] Failed to update profile:', err);
      // Fallback local save
      if (user) {
        useAuthStore.setState({ user: { ...user, name, email, avatarUrl } });
      }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color="#1C1410" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </View>
      
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <TouchableOpacity onPress={pickImage}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width: 100, height: 100, borderRadius: 50 }} />
          ) : (
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#FF6B1A', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 40, color: 'white', fontFamily: 'Syne-ExtraBold' }}>{name?.charAt(0) || 'C'}</Text>
            </View>
          )}
          <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#1C1410', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FDF6EE' }}>
            <Text style={{ color: 'white', fontSize: 16 }}>📷</Text>
          </View>
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your full name"
            placeholderTextColor="#C4B5A5"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="your.email@example.com"
            placeholderTextColor="#C4B5A5"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={user?.phone || ''}
            editable={false}
          />
          <Text style={styles.helper}>Phone number cannot be changed.</Text>
        </View>
      </ScrollView>

      <TouchableOpacity 
        style={styles.submitBtnWrapper} 
        disabled={!name || saving}
        onPress={handleSave}
      >
        <LinearGradient 
          colors={(!name || saving) ? ['#C4B5A5', '#C4B5A5'] : ['#FF6B1A', '#F59E0B']} 
          style={styles.submitBtn}
        >
          <Text style={styles.submitText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE', paddingHorizontal: 24, paddingBottom: 24 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    marginBottom: 20
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#FFF0D6', 
    borderRadius: 20,
    marginRight: 16
  },
  headerTitle: { 
    fontFamily: 'Syne-ExtraBold', 
    fontSize: 24, 
    color: '#1C1410' 
  },
  content: { paddingBottom: 24 },
  inputGroup: { marginBottom: 20 },
  label: { fontFamily: 'Syne-Bold', fontSize: 14, color: '#1C1410', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEE0CC', borderRadius: 14, paddingHorizontal: 16, height: 56, fontFamily: 'Nunito-SemiBold', fontSize: 16, color: '#1C1410' },
  disabledInput: { backgroundColor: '#F5E8D5', color: '#6B5C4E' },
  helper: { fontFamily: 'Nunito-SemiBold', fontSize: 12, color: '#C4B5A5', marginTop: 4 },
  submitBtnWrapper: { marginTop: 'auto' },
  submitBtn: { height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  submitText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#FFFFFF' }
});
