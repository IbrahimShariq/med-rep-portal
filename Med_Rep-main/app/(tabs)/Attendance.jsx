// app/Attendance.jsx
// Full attendance check-in / check-out screen with GPS validation.

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'expo-router';

import Colors from '../../utils/Colors';
import FlagBadge from '../../components/FlagBadge';
import { isWithinRadius } from '../../utils/geoUtils';

import {
  selectIsCheckedIn,
  selectIsCheckedOut,
  setCurrentLocation,
  setLocationPermission,
  setLoading,
  setTodayAttendance,
  checkedIn,
  checkedOut,
} from '../../redux/slices/attendanceSlice';
import { selectUserBaseCoords, selectUser } from '../../redux/slices/authSlice';
import { selectAttendanceRadius } from '../../redux/slices/settingsSlice';

import { checkIn, checkOut, getTodayAttendance } from '../../database/attendanceService';
import { syncAll } from '../../database/syncService';

// Conditionally import expo-location so the code doesn't crash
// if the package hasn't been installed yet (dev mode fallback).
let Location;
try {
  Location = require('expo-location');
} catch {
  Location = null;
}

export default function AttendanceScreen() {
  const dispatch = useDispatch();
  const router = useRouter();

  const user = useSelector(selectUser);
  const isCheckedIn = useSelector(selectIsCheckedIn);
  const isCheckedOut = useSelector(selectIsCheckedOut);
  const todayAttendance = useSelector((s) => s.attendance.today);
  const currentLocation = useSelector((s) => s.attendance.currentLocation);
  const loading = useSelector((s) => s.attendance.loading);
  const baseCoords = useSelector(selectUserBaseCoords);
  const radiusMeters = useSelector(selectAttendanceRadius);

  const [withinRadius, setWithinRadius] = useState(null); // null | true | false
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [exceptionReason, setExceptionReason] = useState('');

  // ---------------------------------------------------------------------------
  // Load today's attendance from SQLite on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadToday = async () => {
      if (!user?.id) return;
      const record = await getTodayAttendance(String(user.id));
      if (record) dispatch(setTodayAttendance(record));
    };
    loadToday();
  }, [dispatch, user?.id]);

  // ---------------------------------------------------------------------------
  // Acquire GPS
  // ---------------------------------------------------------------------------
  const acquireGPS = useCallback(async () => {
    if (!Location) {
      return null;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    dispatch(setLocationPermission(status));

    if (status !== 'granted') {
      Alert.alert(
        'Location Permission Required',
        'Please enable location access in your phone settings to use attendance features.',
      );
      return null;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
      });

      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
      };

      dispatch(setCurrentLocation(coords));

      // Check if within radius of base
      if (baseCoords) {
        const result = isWithinRadius(coords, baseCoords, radiusMeters);
        setWithinRadius(result.withinRadius);
      } else {
        setWithinRadius(true); // No base set — allow check-in
      }

      return coords;
    } catch (err) {
      console.error('GPS error:', err);
      return null;
    }
  }, [baseCoords, dispatch, radiusMeters]);

  useEffect(() => {
    acquireGPS();
  }, [acquireGPS]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleCheckIn = async (reason = null) => {
    dispatch(setLoading(true));

    const coords = currentLocation ?? (await acquireGPS());
    if (!coords) {
      dispatch(setLoading(false));
      return;
    }

    // If out of area and no reason given, prompt for reason
    if (!withinRadius && !reason) {
      dispatch(setLoading(false));
      setShowExceptionModal(true);
      return;
    }

    const result = await checkIn({
      repId: String(user?.id ?? 'offline'),
      latitude: coords.latitude,
      longitude: coords.longitude,
      baseCoords: baseCoords,
      exceptionReason: reason,
    });

    if (result.success) {
      dispatch(
        checkedIn({
          id: result.attendanceId,
          check_in_time: new Date().toISOString(),
          status: result.status,
          distance_from_base_m: result.distanceMeters,
        }),
      );
      // Reload full record
      const record = await getTodayAttendance(String(user?.id));
      if (record) dispatch(setTodayAttendance(record));
      try {
        await syncAll(String(user?.id));
      } catch {
        // Keep the record queued locally until the portal API is reachable.
      }
    } else {
      Alert.alert('Check-In Failed', result.error ?? 'Please try again.');
    }

    dispatch(setLoading(false));
  };

  const handleCheckOut = async () => {
    dispatch(setLoading(true));

    const coords = currentLocation ?? (await acquireGPS());
    if (!coords) {
      dispatch(setLoading(false));
      return;
    }

    const result = await checkOut({
      repId: String(user?.id ?? 'offline'),
      latitude: coords.latitude,
      longitude: coords.longitude,
    });

    if (result.success) {
      dispatch(checkedOut({ check_out_time: new Date().toISOString() }));
      const record = await getTodayAttendance(String(user?.id));
      if (record) dispatch(setTodayAttendance(record));
      try {
        await syncAll(String(user?.id));
      } catch {
        // Keep the record queued locally until the portal API is reachable.
      }
    } else {
      Alert.alert('Check-Out Failed', result.error ?? 'Please try again.');
    }

    dispatch(setLoading(false));
  };

  const handleExceptionSubmit = () => {
    if (!exceptionReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for checking in outside your area.');
      return;
    }
    setShowExceptionModal(false);
    handleCheckIn(exceptionReason.trim());
    setExceptionReason('');
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const today = format(new Date(), 'EEEE, MMMM d');
  const formatTime = (iso) => (iso ? format(new Date(iso), 'hh:mm a') : '—');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.backgroundwhite} />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.darkgrey} />
          </TouchableOpacity>
          <View>
            <Text style={styles.pageTitle}>Attendance</Text>
            <Text style={styles.dateLabel}>{today}</Text>
          </View>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusCardHeader}>
            <Text style={styles.statusCardTitle}>Today&apos;s Status</Text>
            {todayAttendance?.status && <FlagBadge status={todayAttendance.status} />}
          </View>

          {/* Times */}
          <View style={styles.timesRow}>
            <View style={styles.timeBlock}>
              <View
                style={[
                  styles.timeIconCircle,
                  { backgroundColor: isCheckedIn ? '#DCFCE7' : '#F3F4F6' },
                ]}
              >
                <Ionicons
                  name="log-in-outline"
                  size={22}
                  color={isCheckedIn ? Colors.primary : Colors.lightgrey}
                />
              </View>
              <Text style={styles.timeLabel}>Check-In</Text>
              <Text style={[styles.timeValue, isCheckedIn && { color: Colors.primary }]}>
                {formatTime(todayAttendance?.check_in_time)}
              </Text>
            </View>

            {/* Connector */}
            <View style={styles.connector}>
              <View style={styles.connectorLine} />
              <Ionicons name="arrow-forward" size={16} color={Colors.bordergrey} />
              <View style={styles.connectorLine} />
            </View>

            <View style={styles.timeBlock}>
              <View
                style={[
                  styles.timeIconCircle,
                  { backgroundColor: isCheckedOut ? '#EEF2FF' : '#F3F4F6' },
                ]}
              >
                <Ionicons
                  name="log-out-outline"
                  size={22}
                  color={isCheckedOut ? '#6366F1' : Colors.lightgrey}
                />
              </View>
              <Text style={styles.timeLabel}>Check-Out</Text>
              <Text style={[styles.timeValue, isCheckedOut && { color: '#6366F1' }]}>
                {formatTime(todayAttendance?.check_out_time)}
              </Text>
            </View>
          </View>

        </View>

        {/* Action Button */}
        {!isCheckedOut && (
          <TouchableOpacity
            style={[
              styles.actionBtn,
              isCheckedIn ? styles.checkOutStyle : styles.checkInStyle,
              loading && styles.disabledBtn,
            ]}
            onPress={isCheckedIn ? handleCheckOut : handleCheckIn}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons
                  name={isCheckedIn ? 'log-out-outline' : 'log-in-outline'}
                  size={22}
                  color="#fff"
                  style={{ marginRight: 10 }}
                />
                <Text style={styles.actionBtnText}>
                  {isCheckedIn ? 'Check Out for Today' : 'Check In Now'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {isCheckedOut && (
          <View style={styles.completeBanner}>
            <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
            <Text style={styles.completeText}>Day complete! See you tomorrow.</Text>
          </View>
        )}

        {/* Refresh GPS (Silent) */}
        <TouchableOpacity style={styles.refreshBtn} onPress={acquireGPS}>
          <Ionicons name="refresh" size={16} color={Colors.primary} />
          <Text style={styles.refreshText}>Force Sync Location</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Exception Reason Modal (Out-of-Area Check-In) */}
      <Modal
        visible={showExceptionModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowExceptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning-outline" size={28} color="#C2410C" />
              <Text style={styles.modalTitle}>Attendance Protocol</Text>
            </View>

            <Text style={styles.modalBody}>
              You are currently outside your assigned base. Please provide a brief reason to continue your check-in for manager review.
            </Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="e.g., Emergency client visit, field relocation..."
              placeholderTextColor={Colors.textgrey}
              multiline
              numberOfLines={3}
              value={exceptionReason}
              onChangeText={setExceptionReason}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowExceptionModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleExceptionSubmit}>
                <Text style={styles.submitText}>Submit & Check In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.backgroundwhite,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.darkgrey,
  },
  dateLabel: {
    fontSize: 12,
    color: Colors.lightgrey,
    marginTop: 1,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.bordergrey,
  },
  statusCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.darkgrey,
  },
  timesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeBlock: {
    flex: 1,
    alignItems: 'center',
  },
  timeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 12,
    color: Colors.textgrey,
    marginBottom: 4,
    fontWeight: '500',
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.darkgrey,
  },
  connector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 24,
  },
  connectorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.bordergrey,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 12,
    color: Colors.lightgrey,
    flex: 1,
  },
  radiusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  radiusText: {
    fontSize: 11,
    color: Colors.textgrey,
  },
  actionBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  checkInStyle: { backgroundColor: Colors.primary },
  checkOutStyle: { backgroundColor: '#6366F1' },
  disabledBtn: { opacity: 0.6 },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  completeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    justifyContent: 'center',
  },
  completeText: {
    color: '#15803D',
    fontWeight: '700',
    fontSize: 14,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 30,
  },
  refreshText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.darkgrey,
  },
  modalBody: {
    fontSize: 14,
    color: Colors.lightgrey,
    lineHeight: 21,
    marginBottom: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: Colors.bordergrey,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.darkgrey,
    backgroundColor: Colors.backgroundwhite,
    minHeight: 90,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.bordergrey,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelText: {
    color: Colors.darkgrey,
    fontWeight: '600',
    fontSize: 14,
  },
  submitBtn: {
    flex: 2,
    borderRadius: 12,
    backgroundColor: '#C2410C',
    paddingVertical: 13,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
