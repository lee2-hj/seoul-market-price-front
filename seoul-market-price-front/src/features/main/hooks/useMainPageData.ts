import { useQuery } from "@tanstack/react-query";

import { getMainPageApi } from "@/api/api";
import { mapMainPageResponse } from "@/features/main/utils/mainPageMappers";

export function useMainPageData(enabled = true) {
  return useQuery({
    queryKey: ["main-page"],
    queryFn: async () => mapMainPageResponse(await getMainPageApi()),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
