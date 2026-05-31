// components/EmptyState.tsx – Empty and error state displays

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';

interface EmptyStateProps {
  type: 'empty' | 'error' | 'favorites';
  onAction?: () => void;
  actionLabel?: string;
  message?: string;
}

const CONFIG = {
  empty: {
    icon: 'search-outline' as const,
    title: 'No deals found',
    defaultMessage: 'Try adjusting your search or filters.',
    defaultAction: 'Reset filters',
  },
  error: {
    icon: 'wifi-outline' as const,
    title: 'Could not load deals',
    defaultMessage: 'Check your connection and try again.',
    defaultAction: 'Retry',
  },
  favorites: {
    icon: 'heart-outline' as const,
    title: 'No saved deals yet',
    defaultMessage: 'Tap the heart on any deal to save it here.',
    defaultAction: 'Browse deals',
  },
};

export default function EmptyState({
  type,
  onAction,
  actionLabel,
  message,
}: EmptyStateProps) {
  const cfg = CONFIG[type];

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={cfg.icon} size={32} color={Colors.orange} />
      </View>
      <Text style={styles.title}>{cfg.title}</Text>
      <Text style={styles.message}>{message ?? cfg.defaultMessage}</Text>
      {onAction ? (
        <TouchableOpacity
          style={styles.button}
          onPress={onAction}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel ?? cfg.defaultAction}
        >
          <Text style={styles.buttonText}>{actionLabel ?? cfg.defaultAction}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.xxxl * 2,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: BorderRadius.full,
    // rgba instead of hex+alpha (cross-platform safe)
    backgroundColor: 'rgba(255, 122, 0, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  button: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.orange,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    minWidth: 140,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
});
