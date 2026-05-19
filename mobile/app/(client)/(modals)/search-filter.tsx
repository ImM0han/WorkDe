import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, radius, shadow } from '../../../src/theme/tokens';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';

export default function SearchFilter() {
  const router = useRouter();
  const [minRating, setMinRating] = useState(4);
  const [distance, setDistance] = useState(10); // km
  const [maxRate, setMaxRate] = useState(2000);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Filters</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Minimum Rating</Text>
        <View style={styles.optionsRow}>
          {[3, 4, 4.5].map(rating => (
            <TouchableOpacity 
              key={rating}
              style={[styles.optionBadge, minRating === rating && styles.optionActive]}
              onPress={() => setMinRating(rating)}
            >
              <Text style={[styles.optionText, minRating === rating && styles.optionTextActive]}>
                {rating}+ ⭐
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Maximum Distance (km)</Text>
        <View style={styles.optionsRow}>
          {[5, 10, 20, 50].map(dist => (
            <TouchableOpacity 
              key={dist}
              style={[styles.optionBadge, distance === dist && styles.optionActive]}
              onPress={() => setDistance(dist)}
            >
              <Text style={[styles.optionText, distance === dist && styles.optionTextActive]}>
                {dist} km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
          <Text style={styles.sectionTitle}>Maximum Daily Rate</Text>
          <Text style={styles.rateValue}>₹{maxRate}</Text>
        </View>
        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={200}
          maximumValue={5000}
          step={100}
          value={maxRate}
          onValueChange={setMaxRate}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border2}
          thumbTintColor={colors.primary}
        />
      </View>

      <View style={{ flex: 1 }} />

      <TouchableOpacity onPress={() => router.back()}>
        <LinearGradient colors={['#FF6B1A', '#F59E0B']} style={styles.applyButton}>
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage, padding: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  title: { fontFamily: typography.fontDisplay, fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  closeText: { fontFamily: typography.fontBody, fontSize: 16, color: colors.primary, fontWeight: '600' },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontFamily: typography.fontDisplay, fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.md },
  rateValue: { fontFamily: typography.fontMono, fontSize: 16, fontWeight: '800', color: colors.primary },
  optionsRow: { flexDirection: 'row', gap: 12 },
  optionBadge: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.full, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border2 },
  optionActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  optionText: { fontFamily: typography.fontBody, fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  optionTextActive: { color: colors.primaryDark, fontWeight: '800' },
  applyButton: { borderRadius: radius.full, padding: 16, alignItems: 'center', ...shadow.card },
  applyButtonText: { fontFamily: typography.fontDisplay, fontSize: 16, fontWeight: '800', color: 'white' }
});
