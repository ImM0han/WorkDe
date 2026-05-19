import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAlertStore } from '../stores/alertStore';

const { width } = Dimensions.get('window');

export const AnimatedAlert = () => {
  const { visible, type, title, message, hideAlert } = useAlertStore();

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const iconScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      iconScale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 200 }));
    } else {
      scale.value = withTiming(0, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
      iconScale.value = 0;
    }
  }, [visible]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  // If we completely unmount, we can't animate out. 
  // We use pointerEvents to ensure it doesn't block touches when invisible.
  if (!visible && opacity.value === 0) return null;

  const iconName = type === 'success' ? 'checkmark-circle' : type === 'error' ? 'close-circle' : 'information-circle';
  const iconColor = type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3';

  return (
    <View style={styles.overlay} pointerEvents={visible ? "auto" : "none"}>
      <Animated.View style={[styles.backdrop, { opacity: opacity }]} pointerEvents={visible ? "auto" : "none"}>
        <Pressable style={StyleSheet.absoluteFill} onPress={hideAlert} />
      </Animated.View>
      <Animated.View style={[styles.popup, animatedContainerStyle]} pointerEvents={visible ? "auto" : "none"}>
        <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
          <Ionicons name={iconName} size={80} color={iconColor} />
        </Animated.View>
        
        {!!title && <Text style={styles.title}>{title}</Text>}
        {!!message && <Text style={styles.message}>{message}</Text>}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  popup: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.8,
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Syne-Bold',
    fontSize: 22,
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
