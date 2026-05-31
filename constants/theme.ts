// constants/theme.ts – SkyCatchy design system

import { StyleSheet } from 'react-native';

export const Colors = {
  // Brand
  yellow: '#FFD60A',
  orange: '#FF7A00',

  // Backgrounds
  white: '#FFFFFF',
  lightBg: '#F2F2F7',
  cardBg: '#FFFFFF',
  modalBg: '#F2F2F7',

  // Text
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#8E8E93',
  textInverse: '#FFFFFF',

  // Borders
  border: '#E5E5EA',
  borderStrong: '#C7C7CC',

  // Semantic
  heartActive: '#FF3B30',
  heartInactive: '#C7C7CC',
  skeleton: '#E5E5EA',
  skeletonHighlight: '#F5F5F7',
  error: '#FF3B30',
  success: '#34C759',

  // Tab bar
  tabActive: '#FF7A00',
  tabInactive: '#8E8E93',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const FontSize = {
  xs: 11,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Shadow presets (iOS)
export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

export const PAGE_SIZE = 20;
