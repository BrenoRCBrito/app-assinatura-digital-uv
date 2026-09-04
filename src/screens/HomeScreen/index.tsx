import React from 'react';
import { View, Text } from 'react-native';
import { styles } from "./styles";
import { PrimaryButton } from "../../components/PrimaryButton";

interface HomeScreenProps {
    onLogout: () => void;
}

export function HomeScreen({ onLogout }: HomeScreenProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Área Segura</Text>

            <Text style={styles.subtitle}>Usuário logado com sucesso!</Text>

            <PrimaryButton label="Sair" onPress={onLogout} variant="danger" />
        </View>
    );
}