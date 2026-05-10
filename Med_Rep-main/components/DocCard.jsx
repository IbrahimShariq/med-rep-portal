import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import Feather from '@expo/vector-icons/Feather';
import Colors from "../utils/Colors";

const DocCard = ({ avatar,name,type,nmc,variant = "black",date,shift,onEdit,onPress}) => {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Image
        source={
          variant === "green"
            ? require("../assets/images/green avatar.png") 
            : avatar
            ? { uri: avatar }
            : require("../assets/images/avatar.png")
        }
        style={styles.avatar}
      />


      <View style={styles.textWrapper}>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.row}>
          <Text style={styles.type}>{type}</Text>
          <Text style={styles.nmc}>NMC no: {nmc}</Text>
        </View>

    
        {variant === "green" && (
          <View style={styles.extraRow}>
            {date && <Text style={styles.badge}>{date}</Text>}
            {shift && <Text style={styles.badge}>{shift}</Text>}
          </View>
        )}
      </View>

     
      {variant === "green" && onEdit && (
        <TouchableOpacity onPress={onEdit} style={styles.editIcon}>
          <Feather name="edit" size={20} color="black" />
        </TouchableOpacity> )}
    </Container>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.white,
    marginBottom: 10,
    position: "relative",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 24,
    marginRight: 12,
  },
  textWrapper: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.black,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  type: {
    fontSize: 14,
    color: Colors.textgrey,
  },
  nmc: {
    fontSize: 12,
    color: Colors.textgrey,
    marginTop: 3,
  },
  extraRow: {
    flexDirection: "row",
    marginTop: 6,
    marginLeft: -2,
  },
  badge: {
    backgroundColor: "#eaf2ef",
    color: Colors.textgrey,
    fontSize: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginRight: 8,
    fontStyle: "italic",
  },
});

export default DocCard;
