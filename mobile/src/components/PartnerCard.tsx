import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius, shadow, typography } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';

interface PartnerCardProps {
  partner: {
    id: string;
    user: { name: string; avatarUrl?: string };
    skills: string[];
    rating: number;
    distance?: number;
    isOnline: boolean;
  };
  onPress: () => void;
}

export const PartnerCard = React.memo(({ partner, onPress }: PartnerCardProps) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: partner.user.avatarUrl || 'https://via.placeholder.com/150' }}
            style={styles.avatar}
            contentFit="cover"
          />
          <View style={[styles.statusDot, { backgroundColor: partner.isOnline ? colors.online : colors.offline }]} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{partner.user.name}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={colors.warning} />
            <Text style={styles.ratingText}>{partner.rating.toFixed(1)}</Text>
            {partner.distance !== undefined && (
              <Text style={styles.distanceText}> • {partner.distance.toFixed(1)}km away</Text>
            )}
          </View>
        </View>
      </View>
      
      <View style={styles.skillsRow}>
        {partner.skills.slice(0, 3).map((skill, index) => (
          <View key={index} style={styles.skillBadge}>
            <Text style={styles.skillText}>{skill}</Text>
          </View>
        ))}
        {partner.skills.length > 3 && (
          <View style={styles.skillBadge}>
            <Text style={styles.skillText}>+{partner.skills.length - 3}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border2,
    ...shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.bgCard,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: typography.fontDisplay,
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  distanceText: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: colors.textMuted,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillBadge: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  skillText: {
    fontFamily: typography.fontMono,
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: '700',
  },
});
