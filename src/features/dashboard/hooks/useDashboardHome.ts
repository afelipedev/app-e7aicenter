import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardHomeService } from "../services/dashboardHomeService";
import type { DashboardPeriodId } from "../types";

export function useDashboardHome(period: DashboardPeriodId) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: ["dashboard", "home", userId, period],
    queryFn: () => DashboardHomeService.getHome(period),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}
