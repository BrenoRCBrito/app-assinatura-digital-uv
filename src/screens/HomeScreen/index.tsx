import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from "./styles" ;

interface HomeScreenProps{
    onLogout : () => void;
}

export function HomeScreen({onLogout} : HomeScreenProps){
    return(
        <View style={styles.container}>
            <Text style={styles.title}>Área Segura</Text>

            <Text style={styles.subtitle}>Usuário logado com sucesso!</Text>

            <TouchableOpacity
                style={styles.logoutButton}
                onPress={onLogout}
            >
                <Text>Sair</Text>
            </TouchableOpacity>
        </View>

    );
}