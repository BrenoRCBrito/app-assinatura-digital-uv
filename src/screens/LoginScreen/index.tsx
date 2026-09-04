import React from "react";
import {View , Text } from "react-native";
import {styles} from "./styles" ;
import { PrimaryButton } from "../../components/PrimaryButton";

interface LoginScreenProps{
    hasHardware : boolean;
    onLogin : () => void;
}

export function LoginScreen({ hasHardware , onLogin}: LoginScreenProps){
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Bem Vindo Assine Aqui</Text>

            <Text style={styles.subtitle}>
                {hasHardware
                    ? 'Toque abaixo para entrar com biometria'
                    : 'Seu dispositivo não possui suporte a biometria'}
            </Text>

            <PrimaryButton
                label="Entrar com Biometria"
                onPress={onLogin}
                disabled={!hasHardware}
            />
        </View>
    )
}