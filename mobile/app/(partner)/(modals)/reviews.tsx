import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function ReviewsModal() {
  const reviews = [
    { id: '1', name: 'John D.', rating: 5, date: 'Oct 15, 2023', comment: 'Excellent electrician. Fixed the wiring issue quickly and safely.' },
    { id: '2', name: 'Sarah M.', rating: 4.8, date: 'Sep 28, 2023', comment: 'Very professional and on time. Highly recommended.' },
    { id: '3', name: 'Raj K.', rating: 5, date: 'Sep 10, 2023', comment: 'Great job, fast and efficient.' }
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rating History</Text>
      <Text style={styles.subtitle}>What clients are saying about your work</Text>
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {reviews.map(r => (
          <View key={r.id} style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.name}>{r.name}</Text>
              <View style={styles.ratingBadge}>
                <Text style={styles.star}>⭐</Text>
                <Text style={styles.rating}>{r.rating}</Text>
              </View>
            </View>
            <Text style={styles.comment}>{r.comment}</Text>
            <Text style={styles.date}>{r.date}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE', padding: 24, paddingTop: 60 },
  title: { fontFamily: 'Syne-ExtraBold', fontSize: 24, color: '#1C1410', marginBottom: 8 },
  subtitle: { fontFamily: 'Nunito-SemiBold', fontSize: 16, color: '#6B5C4E', marginBottom: 24 },
  content: { paddingBottom: 24 },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#EEE0CC', marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  name: { fontFamily: 'Syne-Bold', fontSize: 16, color: '#1C1410' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0D6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  star: { fontSize: 12, marginRight: 4 },
  rating: { fontFamily: 'Nunito-Bold', fontSize: 14, color: '#FF6B1A' },
  comment: { fontFamily: 'Nunito-SemiBold', fontSize: 14, color: '#6B5C4E', marginBottom: 12, lineHeight: 20 },
  date: { fontFamily: 'DMMono-Regular', fontSize: 12, color: '#C4B5A5' }
});
