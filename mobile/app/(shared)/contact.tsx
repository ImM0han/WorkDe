import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, radius, shadow } from '../../src/theme/tokens';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';

export default function ContactScreen() {
  const router = useRouter();

  const handleEmail = () => {
    Linking.openURL('mailto:wrkup.app@gmail.com?subject=WrkUp%20Support&body=Hi%20WrkUp%20Support%20Team,');
  };

  const handleTelegram = () => {
    Linking.openURL('https://t.me/WrkUpp');
  };

  const handleCopyAddress = async () => {
    await Clipboard.setStringAsync('Dhanbad, Jharkhand, India');
    Toast.show({
      type: 'success',
      text1: 'Address Copied',
      text2: 'Office address copied to clipboard.',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Us</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>WrkUp</Text>
          </View>
          <Text style={styles.title}>Get in Touch</Text>
          <Text style={styles.subtitle}>
            Have questions, feedback, or need help with a job? Choose any of the contact channels below.
          </Text>
        </View>

        <TouchableOpacity style={styles.contactCard} onPress={handleEmail} activeOpacity={0.8}>
          <View style={styles.iconContainer}>
            <Feather name="mail" size={24} color={colors.primary} />
          </View>
          <View style={styles.cardDetails}>
            <Text style={styles.cardLabel}>Email Support</Text>
            <Text style={styles.cardValue}>wrkup.app@gmail.com</Text>
            <Text style={styles.cardSubtext}>Tap to send an email. We typically reply within 24 hours.</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textMuted} style={styles.chevron} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactCard} onPress={handleTelegram} activeOpacity={0.8}>
          <View style={styles.iconContainer}>
            <Feather name="send" size={24} color={colors.primary} />
          </View>
          <View style={styles.cardDetails}>
            <Text style={styles.cardLabel}>Telegram Channel</Text>
            <Text style={styles.cardValue}>@WrkUpp</Text>
            <Text style={styles.cardSubtext}>Tap to join our Telegram community or reach support directly.</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textMuted} style={styles.chevron} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactCard} onPress={handleCopyAddress} activeOpacity={0.8}>
          <View style={styles.iconContainer}>
            <Feather name="map-pin" size={24} color={colors.primary} />
          </View>
          <View style={styles.cardDetails}>
            <Text style={styles.cardLabel}>Registered Address</Text>
            <Text style={styles.cardValue}>Dhanbad, Jharkhand, India</Text>
            <Text style={styles.cardSubtext}>Tap to copy our head office address to clipboard.</Text>
          </View>
          <Feather name="copy" size={18} color={colors.textMuted} style={styles.chevron} />
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Feather name="info" size={16} color={colors.textSecondary} style={{ marginRight: 8, marginTop: 2 }} />
          <Text style={styles.infoText}>
            For disputes regarding active jobs, payments, or partner verifications, you can also raise support tickets directly inside the corresponding job detail screen.
          </Text>
        </View>
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
    gap: spacing.sm,
  },
  introCard: {
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  logoContainer: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginBottom: spacing.md,
  },
  logoText: {
    fontFamily: typography.fontDisplay,
    fontSize: 16,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: typography.fontDisplay,
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border2,
    ...shadow.card,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardDetails: {
    flex: 1,
    marginRight: spacing.sm,
  },
  cardLabel: {
    fontFamily: typography.fontDisplay,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardValue: {
    fontFamily: typography.fontBody,
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardSubtext: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  chevron: {
    alignSelf: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primaryBg,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginTop: spacing.md,
  },
  infoText: {
    flex: 1,
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
