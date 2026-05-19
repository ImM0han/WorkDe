import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, typography, spacing, radius } from '../../../src/theme/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ComingSoon() {
  const { title } = useLocalSearchParams();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title || 'Coming Soon'}</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.content}>
        <Text style={styles.emoji}>🚧</Text>
        <Text style={styles.message}>We are currently working on this feature!</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { fontFamily: typography?.fontBody || 'Nunito', fontSize: 16, color: colors.primary, fontWeight: '600' },
  title: { fontFamily: typography?.fontDisplay || 'Syne', fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emoji: { fontSize: 64, marginBottom: spacing.md },
  message: { fontFamily: typography?.fontBody || 'Nunito', fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  btn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.full },
  btnText: { fontFamily: typography?.fontBody || 'Nunito', color: 'white', fontWeight: '800' }
});
