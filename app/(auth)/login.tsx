/**
 * Login screen — local demo authentication.
 */
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useT } from '../../src/hooks/useTheme';
import { useAuth, useLoginFlow } from '../../src/hooks/useAuth';
import { AppText } from '../../src/components/ui/AppText';
import { Button } from '../../src/components/ui/Button';
import { Icon } from '../../src/components/ui/Icon';
import { Input } from '../../src/components/ui/Input';
import { useToast } from '../../src/components/ui/Toast';
import { StorageNotice } from '../../src/components/ui/StorageNotice';
import { APP_NAME } from '../../src/utils/constants';

export default function LoginScreen() {
  const theme = useTheme();
  const t = useT();
  const toast = useToast();
  const { error, isSubmitting } = useAuth();
  const { submitLogin } = useLoginFlow();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = async () => {
    setFieldErrors({});
    const result = await submitLogin(email, password);
    if (!result.ok) {
      setFieldErrors({ email: error ? t(error as never) : undefined });
      toast.error(result.error);
    } else {
      toast.success(t('nav.home'));
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { padding: theme.spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <View
              style={[
                styles.logo,
                {
                  backgroundColor: theme.colors.heroGradient[1],
                  borderRadius: 18,
                },
              ]}
            >
              <Icon name="shield-checkmark" size={26} color="#ffffff" />
            </View>
            <AppText variant="title" style={{ marginTop: theme.spacing.lg }}>
              {APP_NAME}
            </AppText>
            <AppText variant="small" tone="muted" style={{ marginTop: 3 }}>
              {t('app.tagline')}
            </AppText>
          </View>

          <View
            style={[
              styles.card,
              {
                // Borderless surface: one flat panel separated by rhythm, not outline.
                backgroundColor: theme.colors.card,
                borderRadius: theme.radius.xl,
                padding: theme.spacing.xl,
                marginTop: theme.spacing.xl,
              },
            ]}
          >
            <AppText variant="title">{t('auth.login.title')}</AppText>
            <AppText variant="small" tone="muted" style={{ marginTop: 4, marginBottom: theme.spacing.lg }}>
              {t('auth.login.subtitle')}
            </AppText>

            <Input
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              placeholder="nama@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon="mail-outline"
              error={fieldErrors.email}
            />

            <Input
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••"
              secureTextEntry
              leftIcon="lock-closed-outline"
              error={fieldErrors.password}
              onSubmitEditing={handleSubmit}
              returnKeyType="go"
            />

            <Button
              label={t('auth.login_action')}
              onPress={handleSubmit}
              loading={isSubmitting}
              fullWidth
              icon="log-in-outline"
              style={{ marginTop: theme.spacing.sm }}
            />

            <Pressable
              onPress={() => router.push('/(auth)/register')}
              style={{ marginTop: theme.spacing.lg, alignItems: 'center' }}
            >
              <AppText variant="small" tone="primary" weight="semibold">
                {t('auth.to_register')}
              </AppText>
            </Pressable>
          </View>

          <StorageNotice compact style={{ marginTop: theme.spacing.lg }} />

          <View style={[styles.demoNote, { marginTop: theme.spacing.lg }]}>
            <Icon name="information-circle-outline" size={14} color={theme.colors.textMuted} />
            <AppText variant="caption" tone="muted" style={{ marginLeft: 6, flex: 1 }}>
              {t('auth.demo_note')}
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center' },
  brand: {},
  logo: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  card: {},
  demoNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
