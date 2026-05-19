import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import api from '../../../src/services/apiClient';
import { useLocationStore } from '../../../src/stores/locationStore';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';

export default function AddAddressScreen() {
  const queryClient = useQueryClient();
  const { addressId, returnToPostJob } = useLocalSearchParams<{ addressId?: string, returnToPostJob?: string }>();
  const isEditing = !!addressId;
  const pickedLocation = useLocationStore((state) => state.pickedLocation);
  const clearPickedLocation = useLocationStore((state) => state.clearPickedLocation);

  const [label, setLabel] = useState<'Home'|'Work'|'Other'>('Home');
  const [customLabel, setCustomLabel] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [flat, setFlat] = useState('');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [mapRegion, setMapRegion] = useState<any>(null);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [locationMethod, setLocationMethod] = useState<'gps' | 'search' | 'map' | null>(null);

  const { data: existing } = useQuery({
    queryKey: ['address', addressId],
    queryFn: () => api.get(`/addresses/${addressId}`).then(r => r.data),
    enabled: isEditing,
  });

  useEffect(() => {
    if (existing) {
      setLabel(existing.label as any);
      setCustomLabel(existing.customLabel || '');
      setName(existing.name);
      setPhone(existing.phone);
      setFlat(existing.flat);
      setStreet(existing.street);
      setLandmark(existing.landmark || '');
      setCity(existing.city);
      setState(existing.state);
      setPincode(existing.pincode);
      setLat(existing.lat);
      setLng(existing.lng);
      setMapRegion({
        latitude: existing.lat,
        longitude: existing.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
      setLocationMethod('map');
    }
  }, [existing]);

  useEffect(() => {
    if (pickedLocation) {
      setLat(pickedLocation.lat);
      setLng(pickedLocation.lng);
      setCity(pickedLocation.city);
      setState(pickedLocation.state);
      setPincode(pickedLocation.pincode);
      setMapRegion({
        latitude: pickedLocation.lat,
        longitude: pickedLocation.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
      setLocationMethod('search');
      clearPickedLocation();
    }
  }, [pickedLocation]);

  const handleGPS = async () => {
    setIsGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Location permission required' });
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = loc.coords;
      setLat(latitude);
      setLng(longitude);
      setMapRegion({
        latitude, longitude,
        latitudeDelta: 0.005, longitudeDelta: 0.005,
      });
      setLocationMethod('gps');

      const reverseGeocode = async (lat: number, lng: number) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'User-Agent': 'GigWork/1.0' } }
          );
          const data = await res.json();
          const addr = data.address;
          if (addr) {
            setCity(addr.city || addr.town || addr.district || '');
            setState(addr.state || '');
            setPincode(addr.postcode || '');
            setStreet(
              [addr.road, addr.suburb, addr.neighbourhood]
                .filter(Boolean).join(', ')
            );
          }
        } catch {}
      };

      await reverseGeocode(latitude, longitude);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Failed to get location' });
    } finally {
      setIsGpsLoading(false);
    }
  };

  const handleSearch = () => {
    router.push(`/(client)/(modals)/location-search`);
  };

  const handleDropPin = () => {
    setLocationMethod('map');
    if (!mapRegion) {
      setMapRegion({
        latitude: 25.5941, longitude: 85.1376,
        latitudeDelta: 0.05, longitudeDelta: 0.05,
      });
    }
  };

  const fullAddress = [flat, street, landmark, city, state, pincode].filter(Boolean).join(', ');

  const isValid =
    name.trim().length >= 2 &&
    phone.trim().length === 10 &&
    flat.trim() &&
    street.trim() &&
    city.trim() &&
    state.trim() &&
    pincode.trim().length === 6 &&
    lat !== null &&
    lng !== null;

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        label, customLabel, name, phone,
        flat, street, landmark, city, state,
        pincode, lat, lng, fullAddress,
      };
      return isEditing
        ? api.put(`/addresses/${addressId}`, payload)
        : api.post('/addresses', payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['savedAddresses'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Address saved successfully!' });
      if (returnToPostJob) {
        useLocationStore.getState().setPickedLocation({
          lat: data.data.lat,
          lng: data.data.lng,
          fullAddress: data.data.fullAddress,
          city: data.data.city,
          state: data.data.state,
          pincode: data.data.pincode,
        });
        router.back();
      } else {
        router.back();
      }
    },
    onError: (error: any) => {
      import('react-native').then(({ Alert }) => {
        Alert.alert(
          'Debug Error',
          JSON.stringify(error.response?.data) || error.message || 'Unknown error'
        );
      });
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Address' : 'Add New Address'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!lat || !lng ? (
          <>
            <Text style={styles.sectionTitle}>Set your location</Text>
            <View style={styles.methodRow}>
              <TouchableOpacity style={[styles.methodBtn, isGpsLoading && { opacity: 0.7 }]} onPress={handleGPS} disabled={isGpsLoading}>
                {isGpsLoading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color="#FF6B1A" />
                    <Text style={styles.methodBtnText}>Detecting...</Text>
                  </View>
                ) : (
                  <Text style={styles.methodBtnText}>📍 Use GPS</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              region={mapRegion}
              scrollEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              zoomEnabled={false}
              onPress={() => {
                router.push('/(client)/(modals)/location-search');
              }}
            >
              <Marker
                coordinate={{ latitude: lat, longitude: lng }}
                pinColor="#FF6B1A"
              />
            </MapView>
            <View pointerEvents="none" style={styles.mapHint}>
              <Text style={styles.mapHintText}>Tap map to open full-screen search</Text>
            </View>
            <TouchableOpacity
              style={styles.changeLocationBtn}
              onPress={() => {
                setLat(null); setLng(null);
              }}
            >
              <Text style={styles.changeLocationText}>Reset</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Address Type</Text>
        <View style={styles.labelRow}>
          {(['Home', 'Work', 'Other'] as const).map(l => (
            <TouchableOpacity
              key={l}
              style={[styles.labelPill, label === l && styles.labelPillActive]}
              onPress={() => {
                setLabel(l);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={styles.labelPillIcon}>
                {l === 'Home' ? '🏠' : l === 'Work' ? '💼' : '📍'}
              </Text>
              <Text style={[styles.labelPillText, label === l && styles.labelPillTextActive]}>
                {l}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {label === 'Other' && (
          <TextInput
            style={styles.input}
            placeholder="Enter a custom label (e.g. Parents' Home)"
            value={customLabel}
            onChangeText={setCustomLabel}
            maxLength={30}
          />
        )}

        <Text style={styles.sectionTitle}>Contact Details</Text>
        <Text style={styles.fieldLabel}>Full Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Name of person at this address"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <Text style={styles.fieldLabel}>Phone Number *</Text>
        <View style={styles.phoneRow}>
          <View style={styles.countryCode}>
            <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
          </View>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="10-digit mobile number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>

        <Text style={styles.sectionTitle}>Address Details</Text>
        <Text style={styles.fieldLabel}>Flat / House No. / Building / Floor *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Flat 4B, Sunrise Apartment"
          value={flat}
          onChangeText={setFlat}
        />

        <Text style={styles.fieldLabel}>Street / Locality / Area *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. MG Road, Boring Road"
          value={street}
          onChangeText={setStreet}
        />

        <Text style={styles.fieldLabel}>Landmark (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Near State Bank ATM"
          value={landmark}
          onChangeText={setLandmark}
        />

        <Text style={styles.fieldLabel}>Pincode *</Text>
        <View style={styles.phoneRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="6-digit pincode"
            value={pincode}
            onChangeText={async (val) => {
              setPincode(val);
              if (val.length === 6) {
                setPincodeLoading(true);
                try {
                  const res = await api.get(`/addresses/pincode/${val}`);
                  if (res.data.found) {
                    setCity(res.data.city);
                    setState(res.data.state);
                  }
                } finally {
                  setPincodeLoading(false);
                }
              }
            }}
            keyboardType="numeric"
            maxLength={6}
          />
          {pincodeLoading && <ActivityIndicator color="#FF6B1A" style={{ marginLeft: 10 }} />}
        </View>
        <Text style={styles.pincodeHint}>City and state auto-fill when you enter pincode</Text>

        <View style={styles.cityStateRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>City *</Text>
            <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>State *</Text>
            <TextInput style={styles.input} placeholder="State" value={state} onChangeText={setState} />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, !isValid && { opacity: 0.6 }]}
          onPress={() => isValid && saveMutation.mutate()}
          disabled={!isValid || saveMutation.isPending}
        >
          <LinearGradient
            colors={isValid ? ['#FF6B1A', '#F59E0B'] : ['#C4B5A5', '#C4B5A5']}
            style={styles.saveBtnGrad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.saveBtnText}>
              {saveMutation.isPending ? 'Saving...' : isEditing ? 'Update Address' : 'Save Address'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EE' },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EEE0CC', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16 },
  backBtnText: { fontFamily: 'Syne-Bold', fontSize: 16, color: '#FF6B1A' },
  headerTitle: { fontFamily: 'Syne-Bold', fontSize: 18, color: '#1C1410' },
  content: { padding: 20, paddingBottom: 60 },
  
  sectionTitle: { fontFamily: 'Syne-Bold', fontSize: 16, color: '#1C1410', marginBottom: 12, marginTop: 20 },
  fieldLabel: { fontFamily: 'Nunito-SemiBold', fontSize: 13, color: '#6B5C4E', marginBottom: 6 },
  input: { backgroundColor: '#FFF0D6', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,107,26,0.25)', paddingHorizontal: 16, paddingVertical: 13, fontFamily: 'Nunito-SemiBold', fontSize: 14, color: '#1C1410', marginBottom: 12 },
  
  methodRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 16 },
  methodBtn: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#FF6B1A', borderRadius: 12, alignItems: 'center' },
  methodBtnText: { fontFamily: 'Syne-Bold', fontSize: 13, color: '#FF6B1A' },
  
  labelRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  labelPill: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: '#EEE0CC', flexDirection: 'row', alignItems: 'center', gap: 6 },
  labelPillActive: { borderColor: '#FF6B1A', backgroundColor: '#FFF0D6', borderWidth: 1.5 },
  labelPillIcon: { fontSize: 16 },
  labelPillText: { fontFamily: 'Nunito-SemiBold', fontSize: 13, color: '#6B5C4E' },
  labelPillTextActive: { color: '#FF6B1A', fontFamily: 'Nunito-Bold' },
  
  mapContainer: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#EEE0CC', marginBottom: 16 },
  map: { height: 300, width: '100%' },
  mapHint: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  mapHintText: { fontFamily: 'Syne-Bold', fontSize: 12, color: '#FFFFFF' },
  changeLocationBtn: { position: 'absolute', bottom: 10, right: 10, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#FF6B1A' },
  changeLocationText: { fontFamily: 'Syne-Bold', fontSize: 12, color: '#FF6B1A' },
  
  cityStateRow: { flexDirection: 'row', gap: 12 },
  pincodeHint: { fontFamily: 'Nunito-SemiBold', fontSize: 12, color: '#C4B5A5', marginTop: -8, marginBottom: 12 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  countryCode: { backgroundColor: '#FFF0D6', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,107,26,0.25)', paddingHorizontal: 12, paddingVertical: 13 },
  countryCodeText: { fontFamily: 'Nunito-SemiBold', fontSize: 14, color: '#1C1410' },
  
  saveBtn: { marginTop: 24 },
  saveBtnGrad: { paddingVertical: 16, alignItems: 'center', borderRadius: 14 },
  saveBtnText: { fontFamily: 'Syne-Bold', fontSize: 16, color: '#FFFFFF' },
});
