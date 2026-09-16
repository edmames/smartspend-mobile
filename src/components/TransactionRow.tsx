/**
 * TransactionRow — the ledger line.
 *
 * The leading glyph is the **wallet mark** of the wallet involved, so a row
 * reads with the same identity as the Dompet tab: an expense from GoPay carries
 * the GoPay mark, income carries the receiving wallet's mark, and savings
 * movements carry the savings mark. Category and wallet names move into the
 * meta line — nothing is lost, but the row now matches the rest of the app.
 *
 * Falls back to the category glyph when the caller has no wallet to hand.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme, useT, useLanguage, useAmountColor } from '../hooks/useTheme';
import type { Transaction, Wallet } from '../types';
import { CATEGORY_META, TRANSACTION_TYPE_META } from '../utils/constants';
import { formatRelativeDay } from '../utils/date';
import { directionOf, formatCurrency } from '../utils/formatting';
import { AppText } from './ui/AppText';
import { IconBadge } from './ui/Icon';
import { SavingsMark, WalletMark } from './ui/WalletMark';
import { haptics } from '../utils/haptics';

/** Only the fields the mark needs; full `Wallet` objects are accepted too. */
export type WalletRef = Pick<Wallet, 'type' | 'brand'>;

export interface TransactionRowProps {
  transaction: Transaction;
  /** Wallet names resolved by the caller (source → destination). */
  sourceWalletName?: string;
  destinationWalletName?: string;
  savingsTargetName?: string;
  /** Wallet marks, so the row matches the Dompet tab. */
  sourceWallet?: WalletRef | null;
  destinationWallet?: WalletRef | null;
  /** Savings movements render the savings mark instead of a wallet mark. */
  savingsMark?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  showDate?: boolean;
  /** Renders a top hairline (used to group rows). */
  divider?: boolean;
  /** Hides the leading glyph entirely. */
  hideIcon?: boolean;
  /** Denser row for dashboard/summary lists. */
  compact?: boolean;
}

