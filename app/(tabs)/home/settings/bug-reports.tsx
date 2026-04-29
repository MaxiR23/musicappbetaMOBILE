import TrackActionsSheet from "@/components/shared/TrackActionsSheet";
import { useAllBugReports } from "@/hooks/use-all-bug-reports";
import { BugCategory, BugReport } from "@/types/bugReport";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CATEGORY_COLORS: Record<BugCategory, string> = {
  playback: "#3b82f6",
  loading: "#f59e0b",
  ui: "#8b5cf6",
  crash: "#ef4444",
  other: "#6b7280",
};

export default function BugReportsScreen() {
  const router = useRouter();
  const { t } = useTranslation("bugReport");
  const { reports, loading, error, filter, setFilter, updateStatus, canSeeAll } = useAllBugReports();

  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const screenTitle = canSeeAll ? t("adminList.title") : t("myReports.title");

  const openDetail = (report: BugReport) => {
    setSelectedReport(report);
    setSheetOpen(true);
  };

  const handleToggleStatus = async () => {
    if (!selectedReport) return;
    const newStatus = selectedReport.status === "open" ? "closed" : "open";
    try {
      await updateStatus(selectedReport.id, newStatus);
      setSheetOpen(false);
      setSelectedReport(null);
    } catch {
      Alert.alert(t("error.title"), t("error.submitFailed"));
    }
  };

  const emptyMessage = canSeeAll ? t("adminList.empty") : t("myReports.empty");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Header onBack={() => router.back()} title={screenTitle} />

      <View style={styles.filterRow}>
        <FilterChip active={filter === "all"} label={t("adminList.filterAll")} onPress={() => setFilter("all")} />
        <FilterChip active={filter === "open"} label={t("adminList.filterOpen")} onPress={() => setFilter("open")} />
        <FilterChip active={filter === "closed"} label={t("adminList.filterClosed")} onPress={() => setFilter("closed")} />
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator color="#fff" />
          <Text style={styles.loadingText}>{t("adminList.loading")}</Text>
        </View>
      ) : error ? (
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>{t("error.loadFailed")}</Text>
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.centerWrap}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ReportRow report={item} showReporter={canSeeAll} onPress={() => openDetail(item)} />
          )}
        />
      )}

      <TrackActionsSheet
        open={sheetOpen}
        onOpenChange={(v) => {
          setSheetOpen(v);
          if (!v) setSelectedReport(null);
        }}
        track={null}
        headerTitle={selectedReport ? t(`categories.${selectedReport.category}`) : ""}
        subtitle={selectedReport?.description ?? ""}
        showAddTo={false}
        showRemove={false}
        showShare={false}
        extraActions={selectedReport && canSeeAll ? [
          {
            key: "toggle-status",
            label: selectedReport.status === "open" ? t("adminList.actions.close") : t("adminList.actions.reopen"),
            icon: selectedReport.status === "open" ? "checkmark-circle-outline" : "refresh-outline",
            onPress: handleToggleStatus,
          },
        ] : []}
      />
    </SafeAreaView>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.backButton}>
        <Ionicons name="chevron-back" size={26} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.backButton} />
    </View>
  );
}

function FilterChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ReportRow({
  report,
  showReporter,
  onPress,
}: {
  report: BugReport;
  showReporter: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation("bugReport");
  const reporterName = report.reporter?.display_name || report.reporter?.username || "—";
  const dateLabel = new Date(report.created_at).toLocaleDateString();
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.rowHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[report.category] }]}>
          <Text style={styles.categoryBadgeText}>{t(`categories.${report.category}`)}</Text>
        </View>
        <View style={[styles.statusDot, report.status === "open" ? styles.statusOpen : styles.statusClosed]} />
      </View>
      <Text style={styles.description} numberOfLines={2}>{report.description}</Text>
      <View style={styles.rowFooter}>
        {showReporter ? (
          <Text style={styles.metaText}>{reporterName}</Text>
        ) : (
          <View />
        )}
        <Text style={styles.metaText}>{dateLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0e0e0e" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 12 },
  backButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  filterChipActive: { backgroundColor: "#fff", borderColor: "#fff" },
  filterChipText: { color: "#fff", fontSize: 13, fontWeight: "500" },
  filterChipTextActive: { color: "#000", fontWeight: "700" },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  row: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  rowHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  categoryBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusOpen: { backgroundColor: "#10b981" },
  statusClosed: { backgroundColor: "#6b7280" },
  description: { color: "#fff", fontSize: 14, lineHeight: 19, marginBottom: 10 },
  rowFooter: { flexDirection: "row", justifyContent: "space-between" },
  metaText: { color: "#9ca3af", fontSize: 12 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  loadingText: { color: "#9ca3af", fontSize: 14 },
  errorText: { color: "#ef4444", fontSize: 14 },
});