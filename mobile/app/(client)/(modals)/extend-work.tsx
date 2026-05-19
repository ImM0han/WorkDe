import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, radius, shadow } from '../../../src/theme/tokens';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function ExtendWork() {
  const router = useRouter();
  const [extraHours, setExtraHours] = useState(1);
  const hourlyRate = 200;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Extend Work</Text>
      <Text style={styles.subtitle}>Request worker to stay longer. They must approve the extension.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Extra Hours</Text>
        <View style={styles.stepper}>
          <TouchableOpacity onPress={() => setExtraHours(Math.max(1, extraHours - 1))} style={styles.stepBtn}>
            <Text style={styles.stepBtnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.stepperValue}>{extraHours}</Text>
          <TouchableOpacity onPress={() => setExtraHours(extraHours + 1)} style={styles.stepBtn}>
            <Text style={styles.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.costLabel}>Additional Cost</Text>
          <Text style={styles.costValue}>₹{extraHours * hourlyRate}</Text>
        </View>
      </View>

      <TouchableOpacity onPress={() => router.back()}>
        <LinearGradient colors={['#FF6B1A', '#F59E0B']} style={styles.sendButton}>
          <Text style={styles.sendButtonText}>Send Extension Request</Text>
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage, padding: spacing.md },
  header: { alignItems: 'flex-end', marginBottom: spacing.xl },
  closeText: { fontFamily: typography.fontBody, fontSize: 16, color: colors.primary, fontWeight: '600' },
  title: { fontFamily: typography.fontDisplay, fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  subtitle: { fontFamily: typography.fontBody, fontSize: 15, color: colors.textSecondary, marginBottom: spacing.xl },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: 20, borderWidth: 1, borderColor: colors.border2, ...shadow.card, marginBottom: spacing.xl },
  label: { fontFamily: typography.fontDisplay, fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 12, textAlign: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontFamily: typography.fontDisplay, fontSize: 24, color: colors.primaryDark, marginTop: -2 },
  stepperValue: { fontFamily: typography.fontMono, fontSize: 24, fontWeight: '800', width: 60, textAlign: 'center' },
  divider: { height: 1, backgroundColor: colors.border2, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  costLabel: { fontFamily: typography.fontBody, fontSize: 16, color: colors.textSecondary },
  costValue: { fontFamily: typography.fontMono, fontSize: 20, fontWeight: '800', color: colors.primary },
  sendButton: { borderRadius: radius.full, padding: 16, alignItems: 'center', ...shadow.card },
  sendButtonText: { fontFamily: typography.fontDisplay, fontSize: 16, fontWeight: '800', color: 'white' }
});
