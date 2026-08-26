import type { AuthUser } from "@/features/auth/store/useAuthStore";
import { getValidDetectedDistrict } from "@/features/region-map/utils/regionSelection";

export const DEFAULT_DISTRICT_NAME = "중구";
export const DEFAULT_DISTRICT_CODE = "11140";

export type RegionDashboardSource = "preference" | "location" | "default";

export interface ResolvedMainRegion {
  source: RegionDashboardSource;
  guCode: string;
  districtName: string;
  titlePrefix: string;
  displayBadge: string;
}

export function resolveMainRegion(user: AuthUser | null): ResolvedMainRegion {
  // 우선순위 1: 현재 위치 (로그인 여부 및 선호지역 존재 여부와 무관하게 최우선)
  const detected = getValidDetectedDistrict();
  if (detected) {
    return {
      source: "location",
      guCode: detected.sggCd,
      districtName: detected.district,
      titlePrefix: detected.district,
      displayBadge: `${detected.district} 현재 위치 기준`,
    };
  }

  // 우선순위 2: 로그인 사용자의 저장된 선호 자치구
  const myGuCode = user?.myGuCode?.trim();
  const myGu = user?.myGu?.trim();
  if (user && myGuCode && /^\d+$/.test(myGuCode) && myGu) {
    return {
      source: "preference",
      guCode: myGuCode,
      districtName: myGu,
      titlePrefix: "내 선호지역",
      displayBadge: `${myGu} 선호지역`,
    };
  }

  // 우선순위 3: 현재 위치와 선호지역이 모두 없으면 기본 지역 중구
  return {
    source: "default",
    guCode: DEFAULT_DISTRICT_CODE,
    districtName: DEFAULT_DISTRICT_NAME,
    titlePrefix: DEFAULT_DISTRICT_NAME,
    displayBadge: `${DEFAULT_DISTRICT_NAME} 기본 지역 기준`,
  };
}
