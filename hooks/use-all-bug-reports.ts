import { useProfile } from "@/hooks/use-profile";
import { bugReportService } from "@/services/bugReportService";
import { BugReport, BugStatus } from "@/types/bugReport";
import { useCallback, useEffect, useState } from "react";

export type ReportFilter = "all" | "open" | "closed";

type State = {
  reports: BugReport[];
  loading: boolean;
  error: string | null;
};

export function useAllBugReports(initialFilter: ReportFilter = "all") {
  const { hasRole } = useProfile();
  const canSeeAll = hasRole("developer");

  const [filter, setFilter] = useState<ReportFilter>(initialFilter);
  const [state, setState] = useState<State>({
    reports: [],
    loading: true,
    error: null,
  });

  const refresh = useCallback(async (currentFilter: ReportFilter) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      let reports: BugReport[];
      if (canSeeAll) {
        const status = currentFilter === "all" ? undefined : (currentFilter as BugStatus);
        reports = await bugReportService.listAll({ status });
      } else {
        const all = await bugReportService.listMine();
        reports = currentFilter === "all"
          ? all
          : all.filter(r => r.status === currentFilter);
      }
      setState({ reports, loading: false, error: null });
    } catch (e: any) {
      setState({ reports: [], loading: false, error: e?.message ?? "load_failed" });
    }
  }, [canSeeAll]);

  useEffect(() => {
    refresh(filter);
  }, [filter, refresh]);

  const updateStatus = useCallback(async (reportId: string, newStatus: BugStatus) => {
    const updated = await bugReportService.updateStatus(reportId, { status: newStatus });
    setState(prev => ({
      ...prev,
      reports: prev.reports.map(r => (r.id === reportId ? updated : r)),
    }));
    return updated;
  }, []);

  return {
    reports: state.reports,
    loading: state.loading,
    error: state.error,
    filter,
    setFilter,
    refresh: () => refresh(filter),
    updateStatus,
    canSeeAll,
  };
}