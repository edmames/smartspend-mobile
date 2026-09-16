/**
 * Savings — goal list with an aggregate header (saved vs goal, member count).
 */
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useT, useLanguage } from '../../src/hooks/useTheme';
import { useSavings } from '../../src/hooks/useSavings';
import { useRefreshAll } from '../../src/hooks/useStorage';
import { AppText } from '../../src/components/ui/AppText';
import { Card, HeroCard, SectionHeader } from '../../src/components/ui/Card';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { FAB } from '../../src/components/ui/FAB';
import { Money } from '../../src/components/ui/Money';
import { AppModal } from '../../src/components/ui/Modal';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import { Button } from '../../src/components/ui/Button';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { Stagger } from '../../src/components/ui/Stagger';
import { SavingsCard } from '../../src/components/SavingsCard';
import { SavingsForm } from '../../src/components/forms/SavingsForm';
import { useToast } from '../../src/components/ui/Toast';
import { formatCurrency, formatPercentage } from '../../src/utils/formatting';
import type { SavingsTarget, TargetProgress } from '../../src/types';

export default function SavingsScreen() {
  const theme = useTheme();
  const t = useT();
  const language = useLanguage();
  const toast = useToast();
  const refreshAll = useRefreshAll();

  const {
    progressList,
    targets,
    totals,
    completedCount,
    addTarget,
    editTarget,
    deleteTarget: deleteTargetAction,
  } = useSavings();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsTarget | null>(null);
  const [menuProgress, setMenuProgress] = useState<TargetProgress | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TargetProgress | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const result = await deleteTargetAction(pendingDelete.target.id);
    setDeleting(false);
    setPendingDelete(null);
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
        <AppText variant="title">{t('savings.title')}</AppText>

        <HeroCard style={{ marginTop: theme.spacing.md }}>
          <View style={styles.heroTop}>
            <AppText variant="micro" style={{ color: 'rgba(255,255,255,0.62)' }}>
              {t('savings.saved').toUpperCase()}
            </AppText>
            <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {`${completedCount}/${targets.length}`}
            </AppText>
          </View>

          <View style={{ marginTop: theme.spacing.sm }}>
            <Money value={totals.saved} size="money" color="#ffffff" />
          </View>

          <ProgressBar
            ratio={totals.goal > 0 ? totals.saved / totals.goal : 0}
            color={theme.colors.primaryBright}
            trackColor="rgba(255,255,255,0.16)"
            height={6}
            style={{ marginTop: theme.spacing.md }}
          />

          <View style={[styles.heroFooter, { marginTop: theme.spacing.sm }]}>
            <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.72)' }} tabular>
              {`${formatPercentage(totals.percentage, 0, language)} ${t('common.of')} ${formatCurrency(totals.goal)}`}
            </AppText>
            <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.72)' }} tabular>
              {`${t('savings.remaining')} ${formatCurrency(totals.remaining)}`}
            </AppText>
          </View>
        </HeroCard>

        <SectionHeader
          title={t('savings.title')}
          count={targets.length}
          actionLabel={t('savings.add')}
          onAction={openCreate}
        />

        {progressList.length === 0 ? (
          <Card>
            <EmptyState
              icon="flag-outline"
              title={t('savings.empty')}
              message={t('savings.empty_hint')}
              actionLabel={t('savings.add')}
              onAction={openCreate}
            />
          </Card>
        ) : (
          progressList.map((progress, index) => (
            <Stagger key={progress.target.id} index={index}>
              <SavingsCard
                progress={progress}
                onPress={() => router.push(`/savings/${progress.target.id}`)}
                onLongPress={() => setMenuProgress(progress)}
              />
            </Stagger>
          ))
        )}
      </ScrollView>

      <FAB onPress={openCreate} accessibilityLabel={t('savings.add')} />

      <BottomSheet
        visible={Boolean(menuProgress)}
        onClose={() => setMenuProgress(null)}
        title={menuProgress?.target.name}
        subtitle={menuProgress ? `${t('savings.saved')} ${formatCurrency(menuProgress.saved)}` : undefined}
      >
        <Button
          label={t('savings.detail')}
          variant="secondary"
          icon="open-outline"
          onPress={() => {
            const id = menuProgress?.target.id;
            setMenuProgress(null);
            if (id) router.push(`/savings/${id}`);
          }}
          style={{ marginBottom: theme.spacing.sm }}
        />
        <Button
          label={t('common.edit')}
          variant="secondary"
          icon="create-outline"
          onPress={() => {
            const progress = menuProgress;
            setMenuProgress(null);
            if (progress) {
              setEditing(progress.target);
              setFormOpen(true);
            }
          }}
          style={{ marginBottom: theme.spacing.sm }}
        />
        <Button
          label={t('common.delete')}
          variant="danger"
          icon="trash-outline"
          onPress={() => {
            const progress = menuProgress;
            setMenuProgress(null);
            if (!progress) return;
            if (progress.saved !== 0) {
              toast.warning(t('savings.delete_blocked'));
              return;
            }
            setPendingDelete(progress);
          }}
        />
      </BottomSheet>

      <AppModal
        visible={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? t('savings.edit') : t('savings.new')}
        subtitle={editing?.name}
      >
        <SavingsForm
          initial={editing ?? undefined}
          targets={targets}
          onSubmit={async (input) => {
            const result = editing ? await editTarget(editing.id, input) : await addTarget(input);
            if (result.ok) {
              toast.success(editing ? t('common.save_changes') : t('savings.add'));
              setFormOpen(false);
              setEditing(null);
            }
            return result;
          }}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      </AppModal>

      <ConfirmDialog
        visible={Boolean(pendingDelete)}
        title={t('savings.delete_confirm')}
        message={pendingDelete?.target.name}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
});
