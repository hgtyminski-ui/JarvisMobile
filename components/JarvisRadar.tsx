import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type JarvisRadarProps = {
  stateLabel: string;
  active?: boolean;
};

export function JarvisRadar({ stateLabel, active = true }: JarvisRadarProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: active ? 1200 : 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: active ? 1200 : 1800,
          useNativeDriver: true,
        }),
      ])
    );

    const rotateLoop = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: active ? 4200 : 7000,
        useNativeDriver: true,
      })
    );

    pulseLoop.start();
    rotateLoop.start();

    return () => {
      pulseLoop.stop();
      rotateLoop.stop();
    };
  }, [active, pulse, rotate]);

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  });
  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.cornerTopLeft} />
      <View style={styles.cornerTopRight} />
      <View style={styles.cornerBottomLeft} />
      <View style={styles.cornerBottomRight} />

      <Animated.View
        style={[
          styles.radar,
          {
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
          },
        ]}>
        <View style={[styles.ring, styles.outerRing]} />
        <View style={[styles.ring, styles.midRing]} />
        <View style={[styles.ring, styles.innerRing]} />
        <View style={styles.crossVertical} />
        <View style={styles.crossHorizontal} />
        <Animated.View style={[styles.sweep, { transform: [{ rotate: spin }] }]}>
          <View style={styles.sweepLine} />
        </Animated.View>
        <View style={styles.signalDot} />
        <View style={styles.coreGlow} />
        <View style={styles.core} />
      </Animated.View>

      <Text selectable style={styles.label}>
        {stateLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 184,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  radar: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(36, 199, 214, 0.28)',
    borderRadius: 999,
  },
  outerRing: {
    width: 132,
    height: 132,
  },
  midRing: {
    width: 94,
    height: 94,
  },
  innerRing: {
    width: 52,
    height: 52,
  },
  crossVertical: {
    position: 'absolute',
    width: 1,
    height: 132,
    backgroundColor: 'rgba(36, 199, 214, 0.14)',
  },
  crossHorizontal: {
    position: 'absolute',
    width: 132,
    height: 1,
    backgroundColor: 'rgba(36, 199, 214, 0.14)',
  },
  sweep: {
    position: 'absolute',
    width: 132,
    height: 132,
  },
  sweepLine: {
    position: 'absolute',
    left: 66,
    top: 66,
    width: 54,
    height: 2,
    backgroundColor: '#24c7d6',
  },
  signalDot: {
    position: 'absolute',
    right: 42,
    top: 42,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1fd19b',
  },
  coreGlow: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(36, 199, 214, 0.12)',
  },
  core: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#24c7d6',
    backgroundColor: '#061224',
  },
  label: {
    marginTop: 14,
    color: '#24c7d6',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
  },
  cornerTopLeft: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: 18,
    height: 18,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: '#0f9eb8',
  },
  cornerTopRight: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 18,
    height: 18,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderColor: '#0f9eb8',
  },
  cornerBottomLeft: {
    position: 'absolute',
    left: 4,
    bottom: 28,
    width: 18,
    height: 18,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#0f9eb8',
  },
  cornerBottomRight: {
    position: 'absolute',
    right: 4,
    bottom: 28,
    width: 18,
    height: 18,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#0f9eb8',
  },
});
