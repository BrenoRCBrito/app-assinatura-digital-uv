import React  from 'react';
import { StatusBar } from 'expo-status-bar';

import { useBiometrics } from './src/hooks/useBiometrics';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';

export default function App() {

  const {
        hasHardware,
        isAuthenticated,
        authenticate,
        logout,
  } = useBiometrics();

  return (
    <>
      <StatusBar style="auto" />

      {isAuthenticated ? (
        <HomeScreen onLogout={logout} />
      ):(
        <LoginScreen hasHardware={hasHardware} onLogin={authenticate}/>
      )}

    </>
    
  );
}


