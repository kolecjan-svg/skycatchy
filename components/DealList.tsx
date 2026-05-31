// components/DealList.tsx – Scrollable deal list with infinite scroll and animated FAB

import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  FlatList,
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ListRenderItemInfo,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DealCard from './DealCard';
import SkeletonCard from './SkeletonCard';
import EmptyState from './EmptyState';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import type { DealDisplay } from '../types';

interface DealListProps {
  deals: DealDisplay[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isRefreshing: boolean;
  favorites: Set<string>;
  onToggleFavorite: (dealId: string) => void;
  onFetchNextPage: () => void;
  onRefresh: () => void;
  onRetry: () => void;
  onResetFilters?: () => void;
  isEmpty?: boolean;
}

const SKELETON_COUNT = 5;
const SKELETONS = Array.from({ length: SKELETON_COUNT }, (_, i) => ({ id: `skeleton-${i}`, delay: i * 100 }));

export default function DealList({
  deals,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  isRefreshing,
  favorites,
  onToggleFavorite,
  onFetchNextPage,
  onRefresh,
  onRetry,
  onResetFilters,
  isEmpty = false,
}: DealListProps) {
  const listRef = useRef<FlatList>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;

  // Animate FAB in/out
  useEffect(() => {
    Animated.spring(fabAnim, {
      toValue: showScrollTop ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();
  }, [showScrollTop, fabAnim]);

  const handleScroll = useCallback(
    ({ nativeEvent }: { nativeEvent: { contentOffset: { y: number } } }) => {
      setShowScrollTop(nativeEvent.contentOffset.y > 400);
    },
    []
  );

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      onFetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, onFetchNextPage]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<DealDisplay>) => (
      <DealCard
        deal={item}
        isFavorite={favorites.has(item.id)}
        onToggleFavorite={onToggleFavorite}
      />
    ),
    [favorites, onToggleFavorite]
  );

  // Unique key combining id + index to handle edge case of DB returning same id twice
  const keyExtractor = useCallback(
    (item: DealDisplay, index: number) => `${item.id}_${index}`,
    []
  );

  const ListFooter = useCallback(() => {
    if (!isFetchingNextPage) return <View style={{ height: Spacing.xxxl }} />;
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={Colors.orange} size="small" />
      </View>
    );
  }, [isFetchingNextPage]);

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.flex}>
        {SKELETONS.map((s) => (
          <SkeletonCard key={s.id} delay={s.delay} />
        ))}
      </View>
    );
  }

  // Error state
  if (isError) {
    return <EmptyState type="error" onAction={onRetry} />;
  }

  // Empty state — guard with !isLoading to prevent flash on initial fetch
  if ((isEmpty || deals.length === 0) && !isLoading) {
    return (
      <EmptyState
        type="empty"
        onAction={onResetFilters}
        actionLabel="Reset filters"
      />
    );
  }

  const fabScale = fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const fabOpacity = fabAnim;

  return (
    <View style={styles.flex}>
      <FlatList
        ref={listRef}
        data={deals}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={ListFooter}
        onScroll={handleScroll}
        scrollEventThrottle={200}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.orange}
            colors={[Colors.orange]}
          />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        // removeClippedSubviews has known issues on iOS – Android only
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={6}
      />

      {/* Animated scroll-to-top FAB */}
      <Animated.View
        style={[
          styles.fab,
          { opacity: fabOpacity, transform: [{ scale: fabScale }] },
        ]}
        pointerEvents={showScrollTop ? 'auto' : 'none'}
      >
        <TouchableOpacity
          onPress={scrollToTop}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Scroll to top"
          style={styles.fabTouchable}
        >
          <Ionicons name="chevron-up" size={22} color={Colors.white} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  list: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  footer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    bottom: Spacing.xxl,
    zIndex: 999,
    ...Shadows.card,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  fabTouchable: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
