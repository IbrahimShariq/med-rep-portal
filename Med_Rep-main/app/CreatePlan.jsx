import { StyleSheet, Text, View, Dimensions, TextInput, TouchableOpacity, Platform } from 'react-native'
import React, { useState } from 'react'

import { useRouter } from 'expo-router';

import DateTimePicker from '@react-native-community/datetimepicker';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import Colors from '../utils/Colors';
import ThemedButton from '../components/ThemedButton';
import useDoctorPlanState from '../redux/PageStates/DoctorPlanState';

const CreatePlan = () => {

    const [formData, setFormData] = useState({ salesman: 'zohaib', startDate: new Date(), endDate: new Date() });
    const [showStart, setShowStart] = useState(false);
    const [showEnd, setShowEnd] = useState(false);

    const router = useRouter();
    const { setDates } = useDoctorPlanState()


    const onChange = (type, event, selectedDate) => {
        if (selectedDate) {

            setFormData({ ...formData, [type]: selectedDate })
        }
        if (type === "startDate") setShowStart(false);
        if (type === "endDate") setShowEnd(false);
    };

    const navigateToPlanDoctor = () => {
        setDates({ 'startDate': formData.startDate, 'endDate': formData.endDate })
        router.push('/DoctorPlan');
    }



    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={Colors.darkgrey} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Plan</Text>
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Sales Man</Text>
                <View style={styles.inputContainer}>
                    <FontAwesome name="user" size={24} color={Colors.primary} />
                    <TextInput
                        value={formData.salesman}
                        onChangeText={(val) => setFormData({ ...formData, salesman: val })}
                        style={styles.inputText}
                        editable={false}
                    />
                </View>
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Plan Start Date</Text>
                <TouchableOpacity onPress={() => setShowStart(true)}>
                    <View style={styles.dateContainer}>
                        <View style={styles.date}>
                            <Feather name="calendar" size={24} color={Colors.primary} />
                            <Text style={styles.inputText}>{formData.startDate.toDateString()}</Text>
                        </View>

                        {showStart && (
                            <DateTimePicker
                                value={formData.startDate}
                                mode='date'
                                display='calendar'
                                minimumDate={new Date()}
                                onChange={(e, d) => onChange("startDate", e, d)}
                            />
                        )}
                        <View>
                            <AntDesign name="down" size={20} color={Colors.primary} />
                        </View>
                    </View>
                </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Plan End Date</Text>
                <TouchableOpacity onPress={() => setShowEnd(true)}>
                    <View style={styles.dateContainer}>
                        <View style={styles.date}>
                            <Feather name="calendar" size={24} color={Colors.primary} />
                            <Text style={styles.inputText}>{formData.endDate.toDateString()}</Text>
                        </View>

                        {showEnd && (
                            <DateTimePicker
                                value={formData.endDate}
                                mode='date'
                                display='calendar'
                                minimumDate={formData.startDate}
                                onChange={(e, d) => onChange("endDate", e, d)}
                            />
                        )}
                        <View>
                            <AntDesign name="down" size={20} color={Colors.primary} />
                        </View>
                    </View>
                </TouchableOpacity>
            </View>

            <View style={styles.nextBtn}>
                <ThemedButton title='Next' onPress={navigateToPlanDoctor} />
            </View>

        </View>
    )
}

export default CreatePlan;

const { width, height } = Dimensions.get('window')

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundwhite,
        paddingHorizontal: width * 0.05,
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
    formGroup: {
        height: height * 0.1,
        marginBottom: height * 0.05

    },
    label: {
        paddingVertical: 15,
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.textgrey
    },
    inputContainer: {
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        columnGap: 20,
        borderRadius: 5,
        borderColor: Colors.bordergrey,
        paddingVertical: 8,
        backgroundColor: Colors.inputBackground,

    },
    inputText: {
        fontSize: 16,
        fontWeight: '400',
        color: Colors.primary
    },
    dateContainer: {
        borderWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: height * 0.08,
        borderRadius: 5,
        borderColor: Colors.bordergrey,
    },
    date: {
        flexDirection: 'row',
        columnGap: 20
    },
    nextBtn: {
        bottom: height * 0.05,
        position: 'absolute',
        width: '90%',
        alignSelf: 'center'
    }
})
