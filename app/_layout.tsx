/**
 * Root layout.
 *
 * Wires the theme (dark by default), toast host, gesture root and the
 * auth-aware redirect between the (auth) and (tabs) groups.
 */
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme, useT } from '../src/hooks/useTheme';
import { useBootstrap } from '../src/hooks/useStorage';
import { useAuthStore } from '../src/store/authStore';
import { ToastProvider } from '../src/components/ui/Toast';
import { AppText } from '../src/components/ui/AppText';
import { Icon } from '../src/components/ui/Icon';
import { APP_NAME } from '../src/utils/constants';
import { installHistoryFallback } from '../src/utils/webHistory';

// Must run before the router mounts: in a sandboxed preview frame the browser
// rejects history updates, which would otherwise break every navigation.
installHistoryFallback();

export default function RootLayout() {
  const theme = useTheme();
  const t = useT();
  const { ready } = useBootstrap();
  const user = useAuthStore((state) => state.user);
  const segments = useSegments();

  /* Auth gate: keep the user inside the right group. */
  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [ready, segments, user]);

  if (!ready) {
    return (
      <View style={[styles.splash, { backgroundColor: theme.colors.background }]}>
        <View
          style={[
            styles.logo,
            { backgroundColor: theme.colors.accentSoft, borderRadius: theme.radius.lg },
          ]}
        >
          <Icon name="shield-checkmark-outline" size={34} color={theme.colors.primary} />
        </View>
        <AppText variant="heading" style={{ marginTop: theme.spacing.lg }}>
          {APP_NAME}
        </AppText>
        <AppText variant="small" tone="muted" style={{ marginTop: 4 }}>
          {t('app.tagline')}
        </AppText>
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: theme.spacing.xl }} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ToastProvider>
          <StatusBar style={theme.dark ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="transaction/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="transaction/[id]" />
            <Stack.Screen name="wallet/[id]" />
            <Stack.Screen name="savings/[id]" />
            <Stack.Screen name="budget/index" />
            <Stack.Screen name="+not-found" options={{ presentation: 'modal' }} />
          </Stack>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
