import { ActivityIndicator, Alert, Dimensions, FlatList, Modal, StyleSheet, Text, TextInput, View, TouchableOpacity, Platform } from 'react-native'
import React, { useState, useEffect } from 'react'

import DocCard from '../components/DocCard'
import Colors from '../utils/Colors'
import { getAllDoctors } from '../database/doctorService'
import { completeVisit, startVisit } from '../database/visitService'
import { syncAll, syncFromPortal } from '../database/syncService'
import { useSelector } from 'react-redux'
import { selectUser } from '../redux/slices/authSlice'

import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

const DoctorList = () => {
    const [data, setData] = useState([])
    const [selectedDoctor, setSelectedDoctor] = useState(null)
    const [notes, setNotes] = useState('')
    const [intentType, setIntentType] = useState('Routine Call')
    const [quantity, setQuantity] = useState('')
    const [saving, setSaving] = useState(false)
    const router = useRouter()
    const user = useSelector(selectUser)

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                await syncFromPortal()
            } catch {
                // Keep showing the local SQLite directory while offline.
            }
            const doctors = await getAllDoctors()
            setData(doctors)
        }
        fetchDoctors()
    }, [])

    const getVisitCoords = async (doctor) => {
        try {
            const Location = require('expo-location')
            const { status } = await Location.requestForegroundPermissionsAsync()
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
                return { latitude: loc.coords.latitude, longitude: loc.coords.longitude }
            }
        } catch {
            // Fall back to the doctor's registered location.
        }
        return {
            latitude: Number(doctor.latitude || 0),
            longitude: Number(doctor.longitude || 0),
        }
    }

    const saveCallReport = async () => {
        if (!selectedDoctor) return
        setSaving(true)
        try {
            const coords = await getVisitCoords(selectedDoctor)
            const visit = await startVisit({
                repId: String(user?.id ?? 'offline'),
                doctorId: selectedDoctor.id,
                latitude: coords.latitude,
                longitude: coords.longitude,
            })

            if (!visit.success) {
                Alert.alert('Visit Failed', visit.error || 'Could not start the visit.')
                return
            }

            await completeVisit({
                visitId: visit.visitId,
                notes,
                intentType,
                medicineId: null,
                quantity: Number(quantity || 0),
            })

            try {
                await syncAll(String(user?.id ?? 'offline'))
            } catch {
                // The visit is stored locally and will sync later.
            }

            setSelectedDoctor(null)
            setNotes('')
            setIntentType('Routine Call')
            setQuantity('')
            Alert.alert('Call Report Saved', 'Your visit report has been recorded.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={Colors.darkgrey} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Doctors List</Text>
            </View>

            <FlatList
                data={data}
                renderItem={({ item, index }) => (
                    <DocCard
                        name={item.name}
                        nmc={item.phone || 'N/A'} // Using phone as a placeholder for NMC
                        type={item.specialization}
                        onPress={() => setSelectedDoctor(item)}
                    />
                )}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                style={{ marginBottom: height * 0.1 }}
                ListEmptyComponent={
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
                        <Text style={{ color: Colors.textgrey }}>No doctors found. Syncing required.</Text>
                    </View>
                }
            />

            <Modal visible={!!selectedDoctor} animationType="slide" transparent onRequestClose={() => setSelectedDoctor(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Call Report</Text>
                        <Text style={styles.modalSubtitle}>{selectedDoctor?.name}</Text>
                        <TextInput
                            style={styles.input}
                            value={intentType}
                            onChangeText={setIntentType}
                            placeholder="Intent type"
                        />
                        <TextInput
                            style={styles.input}
                            value={quantity}
                            onChangeText={setQuantity}
                            keyboardType="numeric"
                            placeholder="Sample quantity"
                        />
                        <TextInput
                            style={[styles.input, styles.notesInput]}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Visit notes, commitment, next action..."
                            multiline
                            textAlignVertical="top"
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedDoctor(null)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtnModal} onPress={saveCallReport} disabled={saving}>
                                {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveText}>Save Report</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    )
}

export default DoctorList;

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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 22,
        paddingBottom: 36,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.darkgrey,
    },
    modalSubtitle: {
        color: Colors.textgrey,
        marginTop: 4,
        marginBottom: 18,
    },
    input: {
        borderWidth: 1,
        borderColor: Colors.bordergrey,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 12,
        color: Colors.darkgrey,
        backgroundColor: Colors.backgroundwhite,
    },
    notesInput: {
        minHeight: 110,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        borderWidth: 1,
        borderColor: Colors.bordergrey,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
    },
    cancelText: {
        color: Colors.darkgrey,
        fontWeight: '700',
    },
    saveBtnModal: {
        flex: 2,
        backgroundColor: Colors.primary,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
    },
    saveText: {
        color: Colors.white,
        fontWeight: '800',
    },
})
