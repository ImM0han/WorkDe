import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '../../src/stores/authStore';
import { colors, typography, spacing, radius } from '../../src/theme/tokens';
import { Feather } from '@expo/vector-icons';
import { getFriendlyErrorMessage } from '../../src/services/errorHelpers';
import { getApiBaseUrl } from '../../src/services/apiClient';

export default function VerifyQuestionsScreen() {
  const router = useRouter();
  const { pendingAuth, setOtpToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [showPickerModal, setShowPickerModal] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      const otpToken = pendingAuth?.otpToken;
      if (!otpToken) {
        Toast.show({ type: 'error', text1: 'Verification session expired. Please start over.' });
        router.replace('/(auth)/login');
        return;
      }

      try {
        const res = await fetch(`${getApiBaseUrl()}/auth/security-questions`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${otpToken}`,
          },
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch security questions');
        }

        if (!data.hasQuestions) {
          console.log('[Verify Questions] Legacy user detected (no security questions). Bypassing...');
          router.replace('/(auth)/set-password');
          return;
        }

        setQuestions(data.questions);
        if (data.questions.length > 0) {
          setSelectedQuestion(data.questions[0]);
        }
      } catch (err: any) {
        Toast.show({ type: 'error', text1: 'Error', text2: getFriendlyErrorMessage(err) });
        router.replace('/(auth)/login');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [pendingAuth]);

  const handleVerify = async () => {
    if (!selectedQuestion) {
      Toast.show({ type: 'error', text1: 'Please select a security question' });
      return;
    }
    if (!answer.trim()) {
      Toast.show({ type: 'error', text1: 'Please write your answer' });
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/verify-security-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pendingAuth?.otpToken}`,
        },
        body: JSON.stringify({
          question: selectedQuestion,
          answer: answer,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Incorrect security answer');
      }

      setOtpToken(data.otpToken);
      Toast.show({ type: 'success', text1: 'Identity verified successfully!' });
      router.replace('/(auth)/set-password');
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Verification Failed', text2: getFriendlyErrorMessage(err) });
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF6B1A" />
          <Text style={styles.loadingText}>Fetching security questions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isReady = selectedQuestion !== '' && answer.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="chevron-left" size={24} color="#1C1410" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Feather name="shield" size={40} color="#FF6B1A" />
            </View>
            
            <Text style={styles.title}>Verify Identity</Text>
            <Text style={styles.subtitle}>
              Select any one of your security questions and answer it to unlock password reset.
            </Text>

            {/* Question Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Select Security Question</Text>
              <TouchableOpacity 
                style={styles.dropdownButton} 
                onPress={() => setShowPickerModal(true)}
                activeOpacity={0.7}
                disabled={verifying}
              >
                <Text style={[styles.dropdownButtonText, !selectedQuestion && styles.dropdownPlaceholder]}>
                  {selectedQuestion || "Choose one question to answer"}
                </Text>
                <Feather name="chevron-down" size={20} color="#C4B5A5" />
              </TouchableOpacity>
            </View>

            {/* Answer Input */}
            {selectedQuestion ? (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Your Answer</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Type your answer here"
                  placeholderTextColor="#C4B5A5"
                  value={answer}
                  onChangeText={setAnswer}
                  editable={!verifying}
                  autoCorrect={false}
                />
              </View>
            ) : null}
          </View>
        </ScrollView>

        <TouchableOpacity 
          style={[styles.verifyButton, (!isReady || verifying) && styles.verifyButtonDisabled]}
          onPress={handleVerify}
          disabled={!isReady || verifying}
        >
          {verifying ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify & Continue →</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {/* Modal for picking questions */}
      <Modal
        visible={showPickerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Choose a Question</Text>
            <View style={styles.modalDivider} />
            {questions.map((question, index) => (
              <TouchableOpacity
                key={index}
                style={styles.questionItem}
                onPress={() => {
                  setSelectedQuestion(question);
                  setAnswer('');
                  setShowPickerModal(false);
                }}
              >
                <Text style={styles.questionItemText}>{question}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowPickerModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF6EE',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
    color: '#6B5C4E',
  },
  header: {
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF0D6',
    borderRadius: 20,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF0D6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'center',
  },
  title: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 28,
    color: '#1C1410',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
    color: '#6B5C4E',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontFamily: 'Nunito-Bold',
    fontSize: 15,
    color: '#1C1410',
    marginBottom: 8,
    lineHeight: 20,
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
    color: '#1C1410',
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
  verifyButton: {
    backgroundColor: '#FF6B1A',
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 24,
    marginBottom: Platform.OS === 'ios' ? 32 : 24,
  },
  verifyButtonDisabled: {
    backgroundColor: '#C4B5A5',
  },
  verifyButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: '#FFF',
  },
  // Modal styles
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
