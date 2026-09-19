import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, radius } from '../../src/theme/tokens';

const TERMS_SECTIONS = [
  {
    id: '1',
    title: '1. What WrkUp Is',
    content: 'WrkUp connects Clients (who post short-term gig jobs) with Partners (who accept and complete them). WrkUp is a marketplace only — not a party to any job agreement, and not an employer of Partners.',
  },
  {
    id: '2',
    title: '2. Eligibility',
    content: 'Must be 18+, legally able to contract, and have a valid Indian mobile number. Partners must complete KYC.',
  },
  {
    id: '3',
    title: '3. Accounts',
    content: 'Provide accurate info, keep credentials secure, report unauthorized use immediately.',
  },
  {
    id: '4',
    title: '4. KYC (Partners)',
    content: 'Aadhaar/government ID verification required. WrkUp may reject or revoke verification if info is false or fraudulent.',
  },
  {
    id: '5',
    title: '5. Jobs',
    content: "Clients post job details (rate, schedule, location). Partners accept, complete, and upload proof. Misrepresenting a job or one's skills violates these Terms.",
  },
  {
    id: '6',
    title: '6. Payments',
    content: 'Payments processed via Razorpay. WrkUp deducts a platform fee (shown in-app). Partner earnings go to an in-app wallet, withdrawable to a bank account. Users are responsible for their own taxes.',
  },
  {
    id: '7',
    title: '7. Cancellations & Refunds',
    content: 'Cancellation windows/fees and refund terms are shown in-app at time of booking/cancellation. Repeated no-shows may lead to penalties.',
  },
  {
    id: '8',
    title: '8. Ratings',
    content: 'Both parties may rate each other honestly after a job. Abusive reviews may be removed.',
  },
  {
    id: '9',
    title: '9. Location Data',
    content: 'Used for job matching, arrival tracking, and safety. Governed by our Privacy Policy.',
  },
  {
    id: '10',
    title: '10. In-App Messaging',
    content: 'Must relate to the job; no abuse or off-platform payment solicitation. May be monitored for safety/fraud/legal purposes.',
  },
  {
    id: '11',
    title: '11. Not an Employer',
    content: 'Partners are independent. WrkUp does not direct work, guarantee earnings, or provide employee benefits. Clients are responsible for a safe work environment.',
    note: "Note: India's Code on Social Security, 2020 has specific gig/platform-worker obligations — recommend legal review.",
  },
  {
    id: '12',
    title: '12. Prohibited Conduct',
    content: 'No fraud, off-platform circumvention, harassment, illegal jobs, hacking, or payment abuse. Violations may lead to suspension, ban, forfeiture of payouts, or law enforcement referral.',
  },
  {
    id: '13',
    title: '13. Disputes',
    content: 'Raise issues in-app; WrkUp reviews evidence and decides platform-related matters (e.g., payment release) at its discretion, without limiting either party\'s legal rights.',
  },
  {
    id: '14',
    title: '14. Content & IP',
    content: 'WrkUp owns the app/brand. You keep ownership of your uploaded content but grant WrkUp a license to use it to operate the Service.',
  },
  {
    id: '15',
    title: '15. Privacy',
    content: 'Governed by our Privacy Policy (incorporated by reference).',
  },
  {
    id: '16',
    title: '16. Third-Party Services',
    content: 'Includes Razorpay (payments) and Firebase (infrastructure). Their own terms also apply.',
  },
  {
    id: '17',
    title: '17. Disclaimers',
    content: 'Service provided "as is." WrkUp doesn\'t guarantee Partner quality, job safety, or uninterrupted service. Users interact at their own risk.',
  },
  {
    id: '18',
    title: '18. Limitation of Liability',
    content: "WrkUp isn't liable for indirect/consequential damages. Total liability capped at platform fees paid in the preceding 6 months or ₹10,000.",
  },
  {
    id: '19',
    title: '19. Indemnification',
    content: 'You agree to indemnify WrkUp against claims arising from your use, Terms violations, or disputes with other Users.',
  },
  {
    id: '20',
    title: '20. Suspension & Termination',
    content: 'Either party may end the relationship; WrkUp may suspend/terminate for violations, fraud, or legal reasons.',
  },
  {
    id: '21',
    title: '21. Changes to Terms',
    content: 'We may update these Terms; continued use means acceptance. Notices via app or Telegram.',
  },
  {
    id: '22',
    title: '22. Governing Law',
    content: 'Laws of India; exclusive jurisdiction of courts in Dhanbad, Jharkhand.',
  },
  {
    id: '23',
    title: '23. General',
    content: 'Entire agreement, severability, no waiver, and assignment clauses apply as standard.',
  },
  {
    id: '24',
    title: '24. Contact',
    content: 'For any questions, concerns, or legal inquiries, please reach out to us at:',
    bullets: [
      'Email: wrkup.app@gmail.com',
      'Address: Dhanbad, Jharkhand, India',
      'Telegram: @WrkUpp',
    ],
  },
];

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.subtitle}>WrkUp Marketplace</Text>
          <View style={styles.divider} />
          <Text style={styles.date}>Last Updated: July 23, 2026</Text>
          <Text style={styles.preamble}>
            By using the WrkUp app ("Service"), operated by <Text style={{ fontWeight: '700' }}>WrkUp</Text> ("we," "us"), you agree to these Terms. Please read them carefully before using the platform.
          </Text>
        </View>

        {TERMS_SECTIONS.map((section) => (
          <View key={section.id} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
            {section.note && (
              <View style={styles.noteContainer}>
                <Text style={styles.noteText}>{section.note}</Text>
              </View>
            )}
            {section.bullets && (
              <View style={styles.bulletsContainer}>
                {section.bullets.map((bullet, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        <Text style={styles.disclaimerText}>
          Draft template for WrkUp. Please consult legal counsel for compliance with applicable local laws, specifically the Code on Social Security (India).
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 60,
  },
  backText: {
    color: colors.textSecondary,
    fontFamily: typography.fontBody,
    fontWeight: '700',
    fontSize: 15,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.fontDisplay,
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  introCard: {
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: typography.fontDisplay,
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  divider: {
    height: 2,
    backgroundColor: colors.primaryBg,
    marginVertical: spacing.md,
  },
  date: {
    fontFamily: typography.fontMono,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  preamble: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border2,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionContent: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  noteContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  noteText: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.textSecondary,
    lineHeight: 18,
  },
  bulletsContainer: {
    marginTop: spacing.sm,
    paddingLeft: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  bulletDot: {
    fontSize: 14,
    color: colors.primary,
    marginRight: spacing.sm,
    lineHeight: 18,
  },
  bulletText: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
  disclaimerText: {
    fontFamily: typography.fontBody,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 16,
  },
});
