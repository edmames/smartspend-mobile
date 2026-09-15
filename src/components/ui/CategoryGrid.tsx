/**
 * CategoryGrid — every category is its own tappable element.
 *
 * Replaces the old category dropdown: a wrapping grid of tiles (icon + label)
 * so the whole set stays visible in one glance and nothing is hidden behind a
 * picker. Idle tiles carry a neutral icon chip; the selected tile takes the
 * category tint on its circle and a matching hairline edge.
 */
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme, useT } from '../../hooks/useTheme';
import type { CategoryKey } from '../../types';
import { CATEGORY_META } from '../../utils/constants';
import { haptics } from '../../utils/haptics';
import { AppText } from './AppText';
import { Icon } from './Icon';

export interface CategoryGridProps {
  /** Categories offered for the current transaction type. */
  categories: CategoryKey[];
  value: CategoryKey;
  onChange: (category: CategoryKey) => void;
  error?: string;
  style?: StyleProp<ViewStyle>;
}

export function CategoryGrid({ categories, value, onChange, error, style }: CategoryGridProps) {
  const theme = useTheme();
  const t = useT();

  return (
    <View style={style}>
      <View style={styles.grid}>
        {categories.map((key) => {
          const meta = CATEGORY_META[key];
          const selected = key === value;
          return (
            <Pressable
              key={key}
              onPress={() => {
                haptics.selection();
                onChange(key);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={t(`category.${key}` as never)}
              style={({ pressed }) => [
                styles.tile,
                {
                  backgroundColor: selected ? `${meta.color}14` : theme.colors.chipTint,
                  borderColor: selected ? `${meta.color}66` : 'transparent',
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.iconChip,
                  { backgroundColor: selected ? `${meta.color}2e` : theme.colors.chipTint },
                ]}
              >
                <Icon name={meta.icon as never} size={18} color={selected ? meta.color : theme.colors.textMuted} />
              </View>

              <AppText
                variant="caption"
                weight={selected ? 'semibold' : 'regular'}
                color={selected ? theme.colors.text : theme.colors.textMuted}
                numberOfLines={1}
                style={{ marginTop: 7 }}
              >
                {t(`category.${key}` as never)}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <AppText variant="caption" tone="danger" style={{ marginTop: 8 }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    // Four per row on a 360–400px screen, more when there is room.
    width: 76,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CategoryGrid;
