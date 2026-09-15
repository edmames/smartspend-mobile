/**
 * WalletMark — identity mark for a wallet.
 *
 * Two looks, one component:
 *  - `tint` (default): glyph in the wallet's colour on a soft ~14% tint — quieter,
 *    blends with the flat-surface design.
 *  - `solid`: white glyph on a deep tile, for use on dark backgrounds (hero cards).
 *
 * Glyphs are hand-drawn vectors on a 24×24 grid: banknote (Cash), bank building
 * (Bank), wallet + tap-to-pay waves (E-Wallet). When the wallet carries a
 * provider (`brand`), the tile shows that brand's monogram in its colour —
 * we ship no third-party logo assets, so a monogram stands in for the logo.
 */
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { WalletBrand, WalletType } from '../../types';
import { WALLET_BRAND_META, WALLET_TYPE_META } from '../../utils/constants';

export type { WalletBrand };

/** Deep tones for the solid variant / glyph on tint. */
const TYPE_INK: Record<WalletType, { accent: string; deep: string }> = {
  cash: { accent: '#10b981', deep: '#065f46' },
  bank: { accent: '#3b82f6', deep: '#1e3a8a' },
  ewallet: { accent: '#8b5cf6', deep: '#5b21b6' },
};

const MARK_PROPS = {
  fill: 'none',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export interface WalletMarkProps {
  type: WalletType;
  /** Provider monogram (BCA, Mandiri, GoPay…). Ignored for cash wallets. */
  brand?: WalletBrand | null;
  /** Tile edge in px. */
  size?: number;
  /** `tint` (default) for light surfaces, `solid` for dark/hero surfaces. */
  variant?: 'tint' | 'solid';
  style?: StyleProp<ViewStyle>;
}

export function WalletMark({ type, brand, size = 40, variant = 'tint', style }: WalletMarkProps) {
  const inked = brand ? WALLET_BRAND_META[brand] : null;
  const accent = inked?.color ?? WALLET_TYPE_META[type].color;
  const deep = inked?.color ?? TYPE_INK[type].deep;
  const solid = variant === 'solid';

  const background = solid ? deep : `${accent}24`;
  const glyphColor = solid ? '#ffffff' : accent;

  return (
    <View style={style}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Rect x="0" y="0" width="48" height="48" rx={Math.round(size * 0.32)} fill={background} />
        {solid ? (
          <Rect
            x="0.9"
            y="0.9"
            width="46.2"
            height="46.2"
            rx={Math.round(size * 0.32) - 1}
            fill="none"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="1.4"
          />
        ) : null}

        {inked ? (
          <SvgText
            x="24"
            y="30.5"
            fontSize={inked.label.length > 3 ? 13 : 16}
            fontWeight="700"
            fill={glyphColor}
            textAnchor="middle"
          >
            {inked.label}
          </SvgText>
        ) : (
          <G transform="translate(12, 12)" {...MARK_PROPS} stroke={glyphColor}>
            {type === 'cash' ? <CashMark /> : type === 'bank' ? <BankMark /> : <EWalletMark />}
          </G>
        )}
      </Svg>
    </View>
  );
}

/**
 * SavingsMark — the savings-side counterpart of `WalletMark`.
 * Same tile geometry, so goals read as part of the same family.
 */
export function SavingsMark({ size = 38, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  // Cyan — matches the semantic `savingsColor` token.
  const accent = '#06b6d4';
  return (
    <View style={style}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Rect x="0" y="0" width="48" height="48" rx={Math.round(size * 0.32)} fill={`${accent}24`} />
        <G transform="translate(12, 12)" {...MARK_PROPS} stroke={accent}>
          <Path d="M5 21V4.6l14 0" />
          <Path d="M5 12.6h12.4" />
          <Circle cx="18.4" cy="18.4" r="4.2" />
        </G>
      </Svg>
    </View>
  );
}

/** Banknote: rounded rect, centre coin, edge ticks. */
function CashMark() {
  return (
    <G>
      <Rect x="0.5" y="4.5" width="23" height="15" rx="2.8" />
      <Circle cx="12" cy="12" r="3" />
      <Path d="M4.6 9.3v5.4" />
      <Path d="M19.4 9.3v5.4" />
    </G>
  );
}

/** Classical bank: pediment, columns, floor line. */
function BankMark() {
  return (
    <G>
      <Path d="M1.8 9 12 3.4 22.2 9" />
      <Path d="M3.8 11.5h16.4" />
      <Path d="M7 13.6v5" />
      <Path d="M12 13.6v5" />
      <Path d="M17 13.6v5" />
      <Path d="M4.2 21h15.6" />
    </G>
  );
}

/** Wallet with contactless waves — "tap to pay". */
function EWalletMark() {
  return (
    <G>
      <Rect x="1.6" y="7.6" width="20.8" height="13.4" rx="3.4" />
      <Path d="M6 14.3h3.8" />
      <Circle cx="17.2" cy="14.3" r="1.5" />
      <Path d="M15.8 2.4a6.6 6.6 0 0 1 6.6 6.6" />
      <Path d="M16.6 5.9a3.2 3.2 0 0 1 3.2 3.2" />
    </G>
  );
}

export default WalletMark;
