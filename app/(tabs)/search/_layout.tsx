import { Stack } from 'expo-router';

export default function SearchStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0e0e0e' },
        animation: 'fade',
      }}
    />
  );
}