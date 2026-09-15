/**
 * CategoryGrid — every category is its own tappable element.
 *
 * Replaces the old category dropdown: a wrapping grid of tiles (icon + label)
 * so the whole set stays visible in one glance and nothing is hidden behind a
 * picker. Tiles are flat by default and take the category tint once selected.
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
                  backgroundColor: selected ? `${meta.color}1f` : theme.colors.backgroundAlt,
                  borderColor: selected ? `${meta.color}73` : 'transparent',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.iconChip,
                  { backgroundColor: selected ? `${meta.color}29` : theme.colors.chipTint },
                ]}
              >
                <Icon name={meta.icon as never} size={16} color={selected ? meta.color : theme.colors.textMuted} />
              </View>

              <AppText
                variant="caption"
                weight={selected ? 'semibold' : 'regular'}
                color={selected ? theme.colors.text : theme.colors.textMuted}
                numberOfLines={1}
                style={{ marginTop: 6 }}
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
    width: 74,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconChip: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CategoryGrid;
