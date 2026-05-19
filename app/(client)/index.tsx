import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius, categoryIcons, categoryBgColors, gradients } from '../../src/theme/tokens';
import { PartnerCard } from '../../src/components/PartnerCard';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import api from '../../src/services/apiClient';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

function CategoryPill({ name, icon, isSelected, onPress }: { name: string, icon: string, isSelected: boolean, onPress: () => void }) {
  return (
    <TouchableOpacity 
      style={[
        styles.pill,
        isSelected ? styles.pillActive : styles.pillInactive
      ]} 
      activeOpacity={0.8} 
      onPress={onPress}
    >
      <Text style={styles.pillIcon}>{icon}</Text>
      <Text style={[
        styles.pillText,
        isSelected ? styles.pillTextActive : styles.pillTextInactive
      ]}>{name}</Text>
    </TouchableOpacity>
  );
}

export default function ClientHome() {
  const { t } = useTranslation();
  const router = useRouter();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({ lat: location.coords.latitude, lng: location.coords.longitude });
    })();
  }, []);

  const { data: partners, isLoading } = useQuery({
    queryKey: ['nearbyPartners', userLocation, selectedCategory],
    queryFn: () => api.get('/partner/nearby', {
      params: { lat: userLocation?.lat, lng: userLocation?.lng, category: selectedCategory }
    }).then(r => r.data),
    enabled: !!userLocation,
    staleTime: 60_000,
  });

  const filteredPartners = partners?.filter((p: any) => {
    let matchesSearch = true;
    if (searchText.trim() !== '') {
      const query = searchText.toLowerCase().trim();
      const nameMatch = p.user.name.toLowerCase().includes(query);
      const skillMatch = p.skills.some((skill: string) => skill.toLowerCase().includes(query));
      matchesSearch = nameMatch || skillMatch;
    }
    return matchesSearch;
  });

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradients.header as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{t('clientHome.findProfessional') || 'Find a Professional'}</Text>
            <View style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder={t('clientHome.searchPlaceholder') || 'Search for skills, names...'}
                placeholderTextColor={colors.textMuted}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>{t('clientHome.categories') || 'Categories'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          <CategoryPill 
            name={t('clientHome.all') || 'All'} icon="🔍" isSelected={selectedCategory === null}
            onPress={() => setSelectedCategory(null)}
          />
          {Object.entries(categoryIcons).map(([name, icon]) => (
            <CategoryPill 
              key={name} name={t(`skills.${name}`) || name} icon={icon} isSelected={selectedCategory === name}
              onPress={() => setSelectedCategory(selectedCategory === name ? null : name)}
            />
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('clientHome.nearbyProfessionals') || 'Nearby Professionals'}</Text>
          <TouchableOpacity onPress={() => router.push('/(client)/(modals)/search-filter')}>
            <Text style={styles.filterText}>{t('common.filter') || 'Filter'} ⚙️</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <Text style={styles.loadingText}>{t('common.loading') || 'Loading nearby partners...'}</Text>
        ) : filteredPartners?.length === 0 ? (
          <Text style={styles.loadingText}>{t('clientHome.noProfessionals') || 'No professionals found matching your criteria.'}</Text>
        ) : (
          filteredPartners?.map((partner: any) => (
            <PartnerCard 
              key={partner.id} partner={partner} 
              onPress={() => router.push(`/(client)/(modals)/partner-profile?partnerId=${partner.id}`)} 
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  header: { paddingBottom: 24, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  headerContent: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  headerTitle: { fontFamily: typography.fontDisplay, fontSize: 26, fontWeight: '800', color: colors.bgCard, marginBottom: spacing.md },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: radius.full, paddingHorizontal: spacing.md, height: 50, borderWidth: 2, borderColor: 'transparent' },
  searchBarFocused: { borderColor: colors.primary },
  searchIcon: { fontSize: 18, marginRight: spacing.sm },
  searchInput: { flex: 1, fontFamily: typography.fontBody, fontSize: 15, color: colors.textPrimary },
  scrollContent: { padding: spacing.md, paddingBottom: 100 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, marginTop: spacing.lg },
  sectionTitle: { fontFamily: typography.fontDisplay, fontSize: 19, fontWeight: '800', color: colors.textPrimary },
  filterText: { fontFamily: typography.fontBody, fontSize: 14, fontWeight: '700', color: colors.primary },
  categoryScroll: { gap: spacing.sm, marginTop: spacing.md, paddingHorizontal: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  pillActive: { backgroundColor: '#FFF0D6', borderWidth: 1.5, borderColor: '#FF6B1A' },
  pillInactive: { backgroundColor: '#FFF', borderWidth: 0.5, borderColor: '#EEE0CC' },
  pillIcon: { fontSize: 16, marginRight: 6 },
  pillText: { fontFamily: typography.fontBody, fontSize: 14 },
  pillTextActive: { color: '#FF6B1A', fontFamily: 'Nunito-Bold' },
  pillTextInactive: { color: '#6B5C4E', fontFamily: 'Nunito-SemiBold' },
  loadingText: { fontFamily: typography.fontBody, textAlign: 'center', marginTop: 20, color: colors.textMuted }
});
