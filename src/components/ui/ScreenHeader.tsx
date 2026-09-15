/**
 * Screen header: large title for tab roots, back button for stack screens.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { haptics } from '../../utils/haptics';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Adds top safe-area padding. */
  withInset?: boolean;
}

export function ScreenHeader({ title, subtitle, onBack, right, style, withInset = false }: ScreenHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: withInset ? insets.top + theme.spacing.sm : 0,
          paddingBottom: theme.spacing.md,
          gap: theme.spacing.md,
        },
        style,
      ]}
    >
      {onBack ? (
        <Pressable
          onPress={() => {
            haptics.light();
            onBack();
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: pressed ? theme.colors.chipTint : theme.colors.cardAlt,
              borderRadius: theme.radius.md,
            },
          ]}
        >
          <Icon name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
      ) : null}

      <View style={{ flex: 1 }}>
        <AppText variant="heading" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" tone="muted" style={{ marginTop: 2 }} numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {right}
    </View>
  );
}

/** Stack screen header that walks back with the router. */
export function StackHeader({
  title,
  subtitle,
  right,
  fallbackRoute = '/(tabs)',
}: Omit<ScreenHeaderProps, 'onBack'> & { fallbackRoute?: string }) {
  return (
    <ScreenHeader
      title={title}
      subtitle={subtitle}
      right={right}
      onBack={() => {
        if (router.canGoBack()) router.back();
        else router.replace(fallbackRoute as never);
      }}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ScreenHeader;
