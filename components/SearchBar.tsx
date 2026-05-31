// components/SearchBar.tsx – Search input with filter button

import React, { useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../constants/theme';

interface SearchBarProps {
  value: string;
  onChange: (text: string) => void;
  onFilterPress: () => void;
  activeFilterCount: number;
}

export default function SearchBar({
  value,
  onChange,
  onFilterPress,
  activeFilterCount,
}: SearchBarProps) {
  const inputRef = useRef<TextInput>(null);

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      {/* Search input */}
      <View style={styles.inputWrapper}>
        <Ionicons
          name="search"
          size={16}
          color={value.length > 0 ? Colors.orange : Colors.textTertiary}
          style={styles.searchIcon}
        />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Search deals…"
          placeholderTextColor={Colors.textTertiary}
          value={value}
          onChangeText={onChange}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel="Search deals"
          clearButtonMode="never"
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter button */}
      <TouchableOpacity
        style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
        onPress={onFilterPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Filter deals. ${activeFilterCount > 0 ? `${activeFilterCount} active` : 'No filters'}`}
      >
        <Ionicons
          name="options-outline"
          size={18}
          color={activeFilterCount > 0 ? Colors.white : Colors.textPrimary}
        />
        {activeFilterCount > 0 && (
          <Text style={styles.filterCount}>{activeFilterCount}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightBg,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 40,
    marginRight: Spacing.sm,
  },
  searchIcon: {
    flexShrink: 0,
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    height: 40,
    ...Platform.select({
      ios: { paddingVertical: 0 },
    }),
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.lightBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  filterButtonActive: {
    backgroundColor: Colors.orange,
  },
  filterCount: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginLeft: 3,
  },
});
