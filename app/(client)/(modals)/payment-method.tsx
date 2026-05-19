import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors, typography, spacing, radius, shadow } from '../../../src/theme/tokens';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function PaymentMethod() {
  const router = useRouter();
  const [method, setMethod] = useState('UPI');

  const methods = ['UPI', 'Credit/Debit Card', 'Net Banking'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Payment Method</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {methods.map(m => (
          <TouchableOpacity 
            key={m} 
            style={[styles.methodCard, method === m && styles.methodCardActive]}
            onPress={() => setMethod(m)}
            activeOpacity={0.7}
          >
            <View style={styles.radio}>
              {method === m && <View style={styles.radioInner} />}
            </View>
            <Text style={[styles.methodText, method === m && styles.methodTextActive]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => router.replace('/(client)/(modals)/payment-processing')}>
          <LinearGradient colors={['#FF6B1A', '#F59E0B']} style={styles.payButton}>
            <Text style={styles.payButtonText}>Pay ₹1,250.00</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { fontFamily: typography.fontBody, fontSize: 16, color: colors.primary, fontWeight: '600' },
  title: { fontFamily: typography.fontDisplay, fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  content: { padding: spacing.md },
  methodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, padding: 20, borderRadius: radius.md, marginBottom: 12, borderWidth: 1, borderColor: colors.border2 },
  methodCardActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary, borderLeftWidth: 4 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  methodText: { fontFamily: typography.fontBody, fontSize: 16, color: colors.textPrimary, fontWeight: '600' },
  methodTextActive: { color: colors.primaryDark, fontWeight: '800' },
  footer: { padding: spacing.md, backgroundColor: colors.bgCard, borderTopWidth: 1, borderTopColor: colors.border, ...shadow.card },
  payButton: { borderRadius: radius.full, padding: 16, alignItems: 'center' },
  payButtonText: { fontFamily: typography.fontDisplay, fontSize: 18, fontWeight: '800', color: 'white' }
});
