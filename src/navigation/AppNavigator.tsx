import React, { use } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { RootStackParamList } from "../types/types";
import { useBiometrics } from "../hooks/useBiometrics";
import { LoginScreen } from "../screens/LoginScreen";
import { HomeScreen } from "../screens/HomeScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator(){
    const {hasHardware , isAuthenticated , authenticate , logout} = useBiometrics();

    return (
        <NavigationContainer>
            <Stack.Navigator>
                {isAuthenticated ? (
                    <Stack.Screen name="Home">
                        {() => <HomeScreen onLogout={logout}/>}
                    </Stack.Screen>
                ) : (
                    <Stack.Screen name="Login">
                        {() => <LoginScreen hasHardware={hasHardware} onLogin={authenticate} />}
                    </Stack.Screen>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    )
}
