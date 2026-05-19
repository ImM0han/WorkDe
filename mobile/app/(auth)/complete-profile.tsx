import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useAuthStore } from '../../src/stores/authStore';

export default function CompleteProfileScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('MALE');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { role, setUser } = useAuthStore();

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) return;
    
    setLoading(true);
    try {
      // Create FormData if uploading image, else just JSON
      // For mock phase, we just pass string values
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ name, email, avatarUrl: avatar, gender })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Profile completion failed');
      
      await setUser(data.user, data.token);
      Toast.show({ type: 'success', text1: 'Account created successfully!' });
      
      if (role === 'PARTNER') router.replace('/(partner)/');
      else router.replace('/(client)/');

    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Complete your profile</Text>
        <Text style={styles.subtitle}>Just a few more details to get started.</Text>

        <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
          <LinearGradient colors={['#CC4A00', '#FF8C42']} style={styles.avatarGradient}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <Text style={styles.avatarInitials}>{name ? name.charAt(0).toUpperCase() : '?'}</Text>
            )}
            <View style={styles.cameraBadge}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="John Doe"
            placeholderTextColor="#C4B5A5"
            value={name}
            onChangeText={setName}
            editable={!loading}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderContainer}>
            {['MALE', 'FEMALE', 'OTHER'].map(g => (
              <TouchableOpacity
                key={g}
                style={[styles.genderPill, gender === g && styles.genderPillActive]}
                onPress={() => setGender(g)}
                disabled={loading}
              >
                <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                  {g === 'MALE' ? '♂ Male' : g === 'FEMALE' ? '♀ Female' : '⊕ Other'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="john@example.com"
            placeholderTextColor="#C4B5A5"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />
        </View>
      </View>

      <TouchableOpacity 
        style={styles.buttonWrapper}
        onPress={handleRegister}
        disabled={!name.trim() || loading}
        activeOpacity={0.8}
      >
        <LinearGradient 
          colors={name.trim() ? ['#FF6B1A', '#F59E0B'] : ['#C4B5A5', '#C4B5A5']} 
          style={styles.button}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Finish →</Text>}
        </LinearGradient>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF6EE',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center'
  },
  title: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 26,
    color: '#1C1410',
    marginBottom: 8
  },
  subtitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
    color: '#6B5C4E',
    marginBottom: 40
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 40
  },
  avatarGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44
  },
  avatarInitials: {
    fontFamily: 'Syne-Bold',
    fontSize: 36,
    color: '#FFFFFF'
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cameraIcon: {
    fontSize: 14
  },
  inputGroup: {
    marginBottom: 24
  },
  label: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: '#1C1410',
    marginBottom: 8
  },
  input: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.25)',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
    color: '#1C1410'
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  genderPill: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEE0CC',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderPillActive: {
    borderColor: '#FF6B1A',
    backgroundColor: '#FFF0D6',
  },
  genderText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    color: '#6B5C4E',
  },
  genderTextActive: {
    color: '#FF6B1A',
    fontFamily: 'Nunito-Bold',
  },
  buttonWrapper: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24
  },
  button: {
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  buttonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: '#FFFFFF'
  }
});
