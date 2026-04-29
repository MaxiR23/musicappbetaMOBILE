import { bugReportService } from "@/services/bugReportService";
import { BugReport, BugReportCreate } from "@/types/bugReport";
import { useCallback, useEffect, useState } from "react";

type State = {
  reports: BugReport[];
  loading: boolean;
  error: string | null;
};

export function useBugReports() {
  const [state, setState] = useState<State>({
    reports: [],
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const reports = await bugReportService.listMine();
      setState({ reports, loading: false, error: null });
    } catch (e: any) {
      setState({ reports: [], loading: false, error: e?.message ?? "load_failed" });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submit = useCallback(async (payload: BugReportCreate): Promise<BugReport> => {
    const created = await bugReportService.create(payload);
    setState(prev => ({ ...prev, reports: [created, ...prev.reports] }));
    return created;
  }, []);

  return {
    reports: state.reports,
    loading: state.loading,
    error: state.error,
    refresh,
    submit,
  };
}