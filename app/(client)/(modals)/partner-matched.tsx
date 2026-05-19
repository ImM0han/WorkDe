import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { colors, typography, spacing, radius, shadow } from '../../../src/theme/tokens';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PartnerMatched() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={styles.title}>Worker Found! 🎉</Text>
      <Text style={styles.subtitle}>A professional has accepted your job.</Text>
      
      <View style={styles.card}>
        <Image source={{ uri: 'https://i.pravatar.cc/150?u=ramesh' }} style={styles.avatar} contentFit="cover" />
        <Text style={styles.name}>Ramesh Kumar</Text>
        <Text style={styles.rating}>⭐ 4.8 (120 reviews)</Text>
        <Text style={styles.eta}>Estimated Arrival: 15 mins</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Verified Professional</Text>
        </View>
      </View>

      <TouchableOpacity onPress={() => router.replace('/(client)/(modals)/daily-ops')}>
        <LinearGradient colors={['#FF6B1A', '#F59E0B']} style={styles.button}>
          <Text style={styles.buttonText}>View Job Details</Text>
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage, padding: spacing.xl, justifyContent: 'center' },
  title: { fontFamily: typography.fontDisplay, fontSize: 32, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs },
  subtitle: { fontFamily: typography.fontBody, fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', ...shadow.lg, marginBottom: spacing.xxl, borderWidth: 1, borderColor: colors.border2 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: spacing.md },
  name: { fontFamily: typography.fontDisplay, fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.xs },
  rating: { fontFamily: typography.fontBody, fontSize: 16, color: colors.textSecondary, fontWeight: '600', marginBottom: spacing.sm },
  eta: { fontFamily: typography.fontMono, fontSize: 14, color: colors.primary, fontWeight: '800', marginBottom: spacing.md },
  badge: { backgroundColor: colors.success + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  badgeText: { fontFamily: typography.fontBody, fontSize: 12, color: colors.success, fontWeight: '700' },
  button: { borderRadius: radius.full, padding: 18, alignItems: 'center', ...shadow.card },
  buttonText: { fontFamily: typography.fontDisplay, fontSize: 18, fontWeight: '800', color: 'white' }
});
