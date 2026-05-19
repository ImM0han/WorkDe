import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { SUPPORTED_LANGUAGES } from '../../src/i18n';
import { useLanguageStore } from '../../src/i18n/languageStore';
import { typography, colors, spacing, shadow, radius } from '../../src/theme/tokens';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function LanguageSettings() {
  const router = useRouter();
  const { t } = useTranslation();
  const { setLanguage, currentLang } = useLanguageStore();
  const [selected, setSelected] = useState(currentLang || 'en');

  useEffect(() => {
    if (currentLang && currentLang !== selected) {
      setSelected(currentLang);
    }
  }, []);

  const handleSelect = async (code: string) => {
    setSelected(code);
    await setLanguage(code);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Toast.show({
      type: 'success',
      text1: t('language.changeTitle'),
      text2: t('language.changed', { lang: SUPPORTED_LANGUAGES.find(l => l.code === code)?.nativeLabel }),
      position: 'bottom',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="chevron-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('language.changeTitle')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.gridContainer}>
        <FlatList
          data={SUPPORTED_LANGUAGES}
          keyExtractor={(item) => item.code}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => {
            const isSelected = selected === item.code;
            return (
              <View style={styles.cardWrapper}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleSelect(item.code)}
                  style={[
                    styles.card,
                    isSelected && styles.cardSelected
                  ]}
                >
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  )}
                  <Text style={styles.flag}>{item.flag}</Text>
                  <Text style={[styles.nativeLabel, isSelected && { color: colors.primary }]}>{item.nativeLabel}</Text>
                  <Text style={styles.enLabel}>{item.label}</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border2,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  gridContainer: {
    flex: 1,
  },
  listContent: {
    padding: 24,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardWrapper: {
    width: (width - 64) / 2,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border2,
    ...shadow.card,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FFF5EB',
  },
  flag: {
    fontSize: 36,
    marginBottom: 12,
  },
  nativeLabel: {
    fontFamily: typography.fontDisplay,
    fontSize: 17,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 4,
  },
  enLabel: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: colors.textSecondary,
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
