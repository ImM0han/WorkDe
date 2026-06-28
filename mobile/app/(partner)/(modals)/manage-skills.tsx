import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../src/stores/authStore';
import api from '../../../src/services/apiClient';

export default function ManageSkillsModal() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [selectedSkills, setSelectedSkills] = useState<string[]>(user?.partner?.skills || []);
  const [saving, setSaving] = useState(false);

  const availableSkills = [
    'Mason', 'Cleaner', 'Electrician', 'Carpenter', 'Plumber', 'Painter', 
    'Gardener', 'Driver', 'Loading', 'Farming', 'Cook', 'Babysitter', 
    'Beautician', 'EventSetup', 'Waiter'
  ];
  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      if (selectedSkills.length >= 2) {
        Toast.show({ type: 'error', text1: 'Limit Reached', text2: 'You can select a maximum of two skills.' });
        return;
      }
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await api.put('/partner/skills', { skills: selectedSkills });
      
      // Update the user's local store details
      if (user) {
        const updatedUser = {
          ...user,
          partner: {
            ...user.partner!,
            skills: selectedSkills
          }
        };
        useAuthStore.setState({ user: updatedUser });
      }

      Toast.show({ type: 'success', text1: 'Success', text2: 'Skills updated successfully.' });
      router.back();
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to save skills. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const showDocumentNote = selectedSkills.includes('Electrician') || selectedSkills.includes('Driver');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('profile.manageSkills') || 'Manage Skills'}</Text>
      <Text style={styles.subtitle}>{t('profile.selectSkills') || 'Select the services you offer. (Max 2)'}</Text>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {availableSkills.map(skill => {
            const isSelected = selectedSkills.includes(skill);
            return (
              <TouchableOpacity 
                key={skill} 
                style={[styles.skillBtn, isSelected && styles.skillBtnActive]}
                onPress={() => toggleSkill(skill)}
              >
                <Text style={[styles.skillText, isSelected && styles.skillTextActive]}>{t(`skills.${skill}`) || skill}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {showDocumentNote && (
        <View style={styles.noteBanner}>
          <Feather name="info" size={18} color="#9A3412" />
          <Text style={styles.noteText}>
            {t('profile.documentNote') || 'A certificate or valid document is required to verify your Electrician or Driver skills.'}
          </Text>
        </View>
      )}

      <TouchableOpacity 
        style={styles.submitBtnWrapper} 
        onPress={handleSave}
        disabled={selectedSkills.length === 0 || saving}
      >
        <LinearGradient 
          colors={selectedSkills.length === 0 || saving ? ['#C4B5A5', '#C4B5A5'] : ['#FF6B1A', '#F59E0B']} 
          style={styles.submitBtn}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>{t('common.save') || 'Save Skills'}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE', padding: 24, paddingTop: 60 },
  title: { fontFamily: 'Syne-ExtraBold', fontSize: 24, color: '#1C1410', marginBottom: 8 },
  subtitle: { fontFamily: 'Nunito-SemiBold', fontSize: 16, color: '#6B5C4E', marginBottom: 32 },
  content: { paddingBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  skillBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#EEE0CC', backgroundColor: '#FFFFFF' },
  skillBtnActive: { borderColor: '#FF6B1A', backgroundColor: '#FFF0D6' },
  skillText: { fontFamily: 'Nunito-Bold', fontSize: 14, color: '#6B5C4E' },
  skillTextActive: { color: '#FF6B1A' },
  noteBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFEDD5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDBA74',
    alignItems: 'center',
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontFamily: 'Nunito-SemiBold',
    fontSize: 13,
    color: '#9A3412',
  },
  submitBtnWrapper: { marginTop: 'auto' },
  submitBtn: { height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  submitText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: '#FFFFFF' }
});
