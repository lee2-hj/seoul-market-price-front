import { useCallback, useMemo } from "react";
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

export interface DistrictLookup {
  districts: District[];
  isLoading: boolean;
  isError: boolean;
  getCodeByName: (name?: string | null) => string | undefined;
  getNameByCode: (code?: string | null) => string | undefined;
}

/**
 * 자치구 이름<->코드 상호 조회 훅. 프로젝트 곳곳에 하드코딩되어 있던
 * "구 이름 -> 코드" 매핑 테이블(예: SEOUL_DISTRICT_CODE_MAP)을 대체하기 위한
 * API 기반 단일 진실 공급원(SSOT). 목록이 아직 로딩 중이거나 실패해도
 * getCodeByName/getNameByCode는 undefined를 반환할 뿐 예외를 던지지 않는다.
 */
export function useDistrictLookup(): DistrictLookup {
  const { data, isLoading, isError } = useDistricts();

  const { nameToCodeMap, codeToNameMap } = useMemo(() => {
    const nameToCode = new Map<string, string>();
    const codeToName = new Map<string, string>();
    (data ?? []).forEach((district) => {
      nameToCode.set(district.sggNm, district.sggCd);
      codeToName.set(district.sggCd, district.sggNm);
    });
    return { nameToCodeMap: nameToCode, codeToNameMap: codeToName };
  }, [data]);

  const getCodeByName = useCallback(
    (name?: string | null) => {
      const key = name?.trim();
      return key ? nameToCodeMap.get(key) : undefined;
    },
    [nameToCodeMap],
  );

  const getNameByCode = useCallback(
    (code?: string | null) => {
      const key = code?.trim();
      return key ? codeToNameMap.get(key) : undefined;
    },
    [codeToNameMap],
  );

  return {
    districts: data ?? [],
    isLoading,
    isError,
    getCodeByName,
    getNameByCode,
  };
}
