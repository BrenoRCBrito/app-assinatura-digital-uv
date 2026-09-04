import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    base:{
        alignItems: 'center',
    },
    primary: {
        backgroundColor: '#007AFF',
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 8,
        width: '100%',
    },
    primaryDisabled: {
        backgroundColor: '#A0C4FF'
    },

    danger: {
        backgroundColor: '#d32f2f',
        paddingVertical: 10,
        paddingHorizontal:20,
        borderRadius: 6,
    },

    text: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
})