// app/(tabs)/index.tsx – Home screen: Deals Feed

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDeals } from '../../hooks/useDeals';
import { useSources } from '../../hooks/useSources';
import { useFavorites } from '../../hooks/useFavorites';
import SearchBar from '../../components/SearchBar';
import DealList from '../../components/DealList';
import FilterModal from '../../components/FilterModal';
import { Colors } from '../../constants/theme';
import { applyFilters, toggleGroupSources } from '../../lib/searchUtils';
import type { Source, SourceGroup } from '../../types';

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());

  // Bug #2 fix: track whether user has explicitly interacted with filters.
  // If not, auto-select all sources on first load so the modal shows all checked.
  const filtersInitialized = useRef(false);

  const { deals, isLoading, isError, hasNextPage, isFetchingNextPage, isRefetching, fetchNextPage, refetch } = useDeals();
  const { favorites, toggle: toggleFavorite } = useFavorites();

  const dealSourceNames = useMemo(() => [...new Set(deals.map((d) => d.source))], [deals]);
  const { data: sourceGroups = [] } = useSources(dealSourceNames);
  const allSourceNames = useMemo(
    () => sourceGroups.flatMap((g: SourceGroup) => g.sources.map((s: Source) => s.name)),
    [sourceGroups]
  );

  // Bug #2 fix: once sources are loaded for the first time, initialize selection to all.
  useEffect(() => {
    if (!filtersInitialized.current && allSourceNames.length > 0) {
      filtersInitialized.current = true;
      setSelectedSources(new Set(allSourceNames));
    }
  }, [allSourceNames]);

  const filteredDeals = useMemo(
    () => applyFilters(deals, searchQuery, selectedSources),
    [deals, searchQuery, selectedSources]
  );

  const handleToggleSource = useCallback((sourceName: string) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      next.has(sourceName) ? next.delete(sourceName) : next.add(sourceName);
      return next;
    });
  }, []);

  const handleToggleGroup = useCallback((group: SourceGroup) => {
    setSelectedSources((prev) => toggleGroupSources(group, prev));
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedSources((prev) => {
      const allSelected = allSourceNames.every((n: string) => prev.has(n));
      return allSelected ? new Set<string>() : new Set(allSourceNames);
    });
  }, [allSourceNames]);

  const handleClearAll = useCallback(() => {
    setSelectedSources(new Set());
  }, []);

  const handleResetFilters = useCallback(() => {
    // Reset to all-selected (matches the default state on first launch)
    setSelectedSources(new Set(allSourceNames));
    setSearchQuery('');
  }, [allSourceNames]);

  const activeFilterCount = selectedSources.size;
  const isEmpty = !isLoading && !isError && filteredDeals.length === 0;

  return (
    <SafeAreaView style={styles.safe}>
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        onFilterPress={() => setFilterVisible(true)}
        activeFilterCount={activeFilterCount}
      />
      <DealList
        deals={filteredDeals}
        isLoading={isLoading}
        isError={isError}
        hasNextPage={hasNextPage ?? false}
        isFetchingNextPage={isFetchingNextPage}
        isRefreshing={isRefetching}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        onFetchNextPage={fetchNextPage}
        onRefresh={() => refetch()}
        onRetry={() => refetch()}
        onResetFilters={handleResetFilters}
        isEmpty={isEmpty}
      />
      <FilterModal
        visible={filterVisible}
        sourceGroups={sourceGroups}
        selectedSources={selectedSources}
        onToggleSource={handleToggleSource}
        onToggleGroup={handleToggleGroup}
        onSelectAll={handleSelectAll}
        onClearAll={handleClearAll}
        onClose={() => setFilterVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.lightBg },
});
