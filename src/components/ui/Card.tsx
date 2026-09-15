/**
 * Card — the surface primitive.
 *
 * Surfaces are **flat** and separated by hairline dividers instead of borders;
 * elevation is reserved for things that genuinely float. There are three
 * weights:
 *   - `plain`  card surface (default) — the workhorse
 *   - `inset`  recessed surface sitting inside a card (rows, empty slots)
 *   - `raised` raised card, only for content that must detach from the page
 *
 * Legacy `elevated` / `flat` / `outlined` values are aliased so older screens
 * keep working.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { haptics } from '../../utils/haptics';
import { usePressScale } from '../../utils/motion';

export type CardVariant = 'plain' | 'inset' | 'raised' | 'elevated' | 'flat' | 'outlined';

export interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLongPress?: () => void;
  variant?: CardVariant;
  padded?: boolean;
  accessibilityLabel?: string;
  /** Removes the surface entirely (used for transparent groupings). */
  bare?: boolean;
}

function resolveVariant(variant: CardVariant): 'plain' | 'inset' | 'raised' | 'bare' {
  switch (variant) {
    case 'inset':
    case 'outlined':
      return 'inset';
    case 'raised':
    case 'elevated':
      return 'raised';
    case 'flat':
      return 'plain';
    default:
      return 'plain';
  }
}

export function Card({
  children,
  style,
  onPress,
  onLongPress,
  variant = 'plain',
  padded = true,
  accessibilityLabel,
  bare = false,
}: CardProps) {
  const theme = useTheme();
  const { colors, radius, spacing } = theme;
  const resolved = bare ? 'bare' : resolveVariant(variant);
  const press = usePressScale(0.99);

  const surface: StyleProp<ViewStyle> = [
    resolved === 'bare'
      ? null
      : {
          backgroundColor: resolved === 'inset' ? colors.cardAlt : colors.card,
          borderRadius: resolved === 'raised' ? radius.lg : radius.lg,
          // Hairline edge on every card: on the dark indigo base a 10% white
          // outline is what separates a card from the background.
          borderWidth: 1,
          borderColor: colors.border,
        },
    resolved === 'raised' ? theme.elevation.floating : null,
    padded && resolved !== 'bare' ? { padding: spacing.card } : null,
    style,
  ];

  if (!onPress && !onLongPress) return <View style={surface}>{children}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPressIn={press.handlers.onPressIn}
      onPressOut={press.handlers.onPressOut}
      onPress={
        onPress
          ? () => {
              haptics.light();
              onPress();
            }
          : undefined
      }
      onLongPress={
        onLongPress
          ? () => {
              haptics.medium();
              onLongPress();
            }
          : undefined
      }
      style={({ pressed }) => [
        surface,
        press.style,
        pressed && resolved !== 'bare'
          ? { backgroundColor: resolved === 'inset' ? colors.surfaceSunken : colors.cardAlt }
          : null,
      ]}
    >
      {children}
    </Pressable>
  );
}

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: IconName;
  /** Small count chip rendered after the title. */
  count?: number;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({ title, actionLabel, onAction, icon, count, style }: SectionHeaderProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.sectionHeader,
        { marginBottom: theme.spacing.md, marginTop: theme.spacing.xl },
        style,
      ]}
    >
      <View style={styles.sectionTitle}>
        {icon ? (
          <Icon name={icon} size={13} color={theme.colors.textFaint} style={{ marginRight: 6 }} />
        ) : null}
        <AppText variant="micro" tone="faint">
          {title.toUpperCase()}
        </AppText>
        {typeof count === 'number' ? (
          <View
            style={{
              marginLeft: 8,
              paddingHorizontal: 6,
              paddingVertical: 1,
              borderRadius: theme.radius.xs,
              backgroundColor: theme.colors.chipTint,
            }}
          >
            <AppText variant="caption" tone="muted" tabular>
              {String(count)}
            </AppText>
          </View>
        ) : null}
      </View>

      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button" style={styles.actionRow}>
          <AppText variant="small" weight="semibold" tone="primary">
            {actionLabel}
          </AppText>
          <Icon name="chevron-forward" size={13} color={theme.colors.primary} style={{ marginLeft: 2 }} />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * HeroCard — the total-money panel.
 * Deliberately restrained: a deep teal-over-indigo ramp, a single hairline
 * highlight at the top edge, and a rule separating the figure from its
 * breakdown. No decorative blobs.
 */
export interface HeroCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Overrides the default teal ramp (e.g. income / expense detail panels). */
  gradient?: readonly [string, string, ...string[]];
}

export function HeroCard({ children, style, gradient: override }: HeroCardProps) {
  const theme = useTheme();
  const gradient = override ?? theme.colors.heroGradient;

  return (
    <View
      style={[
        {
          borderRadius: theme.radius.xl,
          backgroundColor: gradient[0],
          padding: theme.spacing.card,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
        },
        style,
      ]}
    >
      {/* Depth comes from the gradient itself — no decorative blobs. */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: 'rgba(255,255,255,0.14)',
          pointerEvents: 'none',
        }}
      />
      {children}
    </View>
  );
}

/** Hairline rule used inside cards. */
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border }, style]} />;
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default Card;
