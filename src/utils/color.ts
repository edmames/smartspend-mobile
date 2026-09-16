/**
 * Colour maths shared by the theme and the wallet marks.
 *
 * Kept dependency-free and non-reactive: these are pure string functions, so
 * they are safe to call during render.
 */

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function parseHex(hex: string): Rgb | null {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6 && clean.length !== 3) return null;
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((char) => char + char)
          .join('')
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return null;
  return { r, g, b };
}

function toHex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
}

/** `#rrggbb` + alpha → `rgba()`. Returns `hex` untouched if it cannot be parsed. */
export function withAlpha(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/**
 * Lifts a hex colour towards white by `amount` (0–1).
 *
 * Brand inks are chosen to look right on a white page, so on the dark indigo
 * surface they read as muddy. Nudging them toward white keeps the hue — BCA is
 * still blue, GoPay still cyan — while making the glyph legible.
 */
export function lightenHex(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const ratio = Math.max(0, Math.min(1, amount));
  const lift = (channel: number) => channel + (255 - channel) * ratio;
  return `#${toHex(lift(rgb.r))}${toHex(lift(rgb.g))}${toHex(lift(rgb.b))}`;
}
