import { StyleSheet, View, type ViewProps } from 'react-native';

export function HudPanel({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.panel, style]} />;
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: 'rgba(36, 199, 214, 0.26)',
    borderRadius: 10,
    backgroundColor: 'rgba(5, 15, 30, 0.7)',
    padding: 14,
  },
});
