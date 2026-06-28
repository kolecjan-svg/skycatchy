// app/(tabs)/favorites.tsx – Favorites screen
// Bug #5 fix: removed "Saved Deals (N)" header. Count is on the tab bar badge.

import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDeals } from '../../hooks/useDeals';
import { useFavorites } from '../../hooks/useFavorites';
import DealList from '../../components/DealList';
import EmptyState from '../../components/EmptyState';
import { Colors } from '../../constants/theme';

export default function FavoritesScreen() {
  const router = useRouter();
  const { deals, isLoading, isError, refetch } = useDeals();
  const { favorites, toggle: toggleFavorite, isLoaded } = useFavorites();

  const favoritedDeals = useMemo(
    () => deals.filter((d) => favorites.has(d.id)),
    [deals, favorites]
  );

  const isEmpty = !isLoading && isLoaded && favoritedDeals.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {isEmpty ? (
        <EmptyState
          type="favorites"
          onAction={() => router.push('/')}
          actionLabel="Browse deals"
        />
      ) : (
        <DealList
          deals={favoritedDeals}
          isLoading={isLoading && !isLoaded}
          isError={isError}
          hasNextPage={false}
          isFetchingNextPage={false}
          isRefreshing={false}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onFetchNextPage={() => {}}
          onRefresh={() => refetch()}
          onRetry={() => refetch()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.lightBg,
  },
});
