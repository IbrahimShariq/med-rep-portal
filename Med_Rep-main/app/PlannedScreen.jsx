import { Dimensions, FlatList, StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native'
import React from 'react'
import Colors from '../utils/Colors';
import ThemedButton from '../components/ThemedButton';
import { useRouter } from 'expo-router';

import PlansFakeData from '../FakeData/PlansFakeData';
import CreatedPlanCard from '../components/CreatedPlanCard';
import Ionicons from '@expo/vector-icons/Ionicons';

const PlannedScreen = () => {

    const data = PlansFakeData()

    const router = useRouter()

    const CreateNewPlan = () => {
        router.push('CreatePlan')
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={Colors.darkgrey} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Plans</Text>
            </View>

            <View style={styles.createPlan}>
                <ThemedButton isIcon={true} title='Create Plan' onPress={CreateNewPlan} />
            </View>
            <Text style={styles.createdPlansText}>Existing Plans</Text>
            <FlatList
                data={data}
                renderItem={({ item, index }) => (
                    <CreatedPlanCard {...item} />
                )}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                style={{ marginBottom: height * 0.1 }}
            />
        </View>
    )
}

export default PlannedScreen;

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
    createPlan: {
        width: '100%',
        height: height * 0.12
    },
    createdPlansText: {
        fontSize: 16,
        fontWeight: 'bold'
    },
})
