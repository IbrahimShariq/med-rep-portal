// app/(tabs)/Home.jsx
// Main home screen for reps — features the AttendanceCard as the primary action,
// then the quick-menu grid below it.
// Note: KM data is intentionally NOT shown to reps on any screen.

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { format } from 'date-fns';

import Colors from '../../utils/Colors';
import AttendanceCard from '../../components/AttendanceCard';

import {
  setTodayAttendance,
  setCurrentLocation,
  setLocationPermission,
  setLoading,
  checkedIn,
  checkedOut,
} from '../../redux/slices/attendanceSlice';
import { selectUser, selectUserBaseCoords } from '../../redux/slices/authSlice';
import { hydrateSettings } from '../../redux/slices/settingsSlice';
import {
  checkIn,
  checkOut,
  getTodayAttendance,
} from '../../database/attendanceService';
import { getAllSettings } from '../../database/settingsService';
import { syncAll } from '../../database/syncService';

// Conditionally import expo-location
let Location;
try {
  Location = require('expo-location');
} catch {
  Location = null;
}

const { width } = Dimensions.get('window');

const MENUS = [
  {
    id: '1',
    title: 'Visits',
    icon: <FontAwesome5 name="user-md" size={26} color={Colors.primary} />,
    path: '/RecentVisit',
  },
  {
    id: '2',
    title: 'Plans',
    icon: <MaterialIcons name="assignment" size={26} color={Colors.primary} />,
    path: '/PlannedScreen',
  },
  {
    id: '3',
    title: 'Doctors',
    icon: <Ionicons name="people-outline" size={26} color={Colors.primary} />,
    path: '/DoctorList',
  },
  {
    id: '4',
    title: 'History',
    icon: <Ionicons name="calendar-outline" size={26} color={Colors.primary} />,
    path: '/AttendanceHistory',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  const user = useSelector(selectUser);
  const todayAttendance = useSelector((s) => s.attendance.today);
  const currentLocation = useSelector((s) => s.attendance.currentLocation);
  const loading = useSelector((s) => s.attendance.loading);
  const baseCoords = useSelector(selectUserBaseCoords);

  const [gpsStatus, setGpsStatus] = useState('acquiring');

  const acquireGPS = useCallback(async () => {
    if (!Location) {
      setGpsStatus('denied');
      return null;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    dispatch(setLocationPermission(status));

    if (status !== 'granted') {
      setGpsStatus('denied');
      return null;
    }

    setGpsStatus('acquiring');

    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
      };
      dispatch(setCurrentLocation(coords));

      return coords;
    } catch {
      return null;
    }
  }, [dispatch]);

  // ---------------------------------------------------------------------------
  // Bootstrap: load settings + today's attendance + acquire GPS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const bootstrap = async () => {
      // Hydrate settings from SQLite
      const settings = await getAllSettings();
      dispatch(hydrateSettings(settings));

      if (user?.id) {
        try {
          await syncAll(String(user.id));
          const refreshedSettings = await getAllSettings();
          dispatch(hydrateSettings(refreshedSettings));
        } catch {
          // Local-first mode: keep working offline and sync when the portal is reachable.
        }
      }

      // Load today's attendance
      if (user?.id) {
        const record = await getTodayAttendance(String(user.id));
        if (record) dispatch(setTodayAttendance(record));
      }

      // Acquire GPS
      acquireGPS();
    };
    bootstrap();
  }, [acquireGPS, dispatch, user?.id]);

  // ---------------------------------------------------------------------------
  // Quick check-in from AttendanceCard (simple tap, no exception flow here)
  // Full flow is on the Attendance screen
  // ---------------------------------------------------------------------------
  const handleCheckIn = async () => {
    dispatch(setLoading(true));
    const coords = currentLocation ?? (await acquireGPS());
    if (!coords) { dispatch(setLoading(false)); return; }

    const result = await checkIn({
      repId: String(user?.id ?? 'guest'),
      latitude: coords.latitude,
      longitude: coords.longitude,
      baseCoords,
    });

    if (result.success) {
      dispatch(checkedIn({
        id: result.attendanceId,
        checkInTime: new Date().toISOString(),
        status: result.status,
        distanceMeters: result.distanceMeters,
      }));
      const record = await getTodayAttendance(String(user?.id));
      if (record) dispatch(setTodayAttendance(record));
      try {
        await syncAll(String(user?.id));
      } catch {
        // The record remains queued locally with synced = 0.
      }
    }
    dispatch(setLoading(false));
  };

  const handleCheckOut = async () => {
    dispatch(setLoading(true));
    const coords = currentLocation ?? (await acquireGPS());
    if (!coords) { dispatch(setLoading(false)); return; }

    const result = await checkOut({
      repId: String(user?.id ?? 'guest'),
      latitude: coords.latitude,
      longitude: coords.longitude,
    });

    if (result.success) {
      dispatch(checkedOut({ checkOutTime: new Date().toISOString() }));
      const record = await getTodayAttendance(String(user?.id));
      if (record) dispatch(setTodayAttendance(record));
      try {
        await syncAll(String(user?.id));
      } catch {
        // The checkout remains queued locally with synced = 0.
      }
    }
    dispatch(setLoading(false));
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.backgroundwhite} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.userName}>{user?.name ?? 'Field Rep'} 👋</Text>
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => router.push('/AttendanceHistory')}
          >
            <Ionicons name="calendar-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Date banner */}
        <Text style={styles.dateLine}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</Text>

        {/* ─── Attendance Card — PRIMARY ACTION ─── */}
        <AttendanceCard
          attendance={todayAttendance}
          gpsStatus={gpsStatus}
          loading={loading}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
          onPress={() => router.push('/Attendance')}
        />

        {/* Quick Menu */}
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.menuGrid}>
          {MENUS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => router.push(item.path)}
              activeOpacity={0.8}
            >
              <View style={styles.menuIconBg}>{item.icon}</View>
              <Text style={styles.menuText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today's Summary (visits count — no KM) */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Today&apos;s Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryNumber}>—</Text>
              <Text style={styles.summaryLabel}>Visits</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryNumber}>—</Text>
              <Text style={styles.summaryLabel}>Planned</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryNumber}>—</Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </View>
          </View>
        </View>

      </ScrollView>
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
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 20,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 14,
    color: Colors.lightgrey,
    fontWeight: '500',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.darkgrey,
    marginTop: 2,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLine: {
    fontSize: 13,
    color: Colors.textgrey,
    marginBottom: 18,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.darkgrey,
    marginBottom: 12,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  menuItem: {
    width: (width - 36 - 30) / 4,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.bordergrey,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIconBg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  menuText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.darkgrey,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: Colors.bordergrey,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.darkgrey,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryBlock: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textgrey,
    marginTop: 3,
    fontWeight: '500',
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.bordergrey,
  },
});
