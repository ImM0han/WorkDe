import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, radius } from '../../../src/theme/tokens';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EndWorkConfirm() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>End Work?</Text>
      <Text style={styles.subtitle}>Are you sure you want to end work? This will generate the final invoice and you will be directed to payment.</Text>

      <View style={styles.buttonsRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirmBtn} onPress={() => router.replace('/(client)/(modals)/payment')}>
          <Text style={styles.confirmText}>Yes, End Work</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage, padding: spacing.xl, justifyContent: 'center' },
  title: { fontFamily: typography.fontDisplay, fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.sm, textAlign: 'center' },
  subtitle: { fontFamily: typography.fontBody, fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xxl },
  buttonsRow: { flexDirection: 'row', gap: 16 },
  cancelBtn: { flex: 1, padding: 16, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border2, alignItems: 'center' },
  cancelText: { fontFamily: typography.fontBody, fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  confirmBtn: { flex: 1, padding: 16, borderRadius: radius.full, backgroundColor: colors.danger, alignItems: 'center' },
  confirmText: { fontFamily: typography.fontBody, fontSize: 16, fontWeight: '700', color: 'white' }
});
