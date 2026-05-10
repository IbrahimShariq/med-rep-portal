import React, { useState } from "react";
import {View, Text, TextInput, StyleSheet} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import Colors from "../utils/Colors";

const SampleDistributionForm = ({ medicines = [], materials = [],  tags = [] }) => {
  const [person, setPerson] = useState(null);
  const [idValue, setIdValue] = useState("");
  const [medicine, setMedicine] = useState(null);
  const [material, setMaterial] = useState(null);
  const [saleText, setSaleText] = useState("");
  const [quantity, setQuantity] = useState("");
  const [tag, setTag] = useState(null);

  

  const personOptions = [
    { label: "Single", value: "single" },
    { label: "Duo", value: "duo" },
  ];


  return (
    <View style={styles.container}>
      <View style={styles.fieldContainer}>
        <Dropdown style={styles.dropdown}
        containerStyle={styles.dropdownContainer} 
        placeholder="Select Person's" placeholderStyle={styles.placeholderStyle}
        data={personOptions}
        labelField="label"
        valueField="value"
        value={person}
        onChange={(item) => setPerson(item.value)}/>
        <View style={styles.separator} />
      </View>

   
      {person === "duo" && (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>ID</Text>
          <TextInput
            style={styles.underlineInput}
            placeholder="Enter ID"
            value={idValue}
            onChangeText={setIdValue}
          />
        </View>
      )}

    
      <View style={styles.fieldContainer}>
        <Dropdown style={styles.dropdown}
        containerStyle={styles.dropdownContainer}
        placeholder="Select Medicine" placeholderStyle={styles.placeholderStyle}
        data={medicines}
        labelField="label"
        valueField="value"
        value={medicine}
        onChange={(item) => setMedicine(item.value)}/>
        <View style={styles.separator} />
      </View>




      <View style={styles.fieldContainer}>
        <Dropdown
        style={styles.dropdown}
        containerStyle={styles.dropdownContainer}
        placeholder="Select Material"
        placeholderStyle={styles.placeholderStyle}
        data={materials}
        labelField="label"
        valueField="value"
        value={material}
        onChange={(item) => setMaterial(item.value)}/>
        <View style={styles.separator} />
      </View>
      
       {material === "sale" && (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Sale Detail</Text>
        <TextInput
        style={styles.underlineInput}
        placeholder="Enter Sale Price"
        value={saleText}
        keyboardType="numeric"
        onChangeText={setSaleText}/>
      </View>
       )}

  
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Quantity</Text>
        <TextInput
          style={styles.underlineInput}
          placeholder="0"
          value={quantity}
          keyboardType="numeric"
          onChangeText={setQuantity}
        />
      </View>


      <View style={styles.fieldContainer}>
        <Dropdown style={styles.dropdown}
        containerStyle={styles.dropdownContainer} 
        placeholder="Tag's" placeholderStyle={styles.placeholderStyle}
        data={tags}
        labelField="label"
        valueField="value"
        value={tag}
        onChange={(item) => setTag(item.value)}/>
        <View style={styles.separator} />
      </View>
      
    </View>
  );
};

export default SampleDistributionForm;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginHorizontal:10,
    backgroundColor: Colors.primaryBackground,
    borderRadius: 10,
  },
  dropdown: {
    height: 50,
    borderColor: Colors.bordergrey,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.white,
  },
  dropdownContainer: {
    borderRadius: 8, 
    borderWidth: 1,
    borderColor: Colors.bordergrey,
    backgroundColor: Colors.white,
  },
  placeholderStyle: {
    color: Colors.textgrey,   
    fontSize: 14,
  },
 
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    color: Colors.primary,
    marginBottom: 4,
    fontWeight: "600",
  },
  underlineInput: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.black,
    fontSize: 16,
    paddingVertical: 6,
    color: Colors.black,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.black,
    marginTop: 4,
  },
 
 
});
