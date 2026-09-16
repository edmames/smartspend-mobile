/**
 * WalletCard — row-style card: type glyph, name + type, tabular balance.
 *
 * An optional `share` ratio renders a thin bar comparing this wallet with the
 * others. The ratio is the wallet's slice of the **sum of all wallet
 * balances** (callers pass `progressFraction(balance, walletsTotal)`), not of
 * total money — savings are a separate pot and would flatten every bar.
 */
import { StyleSheet, View } from 'react-native';
import { useTheme, useT } from '../hooks/useTheme';
import type { Wallet } from '../types';
import { WALLET_TYPE_META } from '../utils/constants';
import { Money } from './ui/Money';
import { AppText } from './ui/AppText';
import { Card } from './ui/Card';
import { Badge } from './ui/Chip';
import { WalletMark, type WalletBrand } from './ui/WalletMark';

export interface WalletCardProps {
  wallet: Wallet;
  /** Optional provider (BCA, GoPay…) — renders a brand monogram mark. */
  brand?: WalletBrand | null;
  balance: number;
  transactionCount?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Compact variant for dashboard "top wallets". */
  compact?: boolean;
  /** 0..1 slice of the total wallet balance (renders a thin bar when provided). */
  share?: number;
}

export function WalletCard({
  wallet,
  brand,
  balance,
  transactionCount,
  onPress,
  onLongPress,
  compact = false,
  share,
}: WalletCardProps) {
  const theme = useTheme();
  const t = useT();
  const meta = WALLET_TYPE_META[wallet.type];

  return (
    <Card
      onPress={onPress}
      onLongPress={onLongPress}
      padded={false}
      style={{ marginBottom: theme.spacing.sm }}
    >
      <View style={{ padding: compact ? 11 : theme.spacing.card }}>
        <View style={styles.row}>
          <WalletMark type={wallet.type} brand={brand ?? wallet.brand} size={compact ? 34 : 42} />

          <View style={{ flex: 1, marginLeft: theme.spacing.md, minWidth: 0 }}>
            <AppText variant={compact ? 'small' : 'body'} weight="semibold" numberOfLines={1}>
              {wallet.name}
            </AppText>
            <View style={styles.metaRow}>
              <Badge label={t(meta.key as never)} color={meta.color} />
              {typeof transactionCount === 'number' && !compact ? (
                <AppText variant="caption" tone="faint" style={{ marginLeft: 6 }} numberOfLines={1}>
                  {`${transactionCount} ${t('wallet.transaction_count').toLowerCase()}`}
                </AppText>
              ) : null}
            </View>
          </View>

          <Money
            value={balance}
            size={compact ? 'body' : 'subtitle'}
            tone={balance < 0 ? 'danger' : 'default'}
            align="right"
          />
        </View>

        {/* No bar for an empty wallet: a rounded-up sliver would read as a real
            share of the total when the wallet actually holds nothing. */}
        {typeof share === 'number' && share > 0 ? (
          <View
            style={[
              styles.shareTrack,
              { height: compact ? 2 : 3, backgroundColor: theme.colors.chipTint, marginTop: compact ? 8 : theme.spacing.md },
            ]}
          >
            <View
              style={{
                width: `${Math.max(2, Math.min(100, share * 100))}%`,
                // Floor of 2% only applies to a non-zero share, so a sliver
                // stays visible while a real zero renders nothing.
                height: '100%',
                borderRadius: 2,
                backgroundColor: meta.color,
                opacity: 0.85,
              }}
            />
          </View>
        ) : null}
      </View>
    </Card>
  );
}

/** Compact wallet chips used in filter rows and summaries. */
export function WalletSummaryStrip({ wallets }: { wallets: { id: string; name: string; balance: number }[] }) {
  const theme = useTheme();
  return (
    <View style={[styles.strip, { gap: theme.spacing.sm }]}>
      {wallets.map((wallet) => (
        <View
          key={wallet.id}
          style={{
            backgroundColor: theme.colors.cardAlt,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            flex: 1,
          }}
        >
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {wallet.name}
          </AppText>
          <Money value={wallet.balance} size="small" numberOfLines={1} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  shareTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});

export default WalletCard;
