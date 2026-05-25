import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type HudButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type HudButtonProps = PressableProps & {
  title: string;
  active?: boolean;
  variant?: HudButtonVariant;
  style?: StyleProp<ViewStyle>;
};

export function HudButton({
  title,
  active = false,
  variant = 'primary',
  disabled,
  style,
  ...props
}: HudButtonProps) {
  return (
    <Pressable
      {...props}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        active && styles.active,
        (pressed || disabled) && styles.pressed,
        style,
      ]}>
      <Text style={[styles.text, variant === 'primary' && styles.primaryText, active && styles.activeText]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  primary: {
    backgroundColor: '#22f2ff',
  },
  secondary: {
    borderWidth: 1,
    borderColor: '#9b7cff',
    backgroundColor: '#110d28',
  },
  danger: {
    borderWidth: 1,
    borderColor: '#ff5b8a',
    backgroundColor: '#1b0815',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  active: {
    backgroundColor: '#22f2ff',
  },
  pressed: {
    opacity: 0.55,
  },
  text: {
    color: '#dbcfff',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  primaryText: {
    color: '#03101a',
  },
  activeText: {
    color: '#03101a',
  },
});
