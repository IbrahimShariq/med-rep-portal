// components/GpsStatusBadge.jsx
// Shows live GPS acquisition status.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Status options: 'acquiring' | 'active' | 'denied' | 'out_of_area' | 'offline'
const STATUS_CONFIG = {
  acquiring: {
    label: 'Acquiring GPS…',
    icon: 'locate-outline',
    bg: '#EFF6FF',
    text: '#1D4ED8',
    dot: '#60A5FA',
  },
  active: {
    label: 'GPS Active',
    icon: 'navigate',
    bg: '#DCFCE7',
    text: '#15803D',
    dot: '#22C55E',
  },
  out_of_area: {
    label: 'Out of Area',
    icon: 'location-outline',
    bg: '#FFF7ED',
    text: '#C2410C',
    dot: '#F97316',
  },
  denied: {
    label: 'GPS Denied',
    icon: 'location-outline',
    bg: '#FEF2F2',
    text: '#B91C1C',
    dot: '#EF4444',
  },
  offline: {
    label: 'Offline Mode',
    icon: 'cloud-offline-outline',
    bg: '#F3F4F6',
    text: '#6B7280',
    dot: '#9CA3AF',
  },
};

export default function GpsStatusBadge({ status = 'acquiring' }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.acquiring;

  return (
    <View style={[styles.container, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Ionicons name={config.icon} size={13} color={config.text} style={{ marginRight: 4 }} />
      <Text style={[styles.label, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
