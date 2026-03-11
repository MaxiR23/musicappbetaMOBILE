module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^expo-constants$': '<rootDir>/test/__mocks__/expo-constants.ts',
    '^react-native-get-random-values$': '<rootDir>/test/__mocks__/empty.ts',
    '^react-native-url-polyfill/auto$': '<rootDir>/test/__mocks__/empty.ts',
    '^react-native$': '<rootDir>/test/__mocks__/empty.ts',
    '^react-native-track-player$': '<rootDir>/test/__mocks__/react-native-track-player.ts',
    '^../lib/supabase$': '<rootDir>/test/__mocks__/supabase.ts',
    '^@react-native-async-storage/async-storage$': '<rootDir>/test/__mocks__/empty.ts',
  },
  testMatch: [
    '<rootDir>/test/**/*.test.{ts,tsx,js,jsx}',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
  },
};