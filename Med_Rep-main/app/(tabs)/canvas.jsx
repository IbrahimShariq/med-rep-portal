import { TouchableOpacity, View } from 'react-native'

import React, { useState } from 'react'
import ConfirmSaveModal from '../../components/ConfirmSaveModal'
import Ionicons from '@expo/vector-icons/Ionicons';
import Colors from '../../utils/Colors';

const Canvas = () => {
    const [show, setShow] = useState(false)

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setShow(true)}>
                <Ionicons name="add" size={24} color={Colors.black} />
            </TouchableOpacity>
            <ConfirmSaveModal
                visible={show}
                onClose={() => setShow(false)}
                onSave={() => setShow(false)}
            />
        </View>
    )
}

export default Canvas
