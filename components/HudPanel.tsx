import { StyleSheet, View, type ViewProps } from 'react-native';

export function HudPanel({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.panel, style]} />;
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: '#1e3569',
    borderRadius: 8,
    backgroundColor: '#081322',
    padding: 18,
  },
});
