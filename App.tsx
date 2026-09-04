import React  from 'react';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';

import { AppNavigator } from './src/navigation/AppNavigator';
import { initDatabase } from './src/services/database';

export default function App() {

  return (
      <SQLiteProvider databaseName="assina_aqui.db" onInit={initDatabase}>
        <StatusBar style="auto" />
        <AppNavigator />
      </SQLiteProvider>
  );
}


