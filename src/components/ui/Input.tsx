/**
 * Text input with label, error/helper states, optional icon slots and a
 * password visibility toggle.
 */
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  /** Prefix rendered inside the field (e.g. "Rp"). */
  prefix?: string;
  suffix?: string;
}

export function Input({
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  prefix,
  suffix,
  secureTextEntry,
  editable = true,
  ...rest
}: InputProps) {
  const theme = useTheme();
  const { colors, radius, spacing, fontSize } = theme;
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const isPassword = Boolean(secureTextEntry);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={[{ marginBottom: spacing.md }, containerStyle]}>
      {label ? (
        <AppText variant="micro" tone="faint" style={{ marginBottom: 6, textTransform: 'uppercase' }}>
          {label}
        </AppText>
      ) : null}

      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.inputBackground,
            borderRadius: radius.md,
            borderColor,
            // Hairline at rest; the focus ring is a tinted underlay instead of a
            // thicker border, so the field never nudges or reflows on focus.
            borderWidth: 1,
            paddingHorizontal: spacing.lg,
            opacity: editable ? 1 : theme.opacity.disabled,
          },
          focused ? styles.focusRing : null,
          focused && error ? { backgroundColor: `${colors.danger}0d` } : null,
        ]}
      >
        {leftIcon ? (
          <Icon name={leftIcon} size={18} color={focused ? colors.primary : colors.textFaint} style={{ marginRight: spacing.sm }} />
        ) : null}

        {prefix ? (
          <AppText variant="body" weight="semibold" tone="muted" style={{ marginRight: 6 }}>
            {prefix}
          </AppText>
        ) : null}

        <TextInput
          {...rest}
          editable={editable}
          secureTextEntry={isPassword && !revealed}
          onFocus={(event) => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.primary}
          style={[
            styles.input,
            { color: colors.text, fontSize: fontSize.bodyLarge },
            rest.multiline ? { minHeight: 80, paddingTop: spacing.sm, textAlignVertical: 'top' } : null,
          ]}
        />

        {suffix ? (
          <AppText variant="body" tone="muted" style={{ marginLeft: 6 }}>
            {suffix}
          </AppText>
        ) : null}

        {isPassword ? (
          <Pressable onPress={() => setRevealed((value) => !value)} hitSlop={10} accessibilityLabel="Toggle password">
            <Icon name={revealed ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
          </Pressable>
        ) : rightIcon ? (
          <Pressable onPress={onRightIconPress} hitSlop={10} disabled={!onRightIconPress}>
            <Icon name={rightIcon} size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={styles.messageRow}>
          <Icon name="alert-circle-outline" size={14} color={colors.danger} style={{ marginRight: 4 }} />
          <AppText variant="small" tone="danger" style={{ flex: 1 }}>
            {error}
          </AppText>
        </View>
      ) : helper ? (
        <AppText variant="small" tone="muted" style={{ marginTop: spacing.xs }}>
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  focusRing: {
    backgroundColor: 'rgba(20, 184, 166, 0.07)',
    shadowColor: '#14b8a6',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  input: {
    flex: 1,
    paddingVertical: 11,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
});

export default Input;
