import { useQuery } from "@tanstack/react-query";

import { getMainPageApi } from "@/api/api";
import { mapPreferenceDashboardData } from "@/features/main/utils/mainPageMappers";
import type { RegionDashboardSource } from "@/features/main/utils/mainRegionResolver";

interface UsePreferenceDashboardDataOptions {
  source: RegionDashboardSource;
  guCode: string;
  userId?: string;
  enabled?: boolean;
}

export function usePreferenceDashboardData({
  source,
  guCode,
  userId,
  enabled = true,
}: UsePreferenceDashboardDataOptions) {
  const normalizedCode = guCode.trim();
  const isValidCode = Boolean(normalizedCode && /^\d+$/.test(normalizedCode));

  return useQuery({
    queryKey: ["main-page", "region-dashboard", source, userId || "guest", normalizedCode],
    queryFn: async () => {
      if (!isValidCode) {
        throw new Error("유효하지 않은 자치구 코드입니다.");
      }
      return mapPreferenceDashboardData(await getMainPageApi({ guCode: normalizedCode }));
    },
    enabled: enabled && isValidCode,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
