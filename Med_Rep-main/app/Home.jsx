import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Colors from '../utils/Colors';

const menus = [
  { id: '1', title: 'Visits', icon: <FontAwesome5 name="user-md" size={28} color={Colors.primary} />, path: '/visits' },
  { id: '2', title: 'Plans', icon: <MaterialIcons name="assignment" size={28} color={Colors.primary} />, path: '/plans' },
  { id: '3', title: 'Activity', icon: <MaterialIcons name="show-chart" size={28} color={Colors.primary} />, path: '/activity' },
  
];

export default function Home() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Home</Text>
        <Ionicons name="search" size={24} color="black" />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput placeholder="Search..." style={styles.searchInput} />
      </View>

      {/* Menu Buttons */}
      <FlatList
        data={menus}
        numColumns={3}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.menuList}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.menuButton} onPress={() => router.push(item.path)}>
            {item.icon}
            <Text style={styles.menuText}>{item.title}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3f3',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 20,
  },
  searchInput: {
    marginLeft: 8,
    flex: 1,
    fontSize: 16,
  },
  menuList: {
    justifyContent: 'space-between',
  },
  menuButton: {
    flex: 1,
    backgroundColor: '#f3f9f9',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 6,
  },
  menuText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '500',
  },
});
