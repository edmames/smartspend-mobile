/**
 * Add transaction (modal route). Accepts optional `type` and `walletId` params
 * so the FABs on other screens can pre-fill the form.
 */
import { ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useT } from '../../src/hooks/useTheme';
import { useKeyboardViewportInset } from '../../src/hooks/useKeyboardViewportInset';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useWallets } from '../../src/hooks/useWallets';
import { useSavings } from '../../src/hooks/useSavings';
import { Card } from '../../src/components/ui/Card';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { StackHeader } from '../../src/components/ui/ScreenHeader';
import { TransactionForm } from '../../src/components/forms/TransactionForm';
import { useToast } from '../../src/components/ui/Toast';
import type { TransactionType } from '../../src/types';
import { USER_TRANSACTION_TYPES } from '../../src/utils/constants';
import { useStackScreenBottomPadding } from '../../src/utils/layout';

export default function NewTransactionScreen() {
  const theme = useTheme();
  // Presented as a modal sheet, so the footer has to clear the home indicator.
  const stackBottomPadding = useStackScreenBottomPadding();
  // Web/PWA: pad the scroll container by the software keyboard's real height
  // (observed from the visual viewport), so every field, category tile and the
  // Save action stay scrollable above the keyboard. Native gets the same
  // behaviour from the OS-scrolled scroll view and needs no extra inset.
  const keyboardInset = useKeyboardViewportInset();
  const t = useT();
  const toast = useToast();
  const params = useLocalSearchParams<{ type?: string; walletId?: string }>();

  const { addTransaction } = useTransactions();
  const { wallets } = useWallets();
  const { targets } = useSavings();

  const requestedType = USER_TRANSACTION_TYPES.includes(params.type as TransactionType)
    ? (params.type as TransactionType)
    : 'expense';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: stackBottomPadding + keyboardInset,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <StackHeader title={t('transaction.new')} fallbackRoute="/(tabs)" />

        {wallets.length === 0 ? (
          <Card>
            <EmptyState
              icon="wallet-outline"
              title={t('error.need_wallet_first')}
              actionLabel={t('wallet.add')}
              onAction={() => router.replace('/(tabs)/wallets')}
            />
          </Card>
        ) : (
          <Card style={{ marginTop: theme.spacing.sm }}>
            <TransactionForm
              wallets={wallets}
              targets={targets}
              transactions={useTransactions().transactions}
              defaultType={requestedType}
              onSubmit={async (input) => {
                const result = await addTransaction(input);
                if (result.ok) {
                  toast.success(t('transaction.add'));
                  router.back();
                }
                return result;
              }}
              onCancel={() => router.back()}
              submitLabel={t('common.save')}
            />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
});
