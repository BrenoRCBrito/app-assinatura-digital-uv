import React from "react";
import { Text, TouchableOpacity } from 'react-native';
import { styles } from './styles'


interface PrimaryButtonProps{
    label: string;
    onPress: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'danger';
}

export function PrimaryButton({
    label,
    onPress,
    disabled = false,
    variant = 'primary',

}: PrimaryButtonProps){
    const variantStyle = variant === 'danger' ? styles.danger : styles.primary;
    const isDisabledPrimary = disabled && variant === 'primary' 

    return(
        <TouchableOpacity
            style={[styles.base , variantStyle , isDisabledPrimary && styles.primaryDisabled]}
            onPress={onPress}
            disabled={disabled}
        >
            <Text style={styles.text}>{label}</Text>
        </TouchableOpacity>
    );
}

