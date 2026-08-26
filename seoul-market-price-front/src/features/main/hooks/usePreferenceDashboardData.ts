import { useQuery } from "@tanstack/react-query";

import { getMainPageApi } from "@/api/api";
import { mapPreferenceDashboardData } from "@/features/main/utils/mainPageMappers";

interface UsePreferenceDashboardDataOptions {
  userId?: string;
  myGuCode?: string | null;
  enabled: boolean;
}

export function usePreferenceDashboardData({
  userId,
  myGuCode,
  enabled,
}: UsePreferenceDashboardDataOptions) {
  const normalizedCode = myGuCode?.trim();
  const guCode = normalizedCode && /^\d+$/.test(normalizedCode)
    ? normalizedCode
    : undefined;

  return useQuery({
    queryKey: ["main-page", "preference", userId ?? "anonymous", guCode ?? "none"],
    queryFn: async () => mapPreferenceDashboardData(await getMainPageApi({ guCode })),
    enabled: enabled && Boolean(userId && guCode),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
