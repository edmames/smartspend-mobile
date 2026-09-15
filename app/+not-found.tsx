/**
 * Fallback route for unmatched deep links.
 */
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme, useT } from '../src/hooks/useTheme';
import { AppText } from '../src/components/ui/AppText';
import { Button } from '../src/components/ui/Button';
import { Icon } from '../src/components/ui/Icon';

export default function NotFoundScreen() {
  const theme = useTheme();
  const t = useT();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, padding: theme.spacing.xl }]}>
      <Icon name="alert-circle-outline" size={44} color={theme.colors.warning} />
      <AppText variant="title" style={{ marginTop: theme.spacing.lg }}>
        404
      </AppText>
      <AppText variant="small" tone="muted" align="center" style={{ marginTop: 6 }}>
        {t('common.error')}
      </AppText>
      <Button label={t('nav.home')} onPress={() => router.replace('/(tabs)')} style={{ marginTop: theme.spacing.xl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
