import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { useHudScale } from './HudScaleProvider';

type JarvisRadarProps = {
  stateLabel: string;
  active?: boolean;
};

export function JarvisRadar({ stateLabel, active = true }: JarvisRadarProps) {
  const { scaleHud, scaleText } = useHudScale();
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
    <View style={[styles.wrap, { width: scaleHud(184), paddingVertical: scaleHud(16) }]}>
      <View style={styles.cornerTopLeft} />
      <View style={styles.cornerTopRight} />
      <View style={styles.cornerBottomLeft} />
      <View style={styles.cornerBottomRight} />

      <Animated.View
        style={[
          styles.radar,
          { width: scaleHud(132), height: scaleHud(132) },
          {
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
          },
        ]}>
        <View style={[styles.ring, { width: scaleHud(132), height: scaleHud(132) }]} />
        <View style={[styles.ring, { width: scaleHud(94), height: scaleHud(94) }]} />
        <View style={[styles.ring, { width: scaleHud(52), height: scaleHud(52) }]} />
        <View style={[styles.crossVertical, { height: scaleHud(132) }]} />
        <View style={[styles.crossHorizontal, { width: scaleHud(132) }]} />
        <Animated.View style={[styles.sweep, { width: scaleHud(132), height: scaleHud(132), transform: [{ rotate: spin }] }]}>
          <View style={[styles.sweepLine, { left: scaleHud(66), top: scaleHud(66), width: scaleHud(54) }]} />
        </Animated.View>
        <View style={[styles.signalDot, { right: scaleHud(42), top: scaleHud(42), width: scaleHud(8), height: scaleHud(8), borderRadius: scaleHud(4) }]} />
        <View style={[styles.coreGlow, { width: scaleHud(34), height: scaleHud(34), borderRadius: scaleHud(17) }]} />
        <View style={[styles.core, { width: scaleHud(18), height: scaleHud(18), borderRadius: scaleHud(9), borderWidth: scaleHud(3) }]} />
      </Animated.View>

      <Text selectable style={[styles.label, { marginTop: scaleHud(14), fontSize: scaleText(11) }]}>
        {stateLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  radar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(36, 199, 214, 0.28)',
    borderRadius: 999,
  },
  crossVertical: {
    position: 'absolute',
    width: 1,
    backgroundColor: 'rgba(36, 199, 214, 0.14)',
  },
  crossHorizontal: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(36, 199, 214, 0.14)',
  },
  sweep: {
    position: 'absolute',
  },
  sweepLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#24c7d6',
  },
  signalDot: {
    position: 'absolute',
    backgroundColor: '#1fd19b',
  },
  coreGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(36, 199, 214, 0.12)',
  },
  core: {
    borderColor: '#24c7d6',
    backgroundColor: '#061224',
  },
  label: {
    color: '#24c7d6',
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
