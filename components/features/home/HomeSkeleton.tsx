import { SkeletonBox, SkeletonImage, SkeletonLine, SkeletonProvider } from "@/components/shared/skeletons/Skeleton";
import React from "react";
import { StyleSheet, View } from "react-native";

export default function HomeSkeleton() {
  return (
    <SkeletonProvider>
      <View style={styles.container}>
        {/* banner cards */}
        <View style={styles.bannerRow}>
          <SkeletonBox width={175} height={280} radius={18} />
          <SkeletonBox width={175} height={280} radius={18} />
        </View>

        {/* recientes - titulo + fila */}
        <View style={styles.section}>
          <SkeletonLine height={18} style={{ width: 200, marginBottom: 12 }} />
          <View style={styles.row}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={`r-${i}`} style={styles.recentItem}>
                <SkeletonImage width={56} height={56} radius={8} />
                <SkeletonLine height={10} style={{ width: 48, marginTop: 6 }} />
              </View>
            ))}
          </View>
        </View>

        {/* nuevos lanzamientos - titulo + fila de albums */}
        <View style={styles.section}>
          <SkeletonLine height={18} style={{ width: 180, marginBottom: 12 }} />
          <View style={styles.row}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={`a-${i}`} style={{ marginRight: 16 }}>
                <SkeletonImage width={120} height={120} radius={8} />
                <SkeletonLine height={12} style={{ width: 100, marginTop: 8 }} />
                <SkeletonLine height={10} style={{ width: 70, marginTop: 4 }} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </SkeletonProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e0e0e",
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  bannerRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 10,
    marginVertical: 12,
  },
  section: {
    marginTop: 12,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: "row",
  },
  recentItem: {
    alignItems: "center",
    marginRight: 12,
  },
});