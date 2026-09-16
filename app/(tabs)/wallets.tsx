/**
 * Wallets — list with share-of-total bars, create / rename, guarded delete.
 */
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useT } from '../../src/hooks/useTheme';
import { useWallets, type WalletWithBalance } from '../../src/hooks/useWallets';
import { useRefreshAll } from '../../src/hooks/useStorage';
import { AppText } from '../../src/components/ui/AppText';
import { Card, Divider, SectionHeader } from '../../src/components/ui/Card';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { FAB } from '../../src/components/ui/FAB';
import { Money } from '../../src/components/ui/Money';
import { AppModal } from '../../src/components/ui/Modal';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import { Button } from '../../src/components/ui/Button';
import { Stagger } from '../../src/components/ui/Stagger';
import { WalletCard } from '../../src/components/WalletCard';
import { WalletForm } from '../../src/components/forms/WalletForm';
import { useToast } from '../../src/components/ui/Toast';
import { formatCurrency } from '../../src/utils/formatting';

export default function WalletsScreen() {
  const theme = useTheme();
  const t = useT();
  const toast = useToast();
  const refreshAll = useRefreshAll();
  const { walletsWithBalance, sortedByBalance, addWallet, editWallet, deleteWallet, totalMoney } = useWallets();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WalletWithBalance | null>(null);
  const [menuWallet, setMenuWallet] = useState<WalletWithBalance | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WalletWithBalance | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const walletsTotal = walletsWithBalance.reduce((sum, wallet) => sum + wallet.balance, 0);
  const savingsTotal = totalMoney - walletsTotal;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (wallet: WalletWithBalance) => {
    setEditing(wallet);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteWallet(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    toast.notify(result, t('common.delete'));
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: theme.spacing.screen, paddingTop: theme.spacing.sm, paddingBottom: 132 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await refreshAll();
              setRefreshing(false);
            }}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            progressBackgroundColor={theme.colors.card}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="title">{t('wallet.title')}</AppText>

        {/* Summary */}
        <Card style={{ marginTop: theme.spacing.md }}>
          <AppText variant="micro" tone="faint">
            {t('wallet.subtitle_total').toUpperCase()}
          </AppText>
          <View style={{ marginTop: theme.spacing.sm }}>
            <Money value={walletsTotal} size="money" />
          </View>

          {/* Composition bar: wallets vs savings */}
          <View style={[styles.composition, { marginTop: theme.spacing.md, backgroundColor: theme.colors.chipTint }]}>
            <View
              style={{
                flex: walletsTotal > 0 ? walletsTotal : 0.001,
                backgroundColor: theme.colors.primary,
                height: '100%',
              }}
            />
            <View style={{ flex: savingsTotal > 0 ? savingsTotal : 0.001, backgroundColor: theme.colors.savingsColor, height: '100%' }} />
          </View>

          <View style={[styles.legendRow, { marginTop: theme.spacing.sm }]}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
              <AppText variant="caption" tone="muted">
                {`${t('dashboard.wallets_total')} · ${formatCurrency(walletsTotal)}`}
              </AppText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: theme.colors.savingsColor }]} />
              <AppText variant="caption" tone="muted">
                {`${t('dashboard.savings_total')} · ${formatCurrency(savingsTotal)}`}
              </AppText>
            </View>
          </View>

          <Divider style={{ marginVertical: theme.spacing.md }} />

          <View style={styles.metaRow}>
            <AppText variant="caption" tone="muted">
              {`${walletsWithBalance.length} ${t('wallet.title').toLowerCase()}`}
            </AppText>
            <AppText variant="caption" tone="muted" tabular>
              {`${t('dashboard.total_money')} ${formatCurrency(totalMoney)}`}
            </AppText>
          </View>
        </Card>

        <SectionHeader title={t('wallet.title')} count={walletsWithBalance.length} />

        {walletsWithBalance.length === 0 ? (
          <Card>
            <EmptyState
              icon="wallet-outline"
              title={t('wallet.empty')}
              message={t('wallet.empty_hint')}
              actionLabel={t('wallet.add')}
              onAction={openCreate}
            />
          </Card>
        ) : (
          sortedByBalance.map((wallet, index) => (
            <Stagger key={wallet.id} index={index}>
              <WalletCard
                wallet={wallet}
                balance={wallet.balance}
                transactionCount={wallet.transactionCount}
                share={walletsTotal > 0 ? Math.max(0, wallet.balance) / walletsTotal : 0}
                onPress={() => router.push(`/wallet/${wallet.id}`)}
                onLongPress={() => setMenuWallet(wallet)}
              />
            </Stagger>
          ))
        )}

        {walletsWithBalance.length > 0 ? (
          <AppText variant="caption" tone="faint" align="center" style={{ marginTop: theme.spacing.md }}>
            {t('wallet.type_hint')}
          </AppText>
        ) : null}
      </ScrollView>

      <FAB onPress={openCreate} accessibilityLabel={t('wallet.add')} />

      <BottomSheet
        visible={Boolean(menuWallet)}
        onClose={() => setMenuWallet(null)}
        title={menuWallet?.name}
        subtitle={menuWallet ? `${t('common.total')} ${formatCurrency(menuWallet.balance)}` : undefined}
      >
        <Button
          label={t('wallet.detail')}
          variant="secondary"
          icon="open-outline"
          onPress={() => {
            const id = menuWallet?.id;
            setMenuWallet(null);
            if (id) router.push(`/wallet/${id}`);
          }}
          style={{ marginBottom: theme.spacing.sm }}
        />
        <Button
          label={t('common.edit')}
          variant="secondary"
          icon="create-outline"
          onPress={() => {
            const wallet = menuWallet;
            setMenuWallet(null);
            if (wallet) openEdit(wallet);
          }}
          style={{ marginBottom: theme.spacing.sm }}
        />
        <Button
          label={t('common.delete')}
          variant="danger"
          icon="trash-outline"
          onPress={() => {
            const wallet = menuWallet;
            setMenuWallet(null);
            if (!wallet) return;
            if (wallet.transactionCount > 1) {
              toast.warning(t('wallet.delete_blocked'));
              return;
            }
            setDeleteTarget(wallet);
          }}
        />
      </BottomSheet>

      <AppModal
        visible={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? t('wallet.edit') : t('wallet.new')}
        subtitle={editing ? editing.name : undefined}
      >
        <WalletForm
          initial={editing ?? undefined}
          wallets={walletsWithBalance}
          onSubmit={async (input) => {
            const result = editing ? await editWallet(editing.id, input) : await addWallet(input);
            if (result.ok) {
              toast.success(editing ? t('common.save_changes') : t('wallet.add'));
              setFormOpen(false);
              setEditing(null);
            }
            return result;
          }}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          submitLabel={editing ? t('common.save_changes') : t('wallet.save_action')}
        />
      </AppModal>

      <ConfirmDialog
        visible={Boolean(deleteTarget)}
        title={t('wallet.delete_confirm')}
        message={deleteTarget ? `${deleteTarget.name} · ${formatCurrency(deleteTarget.balance)}` : undefined}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  composition: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    gap: 2,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