export function TransactionRow({
  transaction,
  sourceWalletName,
  destinationWalletName,
  savingsTargetName,
  sourceWallet,
  destinationWallet,
  savingsMark = false,
  onPress,
  onLongPress,
  showDate = true,
  divider = false,
  hideIcon = false,
  compact = false,
}: TransactionRowProps) {
  const theme = useTheme();
  const t = useT();
  const language = useLanguage();

  const categoryMeta = CATEGORY_META[transaction.category] ?? CATEGORY_META.other;
  const direction = directionOf(transaction.type);
  const amountColor = useAmountColor(transaction.type);

  /* ----------------------------- leading mark ----------------------------- */
  const isSavingsMovement = transaction.type === 'savings_deposit' || transaction.type === 'savings_withdraw';

  /* -------------------------------- title --------------------------------- */
  const typeLabel = t(TRANSACTION_TYPE_META[transaction.type].key as never);
  const description = transaction.description.trim();
  /**
   * A user-typed description always wins. Otherwise the type label carries the
   * row, and savings movements name their target so the header is never a bare
   * "Setor tabungan" with the destination left to the metadata line.
   */
  const title = description
    ? description
    : isSavingsMovement && savingsTargetName
      ? `${typeLabel} — ${savingsTargetName}`
      : typeLabel;
  // Money leaves the source wallet, so that is the wallet the row is "about";
  // for income the destination wallet is the one that received it.
  const walletRef =
    transaction.type === 'income' ? (destinationWallet ?? sourceWallet) : (sourceWallet ?? destinationWallet);
  const markSize = compact ? 32 : 38;

  /* ------------------------------ meta line ------------------------------- */
  /**
   * Built as one string and rendered as a single text node.
   *
   * Each fragment used to be its own `numberOfLines={1}` node inside a flex row,
   * so a narrow screen clipped every piece independently and the line came out
   * as "Hari … · Tabun… · Sopipau → N…". One node means one clip, at the end,
   * where the ellipsis actually reads as "there is more".
   */
  const metaParts: string[] = [];
  // Skipped when the caller already groups rows under a date heading, so the
  // same date is not printed twice in a row.
  if (showDate) metaParts.push(formatRelativeDay(transaction.date, language));
  metaParts.push(t(`category.${transaction.category}` as never));

  if (transaction.type === 'transfer') {
    metaParts.push(`${sourceWalletName ?? '—'} → ${destinationWalletName ?? '—'}`);
  } else if (transaction.type === 'savings_deposit') {
    metaParts.push(`${sourceWalletName ?? '—'} → ${savingsTargetName ?? '—'}`);
  } else if (transaction.type === 'savings_withdraw') {
    metaParts.push(`${savingsTargetName ?? '—'} → ${sourceWalletName ?? '—'}`);
  } else if (sourceWalletName) {
    metaParts.push(sourceWalletName);
  }

  if (transaction.paymentMethod) {
    metaParts.push(t(`payment.${transaction.paymentMethod}` as never));
  }

  const sign = direction === 'in' ? '+ ' : direction === 'out' ? '− ' : '';
  /** Meta reads at body-metadata size normally, one step down on dense rows. */
  const metaVariant = compact ? 'caption' : 'small';

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${title} ${formatCurrency(transaction.amount)}`}
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
        styles.row,
        {
          paddingVertical: compact ? 8 : 12,
          borderTopWidth: divider ? StyleSheet.hairlineWidth : 0,
          borderTopColor: theme.colors.border,
          backgroundColor: pressed ? theme.colors.cardAlt : 'transparent',
          borderRadius: pressed ? theme.radius.sm : 0,
        },
      ]}
    >
      {hideIcon ? null : isSavingsMovement && savingsMark ? (
        <SavingsMark size={markSize} />
      ) : walletRef ? (
        <WalletMark type={walletRef.type} brand={walletRef.brand} size={markSize} />
      ) : (
        <IconBadge
          name={categoryMeta.icon as never}
          color={categoryMeta.color}
          containerSize={markSize}
          size={compact ? 15 : 18}
          // Matches the wallet marks: a fuller tile so the glyph reads as a mark.
          tint={0.2}
        />
      )}

      <View style={{ flex: 1, marginLeft: hideIcon ? 0 : theme.spacing.md, minWidth: 0 }}>
        <AppText variant={compact ? 'small' : 'body'} weight="medium" numberOfLines={1}>
          {title}
        </AppText>
        <AppText
          variant={metaVariant}
          tone="muted"
          numberOfLines={1}
          style={{ marginTop: theme.spacing.xs }}
        >
          {metaParts.join(' · ')}
        </AppText>
      </View>

      <AppText
        variant={compact ? 'small' : 'body'}
        weight="semibold"
        tabular
        color={amountColor}
        numberOfLines={1}
        style={{ marginLeft: theme.spacing.sm }}
      >
        {`${sign}Rp ${formatCurrency(transaction.amount, { withSymbol: false })}`}
      </AppText>
    </Pressable>
  );
}

/** Day group header: weekday/date on the left, net movement on the right. */
export function DayGroupHeader({
  label,
  weekday,
  net,
  count,
}: {
  label: string;
  weekday: string;
  net: number;
  count: number;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.groupHeader, { marginTop: theme.spacing.lg, marginBottom: theme.spacing.xs }]}>
      <View style={styles.groupLeft}>
        <AppText variant="small" weight="semibold" tone="medium">
          {label}
        </AppText>
        <AppText variant="caption" tone="faint" style={{ marginLeft: 6 }}>
          {weekday}
        </AppText>
        <View style={[styles.groupCount, { backgroundColor: theme.colors.chipTint }]}>
          <AppText variant="caption" tone="muted" tabular>
            {String(count)}
          </AppText>
        </View>
      </View>

      <AppText variant="caption" tabular tone={net >= 0 ? 'success' : 'danger'} weight="semibold">
        {`${net >= 0 ? '+' : '−'} Rp ${formatCurrency(Math.abs(net), { withSymbol: false })}`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupCount: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
});

export default TransactionRow;
