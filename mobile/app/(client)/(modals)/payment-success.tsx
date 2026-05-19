import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, radius, shadow } from '../../../src/theme/tokens';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

export default function PaymentSuccess() {
  const router = useRouter();
  const txId = 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase();

  const handleCopy = async () => {
    await Clipboard.setStringAsync(txId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.iconCircle}>
        <Text style={styles.checkIcon}>✓</Text>
      </View>

      <Text style={styles.title}>Payment Successful</Text>
      
      <View style={styles.receipt}>
        <Text style={styles.label}>Amount Paid</Text>
        <Text style={styles.amount}>₹1,250.00</Text>
        
        <View style={styles.divider} />
        
        <Text style={styles.label}>Transaction ID</Text>
        <TouchableOpacity onPress={handleCopy} onLongPress={handleCopy}>
          <Text style={styles.txId}>{txId}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.dismissAll()}>
        <LinearGradient colors={['#FF6B1A', '#F59E0B']} style={styles.button}>
          <Text style={styles.buttonText}>Back to Home</Text>
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage, padding: spacing.xl, justifyContent: 'center' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.xl, ...shadow.card },
  checkIcon: { fontSize: 40, color: 'white', fontWeight: '800' },
  title: { fontFamily: typography.fontDisplay, fontSize: 28, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xl },
  receipt: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: 24, borderWidth: 1, borderColor: colors.border2, ...shadow.card, marginBottom: spacing.xxl, alignItems: 'center' },
  label: { fontFamily: typography.fontBody, fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  amount: { fontFamily: typography.fontMono, fontSize: 32, fontWeight: '800', color: colors.primary },
  divider: { height: 1, width: '100%', backgroundColor: colors.border2, marginVertical: 20 },
  txId: { fontFamily: typography.fontMono, fontSize: 18, color: colors.textPrimary, fontWeight: '600' },
  button: { borderRadius: radius.full, padding: 18, alignItems: 'center', ...shadow.card },
  buttonText: { fontFamily: typography.fontDisplay, fontSize: 18, fontWeight: '800', color: 'white' }
});
