// app/(tabs)/favorites.tsx – Favorites screen

import React, { useMemo } from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useDeals } from '../../hooks/useDeals';
import { useFavorites } from '../../hooks/useFavorites';
import DealList from '../../components/DealList';
import EmptyState from '../../components/EmptyState';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../constants/theme';

export default function FavoritesScreen() {
  const router = useRouter();
  const { deals, isLoading, isError, refetch } = useDeals();
  const { favorites, toggle: toggleFavorite, isLoaded } = useFavorites();

  const favoritedDeals = useMemo(
    () => deals.filter((d) => favorites.has(d.id)),
    [deals, favorites]
  );

  // Only show empty state once favorites storage has loaded AND deals have loaded
  const isEmpty = !isLoading && isLoaded && favoritedDeals.length === 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Saved Deals</Text>
        {favorites.size > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{favorites.size}</Text>
          </View>
        )}
      </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    flex: 1,
  },
  countBadge: {
    backgroundColor: Colors.orange,
    borderRadius: BorderRadius.full,
    minWidth: 26,
    height: 26,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
});
