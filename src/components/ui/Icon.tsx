/**
 * Icon wrapper around Ionicons.
 *
 * `IconName` is derived from the font's glyph map, so a typo is a compile-time
 * error instead of a missing glyph at runtime.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ColorValue, StyleProp, TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export type IconName = keyof typeof Ionicons.glyphMap;

export interface IconProps {
  name: IconName;
  size?: number;
  /** `ColorValue` so navigation-provided tint colours pass straight through. */
  color?: ColorValue;
  style?: StyleProp<TextStyle>;
}

/**
 * Defaults to the theme's primary text colour. It used to default to a fixed
 * near-white, which was invisible on the light theme for any icon whose caller
 * relied on the default.
 */
export function Icon({ name, size = 20, color, style }: IconProps) {
  const theme = useTheme();
  return <Ionicons name={name} size={size} color={color ?? theme.colors.text} style={style} />;
}

/**
 * IconBadge — glyph inside a soft rounded container.
 * `tint` controls how strong the category colour reads (default 14%), which
 * keeps long lists from turning into a colour collage.
 */
export function IconBadge({
  name,
  color,
  size = 20,
  containerSize = 40,
  background,
  tint,
}: {
  name: IconName;
  color: string;
  size?: number;
  containerSize?: number;
  background?: string;
  tint?: number;
}) {
  return (
    <Icon
      name={name}
      size={size}
      color={color}
      style={{
        width: containerSize,
        height: containerSize,
        borderRadius: containerSize / 3,
        textAlign: 'center',
        lineHeight: containerSize,
        backgroundColor: background ?? `${color}${tint ? Math.round(tint * 255).toString(16).padStart(2, '0') : '22'}`,
        overflow: 'hidden',
      }}
    />
  );
}

export default Icon;
