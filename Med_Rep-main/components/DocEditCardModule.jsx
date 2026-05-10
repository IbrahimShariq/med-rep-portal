import React, { useState } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Dropdown } from "react-native-element-dropdown";
import Colors from "../utils/Colors";

const DoctorEditModule = ({ visible, onClose, onDelete, onSave }) => {
  const [text, setText] = useState("");
  const [date, setDate] = useState(new Date());
  const [openDate, setOpenDate] = useState(false);
  const [shift, setShift] = useState("");


  // Format date (DD/MM/YYYY)
  const formatDate = (d) => {
    if (!d) return "Date";
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };


  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <View style={styles.header}>
            <Text style={styles.title}>Edited Doctor</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Label */}
          <Text style={styles.label}>Name</Text>

          <TextInput
            style={styles.input}
            placeholder="Text"
            placeholderTextColor="#626262ff"
            value={text}
            onChangeText={setText}
          />

          {/* Date + Shift */}
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.dateBox}
              onPress={() => setOpenDate(true)}>
              <Text style={{ color: "#000" }}>{formatDate(date)}</Text>
              <Image
                source={require("../assets/images/calender.png")}
                style={{ width: 18, height: 18, marginLeft: 6 }}
              />
            </TouchableOpacity>

            {openDate && (
              <DateTimePicker
                value={date}
                mode="date"
                display="calendar"
                onChange={(event, selectedDate) => {
                  setOpenDate(false);
                  if (selectedDate) setDate(selectedDate);
                }}
              />
            )}

          
            <View style={styles.dropdownWrapper}>
              <Dropdown
                style={styles.dropdown}
                containerStyle={styles.dropdownContainer} 
                placeholder="Shift's" placeholderStyle={{ color: "#A1A8B0" }}
                data={[
                  { label: "Morning", value: "Morning" },
                  { label: "Day", value: "Day" },
                  { label: "Night", value: "Night" },
                ]}
                labelField="label"
                valueField="value"
                value={shift}
                onChange={(item) => setShift(item.value)}
                    
              />
            </View>
          </View>

          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
              <Text style={styles.btnText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => {
                onSave({ text, date, shift });
                setText("");
                setShift("");
              }}>
              <Text style={styles.btnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalBox: {
    width: "85%",
    backgroundColor: Colors.primaryBackground,
    borderRadius: 10,
    padding: 15,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.black,
  },
  cancelBtn: {
    fontSize: 20,
    color: Colors.black,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.primary,
    marginBottom: 3,
  },
  input: {
    borderBottomWidth: 1,
    borderColor: Colors.black,
    paddingVertical: 6,
    marginBottom: 15,
    fontSize: 14,
    color: Colors.black,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.bordergrey,
    borderRadius: 6,
    padding: 8,
    flex: 1,
    marginRight: 8,
    backgroundColor:Colors.backgroundwhite,
  },
  dropdownWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.bordergrey,
    borderRadius: 6,
    marginLeft: 8,
  },
  dropdown: {
    height: 35,
    paddingHorizontal: 8,
    backgroundColor: Colors.backgroundwhite,
    borderRadius:6,
  },
  dropdownContainer: {
    borderRadius: 6,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: "red",
    padding: 10,
    borderRadius: 6,
    marginRight: 6,
    alignItems: "center",
  },
  saveBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 10,
    borderRadius: 6,
    marginLeft: 6,
    alignItems: "center",
  },
  btnText: {
    color: Colors.white,
    fontWeight: "600",
  },
});

export default DoctorEditModule;
