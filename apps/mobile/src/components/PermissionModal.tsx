import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

interface PermissionModalProps {
  visible: boolean;
  title?: string;
  description?: string;
  iconName?: keyof typeof Feather.glyphMap;
  badgeText?: string;
  allowButtonText?: string;
  skipButtonText?: string;
  onAllow: () => void;
  onSkip?: () => void;
}

const { width } = Dimensions.get('window');

export function PermissionModal({
  visible,
  title = 'Enable Location Services',
  description = 'We need your location to show nearby jobs, match professionals in real-time, and calculate precise distance.',
  iconName = 'map-pin',
  badgeText = 'REQUIRED FOR REAL-TIME MATCHING',
  allowButtonText = 'Grant Location Permission',
  skipButtonText = 'Not Now',
  onAllow,
  onSkip,
}: PermissionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.cardContainer}>
          {/* Top Gradient Badge Icon */}
          <View style={styles.iconOuterRing}>
            <LinearGradient
              colors={['#FF6B1A', '#F59E0B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Feather name={iconName} size={32} color="#FFFFFF" />
            </LinearGradient>
          </View>

          {/* Badge Label */}
          {badgeText ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          ) : null}

          {/* Title & Description */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          {/* Benefit Bullet Points */}
          <View style={styles.benefitsContainer}>
            <View style={styles.benefitRow}>
              <View style={styles.benefitIconBg}>
                <Feather name="check" size={14} color="#FF6B1A" />
              </View>
              <Text style={styles.benefitText}>Find work & workers nearby in seconds</Text>
            </View>

            <View style={styles.benefitRow}>
              <View style={styles.benefitIconBg}>
                <Feather name="navigation" size={14} color="#FF6B1A" />
              </View>
              <Text style={styles.benefitText}>Accurate live tracking & distance calculation</Text>
            </View>

            <View style={styles.benefitRow}>
              <View style={styles.benefitIconBg}>
                <Feather name="shield" size={14} color="#FF6B1A" />
              </View>
              <Text style={styles.benefitText}>Private & encrypted — used only when active</Text>
            </View>
          </View>

          {/* Actions */}
          <TouchableOpacity
            style={styles.allowButtonWrapper}
            activeOpacity={0.85}
            onPress={onAllow}
          >
            <LinearGradient
              colors={['#FF6B1A', '#F59E0B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.allowButton}
            >
              <Text style={styles.allowButtonText}>{allowButtonText}</Text>
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          {onSkip ? (
            <TouchableOpacity
              style={styles.skipButton}
              activeOpacity={0.7}
              onPress={onSkip}
            >
              <Text style={styles.skipButtonText}>{skipButtonText}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 20, 16, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  cardContainer: {
    width: Math.min(width - 40, 380),
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    paddingTop: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  iconOuterRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF0D6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 26, 0.2)',
  },
  iconGradient: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  badge: {
    backgroundColor: '#FFF0D6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 26, 0.25)',
  },
  badgeText: {
    fontFamily: 'DMMono-Medium',
    fontSize: 10,
    color: '#FF6B1A',
    letterSpacing: 0.6,
  },
  title: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 22,
    color: '#1C1410',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    color: '#6B5C4E',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  benefitsContainer: {
    width: '100%',
    backgroundColor: '#FDF6EE',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 26, 0.12)',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitIconBg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF0D6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 13,
    color: '#1C1410',
    flex: 1,
  },
  allowButtonWrapper: {
    width: '100%',
    marginBottom: 10,
  },
  allowButton: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  allowButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  skipButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: '#8C7A6B',
  },
});
