import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    ScrollView,
    StyleSheet,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard,
    Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import ThemedButton from '../components/ThemedButton';

import Feather from '@expo/vector-icons/Feather';
import AntDesign from '@expo/vector-icons/AntDesign';
import Colors from '../utils/Colors';

// Medical Cross Icon Component
const MedicalCrossIcon = () => (
    <View style={styles.crossIcon}>
        <View style={styles.crossVertical} />
        <View style={styles.crossHorizontal} />
    </View>
);

// Close Icon Component
const CloseIcon = () => (
    <AntDesign name="close" size={24} color={Colors.textgrey} />
);

// Calendar Icon Component
const CalendarIcon = () => (
    <Feather name="calendar" size={24} color={Colors.primary} />
);

// Chevron Down Icon Component
const ChevronDownIcon = ({ isOpen }) => (
    <View style={[styles.chevron, isOpen && styles.chevronOpen]}>
        <View style={styles.chevronLine} />
    </View>
);

const AddDoctorModal = ({ isVisible, onClose }) => {
    const [doctorName, setDoctorName] = useState('');
    const [date, setDate] = useState(new Date());
    const [show, setShow] = useState(false);
    const [selectedShift, setSelectedShift] = useState('');
    const [isShiftDropdownOpen, setIsShiftDropdownOpen] = useState(false);
    const [isDoctorDropdownOpen, setIsDoctorDropdownOpen] = useState(false);

    const shifts = ['Morning', 'Day', 'Night'];

    const onChange = (event, selectedDate) => {
        setShow(false); // always close after picking a date
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    // Sample doctor list - replace with your actual data source
    const allDoctors = [
        'Dr. Sarah Johnson',
        'Dr. Michael Chen',
        'Dr. Emily Rodriguez',
        'Dr. David Thompson',
        'Dr. Lisa Anderson',
        'Dr. James Wilson',
        'Dr. Maria Garcia',
        'Dr. Robert Kumar',
        'Dr. Jennifer Lee',
        'Dr. Ahmed Hassan',
    ];

    // Filter doctors based on search input
    const filteredDoctors = allDoctors.filter((doctor) =>
        doctor.toLowerCase().includes(doctorName.toLowerCase())
    );

    const handleSave = () => {
        if (!doctorName || !date || !selectedShift || !allDoctors.includes(doctorName)) return;
        setDoctorName('');
        setSelectedShift('');
        onClose(); // close modal
    };

    const handleDoctorSelect = (doctor) => {
        setDoctorName(doctor);
        setIsDoctorDropdownOpen(false);
    };

    const handleShiftSelect = (shift) => {
        setSelectedShift(shift);
        setIsShiftDropdownOpen(false);
    };

    return (
        <Modal
            visible={isVisible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                    >
                        <View style={styles.modalContainer}>
                            {/* Close Button */}
                            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                <CloseIcon />
                            </TouchableOpacity>

                            {/* Header */}
                            <View style={styles.header}>
                                <MedicalCrossIcon />
                                <Text style={styles.title}>Add Doctor</Text>
                            </View>

                            {/* Form */}
                            <View style={styles.form}>
                                {/* Doctor Name */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Name</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={doctorName}
                                        onChangeText={(text) => {
                                            setDoctorName(text);
                                            setIsDoctorDropdownOpen(true);
                                        }}
                                        onFocus={() => setIsDoctorDropdownOpen(true)}
                                        placeholder="Search or type doctor name"
                                        placeholderTextColor="#9CA3AF"
                                        blurOnSubmit={false}
                                    />

                                    {/* Doctor Search Dropdown */}
                                    {isDoctorDropdownOpen && doctorName && (
                                        <View style={styles.dropdown}>
                                            <ScrollView style={styles.dropdownScroll} keyboardShouldPersistTaps="handled">
                                                {filteredDoctors.length > 0 ? (
                                                    filteredDoctors.map((doctor, index) => (
                                                        <TouchableOpacity
                                                            key={index}
                                                            style={[
                                                                styles.dropdownItem,
                                                                index === filteredDoctors.length - 1 && styles.dropdownItemLast,
                                                            ]}
                                                            onPress={() => handleDoctorSelect(doctor)}
                                                        >
                                                            <Text style={styles.dropdownText}>{doctor}</Text>
                                                        </TouchableOpacity>
                                                    ))
                                                ) : (
                                                    <View style={styles.noResults}>
                                                        <Text style={styles.noResultsText}>No doctors found.</Text>
                                                    </View>
                                                )}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>

                                {/* Date and Shift */}
                                <View style={styles.row}>
                                    {/* Date Field */}
                                    <View style={[styles.inputGroup, styles.halfWidth]}>
                                        <Text style={styles.labelGray}>Date</Text>
                                        <TouchableOpacity onPress={() => setShow(true)}>
                                            <View style={styles.dateContainer}>
                                                <Text style={styles.dateInput}>{date.toDateString()}</Text>
                                                <CalendarIcon />
                                            </View>
                                        </TouchableOpacity>

                                        {/* Date Picker */}
                                        {show && (
                                            <DateTimePicker
                                                value={date}
                                                mode="date"
                                                display="default"
                                                onChange={onChange}
                                            />
                                        )}
                                    </View>

                                    {/* Shift Field */}
                                    <View style={[styles.inputGroup, styles.halfWidth]}>
                                        <Text style={styles.labelGray}>Shift&apos;s</Text>
                                        <TouchableOpacity
                                            style={styles.shiftContainer}
                                            onPress={() => setIsShiftDropdownOpen(!isShiftDropdownOpen)}
                                        >
                                            <Text style={styles.shiftText}>{selectedShift || 'Select shift'}</Text>
                                            <ChevronDownIcon isOpen={isShiftDropdownOpen} />
                                        </TouchableOpacity>

                                        {/* Shift Dropdown */}
                                        {isShiftDropdownOpen && (
                                            <View style={styles.shiftDropdown}>
                                                {shifts.map((shift, index) => (
                                                    <TouchableOpacity
                                                        key={shift}
                                                        style={[
                                                            styles.shiftDropdownItem,
                                                            index === shifts.length - 1 && styles.dropdownItemLast,
                                                        ]}
                                                        onPress={() => handleShiftSelect(shift)}
                                                    >
                                                        <Text style={styles.dropdownText}>{shift}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>

                            {/* Save Button */}
                            <View>
                                <ThemedButton title="Save" onPress={handleSave} />
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20
    },
    modalContainer: {
        backgroundColor: Colors.backgroundwhite,
        borderRadius: 16,
        padding: 20,
        width: '100%',
        position: 'relative',
    },
    closeButton: {
        position: 'absolute',
        top: 24,
        right: 24,
        zIndex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        color: Colors.black,
        marginLeft: 12,
    },
    form: {
        marginBottom: 32,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 8,
    },
    labelGray: {
        color: '#9CA3AF',
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 12,
    },
    textInput: {
        fontSize: 16,
        color: '#4B5563',
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: '#D1D5DB',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfWidth: {
        width: '48%',
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateInput: {
        fontSize: 16,
        color: '#4B5563',
        flex: 1,
    },
    shiftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    shiftText: {
        fontSize: 16,
        color: '#4B5563',
    },
    dropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        marginTop: 4,
        maxHeight: 192,
        zIndex: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    dropdownScroll: {
        maxHeight: 192,
    },
    dropdownItem: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    dropdownItemLast: {
        borderBottomWidth: 0,
    },
    dropdownText: {
        fontSize: 16,
        color: '#374151',
    },
    noResults: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    noResultsText: {
        fontSize: 14,
        color: '#6B7280',
    },
    shiftDropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        marginTop: 8,
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    shiftDropdownItem: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    crossIcon: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    crossVertical: {
        position: 'absolute',
        width: 8,
        height: 24,
        backgroundColor: '#2DD4BF',
        borderRadius: 4,
    },
    crossHorizontal: {
        position: 'absolute',
        width: 24,
        height: 8,
        backgroundColor: '#2DD4BF',
        borderRadius: 4,
    },
    chevron: {
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chevronLine: {
        width: 8,
        height: 8,
        borderRightWidth: 2,
        borderBottomWidth: 2,
        borderColor: '#9CA3AF',
        transform: [{ rotate: '45deg' }],
    },
    chevronOpen: {
        transform: [{ rotate: '180deg' }],
    },
});

export default AddDoctorModal;
