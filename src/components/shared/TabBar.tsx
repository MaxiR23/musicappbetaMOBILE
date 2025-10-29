// src/components/shared/TabBar.tsx
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export interface Tab {
  /** ID único del tab */
  id: string;
  /** Label a mostrar */
  label: string;
}

interface TabBarProps {
  /** Array de tabs */
  tabs: Tab[];
  /** ID del tab activo */
  activeTabId: string;
  /** Callback al cambiar de tab */
  onTabChange: (tabId: string) => void;
  /** Si los tabs deben hacer scroll horizontal (default: true cuando hay muchos tabs) */
  scrollable?: boolean;
}

/**
 * TabBar horizontal reutilizable.
 * Hace scroll automático cuando hay muchos tabs.
 * 
 * @example
 * const tabs = [
 *   { id: "albums", label: "Albums" },
 *   { id: "singles", label: "Singles & EPs" },
 * ];
 * 
 * <TabBar 
 *   tabs={tabs}
 *   activeTabId={activeTab}
 *   onTabChange={setActiveTab}
 * />
 * 
 * @example
 * // Con tabs dinámicos (categories)
 * const tabs = categories.map(cat => ({ id: cat, label: cat }));
 * <TabBar tabs={tabs} activeTabId={activeCategory} onTabChange={setActiveCategory} />
 */
export default function TabBar({
  tabs,
  activeTabId,
  onTabChange,
  scrollable = true,
}: TabBarProps) {
  const content = (
    <View style={styles.tabsRow}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.id}
          onPress={() => onTabChange(tab.id)}
          style={[styles.tab, activeTabId === tab.id && styles.tabActive]}
        >
          <Text
            style={[
              styles.tabText,
              activeTabId === tab.id && styles.tabTextActive,
            ]}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        {content}
      </ScrollView>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  scrollView: {
    marginTop: 4,
    maxHeight: 56,
    flexGrow: 0,
    flexShrink: 0,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  tab: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#1e1e1e",
    justifyContent: "center",
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#fff",
  },
  tabText: {
    color: "#ddd",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#000",
  },
});