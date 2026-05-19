import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface AddressCardProps {
  address: any;
  mode: 'manage' | 'select';
  isSelected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSetDefault?: () => void;
}

const LABEL_ICONS: Record<string, string> = {
  Home: '🏠', Work: '💼', Other: '📍',
};

const AddressCard = React.memo(({
  address, mode, isSelected,
  onSelect, onEdit, onDelete, onSetDefault,
}: AddressCardProps) => {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        mode === 'select' && isSelected && styles.cardSelected,
      ]}
      onPress={mode === 'select' ? onSelect : undefined}
      activeOpacity={mode === 'select' ? 0.7 : 1}
    >
      {/* Top row: label icon + label + default badge */}
      <View style={styles.topRow}>
        <View style={styles.labelLeft}>
          <Text style={styles.labelIcon}>
            {LABEL_ICONS[address.label] ?? '📍'}
          </Text>
          <Text style={styles.labelText}>
            {address.label === 'Other'
              ? address.customLabel || 'Other'
              : address.label}
          </Text>
        </View>

        <View style={styles.rightRow}>
          {address.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>DEFAULT</Text>
            </View>
          )}
          {mode === 'select' && isSelected && (
            <View style={styles.selectedDot} />
          )}
        </View>
      </View>

      {/* Contact name + phone */}
      <Text style={styles.contactName}>{address.name}</Text>
      <Text style={styles.contactPhone}>{address.phone}</Text>

      {/* Full address */}
      <Text style={styles.addressLine}>
        {address.flat}, {address.street}
        {address.landmark ? `, Near ${address.landmark}` : ''}
      </Text>
      <Text style={styles.addressLine}>
        {address.city}, {address.state} — {address.pincode}
      </Text>

      {/* Action buttons — only in manage mode */}
      {mode === 'manage' && (
        <View style={styles.actions}>
          {!address.isDefault && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={onSetDefault}
            >
              <Text style={styles.actionBtnText}>Set as Default</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={onDelete}
          >
            <Text style={styles.actionBtnDangerText}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEE0CC',
    marginBottom: 12,
  },
  cardSelected: {
    borderColor: '#FF6B1A',
    borderWidth: 2,
    backgroundColor: '#FFF8F0',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  labelIcon: { fontSize: 16 },
  labelText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: '#1C1410',
  },
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  defaultBadge: {
    backgroundColor: '#FFF0D6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FFB347',
  },
  defaultBadgeText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 10,
    color: '#CC4A00',
    letterSpacing: 0.5,
  },
  selectedDot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#FF6B1A',
    borderWidth: 2, borderColor: '#FF6B1A',
  },
  contactName: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: '#1C1410',
    marginBottom: 2,
  },
  contactPhone: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 13,
    color: '#6B5C4E',
    marginBottom: 6,
  },
  addressLine: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 13,
    color: '#6B5C4E',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5E8D5',
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FF6B1A',
  },
  actionBtnText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
    color: '#FF6B1A',
  },
  actionBtnDanger: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  actionBtnDangerText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
    color: '#EF4444',
  },
});

export default AddressCard;
