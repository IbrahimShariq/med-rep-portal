import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import Colors from '../utils/Colors'

import Ionicons from '@expo/vector-icons/Ionicons';

const ThemedButton = ({ title = "Click Me", onPress, isIcon = false }) => {
    return (
        <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={onPress}>
            {isIcon &&
                <View style={styles.icon}>
                    <Ionicons name="create" size={24} color={Colors.primary} />
                </View>}
            <Text style={styles.text}>{title}</Text>
        </TouchableOpacity>
    )
}

export default ThemedButton

const styles = StyleSheet.create({
    button: {
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        elevation: 5,
        flexDirection: 'row',
        justifyContent: 'center',
        columnGap: 10
    },
    text: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    icon: {
        width: 30,
        height: 30,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 60
    }
})
