import React from "react";
import {View , Text , TouchableOpacity} from "react-native";
import {styles} from "./styles" ;

interface LoginScreenProps{
    hasHardware : boolean;
    onLogin : () => void;
}

export function LoginScreen({ hasHardware , onLogin}: LoginScreenProps){
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Bem Vindo</Text>

            <Text style={styles.subtitle}>
                ? 'Toque abaixo para entrar com biometria'
                : 'Seu dispositivo não possui suporte a biometria'
            </Text>

            <TouchableOpacity
                style={[styles.button , !hasHardware && styles.buttonDisabled]}
                onPress={onLogin}
                disabled={!hasHardware}
            >
                <Text style={styles.buttonText}>Entrar com Biometria</Text>
            </TouchableOpacity>
        </View>
    )
}