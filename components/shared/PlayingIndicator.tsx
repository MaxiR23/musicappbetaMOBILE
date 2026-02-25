import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface PlayingIndicatorProps {
  color?: string;
  size?: number;
  isPlaying: boolean;
}

export default function PlayingIndicator({ 
  color = '#b0b0b0', 
  size = 14,
  isPlaying
}: PlayingIndicatorProps) {
  const scale1 = useSharedValue(0.3);
  const scale2 = useSharedValue(0.3);
  const scale3 = useSharedValue(0.3);

  useEffect(() => {
    if (isPlaying) {
      scale1.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 830, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.5, { duration: 840, easing: Easing.inOut(Easing.sin) })
        ),
        -1
      );

      scale2.value = withDelay(
        100,
        withRepeat(
          withSequence(
            withTiming(0.85, { duration: 730, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.4, { duration: 760, easing: Easing.inOut(Easing.sin) })
          ),
          -1
        )
      );

      scale3.value = withDelay(
        200,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 650, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.6, { duration: 660, easing: Easing.inOut(Easing.sin) })
          ),
          -1
        )
      );
    } else {
      scale1.value = withTiming(0.3, { duration: 300 });
      scale2.value = withTiming(0.3, { duration: 350 });
      scale3.value = withTiming(0.3, { duration: 400 });
    }
  }, [isPlaying]);

  const bar1Style = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale1.value }],
  }));

  const bar2Style = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale2.value }],
  }));

  const bar3Style = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale3.value }],
  }));

  const barWidth = size / 4.5;

  return (
    <View style={[styles.container, { height: size }]}>
      <Animated.View 
        style={[
          styles.bar, 
          { backgroundColor: color, width: barWidth, height: size },
          bar1Style
        ]} 
      />
      <Animated.View 
        style={[
          styles.bar, 
          { backgroundColor: color, width: barWidth, height: size },
          bar2Style
        ]} 
      />
      <Animated.View 
        style={[
          styles.bar, 
          { backgroundColor: color, width: barWidth, height: size },
          bar3Style
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