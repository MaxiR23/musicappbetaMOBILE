// src/components/shared/PlayingIndicator.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

interface PlayingIndicatorProps {
  color?: string;
  size?: number;
  isPlaying: boolean;
}

export default function PlayingIndicator({ 
  color = '#4a9eff', 
  size = 14,
  isPlaying
}: PlayingIndicatorProps) {
  const bar1 = useRef(new Animated.Value(0.05)).current;
  const bar2 = useRef(new Animated.Value(0.05)).current;
  const bar3 = useRef(new Animated.Value(0.05)).current;
  
  const loop1 = useRef<Animated.CompositeAnimation | null>(null);
  const loop2 = useRef<Animated.CompositeAnimation | null>(null);
  const loop3 = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isPlaying) {
      // LOOP 1 - empieza DIRECTO desde 0.05
      loop1.current = Animated.loop(
        Animated.sequence([
          Animated.timing(bar1, {
            toValue: 0.9,
            duration: 830,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(bar1, {
            toValue: 0.5,
            duration: 840,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      );
      loop1.current.start();

      // LOOP 2 - con delay para desincronizar
      setTimeout(() => {
        loop2.current = Animated.loop(
          Animated.sequence([
            Animated.timing(bar2, {
              toValue: 0.75,
              duration: 730,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: false,
            }),
            Animated.timing(bar2, {
              toValue: 0.35,
              duration: 760,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: false,
            }),
          ])
        );
        loop2.current.start();
      }, 100);

      // LOOP 3 - con otro delay
      setTimeout(() => {
        loop3.current = Animated.loop(
          Animated.sequence([
            Animated.timing(bar3, {
              toValue: 0.95,
              duration: 650,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: false,
            }),
            Animated.timing(bar3, {
              toValue: 0.6,
              duration: 660,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: false,
            }),
          ])
        );
        loop3.current.start();
      }, 200);
      
    } else {
      // Pausado
      if (loop1.current) loop1.current.stop();
      if (loop2.current) loop2.current.stop();
      if (loop3.current) loop3.current.stop();
      
      Animated.parallel([
        Animated.timing(bar1, {
          toValue: 0.05,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(bar2, {
          toValue: 0.05,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(bar3, {
          toValue: 0.05,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    }

    return () => {
      if (loop1.current) loop1.current.stop();
      if (loop2.current) loop2.current.stop();
      if (loop3.current) loop3.current.stop();
    };
  }, [isPlaying]);

  return (
    <View style={[styles.container, { height: size }]}>
      <Animated.View
        style={[
          styles.bar,
          {
            backgroundColor: color,
            width: size / 4.5,
            height: bar1.interpolate({
              inputRange: [0, 1],
              outputRange: ['30%', '100%'],
            }),
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bar,
          {
            backgroundColor: color,
            width: size / 4.5,
            height: bar2.interpolate({
              inputRange: [0, 1],
              outputRange: ['30%', '100%'],
            }),
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bar,
          {
            backgroundColor: color,
            width: size / 4.5,
            height: bar3.interpolate({
              inputRange: [0, 1],
              outputRange: ['30%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    justifyContent: 'center',
  },
  bar: {
    borderRadius: 2,
  },
});