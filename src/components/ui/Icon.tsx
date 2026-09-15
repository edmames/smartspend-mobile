/**
 * Icon wrapper around Ionicons.
 *
 * `IconName` is derived from the font's glyph map, so a typo is a compile-time
 * error instead of a missing glyph at runtime.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ColorValue, StyleProp, TextStyle } from 'react-native';

export type IconName = keyof typeof Ionicons.glyphMap;

export interface IconProps {
  name: IconName;
  size?: number;
  /** `ColorValue` so navigation-provided tint colours pass straight through. */
  color?: ColorValue;
  style?: StyleProp<TextStyle>;
}

export function Icon({ name, size = 20, color = '#e2e8f0', style }: IconProps) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
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
