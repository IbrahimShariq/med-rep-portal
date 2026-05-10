// components/FlagBadge.jsx
// Color-coded badge for attendance and visit flag statuses.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FLAG_CONFIG = {
  VALID: {
    label: 'Valid',
    icon: 'checkmark-circle',
    bg: '#DCFCE7',
    text: '#15803D',
    border: '#86EFAC',
  },
  OUT_OF_BOUNDS: {
    label: 'Out of Area',
    icon: 'location-outline',
    bg: '#FFF7ED',
    text: '#C2410C',
    border: '#FED7AA',
  },
  LATE: {
    label: 'Late',
    icon: 'time-outline',
    bg: '#FEF9C3',
    text: '#854D0E',
    border: '#FDE047',
  },
  LOCATION_MISMATCH: {
    label: 'Location Mismatch',
    icon: 'warning-outline',
    bg: '#FFF7ED',
    text: '#C2410C',
    border: '#FED7AA',
  },
  UNREALISTIC_JUMP: {
    label: 'Suspicious',
    icon: 'alert-circle-outline',
    bg: '#FEF2F2',
    text: '#B91C1C',
    border: '#FECACA',
  },
};

/**
 * @param {object} props
 * @param {string} props.status — one of VALID | OUT_OF_BOUNDS | LATE | LOCATION_MISMATCH | UNREALISTIC_JUMP
 * @param {'sm'|'md'} props.size — default 'md'
 */
export default function FlagBadge({ status, size = 'md' }) {
  const config = FLAG_CONFIG[status] ?? FLAG_CONFIG.VALID;
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          paddingHorizontal: isSmall ? 8 : 10,
          paddingVertical: isSmall ? 3 : 5,
        },
      ]}
    >
      <Ionicons
        name={config.icon}
        size={isSmall ? 12 : 14}
        color={config.text}
        style={styles.icon}
      />
      <Text style={[styles.label, { color: config.text, fontSize: isSmall ? 11 : 12 }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontWeight: '600',
  },
});
