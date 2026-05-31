// app/(tabs)/settings.tsx – Settings screen

import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  Shadows,
} from '../../constants/theme';
import Constants from 'expo-constants';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const SUPPORT_EMAIL = 'info@skycatchy.com';

interface SettingsRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  badge?: string;
  isFirst?: boolean;
  isLast?: boolean;
}

function SettingsRow({
  icon,
  label,
  onPress,
  disabled = false,
  badge,
  isFirst = false,
  isLast = false,
}: SettingsRowProps) {
  return (
    <TouchableOpacity
      style={[
        styles.row,
        isFirst && styles.rowFirst,
        isLast && styles.rowLast,
        disabled && styles.rowDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || !onPress }}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={disabled ? Colors.textTertiary : Colors.orange} />
      </View>
      <Text style={[styles.rowLabel, disabled && styles.rowLabelDisabled]}>
        {label}
      </Text>
      <View style={styles.rowRight}>
        {badge ? (
          <Text style={styles.badge}>{badge}</Text>
        ) : onPress && !disabled ? (
          <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
        ) : disabled ? (
          <Text style={styles.comingSoon}>Soon</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function SettingsScreen() {
  const handleContactSupport = () => {
    const subject = encodeURIComponent('SkyCatchy Support');
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <SectionHeader title="Account" />
        <View style={styles.section}>
          <SettingsRow
            icon="person-outline"
            label="Log in / Sign up"
            disabled
            isFirst
          />
          <SettingsRow
            icon="log-out-outline"
            label="Log out"
            disabled
            isLast
          />
        </View>

        {/* Preferences */}
        <SectionHeader title="Preferences" />
        <View style={styles.section}>
          <SettingsRow
            icon="notifications-outline"
            label="Notifications"
            disabled
            isFirst
          />
          <SettingsRow
            icon="language-outline"
            label="Language"
            disabled
            isLast
          />
        </View>

        {/* Support */}
        <SectionHeader title="Support" />
        <View style={styles.section}>
          <SettingsRow
            icon="mail-outline"
            label="Contact Support"
            onPress={handleContactSupport}
            isFirst
            isLast
          />
        </View>

        {/* Legal */}
        <SectionHeader title="Legal" />
        <View style={styles.section}>
          <SettingsRow
            icon="document-text-outline"
            label="Terms of Service"
            disabled
            isFirst
          />
          <SettingsRow
            icon="shield-outline"
            label="Privacy Policy"
            disabled
            isLast
          />
        </View>

        {/* App Info */}
        <SectionHeader title="About" />
        <View style={styles.section}>
          <SettingsRow
            icon="information-circle-outline"
            label="App version"
            badge={APP_VERSION}
            isFirst
          />
          <SettingsRow
            icon="airplane-outline"
            label="About SkyCatchy"
            disabled
            isLast
          />
        </View>

        <Text style={styles.footer}>
          SkyCatchy · Find the best flight deals
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.lightBg,
  },
  header: {
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
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.xxxl * 2,
  },
  sectionHeader: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  section: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    minHeight: 52,
  },
  rowFirst: {
    borderTopWidth: 0,
  },
  rowLast: {},
  rowDisabled: {
    opacity: 0.6,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255, 122, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  rowLabel: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
  },
  rowLabelDisabled: {
    color: Colors.textSecondary,
  },
  rowRight: {
    marginLeft: Spacing.sm,
  },
  badge: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  comingSoon: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    backgroundColor: Colors.lightBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  footer: {
    textAlign: 'center',
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.xxxl,
    paddingBottom: Spacing.lg,
  },
});
