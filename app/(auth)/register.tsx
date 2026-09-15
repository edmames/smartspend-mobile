/**
 * Register screen — creates a local demo account.
 */
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useT } from '../../src/hooks/useTheme';
import { useLoginFlow } from '../../src/hooks/useAuth';
import { AppText } from '../../src/components/ui/AppText';
import { Button } from '../../src/components/ui/Button';
import { Icon } from '../../src/components/ui/Icon';
import { Input } from '../../src/components/ui/Input';
import { useToast } from '../../src/components/ui/Toast';
import { StorageNotice } from '../../src/components/ui/StorageNotice';
import { passwordStrength, validateRegisterInput } from '../../src/utils/validation';
import { MAX_NAME_LENGTH } from '../../src/utils/constants';

export default function RegisterScreen() {
  const theme = useTheme();
  const t = useT();
  const toast = useToast();
  const { submitRegister } = useLoginFlow();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const strength = passwordStrength(password);
  const strengthLabels = ['', t('common.loading'), t('budget.status.warning'), t('report.net_positive'), t('savings.completed')];
  const strengthColors = [
    theme.colors.border,
    theme.colors.danger,
    theme.colors.warning,
    theme.colors.primary,
    theme.colors.success,
  ];

  const handleSubmit = async () => {
    setErrors({});
    const validation = validateRegisterInput(
      { name, email, password, confirmPassword },
      { wallets: [], targets: [], budgets: [] },
    );

    if (!validation.ok) {
      const mapped: Partial<Record<string, string>> = {};
      for (const [field, code] of Object.entries(validation.errors)) {
        mapped[field] = t(`error.${code}` as never);
      }
      setErrors(mapped);
      return;
    }

    setSubmitting(true);
    const result = await submitRegister(email, password, name);
    setSubmitting(false);
    if (!result.ok) {
      setErrors({ form: result.error });
      toast.error(result.error);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { padding: theme.spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <AppText variant="title">{t('auth.register.title')}</AppText>
            <AppText variant="small" tone="muted" style={{ marginTop: 3 }}>
              {t('auth.register.subtitle')}
            </AppText>
          </View>

          <StorageNotice compact style={{ marginTop: theme.spacing.lg }} />

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.card,
                borderRadius: theme.radius.xl,
                padding: theme.spacing.xl,
                marginTop: theme.spacing.lg,
              },
            ]}
          >
            <Input
              label={t('auth.name')}
              value={name}
              onChangeText={setName}
              placeholder="Budi Santoso"
              leftIcon="person-outline"
              autoCapitalize="words"
              maxLength={MAX_NAME_LENGTH}
              error={errors.name}
            />

            <Input
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              placeholder="nama@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail-outline"
              error={errors.email}
            />

            <Input
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••"
              secureTextEntry
              leftIcon="lock-closed-outline"
              error={errors.password}
            />

            {password ? (
              <View style={[styles.strengthRow, { marginTop: -6, marginBottom: theme.spacing.md }]}>
                {[0, 1, 2, 3].map((index) => (
                  <View
                    key={index}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor: index < strength ? strengthColors[strength] : theme.colors.border,
                      },
                    ]}
                  />
                ))}
                <AppText variant="caption" tone="muted" style={{ marginLeft: 8 }}>
                  {strengthLabels[strength]}
                </AppText>
              </View>
            ) : null}

            <Input
              label={t('auth.confirm_password')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••"
              secureTextEntry
              leftIcon="lock-closed-outline"
              error={errors.confirmPassword}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />

            {errors.form ? (
              <View style={[styles.errorBox, { backgroundColor: `${theme.colors.danger}18`, borderRadius: theme.radius.md }]}>
                <Icon name="alert-circle-outline" size={16} color={theme.colors.danger} />
                <AppText variant="small" tone="danger" style={{ flex: 1, marginLeft: 8 }}>
                  {errors.form}
                </AppText>
              </View>
            ) : null}

            <Button
              label={t('auth.register_action')}
              onPress={handleSubmit}
              loading={submitting}
              fullWidth
              icon="person-outline"
            />

            <Pressable onPress={() => router.back()} style={{ marginTop: theme.spacing.lg, alignItems: 'center' }}>
              <AppText variant="small" tone="primary" weight="semibold">
                {t('auth.to_login')}
              </AppText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center' },
  header: {},
  card: {},
  strengthRow: { flexDirection: 'row', alignItems: 'center' },
  strengthBar: { flex: 1, height: 4, borderRadius: 2, marginRight: 4 },
  errorBox: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 12 },
});
