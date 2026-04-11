import React from "react";
import Svg, { Line } from "react-native-svg";

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export default function BeatlyLogo({
  size = 24,
  color = "#ffffff",
  strokeWidth = 6,
}: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Line x1="20" y1="48" x2="20" y2="52" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="35" y1="32" x2="35" y2="68" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="50" y1="20" x2="50" y2="80" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="65" y1="36" x2="65" y2="64" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="80" y1="48" x2="80" y2="52" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}