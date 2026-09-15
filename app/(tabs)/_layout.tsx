/**
 * Bottom tab navigation: Home · Transactions · Wallets · Savings · Reports · Settings.
 *
 * The bar uses a translucent indigo surface with a hairline top edge; the
 * active tab is marked by a small teal pill indicator plus colour, so state is
 * readable without relying on colour alone.
 */
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useTheme, useT } from '../../src/hooks/useTheme';
import { Icon, type IconName } from '../../src/components/ui/Icon';
import { haptics } from '../../src/utils/haptics';

interface TabDefinition {
  name: string;
  titleKey: 'nav.home' | 'nav.transactions' | 'nav.wallets' | 'nav.savings' | 'nav.reports' | 'nav.settings';
  icon: IconName;
  activeIcon: IconName;
}

const TABS: TabDefinition[] = [
  { name: 'index', titleKey: 'nav.home', icon: 'home-outline', activeIcon: 'home' },
  { name: 'transactions', titleKey: 'nav.transactions', icon: 'swap-horizontal-outline', activeIcon: 'swap-horizontal' },
  { name: 'wallets', titleKey: 'nav.wallets', icon: 'wallet-outline', activeIcon: 'wallet' },
  { name: 'savings', titleKey: 'nav.savings', icon: 'flag-outline', activeIcon: 'flag' },
  { name: 'reports', titleKey: 'nav.reports', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
  { name: 'settings', titleKey: 'nav.settings', icon: 'settings-outline', activeIcon: 'settings' },
];

export default function TabsLayout() {
  const theme = useTheme();
  const t = useT();
  const barHeight = Platform.OS === 'ios' ? 84 : 62;
  const bottomInset = Platform.OS === 'ios' ? 24 : 8;

  return (
    <Tabs
      screenListeners={{ tabPress: () => haptics.selection() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primaryBright,
        tabBarInactiveTintColor: theme.colors.textFaint,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: barHeight,
          paddingTop: 8,
          paddingBottom: bottomInset,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.2,
          marginTop: 1,
        },
        tabBarItemStyle: { paddingHorizontal: 2 },
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.titleKey),
            tabBarIcon: ({ focused, color, size }) => (
              <View style={styles.iconWrap}>
                <Icon name={focused ? tab.activeIcon : tab.icon} size={size ?? 21} color={color} />
                <View
                  style={[
                    styles.indicator,
                    {
                      backgroundColor: theme.colors.primary,
                      opacity: focused ? 1 : 0,
                    },
                  ]}
                />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    bottom: -7,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
