// app/AttendanceHistory.jsx
// Shows the rep's full attendance history with flag badges.
// KM data is intentionally NOT shown here — admin-only.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import { useSelector } from 'react-redux';
import { useRouter } from 'expo-router';

import Colors from '../../utils/Colors';
import FlagBadge from '../../components/FlagBadge';
import { selectUser } from '../../redux/slices/authSlice';
import { getAttendanceHistory } from '../../database/attendanceService';

function formatDateLabel(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'EEE, MMM d');
  } catch {
    return dateStr;
  }
}

function formatTimeShort(iso) {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'hh:mm a');
  } catch {
    return '—';
  }
}

function AttendanceHistoryItem({ item }) {
  const hasCheckOut = !!item.check_out_time;

  return (
    <View style={styles.item}>
      {/* Left — Date */}
      <View style={styles.datePill}>
        <Text style={styles.datePillDay}>{formatDateLabel(item.date)}</Text>
        <Text style={styles.datePillFull}>{item.date}</Text>
      </View>

      {/* Right — Details */}
      <View style={styles.details}>
        <FlagBadge status={item.status} size="sm" />

        <View style={styles.timeRow}>
          <View style={styles.timeChip}>
            <Ionicons name="log-in-outline" size={13} color={Colors.primary} />
            <Text style={styles.timeText}>{formatTimeShort(item.check_in_time)}</Text>
          </View>
          <Ionicons name="arrow-forward" size={13} color={Colors.bordergrey} />
          <View style={styles.timeChip}>
            <Ionicons name="log-out-outline" size={13} color={hasCheckOut ? '#6366F1' : Colors.lightgrey} />
            <Text style={[styles.timeText, !hasCheckOut && { color: Colors.textgrey }]}>
              {formatTimeShort(item.check_out_time)}
            </Text>
          </View>
        </View>

        {item.exception_reason ? (
          <View style={styles.reasonRow}>
            <Ionicons name="chatbubble-outline" size={12} color={Colors.textgrey} />
            <Text style={styles.reasonText} numberOfLines={1}>
              {item.exception_reason}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function AttendanceHistoryScreen() {
  const router = useRouter();
  const user = useSelector(selectUser);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getAttendanceHistory(String(user?.id ?? 'offline'), 60);
      setRecords(data);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.backgroundwhite} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.darkgrey} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Attendance History</Text>
          <Text style={styles.subtitle}>Last 60 days</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : records.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={56} color={Colors.bordergrey} />
          <Text style={styles.emptyText}>No attendance records yet</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <AttendanceHistoryItem item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.backgroundwhite,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bordergrey,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.darkgrey,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.lightgrey,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.lightgrey,
    fontWeight: '500',
  },
  list: {
    padding: 16,
    gap: 10,
  },
  item: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.bordergrey,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  datePill: {
    minWidth: 72,
    backgroundColor: Colors.primaryBackground,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePillDay: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  datePillFull: {
    fontSize: 10,
    color: Colors.lightgrey,
    marginTop: 2,
  },
  details: {
    flex: 1,
    gap: 7,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.darkgrey,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reasonText: {
    fontSize: 11,
    color: Colors.textgrey,
    flex: 1,
  },
});
