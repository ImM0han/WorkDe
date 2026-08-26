import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function MapView(props: any) {
  return (
    <View style={[styles.container, props.style]}>
      <Text style={styles.text}>🗺️ Map View</Text>
    </View>
  );
}

export function Marker(props: any) {
  return null;
}

export function Polyline(props: any) {
  return null;
}

export function Callout(props: any) {
  return null;
}

export default MapView;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    minHeight: 150,
  },
  text: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: '#4B5563',
  },
});
