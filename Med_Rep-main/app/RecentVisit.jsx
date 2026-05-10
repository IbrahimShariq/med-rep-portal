import { Dimensions, FlatList, StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import React, { useState } from 'react'

import { useRouter } from 'expo-router'

import PopupModule from '../components/PopupModule'
import DocCard from '../components/DocCard'
import Colors from '../utils/Colors'
import fakeDoctorPlans from '../FakeData/DoctorFakeData'

const RecentVisit = () => {

    const data = fakeDoctorPlans()

    const [showModal, setShowModal] = useState(false);
    const router = useRouter()

    const handleSelection = (choice) => {
        switch (choice) {
            case 'Plan':
                router.push('/PlannedScreen')
                break;
            case 'Unplan':
                router.push('/DoctorList')
                break;
        }
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={Colors.darkgrey} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Recent Visits</Text>
            </View>

            <FlatList
                data={data}
                renderItem={({ item, index }) => (
                    <DocCard
                        name={item.name}
                        nmc={item.nmcNo}
                        type={item.specialization}
                    />
                )}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                style={{ marginBottom: height * 0.1 }}
            />

            <View style={styles.addBtn}>
                <TouchableOpacity
                    onPress={() => { setShowModal(true) }}
                    style={{
                        paddingHorizontal: 10,
                        paddingVertical: 10,
                        backgroundColor: Colors.primary,
                        borderRadius: 50

                    }}>
                    <Ionicons name="add" size={24} color={Colors.white} />
                </TouchableOpacity>
                {showModal && (
                    <PopupModule
                        visible={showModal}
                        onClose={() => setShowModal(false)}
                        options={['Plan', 'Unplan', 'Company Visit']}
                        onSelect={(choice) => handleSelection(choice)}
                    />
                )}
            </View>
        </View>
    )
}

export default RecentVisit

const { width, height } = Dimensions.get('window')

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundwhite,
        paddingHorizontal: width * 0.05
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'android' ? 50 : 20,
        paddingBottom: 20,
        gap: 15
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.darkgrey,
    },
    addBtn: {
        position: 'absolute',
        bottom: 25,
        right: 25
    }
})