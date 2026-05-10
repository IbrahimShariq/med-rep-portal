import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native'
import React from 'react'
import Colors from '../utils/Colors'

const CreatedPlanCard = ({ startDate = "1 Aug", endDate = "1 Sep", onPressView }) => {
    return (
        <View style={styles.card}>
            <Text style={styles.dateText}>
                {startDate} - {endDate}
            </Text>
            <TouchableOpacity style={styles.viewButton} onPress={onPressView}>
                <Text style={styles.viewText}>View</Text>
            </TouchableOpacity>
        </View>
    )
}

export default CreatedPlanCard

const { width } = Dimensions.get('window')

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.primaryBackground,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginVertical: 8,
        width: width * 0.84,
        borderColor: Colors.primary,
        borderWidth: 1,
    },
    dateText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    viewButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 8,
    },
    viewText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
})
