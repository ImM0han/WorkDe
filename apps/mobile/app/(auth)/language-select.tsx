import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { SUPPORTED_LANGUAGES } from '../../src/i18n';
import { useLanguageStore } from '../../src/i18n/languageStore';
import { typography } from '../../src/theme/tokens';

const { width } = Dimensions.get('window');

export default function LanguageSelect() {
  const router = useRouter();
  const { t } = useTranslation();
  const { setLanguage, markLanguageSelected, currentLang } = useLanguageStore();
  const [selected, setSelected] = useState(currentLang || 'en');

  useEffect(() => {
    // When screen loads, if the store already has a language, use it to pre-select
    if (currentLang && currentLang !== selected) {
      setSelected(currentLang);
    }
  }, []);

  const handleSelect = async (code: string) => {
    setSelected(code);
    await setLanguage(code); // Live preview updates instantly
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleContinue = () => {
    markLanguageSelected();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(auth)/onboarding');
  };

  return (
    <LinearGradient colors={['#1A0C02', '#CC4A00', '#FF6B1A', '#FF8C42']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header */}
        <Animated.View entering={FadeIn.delay(100).duration(800)} style={styles.header}>
          <Text style={styles.appName}>{t('app.name')}</Text>
          <Text style={styles.tagline}>{t('app.tagline')}</Text>
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.titleContainer}>
          <Text style={styles.title}>{t('language.selectTitle')}</Text>
          <Text style={styles.subtitle}>{t('language.selectSubtitle')}</Text>
        </Animated.View>

        {/* Grid */}
        <View style={styles.gridContainer}>
          <FlatList
            data={SUPPORTED_LANGUAGES}
            keyExtractor={(item) => item.code}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.row}
            renderItem={({ item, index }) => {
              const isSelected = selected === item.code;
              return (
                <Animated.View entering={FadeInUp.delay(300 + (index * 100)).duration(500)} style={styles.cardWrapper}>
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
                    <Text style={styles.nativeLabel}>{item.nativeLabel}</Text>
                    <Text style={styles.enLabel}>{item.label}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            }}
          />
        </View>

        {/* Continue Button */}
        <Animated.View entering={FadeInUp.delay(800).duration(500)} style={styles.footer}>
          <TouchableOpacity onPress={handleContinue} activeOpacity={0.8}>
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.continueButton}
            >
              <Text style={styles.continueText}>{t('common.continue')} →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  appName: {
    fontFamily: typography.fontDisplay,
    fontSize: 42,
    color: '#FFF',
    fontWeight: '800',
    letterSpacing: -1,
  },
  tagline: {
    fontFamily: typography.fontBody,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  titleContainer: {
    marginBottom: 30,
  },
  title: {
    fontFamily: typography.fontDisplay,
    fontSize: 28,
    color: '#FFF',
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  gridContainer: {
    flex: 1,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardWrapper: {
    width: (width - 64) / 2, // 24 padding on each side (48) + 16 gap between = 64
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderColor: '#FFF',
  },
  flag: {
    fontSize: 36,
    marginBottom: 12,
  },
  nativeLabel: {
    fontFamily: typography.fontDisplay,
    fontSize: 17,
    color: '#FFF',
    fontWeight: '700',
    marginBottom: 4,
  },
  enLabel: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFF',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: {
    color: '#FF6B1A',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    paddingBottom: 24,
  },
  continueButton: {
    borderRadius: 100,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  continueText: {
    fontFamily: typography.fontBody,
    fontSize: 18,
    color: '#FFF',
    fontWeight: '700',
  }
});
