import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { 
  colors, typography, spacing, radius, categoryIcons, shadow,
  groupJobCategories, femaleOnlyCategories, seasonalCategories, 
  materialCategories, categoryRateDefaults 
} from '../../src/theme/tokens';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import api from '../../src/services/apiClient';
import { useQuery } from '@tanstack/react-query';
import { useLocationStore } from '../../src/stores/locationStore';
import AddressCard from '../../src/components/AddressCard';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

export default function PostJob() {
  const { t } = useTranslation();
  const router = useRouter();
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [workers, setWorkers] = useState(1);
  const [rateType, setRateType] = useState<'DAILY' | 'HOURLY'>('DAILY');
  const [rate, setRate] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const MAX_PHOTOS = 5;

  const pickImages = async () => {
    if (imageUris.length >= MAX_PHOTOS) return;
    const remaining = MAX_PHOTOS - imageUris.length;
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newUris = result.assets.map(a => a.uri);
      setImageUris(prev => [...prev, ...newUris].slice(0, MAX_PHOTOS));
    }
  };

  const removeImage = (index: number) => {
    setImageUris(prev => prev.filter((_, i) => i !== index));
  };

  const [femaleOnly, setFemaleOnly] = useState(false);
  const [seasonLabel, setSeasonLabel] = useState('Year-round');
  const [materialsIncluded, setMaterialsIncluded] = useState(false);
  const [materialCost, setMaterialCost] = useState('');
  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['savedAddresses'],
    queryFn: () => api.get('/addresses').then(r => r.data),
  });

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [jobLocation, setJobLocation] = useState<{ lat: number; lng: number; address: string; contactName?: string; contactPhone?: string; } | null>(null);

  const pickedLocation = useLocationStore((state) => state.pickedLocation);
  const clearPickedLocation = useLocationStore((state) => state.clearPickedLocation);

  useEffect(() => {
    const defaultAddr = savedAddresses.find((a: any) => a.isDefault);
    if (defaultAddr && !selectedAddressId) {
      setSelectedAddressId(defaultAddr.id);
      setJobLocation({
        lat: defaultAddr.lat,
        lng: defaultAddr.lng,
        address: defaultAddr.fullAddress,
        contactName: defaultAddr.name,
        contactPhone: defaultAddr.phone,
      });
    }
  }, [savedAddresses]);

  useEffect(() => {
    if (pickedLocation) {
      setJobLocation({
        lat: pickedLocation.lat,
        lng: pickedLocation.lng,
        address: pickedLocation.fullAddress,
      });
      setSelectedAddressId(null);
      clearPickedLocation();
    }
  }, [pickedLocation]);

  const handleNext = () => {
    if (!category || !description || !rate || !jobLocation) return;
    
    router.push({
      pathname: '/(client)/(modals)/job-review-confirm',
      params: {
        category,
        description,
        date: date.toISOString(),
        workers: workers.toString(),
        femaleOnly: femaleOnly.toString(),
        seasonLabel,
        materialsIncluded: materialsIncluded.toString(),
        materialCost,
        rateType,
        rate,
        imageUris: JSON.stringify(imageUris),
        lat: jobLocation.lat.toString(),
        lng: jobLocation.lng.toString(),
        address: jobLocation.address,
        contactName: jobLocation.contactName || '',
        contactPhone: jobLocation.contactPhone || '',
      }
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('postJob.postJobTitle') || 'Post a Job'}</Text>
        <Text style={styles.stepText}>{t('postJob.step1Text') || 'Step 1 of 2'}</Text>
      </View>
      
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '50%' }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Category */}
        <Text style={styles.label}>{t('postJob.categoryLabel') || 'Select Category'}</Text>
        <View style={styles.categoryGrid}>
          {Object.entries(categoryIcons).map(([cat, icon]) => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.categoryGridItem, category === cat && styles.categoryGridItemActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={styles.categoryGridIcon}>{icon}</Text>
              <Text style={[styles.categoryGridText, category === cat && styles.categoryGridTextActive]} numberOfLines={1}>{t(`skills.${cat}`) || cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.label}>{t('postJob.descriptionLabel') || 'Job Description'}</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={4}
          placeholder={t('postJob.descriptionPlaceholder') || 'Describe what needs to be done...'}
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          textAlignVertical="top"
        />

        {/* Photo Upload */}
        <Text style={styles.label}>{t('postJob.addPhotoLabel') || 'Add Photos of Work'}
          <Text style={styles.photoCountLabel}> ({imageUris.length}/{MAX_PHOTOS})</Text>
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photosRow}
        >
          {imageUris.map((uri, idx) => (
            <View key={idx} style={styles.photoThumbContainer}>
              <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
              <TouchableOpacity
                style={styles.removePhotoBtn}
                onPress={() => removeImage(idx)}
                activeOpacity={0.8}
              >
                <Text style={styles.removePhotoBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {imageUris.length < MAX_PHOTOS && (
            <TouchableOpacity style={styles.addPhotoTile} onPress={pickImages} activeOpacity={0.7}>
              <Text style={styles.addPhotoIcon}>📷</Text>
              <Text style={styles.addPhotoText}>
                {imageUris.length === 0 ? 'Add Photos' : 'Add More'}
              </Text>
              <Text style={styles.addPhotoSub}>(Optional)</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Date */}
        <Text style={styles.label}>{t('postJob.dateLabel') || 'Scheduled Date'}</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowPicker(true)}>
          <Text style={styles.dateButtonText}>{date.toLocaleDateString()}</Text>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowPicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}

        {/* Conditional Features */}
        {category && groupJobCategories.includes(category) && (
          <View>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>{t('postJob.workersLabel') || 'Number of Workers'}</Text>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => setWorkers(Math.max(1, workers - 1))} style={styles.stepButton}>
                  <Text style={styles.stepButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{workers}</Text>
                <TouchableOpacity onPress={() => setWorkers(Math.min(50, workers + 1))} style={styles.stepButton}>
                  <Text style={styles.stepButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            {rate ? (
              <Text style={styles.hintText}>Total Hint: ₹{(parseFloat(rate) || 0) * workers}</Text>
            ) : null}
          </View>
        )}

        {category && femaleOnlyCategories.includes(category) && (
          <View style={styles.rowBetween}>
            <Text style={styles.label}>{t('postJob.femaleOnlyLabel') || 'Female workers only'}</Text>
            <Switch
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.bgCard}
              value={femaleOnly}
              onValueChange={setFemaleOnly}
            />
          </View>
        )}

        {category && seasonalCategories.includes(category) && (
          <View>
            <Text style={styles.label}>{t('postJob.seasonLabel') || 'Season'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
              {['Kharif(Jun–Oct)', 'Rabi(Nov–Apr)', 'Zaid(Mar–Jun)', 'Year-round'].map(s => (
                <TouchableOpacity 
                  key={s} 
                  style={[styles.categoryPill, seasonLabel === s && styles.categoryPillActive]}
                  onPress={() => setSeasonLabel(s)}
                >
                  <Text style={[styles.categoryPillText, seasonLabel === s && styles.categoryPillTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {category && materialCategories.includes(category) && (
          <View>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>{t('postJob.materialsLabel') || 'Materials included'}</Text>
              <Switch
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.bgCard}
                value={materialsIncluded}
                onValueChange={setMaterialsIncluded}
              />
            </View>
            {materialsIncluded && (
              <View style={styles.rateInputContainer}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={styles.rateInput}
                  placeholder="Material Cost"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={materialCost}
                  onChangeText={setMaterialCost}
                />
              </View>
            )}
            {materialsIncluded && rate && materialCost ? (
              <Text style={styles.hintText}>Total Hint: ₹{(parseFloat(rate) || 0) + (parseFloat(materialCost) || 0)}</Text>
            ) : null}
          </View>
        )}

        {/* Rate Type Toggle */}
        <View style={styles.rowBetween}>
          <Text style={styles.label}>{t('postJob.rateTypeLabel') || 'Rate Type'}</Text>
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleText, rateType === 'HOURLY' && styles.toggleTextActive]}>{t('jobs.hourly') || 'Hourly'}</Text>
            <Switch
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.bgCard}
              value={rateType === 'DAILY'}
              onValueChange={(val) => setRateType(val ? 'DAILY' : 'HOURLY')}
            />
            <Text style={[styles.toggleText, rateType === 'DAILY' && styles.toggleTextActive]}>{t('jobs.daily') || 'Daily'}</Text>
          </View>
        </View>
        
        <View style={styles.rateInputContainer}>
          <Text style={styles.currencyPrefix}>₹</Text>
          <TextInput
            style={styles.rateInput}
            placeholder={`Enter ${rateType.toLowerCase()} amount`}
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={rate}
            onChangeText={setRate}
          />
        </View>
        {category && categoryRateDefaults[category] && (
          <Text style={styles.hintText}>
            Suggested: ₹{categoryRateDefaults[category].suggestedMin}–₹{categoryRateDefaults[category].suggestedMax} {categoryRateDefaults[category].unit}
          </Text>
        )}

        {/* Location Map */}
        <Text style={styles.sectionTitle}>📍 {t('postJob.locationLabel') || 'Job Location'}</Text>

        {savedAddresses.length > 0 ? (
          <>
            {savedAddresses.map((addr: any) => (
              <AddressCard
                key={addr.id}
                address={addr}
                mode="select"
                isSelected={selectedAddressId === addr.id}
                onSelect={() => {
                  setSelectedAddressId(addr.id);
                  setJobLocation({
                    lat: addr.lat,
                    lng: addr.lng,
                    address: addr.fullAddress,
                    contactName: addr.name,
                    contactPhone: addr.phone,
                  });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
            ))}
            <TouchableOpacity
              style={styles.differentAddrBtn}
              onPress={() => router.push('/(client)/(modals)/add-address?returnToPostJob=true')}
            >
              <Text style={styles.differentAddrIcon}>＋</Text>
              <Text style={styles.differentAddrText}>Add new address</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.differentAddrBtn, { paddingVertical: 24 }]}
            onPress={() => router.push('/(client)/(modals)/add-address?returnToPostJob=true')}
          >
            <Text style={[styles.differentAddrIcon, { fontSize: 24, marginRight: 12 }]}>📍</Text>
            <View>
              <Text style={styles.differentAddrText}>Add Job Location</Text>
              <Text style={{ fontFamily: 'Nunito-SemiBold', fontSize: 13, color: '#6B5C4E', marginTop: 4 }}>
                Required to post a job
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          onPress={handleNext}
          disabled={!category || !description || !rate || !jobLocation}
        >
          <LinearGradient 
            colors={category && description && rate && jobLocation ? ['#FF6B1A', '#F59E0B'] : ['#C4B5A5', '#EEE0CC']} 
            style={styles.nextButton}
          >
            <Text style={styles.nextButtonText}>{t('common.next') || 'Next'} →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

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
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  headerTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  stepText: {
    fontFamily: typography.fontMono,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border2,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  label: {
    fontFamily: typography.fontDisplay,
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  categoryGridItem: {
    width: '25%',
    padding: 4,
    alignItems: 'center',
  },
  categoryGridItemActive: {
    backgroundColor: '#FFF0D6',
    borderWidth: 2,
    borderColor: '#FF6B1A',
    borderRadius: radius.md,
  },
  categoryGridIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryGridText: {
    fontFamily: typography.fontBody,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  categoryGridTextActive: {
    color: '#FF6B1A',
    fontFamily: 'Nunito-Bold',
  },
  categoryPill: {
    backgroundColor: colors.bgCard,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border2,
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  categoryPillText: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryPillTextActive: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
  hintText: {
    fontFamily: typography.fontBody,
    color: colors.textSecondary,
    marginTop: 4,
    fontSize: 13,
  },
  textArea: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border2,
    fontFamily: typography.fontBody,
    fontSize: 15,
    color: colors.textPrimary,
    height: 100,
  },
  // Multi-photo styles
  photoCountLabel: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '400',
  },
  photosRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
    paddingRight: 4,
  },
  photoThumbContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  photoThumb: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: colors.border2,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  removePhotoBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
  },
  addPhotoTile: {
    width: 100,
    height: 100,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  addPhotoIcon: {
    fontSize: 22,
  },
  addPhotoText: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  addPhotoSub: {
    fontFamily: typography.fontBody,
    fontSize: 10,
    color: colors.textMuted,
  },
  dateButton: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border2,
  },
  dateButtonText: {
    fontFamily: typography.fontMono,
    fontSize: 15,
    color: colors.textPrimary,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border2,
    padding: 4,
  },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonText: {
    fontFamily: typography.fontDisplay,
    fontSize: 20,
    color: colors.primaryDark,
    marginTop: -2,
  },
  stepperValue: {
    fontFamily: typography.fontMono,
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    width: 30,
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleText: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginHorizontal: 8,
  },
  toggleTextActive: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border2,
    paddingHorizontal: 12,
    marginTop: spacing.sm,
  },
  currencyPrefix: {
    fontFamily: typography.fontMono,
    fontSize: 18,
    color: colors.textPrimary,
    marginRight: 8,
    fontWeight: '800',
  },
  rateInput: {
    flex: 1,
    paddingVertical: 12,
    fontFamily: typography.fontMono,
    fontSize: 16,
    color: colors.textPrimary,
  },
  
  selectedAddressCard: {
    backgroundColor: colors.bgCard,
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border2,
    marginTop: spacing.sm,
    ...shadow.card
  },
  selectedAddressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  addressLabelPill: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  addressLabelText: {
    fontFamily: typography.fontMono,
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '800'
  },
  changeAddressBtn: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700'
  },
  selectedAddressText: {
    fontFamily: typography.fontBody,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22
  },
  differentAddrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#FF6B1A',
    borderStyle: 'dashed',
    marginTop: spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  differentAddrIcon: {
    fontFamily: typography.fontDisplay,
    fontSize: 20,
    color: '#FF6B1A',
    marginRight: 8,
  },
  differentAddrText: {
    fontFamily: 'Syne-Bold',
    fontSize: 15,
    color: '#FF6B1A',
  },

  nextButton: {
    borderRadius: radius.full,
    padding: 16,
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  nextButtonText: {
    fontFamily: 'Syne-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
