import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface Zone {
  top: number;    // Normalized 0..1 (0% to 100% of screen height)
  bottom: number; // Normalized 0..1
  left?: number;  // Normalized 0..1 (default 0)
  right?: number; // Normalized 0..1 (default 1)
}

interface ScatteredJobIconsProps {
  zones?: Zone[];
  color?: string;
}

type MaterialIconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface IconSeed {
  id: string;
  name: MaterialIconName;
  x: number; // 0.0 to 1.0 (percent of screen width)
  y: number; // 0.0 to 1.0 (percent of screen height)
  size: number; // 20 to 32
  rotation: string; // e.g. "-22deg"
  opacity: number; // 0.08 to 0.15
}

// Fixed seeded array representing 15 gig job categories:
// mason, cleaner, electrician, carpenter, plumber, painter, gardener, driver,
// loading/unloading, farming, cook, babysitter, beautician, event setup, waiter.
const SEEDED_ICONS: IconSeed[] = [
  // Top region (y: 0.02 - 0.25)
  { id: '1', name: 'hammer', x: 0.08, y: 0.03, size: 26, rotation: '-22deg', opacity: 0.12 },
  { id: '2', name: 'broom', x: 0.35, y: 0.05, size: 24, rotation: '15deg', opacity: 0.10 },
  { id: '3', name: 'flash', x: 0.65, y: 0.04, size: 28, rotation: '-30deg', opacity: 0.14 },
  { id: '4', name: 'pipe-wrench', x: 0.88, y: 0.06, size: 22, rotation: '25deg', opacity: 0.09 },
  { id: '5', name: 'format-paint', x: 0.18, y: 0.12, size: 30, rotation: '-15deg', opacity: 0.13 },
  { id: '6', name: 'flower', x: 0.50, y: 0.11, size: 22, rotation: '40deg', opacity: 0.11 },
  { id: '7', name: 'car', x: 0.80, y: 0.14, size: 26, rotation: '-10deg', opacity: 0.12 },
  { id: '8', name: 'dolly', x: 0.05, y: 0.19, size: 28, rotation: '20deg', opacity: 0.10 },
  { id: '9', name: 'sprout', x: 0.38, y: 0.18, size: 24, rotation: '-25deg', opacity: 0.14 },
  { id: '10', name: 'chef-hat', x: 0.72, y: 0.21, size: 30, rotation: '12deg', opacity: 0.11 },
  { id: '11', name: 'baby-face-outline', x: 0.91, y: 0.22, size: 24, rotation: '-18deg', opacity: 0.13 },
  { id: '12', name: 'content-cut', x: 0.25, y: 0.24, size: 22, rotation: '35deg', opacity: 0.09 },

  // Mid-upper region (y: 0.26 - 0.50)
  { id: '13', name: 'party-popper', x: 0.06, y: 0.28, size: 26, rotation: '-15deg', opacity: 0.12 },
  { id: '14', name: 'room-service', x: 0.92, y: 0.29, size: 28, rotation: '22deg', opacity: 0.10 },
  { id: '15', name: 'hammer', x: 0.04, y: 0.35, size: 24, rotation: '45deg', opacity: 0.11 },
  { id: '16', name: 'flash', x: 0.93, y: 0.37, size: 30, rotation: '-20deg', opacity: 0.13 },
  { id: '17', name: 'broom', x: 0.07, y: 0.42, size: 22, rotation: '-35deg', opacity: 0.09 },
  { id: '18', name: 'format-paint', x: 0.91, y: 0.44, size: 26, rotation: '18deg', opacity: 0.14 },
  { id: '19', name: 'pipe-wrench', x: 0.05, y: 0.49, size: 28, rotation: '10deg', opacity: 0.10 },

  // Mid-lower region (y: 0.51 - 0.75)
  { id: '20', name: 'car', x: 0.94, y: 0.52, size: 24, rotation: '-28deg', opacity: 0.12 },
  { id: '21', name: 'flower', x: 0.06, y: 0.57, size: 30, rotation: '30deg', opacity: 0.13 },
  { id: '22', name: 'dolly', x: 0.92, y: 0.59, size: 22, rotation: '-12deg', opacity: 0.09 },
  { id: '23', name: 'sprout', x: 0.04, y: 0.64, size: 26, rotation: '25deg', opacity: 0.11 },
  { id: '24', name: 'chef-hat', x: 0.95, y: 0.66, size: 28, rotation: '-40deg', opacity: 0.14 },
  { id: '25', name: 'baby-face-outline', x: 0.07, y: 0.71, size: 24, rotation: '15deg', opacity: 0.10 },
  { id: '26', name: 'content-cut', x: 0.92, y: 0.73, size: 26, rotation: '-22deg', opacity: 0.12 },

  // Bottom region (y: 0.76 - 0.98)
  { id: '27', name: 'party-popper', x: 0.12, y: 0.77, size: 28, rotation: '35deg', opacity: 0.13 },
  { id: '28', name: 'room-service', x: 0.42, y: 0.79, size: 22, rotation: '-15deg', opacity: 0.09 },
  { id: '29', name: 'hammer', x: 0.75, y: 0.78, size: 30, rotation: '20deg', opacity: 0.11 },
  { id: '30', name: 'broom', x: 0.88, y: 0.81, size: 24, rotation: '-30deg', opacity: 0.14 },
  { id: '31', name: 'flash', x: 0.08, y: 0.84, size: 26, rotation: '12deg', opacity: 0.10 },
  { id: '32', name: 'format-paint', x: 0.32, y: 0.86, size: 28, rotation: '-25deg', opacity: 0.12 },
  { id: '33', name: 'pipe-wrench', x: 0.60, y: 0.85, size: 22, rotation: '40deg', opacity: 0.09 },
  { id: '34', name: 'flower', x: 0.85, y: 0.88, size: 30, rotation: '-18deg', opacity: 0.13 },
  { id: '35', name: 'car', x: 0.15, y: 0.92, size: 24, rotation: '28deg', opacity: 0.11 },
  { id: '36', name: 'dolly', x: 0.45, y: 0.93, size: 26, rotation: '-10deg', opacity: 0.14 },
  { id: '37', name: 'sprout', x: 0.70, y: 0.94, size: 28, rotation: '15deg', opacity: 0.10 },
  { id: '38', name: 'chef-hat', x: 0.89, y: 0.96, size: 22, rotation: '-35deg', opacity: 0.12 }
];

export default function ScatteredJobIcons({ zones, color = '#C4B5A5' }: ScatteredJobIconsProps) {
  const { width, height } = useWindowDimensions();

  // If zones prop is provided, filter icons to those residing in at least one zone
  const visibleIcons = SEEDED_ICONS.filter(icon => {
    if (!zones || zones.length === 0) return true;
    return zones.some(zone => {
      const inY = icon.y >= zone.top && icon.y <= zone.bottom;
      const minX = zone.left ?? 0;
      const maxX = zone.right ?? 1;
      const inX = icon.x >= minX && icon.x <= maxX;
      return inY && inX;
    });
  });

  return (
    <View style={styles.overlay} pointerEvents="none">
      {visibleIcons.map(icon => (
        <View
          key={icon.id}
          style={[
            styles.iconWrapper,
            {
              left: icon.x * width - icon.size / 2,
              top: icon.y * height - icon.size / 2,
              opacity: icon.opacity,
              transform: [{ rotate: icon.rotation }],
            },
          ]}
        >
          <MaterialCommunityIcons name={icon.name} size={icon.size} color={color} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  iconWrapper: {
    position: 'absolute',
  },
});
