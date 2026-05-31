// components/SkeletonCard.tsx – Loading skeleton for deal cards

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';

interface SkeletonBlockProps {
  width: number | string;
  height: number;
  style?: object;
  opacity: Animated.AnimatedInterpolation<string | number>;
}

function SkeletonBlock({ width, height, style, opacity }: SkeletonBlockProps) {
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: Colors.skeleton,
          borderRadius: BorderRadius.sm,
          opacity,
        },
        style,
      ]}
    />
  );
}

interface SkeletonCardProps {
  delay?: number;
}

export default function SkeletonCard({ delay = 0 }: SkeletonCardProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, delay]);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });

  return (
    <View style={styles.card} accessibilityLabel="Loading deal">
      <SkeletonBlock width="100%" height={180} opacity={opacity} style={{ borderRadius: 0 }} />
      <View style={styles.content}>
        <SkeletonBlock width="88%" height={18} opacity={opacity} />
        <SkeletonBlock width="65%" height={18} opacity={opacity} style={{ marginTop: 6 }} />
        <SkeletonBlock width="100%" height={13} opacity={opacity} style={{ marginTop: 12 }} />
        <SkeletonBlock width="92%" height={13} opacity={opacity} style={{ marginTop: 5 }} />
        <SkeletonBlock width="75%" height={13} opacity={opacity} style={{ marginTop: 5 }} />
        <View style={styles.meta}>
          <SkeletonBlock width={76} height={22} opacity={opacity} style={{ borderRadius: BorderRadius.sm }} />
          <SkeletonBlock width={48} height={12} opacity={opacity} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.card,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
});
