/**
 * StatTile — compact metric block (reports, summaries). Label is a micro
 * uppercase; the figure is tabular so tiles line up across a row.
 */
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export interface StatTileProps {
  label: string;
  value: string;
  icon?: IconName;
  tone?: 'default' | 'success' | 'danger' | 'warning' | 'primary';
  hint?: string;
  style?: StyleProp<ViewStyle>;
  /** Renders without a surface (inside hero panels). */
  bare?: boolean;
}

export function StatTile({ label, value, icon, tone = 'default', hint, style, bare = false }: StatTileProps) {
  const theme = useTheme();

  const accent: Record<NonNullable<StatTileProps['tone']>, string> = {
    default: theme.colors.text,
    success: theme.colors.success,
    danger: theme.colors.danger,
    warning: theme.colors.warning,
    primary: theme.colors.primary,
  };

  return (
    <View
      style={[
        styles.tile,
        bare
          ? null
          : {
              backgroundColor: theme.colors.card,
              borderRadius: theme.radius.md,
              padding: theme.spacing.md,
            },
        style,
      ]}
    >
      <View style={styles.labelRow}>
        {icon ? (
          <Icon
            name={icon}
            size={12}
            color={bare ? theme.colors.onHeroFaint : theme.colors.textFaint}
            style={{ marginRight: 5 }}
          />
        ) : null}
        {/* `bare` means the tile sits on a HeroCard ramp, so it takes hero ink. */}
        <AppText variant="micro" tone={bare ? 'onHeroMuted' : 'faint'}>
          {label.toUpperCase()}
        </AppText>
      </View>

      <AppText
        variant="subtitle"
        weight="bold"
        tabular
        color={bare ? theme.colors.onHero : accent[tone]}
        style={{ marginTop: 5 }}
        numberOfLines={1}
      >
        {value}
      </AppText>

      {hint ? (
        <AppText variant="caption" tone={bare ? 'onHeroFaint' : 'muted'} style={{ marginTop: 2 }}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default StatTile;
