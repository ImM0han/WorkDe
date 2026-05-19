import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView } from 'react-native';

export default function SearchScreen() {
  const [query, setQuery] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search Jobs</Text>
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Search categories, skills, or locations..."
          placeholderTextColor="#C4B5A5"
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.emptyText}>Type to search for jobs matching your skills.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF6EE',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    backgroundColor: '#FFF0D6',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE0CC'
  },
  headerTitle: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 26,
    color: '#1C1410'
  },
  searchContainer: {
    padding: 24
  },
  input: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEE0CC',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
    color: '#1C1410'
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24
  },
  emptyText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    color: '#C4B5A5',
    textAlign: 'center',
    marginTop: 40
  }
});
