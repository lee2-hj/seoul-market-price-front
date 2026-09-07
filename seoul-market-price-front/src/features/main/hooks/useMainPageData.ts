import { useQuery } from "@tanstack/react-query";

import { getMainPageApi } from "@/api/api";
import { mapMainPageResponse, mapPreferenceDashboardData } from "@/features/main/utils/mainPageMappers";
import type { MainPageViewData, PreferenceDashboardData } from "@/features/main/types/mainPage.types";

export interface MainPageData extends MainPageViewData {
  dashboard: PreferenceDashboardData;
}

// 메인페이지 전체(구별 TOP5, 상승/하락 TOP5)와 선호지역 대시보드(가격 추이,
// 거래량 순위 등)는 동일한 /fastApi/mainpage 응답 하나로 함께 내려오므로,
// 과거처럼 guCode 유무만 다른 두 번의 별도 요청으로 나누지 않고 한 번만 호출한다.
export function useMainPageData(guCode: string, enabled = true) {
  const normalizedCode = guCode.trim();
  const isValidCode = Boolean(normalizedCode && /^\d+$/.test(normalizedCode));

  return useQuery({
    queryKey: ["main-page", normalizedCode],
    queryFn: async (): Promise<MainPageData> => {
      const response = await getMainPageApi({ guCode: normalizedCode });
      return {
        ...mapMainPageResponse(response),
        dashboard: mapPreferenceDashboardData(response),
      };
    },
    enabled: enabled && isValidCode,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
