import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../src/stores/authStore';
import api from '../../../src/services/apiClient';

export default function ReviewsModal() {
  const { user } = useAuthStore();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['partnerReviews', user?.partnerId],
    queryFn: () => api.get(`/partner/${user?.partnerId}/reviews`).then(r => r.data),
    enabled: !!user?.partnerId
  });

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rating History</Text>
      <Text style={styles.subtitle}>What clients are saying about your work</Text>
      
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#FF6B1A" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {reviews && reviews.length > 0 ? (
            reviews.map((r: any) => (
              <View key={r.id} style={styles.card}>
                <View style={styles.header}>
                  <Text style={styles.name}>{r.name}</Text>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.star}>⭐</Text>
                    <Text style={styles.rating}>{r.rating.toFixed(1)}</Text>
                  </View>
                </View>
                {r.category && <Text style={styles.categoryTag}>{r.category}</Text>}
                {r.comment ? (
                  <Text style={styles.comment}>{r.comment}</Text>
                ) : (
                  <Text style={[styles.comment, { fontStyle: 'italic', color: '#C4B5A5' }]}>No written feedback provided.</Text>
                )}
                <Text style={styles.date}>{formatDate(r.createdAt)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No ratings or reviews yet.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE', padding: 24, paddingTop: 60 },
  title: { fontFamily: 'Syne-ExtraBold', fontSize: 24, color: '#1C1410', marginBottom: 8 },
  subtitle: { fontFamily: 'Nunito-SemiBold', fontSize: 16, color: '#6B5C4E', marginBottom: 24 },
  content: { paddingBottom: 24 },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#EEE0CC', marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  name: { fontFamily: 'Syne-Bold', fontSize: 16, color: '#1C1410' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0D6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  star: { fontSize: 12, marginRight: 4 },
  rating: { fontFamily: 'Nunito-Bold', fontSize: 14, color: '#FF6B1A' },
  categoryTag: { fontFamily: 'Nunito-Bold', fontSize: 12, color: '#FF6B1A', backgroundColor: '#FFF0D6', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 8 },
  comment: { fontFamily: 'Nunito-SemiBold', fontSize: 14, color: '#6B5C4E', marginBottom: 12, lineHeight: 20 },
  date: { fontFamily: 'DMMono-Regular', fontSize: 12, color: '#C4B5A5' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  emptyText: { fontFamily: 'Nunito-SemiBold', fontSize: 14, color: '#C4B5A5', textAlign: 'center' }
});

