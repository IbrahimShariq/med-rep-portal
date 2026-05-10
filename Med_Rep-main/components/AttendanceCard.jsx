// components/AttendanceCard.jsx
// Displays today's check-in status on the Home screen.
// Tapping navigates to the full Attendance screen.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import Colors from '../utils/Colors';
import FlagBadge from './FlagBadge';
import { formatDistance } from '../utils/geoUtils';

/**
 * @param {object} props
 * @param {object|null} props.attendance    — today's attendance record from Redux
 * @param {object|null} props.location      — { latitude, longitude } from Redux
 * @param {string}       props.gpsStatus    — 'acquiring' | 'active' | 'out_of_area' | 'denied'
 * @param {boolean}      props.loading
 * @param {Function}     props.onCheckIn
 * @param {Function}     props.onCheckOut
 * @param {Function}     props.onPress      — navigate to full attendance screen
 */
export default function AttendanceCard({
  attendance,
  gpsStatus,
  loading,
  onCheckIn,
  onCheckOut,
  onPress,
}) {
  const isCheckedIn = !!attendance?.check_in_time;
  const isCheckedOut = !!attendance?.check_out_time;

  const formatTime = (isoStr) => {
    if (!isoStr) return '—';
    try {
      return format(new Date(isoStr), 'hh:mm a');
    } catch {
      return '—';
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
          <Text style={styles.title}>Today&apos;s Attendance</Text>
        </View>
      </View>

      {/* Status Badge */}
      {attendance?.status && (
        <View style={styles.flagRow}>
          <FlagBadge status={attendance.status} />
          {attendance.distance_from_base_m > 0 && (
            <Text style={styles.distanceNote}>
              {formatDistance(attendance.distance_from_base_m)} from base
            </Text>
          )}
        </View>
      )}

      {/* Time Row */}
      <View style={styles.timeRow}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Check-In</Text>
          <Text style={[styles.timeValue, isCheckedIn && { color: Colors.primary }]}>
            {formatTime(attendance?.check_in_time)}
          </Text>
        </View>
        <View style={styles.timeDivider} />
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Check-Out</Text>
          <Text style={[styles.timeValue, isCheckedOut && { color: '#6366F1' }]}>
            {formatTime(attendance?.check_out_time)}
          </Text>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[
          styles.actionBtn,
          isCheckedOut
            ? styles.doneBtn
            : isCheckedIn
            ? styles.checkOutBtn
            : styles.checkInBtn,
        ]}
        onPress={isCheckedIn && !isCheckedOut ? onCheckOut : onCheckIn}
        disabled={loading || isCheckedOut}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons
              name={
                isCheckedOut
                  ? 'checkmark-done-circle'
                  : isCheckedIn
                  ? 'log-out-outline'
                  : 'log-in-outline'
              }
              size={18}
              color="#fff"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.actionText}>
              {isCheckedOut
                ? 'Day Complete'
                : isCheckedIn
                ? 'Check Out'
                : 'Check In'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.bordergrey,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.darkgrey,
  },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  distanceNote: {
    fontSize: 12,
    color: Colors.lightgrey,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  timeBlock: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 11,
    color: Colors.textgrey,
    marginBottom: 2,
    fontWeight: '500',
  },
  timeValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.darkgrey,
  },
  timeDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.bordergrey,
  },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInBtn: {
    backgroundColor: Colors.primary,
  },
  checkOutBtn: {
    backgroundColor: '#6366F1',
  },
  doneBtn: {
    backgroundColor: Colors.lightgrey,
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
