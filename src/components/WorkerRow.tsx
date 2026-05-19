import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { colors, typography, spacing, radius, shadow } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';

interface WorkerRowProps {
  worker: {
    id: string;
    name: string;
    avatarUrl: string;
    status: 'On Task' | 'Break' | 'Offline';
    jobCategory: string;
  };
  onPress: () => void;
}

export const WorkerRow = React.memo(({ worker, onPress }: WorkerRowProps) => {
  const statusColors = {
    'On Task': { bg: '#DCFCE7', text: '#166534' },
    'Break': { bg: '#FEF3C7', text: '#92400E' },
    'Offline': { bg: colors.border2, text: colors.textSecondary },
  };

  const statusStyle = statusColors[worker.status];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Image source={{ uri: worker.avatarUrl }} style={styles.avatar} contentFit="cover" />
      <View style={styles.info}>
        <Text style={styles.name}>{worker.name}</Text>
        <Text style={styles.category}>{worker.jobCategory}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
        <Text style={[styles.statusText, { color: statusStyle.text }]}>{worker.status}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, padding: 16, borderRadius: radius.md, marginBottom: 12, borderWidth: 1, borderColor: colors.border2, ...shadow.card },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  info: { flex: 1 },
  name: { fontFamily: typography.fontDisplay, fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  category: { fontFamily: typography.fontBody, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  statusText: { fontFamily: typography.fontBody, fontSize: 12, fontWeight: '700' },
});
