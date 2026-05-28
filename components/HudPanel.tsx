import { StyleSheet, View, type ViewProps } from 'react-native';

import { useHudScale } from './HudScaleProvider';

export function HudPanel({ style, ...props }: ViewProps) {
  const { scaleHud } = useHudScale();

  return (
    <View
      {...props}
      style={[
        styles.panel,
        { borderRadius: scaleHud(10), padding: scaleHud(14) },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: 'rgba(36, 199, 214, 0.26)',
    backgroundColor: 'rgba(5, 15, 30, 0.7)',
  },
});
