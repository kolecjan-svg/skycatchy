// app/(tabs)/_layout.tsx – Tab navigation configuration

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, View, Text } from 'react-native';
import { Colors, FontSize } from '../../constants/theme';
import { useFavorites } from '../../hooks/useFavorites';

function TabIcon({
  name,
  focused,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  focused: boolean;
}) {
  return (
    <Ionicons
      name={name}
      size={24}
      color={focused ? Colors.tabActive : Colors.tabInactive}
    />
  );
}

function FavoritesIcon({ focused }: { focused: boolean }) {
  const { favorites } = useFavorites();
  const count = favorites.size;

  return (
    <View>
      <TabIcon name={focused ? 'heart' : 'heart-outline'} focused={focused} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Saved',
          tabBarIcon: ({ focused }) => <FavoritesIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'settings' : 'settings-outline'} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopColor: '#E5E5EA',
    borderTopWidth: StyleSheet.hairlineWidth,
    height: Platform.OS === 'ios' ? 82 : 62,
    paddingBottom: Platform.OS === 'ios' ? 26 : 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  tabItem: {
    flex: 1,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -6,
    backgroundColor: Colors.orange,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },
});
