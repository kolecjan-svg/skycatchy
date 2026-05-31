// components/FilterModal.tsx – Source filter with collapsible groups + tri-state + clear

import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  StyleSheet, Platform, LayoutAnimation, UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '../constants/theme';
import { getGroupSelectionState } from '../lib/searchUtils';
import { isCollapsed, toggleCollapsed } from '../lib/uiUtils';
import type { SourceGroup } from '../types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FilterModalProps {
  visible: boolean;
  sourceGroups: SourceGroup[];
  selectedSources: Set<string>;
  onToggleSource: (sourceName: string) => void;
  onToggleGroup: (group: SourceGroup) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onClose: () => void;
}

function Checkbox({ checked, partial }: { checked: boolean; partial?: boolean }) {
  return (
    <View style={[styles.checkbox, (checked || partial) && styles.checkboxChecked]}>
      {checked && !partial && <Ionicons name="checkmark" size={12} color={Colors.white} />}
      {partial && <View style={styles.partialDash} />}
    </View>
  );
}

function CollapsibleGroup({
  group, selectedSources, collapsed,
  onToggleSource, onToggleGroup, onToggleCollapse,
}: {
  group: SourceGroup;
  selectedSources: Set<string>;
  collapsed: boolean;
  onToggleSource: (n: string) => void;
  onToggleGroup: (g: SourceGroup) => void;
  onToggleCollapse: (cat: string) => void;
}) {
  const state = getGroupSelectionState(group, selectedSources);
  const count = group.sources.filter((s) => selectedSources.has(s.name)).length;

  const handleCollapse = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggleCollapse(group.category);
  }, [group.category, onToggleCollapse]);

  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <TouchableOpacity
          style={styles.groupCheckRow}
          onPress={() => onToggleGroup(group)}
          activeOpacity={0.7}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: state === 'all' }}
          accessibilityLabel={`${group.label}${count > 0 ? `, ${count} selected` : ''}`}
        >
          <Checkbox checked={state === 'all'} partial={state === 'partial'} />
          <Text style={styles.groupLabel}>
            {group.label}{count > 0 ? ` (${count})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleCollapse}
          hitSlop={{ top: 10, bottom: 10, left: 14, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={collapsed ? `Expand ${group.label}` : `Collapse ${group.label}`}
        >
          <Ionicons
            name={collapsed ? 'chevron-down' : 'chevron-up'}
            size={16}
            color={Colors.textTertiary}
          />
        </TouchableOpacity>
      </View>

      {!collapsed && group.sources.map((source) => (
        <TouchableOpacity
          key={source.id}
          style={styles.sourceRow}
          onPress={() => onToggleSource(source.name)}
          activeOpacity={0.7}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selectedSources.has(source.name) }}
          accessibilityLabel={source.name}
        >
          <Checkbox checked={selectedSources.has(source.name)} />
          <Text style={styles.sourceName} numberOfLines={1}>{source.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function FilterModal({
  visible, sourceGroups, selectedSources,
  onToggleSource, onToggleGroup, onSelectAll, onClearAll, onClose,
}: FilterModalProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const handleToggleCollapse = useCallback((cat: string) => {
    setCollapsedGroups((prev) => toggleCollapsed(prev, cat));
  }, []);

  const allSourceNames = useMemo(
    () => sourceGroups.flatMap((g) => g.sources.map((s) => s.name)),
    [sourceGroups]
  );
  const allSelected = allSourceNames.length > 0 && allSourceNames.every((n) => selectedSources.has(n));
  const activeCount = selectedSources.size;
  const totalSources = allSourceNames.length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Filter by source</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close filter"
          >
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* All sources toggle */}
        <View style={styles.allRow}>
          <TouchableOpacity
            style={styles.allSourcesRow}
            onPress={onSelectAll}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: allSelected }}
            accessibilityLabel="All sources"
          >
            <Checkbox checked={allSelected} />
            <Text style={styles.allSourcesText}>All sources</Text>
            <Text style={styles.totalCount}>{totalSources} sources</Text>
          </TouchableOpacity>
        </View>

        {/* No sources warning */}
        {activeCount > 0 && activeCount === totalSources && (
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.textTertiary} />
            <Text style={styles.infoText}>Showing all {totalSources} sources</Text>
          </View>
        )}

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {sourceGroups.map((group) => (
            <CollapsibleGroup
              key={group.category}
              group={group}
              selectedSources={selectedSources}
              collapsed={isCollapsed(collapsedGroups, group.category)}
              onToggleSource={onToggleSource}
              onToggleGroup={onToggleGroup}
              onToggleCollapse={handleToggleCollapse}
            />
          ))}
          <View style={{ height: Spacing.xxxl }} />
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {activeCount > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={onClearAll}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Clear all source filters"
            >
              <Text style={styles.clearText}>Clear all</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.applyButton, activeCount > 0 && styles.applyButtonActive]}
            onPress={onClose}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Apply${activeCount > 0 ? ` (${activeCount} selected)` : ''}`}
          >
            <Text style={styles.applyText}>
              {activeCount > 0 ? `Show results (${activeCount})` : 'Apply'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.modalBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.lightBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allRow: {
    backgroundColor: Colors.white,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    ...Shadows.card,
  },
  allSourcesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  allSourcesText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    flex: 1,
    marginLeft: Spacing.md,
  },
  totalCount: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  infoText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginLeft: 4,
  },
  scroll: {
    flex: 1,
    marginTop: Spacing.md,
  },
  group: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    ...Shadows.card,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  groupCheckRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flex: 1,
    marginLeft: Spacing.md,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.orange,
    borderColor: Colors.orange,
  },
  partialDash: {
    width: 10,
    height: 2,
    backgroundColor: Colors.white,
    borderRadius: 1,
  },
  sourceName: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginLeft: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.xl,
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  clearButton: {
    flex: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  clearText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  applyButton: {
    flex: 2,
    backgroundColor: Colors.lightBg,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  applyButtonActive: {
    backgroundColor: Colors.orange,
  },
  applyText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
});
