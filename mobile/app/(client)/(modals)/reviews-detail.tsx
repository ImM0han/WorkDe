import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, radius } from '../../../src/theme/tokens';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ReviewsDetail() {
  const router = useRouter();
  
  const reviews = [
    { id: '1', client: 'Amit Singh', rating: 5, text: 'Great work, very professional.', date: '2 days ago' },
    { id: '2', client: 'Priya Verma', rating: 4, text: 'Arrived a bit late but fixed the issue perfectly.', date: '1 week ago' },
    { id: '3', client: 'Vikram Joshi', rating: 5, text: 'Excellent service!', date: '2 weeks ago' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>All Reviews</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {reviews.map(review => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewClient}>{review.client}</Text>
              <Text style={styles.reviewDate}>{review.date}</Text>
            </View>
            <View style={styles.ratingRowSm}>
              {[...Array(5)].map((_, i) => (
                <Ionicons key={i} name="star" size={14} color={i < review.rating ? colors.warning : colors.border} />
              ))}
            </View>
            <Text style={styles.reviewText}>{review.text}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontFamily: typography.fontDisplay, fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  content: { padding: spacing.md },
  reviewCard: { backgroundColor: colors.bgCard, padding: 16, borderRadius: radius.md, marginBottom: 12, borderWidth: 1, borderColor: colors.border2 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  reviewClient: { fontFamily: typography.fontBody, fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  reviewDate: { fontFamily: typography.fontMono, fontSize: 12, color: colors.textMuted },
  ratingRowSm: { flexDirection: 'row', marginBottom: 10 },
  reviewText: { fontFamily: typography.fontBody, fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
});
