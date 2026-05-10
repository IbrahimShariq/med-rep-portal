import { Dimensions, FlatList, StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native'
import React, { useState } from 'react'

import Ionicons from '@expo/vector-icons/Ionicons';

import { useRouter } from 'expo-router'
import { format } from 'date-fns'

import DocCard from '../components/DocCard'
import DoctorEditModule from '../components/DocEditCardModule'
import ConfirmSaveModal from '../components/ConfirmSaveModal'
import Colors from '../utils/Colors'

import useDoctorPlanState from '../redux/PageStates/DoctorPlanState'
import fakeDoctorPlans from '../FakeData/DoctorFakeData'
import AddDoctorModal from '../components/AddDoctoralModal';
import ThemedButton from '../components/ThemedButton';

const DoctorPlan = () => {

    const router = useRouter()
    const { dates } = useDoctorPlanState()

    const [showEdit, setShowEdit] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)

    const handleDocEdit = () => {
        setShowEdit(true)
    }

    const handleSave = () => {
        setShowConfirmModal(true)
    }

    const data = fakeDoctorPlans()

    const dateTitle = dates
        ? `${format(dates.startDate, 'MMM d')} - ${format(dates.endDate, 'MMM d, yyyy')}`
        : 'Doctor Plan';

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeftRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color={Colors.darkgrey} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>Plan Details</Text>
                        <Text style={styles.headerSubtitle}>{dateTitle}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={() => setShowAddModal(true)}
                    style={styles.addBtnHeader}
                >
                    <Ionicons name="add" size={24} color={Colors.white} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={data}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item, index }) => (
                    <View>
                        <DocCard
                            variant='green'
                            date={item.date}
                            name={item.name}
                            nmc={item.nmcNo}
                            type={item.specialization}
                            shift={item.shift}
                            onEdit={handleDocEdit}
                        />
                        {showEdit && (
                            <DoctorEditModule
                                visible={showEdit}
                                onClose={() => setShowEdit(false)}
                                onSave={() => setShowEdit(false)}
                                onDelete={() => setShowEdit(false)}
                            />
                        )}

                    </View>
                )}
                style={styles.flatlistContainer}
                showsVerticalScrollIndicator={false}
            />
            <AddDoctorModal isVisible={showAddModal} onClose={() => setShowAddModal(false)} />
            <View style={styles.saveBtn}>
                <ThemedButton title='Save Plan' onPress={handleSave} />
                {showConfirmModal && (
                    <ConfirmSaveModal
                        visible={showConfirmModal}
                        onClose={() => setShowConfirmModal(false)}
                        onSave={() => {
                            setShowConfirmModal(false);
                            router.replace('/(tabs)/Home');
                        }}
                    />
                )}
            </View>
        </View>
    )
}

export default DoctorPlan

const { width } = Dimensions.get('window')

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundwhite,
        paddingHorizontal: width * 0.05,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'android' ? 50 : 20,
        paddingBottom: 20,
    },
    headerLeftRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
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
    headerSubtitle: {
        fontSize: 12,
        color: Colors.lightgrey,
    },
    addBtnHeader: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtn: {
        position: 'absolute',
        bottom: 25,
        alignSelf: 'center',
        width: '90%'
    },
    flatlistContainer: {
        marginBottom: 80
    }
})
