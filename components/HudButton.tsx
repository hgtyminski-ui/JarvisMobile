import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useHudScale } from './HudScaleProvider';

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
  const { scaleHud, scaleText } = useHudScale();

  return (
    <Pressable
      {...props}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        {
          minHeight: scaleHud(38),
          borderRadius: scaleHud(9),
          paddingHorizontal: scaleHud(10),
        },
        active && styles.active,
        (pressed || disabled) && styles.pressed,
        style,
      ]}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        style={[
          styles.text,
          { fontSize: scaleText(13), lineHeight: scaleText(16) },
          variant === 'primary' && styles.primaryText,
          active && styles.activeText,
        ]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primary: {
    borderColor: 'rgba(36, 199, 214, 0.64)',
    backgroundColor: 'rgba(3, 136, 156, 0.06)',
  },
  secondary: {
    borderColor: 'rgba(140, 117, 201, 0.58)',
    backgroundColor: 'rgba(84, 58, 142, 0.08)',
  },
  danger: {
    borderColor: 'rgba(205, 73, 115, 0.68)',
    backgroundColor: 'rgba(120, 28, 58, 0.08)',
  },
  ghost: {
    borderColor: 'rgba(36, 199, 214, 0.18)',
    backgroundColor: 'rgba(6, 18, 36, 0.5)',
  },
  active: {
    borderColor: 'rgba(36, 199, 214, 0.72)',
    backgroundColor: 'rgba(36, 199, 214, 0.1)',
  },
  pressed: {
    opacity: 0.55,
  },
  text: {
    color: '#8d75c9',
    fontWeight: '900',
    textAlign: 'center',
  },
  primaryText: {
    color: '#24c7d6',
  },
  activeText: {
    color: '#24c7d6',
  },
});
