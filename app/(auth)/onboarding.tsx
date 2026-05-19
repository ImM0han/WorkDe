import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolateColor } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const slides = [
  { title: 'Find Work\nNearby', emoji: '🗺️', desc: 'Get matched with clients who need your skills instantly.' },
  { title: 'Get Paid\nInstantly', emoji: '💰', desc: 'Secure payments straight to your GigWork wallet.' },
  { title: 'Verified &\nTrusted', emoji: '✅', desc: 'Join a community of verified professionals.' }
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem('onboarded').then((val) => {
      if (val === 'true') {
        router.replace('/(auth)/role-select');
      }
    });
  }, []);

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      await AsyncStorage.setItem('onboarded', 'true');
      router.replace('/(auth)/role-select');
    }
  };

  const skip = async () => {
    await AsyncStorage.setItem('onboarded', 'true');
    router.replace('/(auth)/role-select');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={skip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.slideContainer}>
        <Text style={styles.emoji}>{slides[currentIndex].emoji}</Text>
        <Text style={styles.title}>{slides[currentIndex].title}</Text>
        <Text style={styles.desc}>{slides[currentIndex].desc}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dotsContainer}>
          {slides.map((_, i) => (
            <Dot key={i} active={i === currentIndex} />
          ))}
        </View>

        <TouchableOpacity onPress={handleNext} activeOpacity={0.8}>
          <LinearGradient colors={['#FF6B1A', '#F59E0B']} style={styles.button}>
            <Text style={styles.buttonText}>
              {currentIndex === slides.length - 1 ? 'Get Started →' : 'Next →'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const Dot = ({ active }: { active: boolean }) => {
  const widthVal = useSharedValue(active ? 24 : 8);

  useEffect(() => {
    widthVal.value = withTiming(active ? 24 : 8, { duration: 300 });
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: widthVal.value,
    backgroundColor: active ? '#FF6B1A' : '#EEE0CC'
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF6EE',
    padding: 24,
    justifyContent: 'space-between'
  },
  skipButton: {
    alignSelf: 'flex-end',
    marginTop: 40,
    padding: 10
  },
  skipText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
    color: '#FF6B1A'
  },
  slideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emoji: {
    fontSize: 100,
    marginBottom: 40
  },
  title: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 34,
    color: '#1C1410',
    textAlign: 'center',
    marginBottom: 16
  },
  desc: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
    color: '#6B5C4E',
    textAlign: 'center',
    paddingHorizontal: 20
  },
  footer: {
    paddingBottom: 40
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8
  },
  dot: {
    height: 8,
    borderRadius: 4
  },
  button: {
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  buttonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: '#FFFFFF'
  }
});
