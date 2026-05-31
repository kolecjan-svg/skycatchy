// app/_layout.tsx – Root layout with providers

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { queryClient } from '../lib/queryClient';
import { favoritesStore } from '../lib/favoritesStore';

export default function RootLayout() {
  // Initialize the shared favorites store once at app startup.
  // Bug #4 fix: this loads AsyncStorage into the single module-level store so
  // all screens (Home, Saved, tab badge) share the same state.
  useEffect(() => {
    favoritesStore.init();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </QueryClientProvider>
  );
}
