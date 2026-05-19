import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, LayoutAnimation, Platform, UIManager, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const FAQS = [
  { id: '1', question: 'How do I get paid?', answer: 'Payments are processed via Razorpay directly to your linked bank account after a job is marked as Complete.' },
  { id: '2', question: 'How does the rating system work?', answer: 'After every job, the client rates you out of 5 stars. Your aggregate rating determines your visibility to new clients.' },
  { id: '3', question: 'What happens if I cancel a job?', answer: 'Cancellations may affect your profile rating. Please contact support if you have an emergency.' },
];

export default function HelpSupportScreen() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleAccordion = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const contactSupport = () => {
    Linking.openURL('mailto:support@gigwork.com');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.contactCard}>
          <Text style={styles.cardTitle}>Need immediate help?</Text>
          <Text style={styles.cardDesc}>Our support team is available 24/7 to assist you with any active jobs or payment disputes.</Text>
          <TouchableOpacity style={styles.contactBtn} onPress={contactSupport}>
            <Text style={styles.contactBtnText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        
        {FAQS.map(faq => (
          <View key={faq.id} style={styles.accordionContainer}>
            <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleAccordion(faq.id)}>
              <Text style={styles.questionText}>{faq.question}</Text>
              <Text style={styles.expandIcon}>{expandedId === faq.id ? '−' : '+'}</Text>
            </TouchableOpacity>
            {expandedId === faq.id && (
              <View style={styles.accordionBody}>
                <Text style={styles.answerText}>{faq.answer}</Text>
              </View>
            )}
          </View>
        ))}

        <Text style={styles.versionText}>
          GigWork v{Constants.expoConfig?.version || '1.0.0'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EEE0CC' },
  backBtn: { width: 60 },
  backText: { color: '#6B5C4E', fontFamily: 'Nunito-Bold' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'Syne-Bold', fontSize: 18, color: '#1C1410' },
  content: { padding: 16 },
  contactCard: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#EEE0CC', marginBottom: 32 },
  cardTitle: { fontFamily: 'Syne-Bold', fontSize: 20, color: '#1C1410', marginBottom: 8 },
  cardDesc: { fontFamily: 'Nunito-Regular', fontSize: 14, color: '#6B5C4E', marginBottom: 24, lineHeight: 22 },
  contactBtn: { backgroundColor: '#FF6B1A', padding: 16, borderRadius: 12, alignItems: 'center' },
  contactBtnText: { color: '#FFFFFF', fontFamily: 'Nunito-Bold', fontSize: 16 },
  sectionTitle: { fontFamily: 'Syne-ExtraBold', fontSize: 18, color: '#1C1410', marginBottom: 16 },
  accordionContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#EEE0CC', marginBottom: 12, overflow: 'hidden' },
  accordionHeader: { flexDirection: 'row', padding: 16, justifyContent: 'space-between', alignItems: 'center' },
  questionText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#1C1410', flex: 1 },
  expandIcon: { fontFamily: 'DMMono-Medium', fontSize: 20, color: '#FF6B1A', marginLeft: 16 },
  accordionBody: { padding: 16, paddingTop: 0 },
  answerText: { fontFamily: 'Nunito-Regular', fontSize: 14, color: '#6B5C4E', lineHeight: 22 },
  versionText: { textAlign: 'center', fontFamily: 'DMMono-Regular', color: '#C4B5A5', marginTop: 40, marginBottom: 20 }
});
