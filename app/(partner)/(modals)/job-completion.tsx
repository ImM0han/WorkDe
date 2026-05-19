import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

export default function JobCompletionModal() {
  const { jobId } = useLocalSearchParams();
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImage = async () => {
    if (photos.length >= 3) return;
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    // API: PATCH /jobs/:id/complete (Upload photos to Firebase first, then backend)
    setTimeout(() => {
      setIsSubmitting(false);
      router.replace('/(partner)');
    }, 1500);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Complete Job</Text>
      <Text style={styles.subtitle}>Upload proof of work and add any final notes.</Text>

      <Text style={styles.label}>Completion Photos (Max 3)</Text>
      <View style={styles.photoGrid}>
        {photos.map((uri, idx) => (
          <View key={idx} style={styles.photoWrapper}>
            <Image source={{ uri }} style={styles.photo} />
            <TouchableOpacity style={styles.removePhoto} onPress={() => setPhotos(photos.filter((_, i) => i !== idx))}>
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < 3 && (
          <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
            <Text style={styles.addPhotoIcon}>+</Text>
            <Text style={styles.addPhotoText}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.label}>Completion Notes (Optional)</Text>
      <TextInput
        style={styles.input}
        multiline
        numberOfLines={4}
        placeholder="Any details the client should know?"
        placeholderTextColor="#C4B5A5"
        value={notes}
        onChangeText={setNotes}
      />

      <TouchableOpacity 
        style={styles.submitBtnWrapper} 
        disabled={isSubmitting || photos.length === 0}
        onPress={handleComplete}
      >
        <LinearGradient 
          colors={photos.length === 0 ? ['#C4B5A5', '#C4B5A5'] : ['#22C55E', '#16A34A']} 
          style={styles.submitBtn}
        >
          <Text style={styles.submitText}>{isSubmitting ? 'Submitting...' : 'Submit & Complete'}</Text>
        </LinearGradient>
      </TouchableOpacity>
      {photos.length === 0 && <Text style={styles.helperText}>At least 1 photo is required.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE' },
  content: { padding: 24 },
  title: { fontFamily: 'Syne-ExtraBold', fontSize: 24, color: '#1C1410', marginBottom: 8 },
  subtitle: { fontFamily: 'Nunito-SemiBold', fontSize: 16, color: '#6B5C4E', marginBottom: 32 },
  label: { fontFamily: 'Syne-Bold', fontSize: 16, color: '#1C1410', marginBottom: 12 },
  photoGrid: { flexDirection: 'row', gap: 12, marginBottom: 24, flexWrap: 'wrap' },
  photoWrapper: { width: 100, height: 100, borderRadius: 12, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  removePhoto: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  removeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  addPhotoBtn: { width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderColor: '#EEE0CC', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  addPhotoIcon: { fontSize: 24, color: '#C4B5A5', marginBottom: 4 },
  addPhotoText: { fontFamily: 'Nunito-SemiBold', fontSize: 12, color: '#C4B5A5' },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEE0CC', borderRadius: 14, padding: 16, fontFamily: 'Nunito-SemiBold', fontSize: 16, color: '#1C1410', minHeight: 120, textAlignVertical: 'top', marginBottom: 32 },
  submitBtnWrapper: { width: '100%' },
  submitBtn: { height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  submitText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#FFFFFF' },
  helperText: { fontFamily: 'Nunito-SemiBold', fontSize: 12, color: '#EF4444', textAlign: 'center', marginTop: 8 }
});
