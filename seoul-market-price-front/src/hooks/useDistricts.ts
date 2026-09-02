import { useQuery } from "@tanstack/react-query";

import { getDongs, getSggs } from "@/features/location/services/locationService";

export interface District {
  sggCd: string;
  sggNm: string;
}

export interface Dong {
  dongCd: string;
  dongNm: string;
}

/**
 * 서울 자치구 목록. 행정구역 개편이 없는 한 값이 바뀌지 않는 참조 데이터라
 * staleTime/gcTime을 Infinity로 두어 세션 내내 재요청 없이 캐시를 재사용한다.
 */
export function useDistricts() {
  return useQuery<District[]>({
    queryKey: ["districts", "sggs"],
    queryFn: getSggs,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/**
 * 선택된 자치구(sggCd)에 속한 법정동 목록.
 */
export function useDongs(sggCd: string) {
  return useQuery<Dong[]>({
    queryKey: ["districts", "dongs", { sggCd }],
    queryFn: () => getDongs(sggCd),
    enabled: Boolean(sggCd),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
