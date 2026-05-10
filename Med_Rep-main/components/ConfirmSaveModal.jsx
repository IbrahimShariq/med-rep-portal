import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import ThemedButton from './ThemedButton';
import Colors from '../utils/Colors';

const ConfirmSaveModal = ({ visible, onClose, onSave }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>

          <Text style={styles.header}>Saving Plan</Text>


          <Text style={styles.title}>Confirm Saving</Text>
          <Text style={styles.description}>
            Are you sure you want to save this plan?
          </Text>
          <View style={{ width: '100%' }}>
            <ThemedButton title='Save' onPress={onSave} />
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  header: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 24,
    textAlign: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: Colors.bordergrey,
    width: '100%',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  cancelText: {
    fontSize: 16,
    color: Colors.lightgrey,
    fontWeight: '500',
  },
});

export default ConfirmSaveModal;
