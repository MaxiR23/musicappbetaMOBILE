import React from "react";
import { View } from "react-native";
import Svg, { Line } from "react-native-svg";

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  withBackground?: boolean;
  backgroundColor?: string;
};

export default function BeatlyLogo({
  size = 24,
  color,
  strokeWidth = 6,
  withBackground = false,
  backgroundColor = "#fff",
}: Props) {
  const iconColor = color ?? (withBackground ? "#1a2744" : "#ffffff");

  if (withBackground) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Svg width={size * 0.55} height={size * 0.55} viewBox="0 0 100 100" fill="none">
          <Line x1="20" y1="48" x2="20" y2="52" stroke={iconColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Line x1="35" y1="32" x2="35" y2="68" stroke={iconColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Line x1="50" y1="20" x2="50" y2="80" stroke={iconColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Line x1="65" y1="36" x2="65" y2="64" stroke={iconColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Line x1="80" y1="48" x2="80" y2="52" stroke={iconColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      </View>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Line x1="20" y1="48" x2="20" y2="52" stroke={iconColor} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="35" y1="32" x2="35" y2="68" stroke={iconColor} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="50" y1="20" x2="50" y2="80" stroke={iconColor} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="65" y1="36" x2="65" y2="64" stroke={iconColor} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="80" y1="48" x2="80" y2="52" stroke={iconColor} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}