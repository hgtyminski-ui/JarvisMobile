import { StyleSheet, View } from 'react-native';

const DOTS = Array.from({ length: 90 }, (_, index) => index);

export function HudBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.vignette} />
      <View style={styles.dotLayer}>
        {DOTS.map((dot) => (
          <View
            key={dot}
            style={[
              styles.dot,
              {
                left: `${(dot * 17) % 100}%`,
                top: `${(dot * 29) % 100}%`,
                opacity: dot % 7 === 0 ? 0.3 : 0.11,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#030814',
  },
  dotLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  dot: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#0c8fa4',
  },
});
