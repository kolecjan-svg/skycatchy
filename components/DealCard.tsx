// components/DealCard.tsx – Deal card display component

import React, { memo, useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '../constants/theme';
import { formatPublishDate, truncateDescription } from '../lib/formatters';
import { decodeHtmlEntities } from '../lib/htmlUtils';
import type { DealDisplay } from '../types';

interface DealCardProps {
  deal: DealDisplay;
  isFavorite: boolean;
  onToggleFavorite: (dealId: string) => void;
}

const DealCard = memo(function DealCard({
  deal,
  isFavorite,
  onToggleFavorite,
}: DealCardProps) {
  const [imageError, setImageError] = useState(false);

  const handlePress = useCallback(() => {
    const url = deal.link ?? '';
    if (!url.startsWith('http://') && !url.startsWith('https://')) return;
    Linking.openURL(url).catch(() => {});
  }, [deal.link]);

  const handleFavoritePress = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onToggleFavorite(deal.id);
    },
    [deal.id, onToggleFavorite]
  );

  const title = decodeHtmlEntities(deal.name);
  const preview = truncateDescription(decodeHtmlEntities(deal.description), 3);
  const timeAgo = formatPublishDate(deal.publish_date);
  const hasImage = !!deal.image && !imageError;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.92}
      accessibilityRole="link"
      accessibilityLabel={`${title}. Source: ${deal.source}. ${timeAgo}. Tap to open deal.`}
    >
      {/* Hero image */}
      <View style={styles.imageContainer}>
        {hasImage ? (
          <ImageBackground
            source={{ uri: deal.image! }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
            accessibilityIgnoresInvertColors
          >
            {/* Gradient overlay for heart button contrast */}
            <LinearGradient
              colors={['rgba(0,0,0,0.32)', 'transparent', 'transparent']}
              start={{ x: 0, y: 1 }}
              end={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          </ImageBackground>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="airplane" size={32} color={Colors.textTertiary} />
          </View>
        )}

        {/* Favorite button */}
        <TouchableOpacity
          style={styles.heartButton}
          onPress={handleFavoritePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
          accessibilityState={{ selected: isFavorite }}
        >
          <View style={[styles.heartBg, isFavorite && styles.heartBgActive]}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavorite ? Colors.heartActive : Colors.white}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        {preview ? (
          <Text style={styles.preview} numberOfLines={3}>
            {preview}
          </Text>
        ) : null}

        {/* Meta row */}
        <View style={styles.meta}>
          <View style={styles.sourceChip}>
            <Text style={styles.sourceText} numberOfLines={1}>
              {deal.source}
            </Text>
          </View>
          {timeAgo ? <Text style={styles.time}>{timeAgo}</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default DealCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.card,
  },
  imageContainer: {
    position: 'relative',
    height: 180,
    backgroundColor: Colors.lightBg,
  },
  image: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.lightBg,
  },
  heartButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
  heartBg: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartBgActive: {
    backgroundColor: 'rgba(255,255,255,0.90)',
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    lineHeight: 23,
    marginBottom: Spacing.xs,
  },
  preview: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  sourceChip: {
    backgroundColor: 'rgba(255, 122, 0, 0.09)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    maxWidth: '65%',
  },
  sourceText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.orange,
    letterSpacing: 0.2,
  },
  time: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
});
