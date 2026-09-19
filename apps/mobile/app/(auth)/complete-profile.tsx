import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { getFriendlyErrorMessage } from '../../src/services/errorHelpers';
import { getApiBaseUrl } from '../../src/services/apiClient';

const SECURITY_QUESTIONS = [
  "What was the name of your first school?",
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "In which city were you born?",
  "What is your favorite food/dish?"
];

export default function CompleteProfileScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('MALE');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { role, setUser } = useAuthStore();

  const [q1, setQ1] = useState('');
  const [a1, setA1] = useState('');
  const [q2, setQ2] = useState('');
  const [a2, setA2] = useState('');
  const [q3, setQ3] = useState('');
  const [a3, setA3] = useState('');
  const [showQuestionModal, setShowQuestionModal] = useState<number | null>(null);

  const getAvailableQuestions = (slot: number) => {
    const selected = [
      slot !== 1 ? q1 : '',
      slot !== 2 ? q2 : '',
      slot !== 3 ? q3 : ''
    ].filter(Boolean);
    return SECURITY_QUESTIONS.filter(q => !selected.includes(q));
  };

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

    if (email.trim() && !email.includes('@')) {
      Toast.show({ 
        type: 'error', 
        text1: 'Invalid Email Address', 
        text2: 'Please enter a valid email address or leave it blank' 
      });
      return;
    }

    if (!q1 || !a1.trim() || !q2 || !a2.trim() || !q3 || !a3.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Security Questions Required',
        text2: 'Please select and answer all 3 security questions'
      });
      return;
    }
    
    setLoading(true);
    try {
      // Create FormData if uploading image, else just JSON
      // For mock phase, we just pass string values
      const res = await fetch(`${getApiBaseUrl()}/auth/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          name, 
          email: email.trim() || undefined, 
          avatarUrl: avatar, 
          gender,
          securityQuestions: [
            { question: q1, answer: a1 },
            { question: q2, answer: a2 },
            { question: q3, answer: a3 }
          ]
        })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Profile completion failed');
      
      await setUser(data.user, data.token);
      Toast.show({ type: 'success', text1: 'Account created successfully!' });
      
      if (role === 'PARTNER') router.replace('/(partner)');
      else router.replace('/(client)');

    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: getFriendlyErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
            <Text style={styles.label}>Email Address (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor="#C4B5A5"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
          </View>

          {/* Security Questions Section */}
          <View style={styles.sectionDivider} />
          
          <View style={styles.securityHeaderContainer}>
            <Feather name="shield" size={20} color="#FF6B1A" />
            <Text style={styles.securitySectionTitle}>Security Questions</Text>
          </View>
          <Text style={styles.securitySectionSubtitle}>
            These questions will act as a recovery key if you forget your password.
          </Text>

          {/* Question 1 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Question 1</Text>
            <TouchableOpacity 
              style={styles.dropdownButton} 
              onPress={() => setShowQuestionModal(1)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dropdownButtonText, !q1 && styles.dropdownPlaceholder]}>
                {q1 || "Select first question"}
              </Text>
              <Feather name="chevron-down" size={20} color="#C4B5A5" />
            </TouchableOpacity>
            {q1 ? (
              <TextInput
                style={[styles.input, { marginTop: 10 }]}
                placeholder="Write your answer here"
                placeholderTextColor="#C4B5A5"
                value={a1}
                onChangeText={setA1}
                editable={!loading}
              />
            ) : null}
          </View>

          {/* Question 2 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Question 2</Text>
            <TouchableOpacity 
              style={styles.dropdownButton} 
              onPress={() => setShowQuestionModal(2)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dropdownButtonText, !q2 && styles.dropdownPlaceholder]}>
                {q2 || "Select second question"}
              </Text>
              <Feather name="chevron-down" size={20} color="#C4B5A5" />
            </TouchableOpacity>
            {q2 ? (
              <TextInput
                style={[styles.input, { marginTop: 10 }]}
                placeholder="Write your answer here"
                placeholderTextColor="#C4B5A5"
                value={a2}
                onChangeText={setA2}
                editable={!loading}
              />
            ) : null}
          </View>

          {/* Question 3 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Question 3</Text>
            <TouchableOpacity 
              style={styles.dropdownButton} 
              onPress={() => setShowQuestionModal(3)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dropdownButtonText, !q3 && styles.dropdownPlaceholder]}>
                {q3 || "Select third question"}
              </Text>
              <Feather name="chevron-down" size={20} color="#C4B5A5" />
            </TouchableOpacity>
            {q3 ? (
              <TextInput
                style={[styles.input, { marginTop: 10 }]}
                placeholder="Write your answer here"
                placeholderTextColor="#C4B5A5"
                value={a3}
                onChangeText={setA3}
                editable={!loading}
              />
            ) : null}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity 
        style={styles.buttonWrapper}
        onPress={handleRegister}
        disabled={!name.trim() || !q1 || !a1.trim() || !q2 || !a2.trim() || !q3 || !a3.trim() || loading}
        activeOpacity={0.8}
      >
        <LinearGradient 
          colors={name.trim() && q1 && a1.trim() && q2 && a2.trim() && q3 && a3.trim() ? ['#FF6B1A', '#F59E0B'] : ['#C4B5A5', '#C4B5A5']} 
          style={styles.button}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Finish →</Text>}
        </LinearGradient>
      </TouchableOpacity>

      {/* Modal for picking questions */}
      <Modal
        visible={showQuestionModal !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQuestionModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Choose a Question</Text>
            <View style={styles.modalDivider} />
            {showQuestionModal !== null && getAvailableQuestions(showQuestionModal).map((question, index) => (
              <TouchableOpacity
                key={index}
                style={styles.questionItem}
                onPress={() => {
                  if (showQuestionModal === 1) setQ1(question);
                  else if (showQuestionModal === 2) setQ2(question);
                  else if (showQuestionModal === 3) setQ3(question);
                  setShowQuestionModal(null);
                }}
              >
                <Text style={styles.questionItemText}>{question}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowQuestionModal(null)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF6EE',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 40,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  countryPicker: {
    backgroundColor: '#FFF0D6',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.25)',
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  countryText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: '#1C1410'
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
  },
  footerLink: {
    fontFamily: 'Nunito-Bold',
    fontSize: 15,
    color: '#FF6B1A'
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#EEE0CC',
    marginVertical: 32,
  },
  securityHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  securitySectionTitle: {
    fontFamily: 'Syne-Bold',
    fontSize: 18,
    color: '#1C1410',
  },
  securitySectionSubtitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    color: '#6B5C4E',
    marginBottom: 24,
    lineHeight: 20,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.25)',
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  dropdownButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
    color: '#1C1410',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#C4B5A5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 20, 16, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#FFFDFB',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#1C1410',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 26, 0.08)',
  },
  modalTitle: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 20,
    color: '#1C1410',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#EEE0CC',
    marginBottom: 16,
  },
  questionItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#FDF6EE',
  },
  questionItemText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 15,
    color: '#6B5C4E',
    lineHeight: 20,
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFF0D6',
    borderRadius: 12,
  },
  cancelButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: '#FF6B1A',
  },
});
