import React, { useState } from "react";
import {Modal,View,Text,TouchableOpacity,StyleSheet,TouchableWithoutFeedback,} from "react-native";
import Colors from "../utils/Colors";

const PopupModule = ({ visible, onClose, options = [], onSelect }) => {
  const [selected, setSelected] = useState(null);

  const handleSelect = (option) => {
    setSelected(option);
    onSelect(option);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <View style={styles.container}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.option}
                onPress={() => handleSelect(option)}
              >
                <View
                  style={[
                    styles.circle,
                    selected === option && styles.circleSelected,
                  ]}
                />
                <Text style={styles.label}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default PopupModule;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  container: {
    backgroundColor: Colors.backgroundwhite,
    borderRadius: 10,
    padding: 20,
    width: 250,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginRight: 12,
  },
  circleSelected: {
    backgroundColor: Colors.background,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.black,
  },
});
