/**
 * CategoryGrid — every category is its own tappable element.
 *
 * Replaces the old category dropdown: a three-column grid of tiles (icon +
 * label) so the whole set stays visible in one glance and nothing is hidden
 * behind a picker. Idle tiles carry a neutral icon chip; the selected tile
 * fills its 40px circle with the category colour, switches the glyph to white
 * and springs up to 110% so the choice is felt as well as seen.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme, useT } from '../../hooks/useTheme';
import type { CategoryKey } from '../../types';
import { CATEGORY_META } from '../../utils/constants';
import { haptics } from '../../utils/haptics';
import { useReducedMotion } from '../../utils/motion';
import { withAlpha } from '../../utils/color';
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
  const t = useT();

  return (
    <View style={style}>
      <View style={styles.grid}>
        {categories.map((key) => {
          const meta = CATEGORY_META[key];
          const selected = key === value;
          return (
            <CategoryTile
              key={key}
              color={meta.color}
              icon={meta.icon as never}
              label={t(`category.${key}` as never)}
              selected={selected}
              onPress={() => {
                haptics.selection();
                onChange(key);
              }}
            />
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

/** One tile — owns its own spring so hooks stay out of the parent's loop. */
function CategoryTile({
  color,
  icon,
  label,
  selected,
  onPress,
}: {
  color: string;
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(selected ? 1.1 : 1)).current;
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    Animated.spring(scale, {
      toValue: reduced ? 1 : selected ? 1.1 : 1,
      useNativeDriver: true,
      friction: 6,
      tension: 160,
    }).start();
  }, [reduced, scale, selected]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={styles.tile}
    >
      <Animated.View style={[styles.tileInner, { transform: [{ scale }] }]}>
        <View
          style={[
            styles.iconChip,
            {
              backgroundColor: selected ? withAlpha(color, 0.22) : theme.colors.accentSoft,
              borderWidth: 1,
              borderColor: selected ? withAlpha(color, 0.45) : theme.colors.border,
            },
          ]}
        >
          {/* Semantic category ink stays readable in both themes. */}
          <Icon name={icon} size={20} color={selected ? color : theme.colors.textMuted} />
        </View>

        <AppText
          variant="caption"
          weight={selected ? 'semibold' : 'regular'}
          color={selected ? theme.colors.text : theme.colors.textMuted}
          align="center"
          numberOfLines={2}
          style={{ marginTop: 7 }}
        >
          {label}
        </AppText>
      </Animated.View>

      {/* Selection tint sits behind the content, so the label keeps contrast. */}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.tileSurface,
          {
            backgroundColor: selected ? withAlpha(color, 0.14) : theme.colors.chipTint,
            // Restrained: a hint of the category hue, not a full-saturation
            // outline, so a selected tile is obvious without shouting.
            borderColor: selected ? withAlpha(color, 0.45) : 'transparent',
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        pointerEvents="none"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    // Three per row on a phone, more when there is width to spare.
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 92,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileSurface: {
    borderRadius: 14,
    borderWidth: 1,
  },
  tileInner: {
    alignItems: 'center',
    paddingHorizontal: 6,
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
