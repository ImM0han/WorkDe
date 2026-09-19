import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

export default function AddCertificateModal() {
  const [skill, setSkill] = useState('');
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleUpload = () => {
    // API: POST /certificates (Multipart)
    router.back();
  };

  const isValid = skill && name && photo;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Add Certificate</Text>
      
      <Text style={styles.label}>Skill Category</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Electrician"
        placeholderTextColor="#C4B5A5"
        value={skill}
        onChangeText={setSkill}
      />

      <Text style={styles.label}>Certificate Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Level 2 Wiring Certification"
        placeholderTextColor="#C4B5A5"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Upload Document (Photo)</Text>
      {photo ? (
        <View style={styles.photoWrapper}>
          <Image source={{ uri: photo }} style={styles.photo} />
          <TouchableOpacity style={styles.removePhoto} onPress={() => setPhoto(null)}>
            <Text style={styles.removeText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
          <Text style={styles.uploadIcon}>📄</Text>
          <Text style={styles.uploadText}>Select File</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        style={styles.submitBtnWrapper} 
        disabled={!isValid}
        onPress={handleUpload}
      >
        <LinearGradient 
          colors={!isValid ? ['#C4B5A5', '#C4B5A5'] : ['#FF6B1A', '#F59E0B']} 
          style={styles.submitBtn}
        >
          <Text style={styles.submitText}>Submit for Review</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE' },
  content: { padding: 24, paddingTop: 60 },
  title: { fontFamily: 'Syne-ExtraBold', fontSize: 24, color: '#1C1410', marginBottom: 32 },
  label: { fontFamily: 'Syne-Bold', fontSize: 14, color: '#1C1410', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEE0CC', borderRadius: 14, paddingHorizontal: 16, height: 56, fontFamily: 'Nunito-SemiBold', fontSize: 16, color: '#1C1410', marginBottom: 24 },
  uploadBtn: { height: 160, borderRadius: 14, borderWidth: 2, borderColor: '#EEE0CC', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', marginBottom: 32 },
  uploadIcon: { fontSize: 32, marginBottom: 8 },
  uploadText: { fontFamily: 'Nunito-SemiBold', fontSize: 14, color: '#6B5C4E' },
  photoWrapper: { height: 160, borderRadius: 14, overflow: 'hidden', marginBottom: 32, borderWidth: 1, borderColor: '#EEE0CC' },
  photo: { width: '100%', height: '100%' },
  removePhoto: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  removeText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  submitBtnWrapper: { marginTop: 24 },
  submitBtn: { height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  submitText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#FFFFFF' }
});
