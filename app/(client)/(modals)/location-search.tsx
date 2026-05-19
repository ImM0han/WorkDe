import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useLocationStore } from '../../../src/stores/locationStore';
import debounce from 'lodash.debounce';

interface SearchResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    district?: string;
    state?: string;
    postcode?: string;
  };
}

export default function LocationSearch() {
  const { setPickedLocation } = useLocationStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async (text: string) => {
    if (text.trim().length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      // Use Photon API which is built on OSM but highly optimized for type-ahead search
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&bbox=68.1,6.5,97.4,35.5&limit=8`,
        { headers: { 'User-Agent': 'GigWork/1.0 (contact@gigwork.in)' } }
      );
      const data = await res.json();
      
      const formattedResults: SearchResult[] = data.features.map((f: any) => {
        const props = f.properties;
        const parts = [props.name, props.street, props.city, props.state, props.country]
          .filter(Boolean)
          .filter((v, i, a) => a.indexOf(v) === i); // remove duplicates
          
        return {
          place_id: props.osm_id?.toString() || Math.random().toString(),
          display_name: parts.join(', '),
          lat: f.geometry.coordinates[1].toString(),
          lon: f.geometry.coordinates[0].toString(),
          address: {
            city: props.city || props.town || props.county || '',
            state: props.state || '',
            postcode: props.postcode || ''
          }
        };
      });
      
      setResults(formattedResults);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounce so we don't hit Nominatim on every keystroke
  const debouncedSearch = useCallback(debounce(search, 500), []);

  const handleSelect = (item: SearchResult) => {
    setPickedLocation({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      fullAddress: item.display_name,
      city:
        item.address?.city ||
        item.address?.town ||
        item.address?.district || '',
      state: item.address?.state || '',
      pincode: item.address?.postcode || '',
    });
    router.back();
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Search Location</Text>
      </View>

      {/* Search input */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search area, street, landmark..."
          placeholderTextColor="#C4B5A5"
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            debouncedSearch(text);
          }}
          autoFocus
          returnKeyType="search"
          onSubmitEditing={() => search(query)}
        />
        {loading && (
          <ActivityIndicator color="#FF6B1A" style={{ marginRight: 12 }} />
        )}
      </View>

      {/* Results list */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.place_id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          // Split display_name into main + secondary parts
          const parts = item.display_name.split(', ');
          const main = parts.slice(0, 2).join(', ');
          const secondary = parts.slice(2).join(', ');
          return (
            <TouchableOpacity
              style={styles.resultRow}
              onPress={() => handleSelect(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.resultPin}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultMain} numberOfLines={1}>
                  {main}
                </Text>
                <Text style={styles.resultSub} numberOfLines={1}>
                  {secondary}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          searched && !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                No results found. Try a different search.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE' },
  header: {
    paddingTop: 56, paddingHorizontal: 20,
    paddingBottom: 12,
  },
  back: {
    fontFamily: 'Nunito-SemiBold', fontSize: 14,
    color: '#FF6B1A', marginBottom: 8,
  },
  title: {
    fontFamily: 'Syne-ExtraBold', fontSize: 22,
    color: '#1C1410',
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF0D6',
    borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,107,26,0.3)',
    marginHorizontal: 16, marginBottom: 8,
  },
  searchIcon: { fontSize: 16, paddingLeft: 14 },
  searchInput: {
    flex: 1, paddingHorizontal: 10,
    paddingVertical: 14,
    fontFamily: 'Nunito-Regular', fontSize: 15,
    color: '#1C1410',
  },
  resultRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 12, paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#EEE0CC',
    backgroundColor: '#FFFFFF',
  },
  resultPin: { fontSize: 16, marginTop: 2 },
  resultMain: {
    fontFamily: 'Nunito-Bold', fontSize: 14,
    color: '#1C1410', marginBottom: 3,
  },
  resultSub: {
    fontFamily: 'Nunito-Regular', fontSize: 12,
    color: '#6B5C4E',
  },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: {
    fontFamily: 'Nunito-Regular', fontSize: 14,
    color: '#C4B5A5', textAlign: 'center',
  },
});
