import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../src/stores/authStore';

export default function RoleSelectScreen() {
  const [selectedRole, setSelectedRole] = useState<'PARTNER' | 'CLIENT' | null>(null);
  const setRole = useAuthStore(state => state.setRole);

  const handleSelect = (role: 'PARTNER' | 'CLIENT') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRole(role);
  };

  const handleContinue = () => {
    if (selectedRole) {
      setRole(selectedRole);
      router.push('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How do you want to use GigWork?</Text>
      
      <View style={styles.cardsContainer}>
        <TouchableOpacity 
          style={[styles.card, selectedRole === 'PARTNER' && styles.cardActive]}
          onPress={() => handleSelect('PARTNER')}
          activeOpacity={0.7}
        >
          <Text style={styles.emoji}>🔧</Text>
          <Text style={[styles.cardTitle, selectedRole === 'PARTNER' && styles.textActive]}>Partner</Text>
          <Text style={styles.cardDesc}>Find work and earn</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, selectedRole === 'CLIENT' && styles.cardActive]}
          onPress={() => handleSelect('CLIENT')}
          activeOpacity={0.7}
        >
          <Text style={styles.emoji}>💼</Text>
          <Text style={[styles.cardTitle, selectedRole === 'CLIENT' && styles.textActive]}>Client</Text>
          <Text style={styles.cardDesc}>Hire skilled workers</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.button, !selectedRole && styles.buttonDisabled]} 
        onPress={handleContinue}
        disabled={!selectedRole}
      >
        <Text style={styles.buttonText}>
          Continue as {selectedRole ? (selectedRole === 'PARTNER' ? 'Partner' : 'Client') : '...'} →
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF6EE',
    padding: 24,
    justifyContent: 'center'
  },
  title: {
    fontFamily: 'Syne-ExtraBold',
    fontSize: 26,
    color: '#1C1410',
    textAlign: 'center',
    marginBottom: 48
  },
  cardsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 48
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#F5E8D5',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: 'rgba(200,100,20,1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardActive: {
    borderColor: '#FF6B1A',
    backgroundColor: '#FFF0D6'
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16
  },
  cardTitle: {
    fontFamily: 'Syne-Bold',
    fontSize: 19,
    color: '#1C1410',
    marginBottom: 8
  },
  cardDesc: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 13,
    color: '#6B5C4E',
    textAlign: 'center'
  },
  textActive: {
    color: '#FF6B1A'
  },
  button: {
    backgroundColor: '#FF6B1A',
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  buttonDisabled: {
    backgroundColor: '#C4B5A5'
  },
  buttonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: '#FFFFFF'
  }
});
