/// <reference types="node" />
jest.mock('expo-crypto', () => ({
  ...jest.requireActual('expo-crypto'),
  randomUUID: () => require('node:crypto').randomUUID(),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
// Explícito para que import e jest.requireMock devolvam a mesma instância do mock de __mocks__/expo-sqlite.ts.
jest.mock('expo-sqlite');
