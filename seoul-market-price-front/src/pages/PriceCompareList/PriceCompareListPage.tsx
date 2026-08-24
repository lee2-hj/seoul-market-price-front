import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Chart } from "react-google-charts";
import {
  AlertCircle,
  BarChart3,
  Building2,
  Check,
  ChevronDown,
  Info,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { cn } from "../../lib/utils";
import apiMiddleware from "../../api/middleware";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { PRICE_NAVIGATION } from "@/config/sectionNavigation";

/* 1. 타입 정의 */
interface MetricResult {
  avgPrice: number;
  recentPrice: number;
  avgJeonsePrice: number;
  recentJeonsePrice: number;
  avgPyeongPrice?: number;
  totalCount?: number;
}

interface CompareResponse {
  r1: MetricResult;
  r2: MetricResult;
  baseDate?: string;
}

interface FastApiRegionSummaryDto {
  cgg_cd?: string;
  stdg_cd?: string;
  total_count?: number;
  avg_thing_amt?: number;
  avg_pyeong_amt?: number;
}

interface FastApiCompareResponse {
  base_date?: string;
  baseDate?: string;
  region1?: FastApiRegionSummaryDto;
  region2?: FastApiRegionSummaryDto;
}

interface FastApiListSummaryDto {
  code?: string;
  name?: string;
  total_count?: number;
  avg_thing_amt?: number;
  avg_pyeong_amt?: number;
}

interface FastApiListResponse {
  base_date?: string;
  groups?: Record<string, FastApiListSummaryDto>;
}

interface SelectedRegion {
  district: string;
  dong: string;
  sggCd?: string;
  dongCd?: string;
}

interface SggItem {
  sggCd: string;
  sggNm: string;
}

interface DongItem {
  dongCd?: string;
  dongNm: string;
  sggCd?: string;
}

interface AutocompleteOption {
  label: string;
  value: string;
  code?: string;
}

interface RawLocationItem {
  sggCd?: string | number;
  code?: string | number;
  sggCode?: string | number;
  dongCd?: string | number;
  dongCode?: string | number;
  id?: string | number;
  sggNm?: string;
  name?: string;
  sggName?: string;
  dongNm?: string;
  dongName?: string;
  label?: string;
  sgg?: string;
  dong?: string;
}

interface LocationApiResponse {
  data?: RawLocationItem[];
  sggs?: RawLocationItem[];
  dongs?: RawLocationItem[];
  items?: RawLocationItem[];
}

/* 2. API 연동 함수 */
/* 자치구 목록 조회 API (GET /api/location/sggs) */
async function fetchSggsApi(): Promise<SggItem[]> {
  try {
    const response = await apiMiddleware.get<
      LocationApiResponse | RawLocationItem[] | string[]
    >("/api/location/sggs");
    const raw = response.data;
    const list: (RawLocationItem | string)[] = Array.isArray(raw)
      ? raw
      : (raw?.data ?? raw?.sggs ?? raw?.items ?? []);

    return list.map((item) => {
      if (typeof item === "string") return { sggCd: item, sggNm: item };
      return {
        sggCd: String(
          item.sggCd ??
            item.code ??
            item.sggCode ??
            item.id ??
            item.sggNm ??
            "",
        ),
        sggNm: String(
          item.sggNm ??
            item.name ??
            item.sggName ??
            item.label ??
            item.sgg ??
            "",
        ),
      };
    });
  } catch (err) {
    console.error("자치구 API 호출 실패:", err);
    return [];
  }
}

/* 자치동 목록 조회 API (GET /api/location/dongs?sggCd=...) */
async function fetchDongsApi(sggCd: string): Promise<DongItem[]> {
  if (!sggCd) return [];
  try {
    const response = await apiMiddleware.get<
      LocationApiResponse | RawLocationItem[] | string[]
    >("/api/location/dongs", { params: { sggCd } });
    const raw = response.data;
    const list: (RawLocationItem | string)[] = Array.isArray(raw)
      ? raw
      : (raw?.data ?? raw?.dongs ?? raw?.items ?? []);

    return list.map((item) => {
      if (typeof item === "string") return { dongNm: item };
      return {
        dongCd: item.dongCd ? String(item.dongCd) : undefined,
        dongNm: String(
          item.dongNm ??
            item.name ??
            item.dongName ??
            item.label ??
            item.dong ??
            "",
        ),
        sggCd: item.sggCd ? String(item.sggCd) : undefined,
      };
    });
  } catch (err) {
    console.warn(`자치동 API 호출 실패 (sggCd: ${sggCd}):`, err);
    return [];
  }
}

/* fastApi 지역별 평균가 목록 조회 (GET /fastApi/list) */
async function fetchFastApiList(guCode?: string): Promise<FastApiListResponse> {
  const response = await apiMiddleware.get<FastApiListResponse>("/fastApi/list", {
    params: guCode ? { guCode } : {},
  });
  return response.data;
}

/* 가격 비교 데이터 조회 API (Elasticsearch 기반 FastAPI /fastApi/compare, /fastApi/list 및 /api/v1 연동) */
async function fetchPriceCompareApi(payload: {
  r1: SelectedRegion;
  r2: SelectedRegion;
}): Promise<CompareResponse> {
  const { r1, r2 } = payload;
  const guCode1 = r1.sggCd || "";
  const dongCode1 = r1.dongCd || "";
  const guCode2 = r2.sggCd || "";
  const dongCode2 = r2.dongCd || "";

  // 1. Elasticsearch 기반 /fastApi/compare 호출 시도 (자치구만 있어도 호출 가능)
  if (guCode1 && guCode2) {
    try {
      const response = await apiMiddleware.get<FastApiCompareResponse>(
        "/fastApi/compare",
        {
          params: {
            guCode1,
            dongCode1: dongCode1 || undefined,
            guCode2,
            dongCode2: dongCode2 || undefined,
            sggCd1: guCode1,
            dongCd1: dongCode1 || undefined,
            sggCd2: guCode2,
            dongCd2: dongCode2 || undefined,
            r1Gu: r1.district,
            r1Dong: r1.dong || undefined,
            r2Gu: r2.district,
            r2Dong: r2.dong || undefined,
          },
        },
      );

      if (response.data && (response.data.region1 || response.data.region2)) {
        const reg1 = response.data.region1;
        const reg2 = response.data.region2;

        const r1Avg = (reg1?.avg_thing_amt ?? 0) > 0
          ? Number(((reg1?.avg_thing_amt ?? 0) / 10000).toFixed(2))
          : 0;
        const r2Avg = (reg2?.avg_thing_amt ?? 0) > 0
          ? Number(((reg2?.avg_thing_amt ?? 0) / 10000).toFixed(2))
          : 0;

        return {
          baseDate: response.data.baseDate || response.data.base_date,
          r1: {
            avgPrice: r1Avg,
            recentPrice: r1Avg,
            avgJeonsePrice: Number((r1Avg * 0.6).toFixed(2)),
            recentJeonsePrice: Number((r1Avg * 0.6).toFixed(2)),
            avgPyeongPrice: reg1?.avg_pyeong_amt,
            totalCount: reg1?.total_count ? Number(reg1.total_count) : undefined,
          },
          r2: {
            avgPrice: r2Avg,
            recentPrice: r2Avg,
            avgJeonsePrice: Number((r2Avg * 0.6).toFixed(2)),
            recentJeonsePrice: Number((r2Avg * 0.6).toFixed(2)),
            avgPyeongPrice: reg2?.avg_pyeong_amt,
            totalCount: reg2?.total_count ? Number(reg2.total_count) : undefined,
          },
        };
      }
    } catch (fastApiErr) {
      console.warn("/fastApi/compare Elasticsearch 호출 폴백 시도:", fastApiErr);
    }
  }

  // 2. Elasticsearch 기반 /fastApi/list 그룹 집계 폴백 시도
  try {
    const [list1, list2] = await Promise.allSettled([
      guCode1 ? fetchFastApiList(guCode1) : Promise.resolve(null),
      guCode2 ? fetchFastApiList(guCode2) : Promise.resolve(null),
    ]);

    let r1Data: FastApiListSummaryDto | undefined;
    let r2Data: FastApiListSummaryDto | undefined;
    let baseDate: string | undefined;

    if (list1.status === "fulfilled" && list1.value?.groups) {
      baseDate = list1.value.base_date;
      const groups: Record<string, FastApiListSummaryDto> = list1.value.groups;
      if (dongCode1 || r1.dong) {
        r1Data = (dongCode1 && groups[dongCode1]) ||
          Object.values(groups).find((g: FastApiListSummaryDto) => g.name === r1.dong || g.name?.includes(r1.dong));
      }
      if (!r1Data) {
        const groupList = Object.values(groups);
        const valid = groupList.filter((g) => (g.avg_thing_amt || 0) > 0);
        const avgThing = valid.length > 0
          ? Math.round(valid.reduce((sum, g) => sum + (g.avg_thing_amt || 0), 0) / valid.length)
          : 0;
        const validPyeong = groupList.filter((g) => (g.avg_pyeong_amt || 0) > 0);
        const avgPyeong = validPyeong.length > 0
          ? Math.round(validPyeong.reduce((sum, g) => sum + (g.avg_pyeong_amt || 0), 0) / validPyeong.length)
          : 0;
        const totCount = groupList.reduce((sum, g) => sum + (g.total_count || 0), 0);
        r1Data = {
          name: r1.district,
          avg_thing_amt: avgThing,
          avg_pyeong_amt: avgPyeong,
          total_count: totCount,
        };
      }
    }

    if (list2.status === "fulfilled" && list2.value?.groups) {
      baseDate = baseDate || list2.value.base_date;
      const groups: Record<string, FastApiListSummaryDto> = list2.value.groups;
      if (dongCode2 || r2.dong) {
        r2Data = (dongCode2 && groups[dongCode2]) ||
          Object.values(groups).find((g: FastApiListSummaryDto) => g.name === r2.dong || g.name?.includes(r2.dong));
      }
      if (!r2Data) {
        const groupList = Object.values(groups);
        const valid = groupList.filter((g) => (g.avg_thing_amt || 0) > 0);
        const avgThing = valid.length > 0
          ? Math.round(valid.reduce((sum, g) => sum + (g.avg_thing_amt || 0), 0) / valid.length)
          : 0;
        const validPyeong = groupList.filter((g) => (g.avg_pyeong_amt || 0) > 0);
        const avgPyeong = validPyeong.length > 0
          ? Math.round(validPyeong.reduce((sum, g) => sum + (g.avg_pyeong_amt || 0), 0) / validPyeong.length)
          : 0;
        const totCount = groupList.reduce((sum, g) => sum + (g.total_count || 0), 0);
        r2Data = {
          name: r2.district,
          avg_thing_amt: avgThing,
          avg_pyeong_amt: avgPyeong,
          total_count: totCount,
        };
      }
    }

    if (r1Data || r2Data) {
      const r1Avg = (r1Data?.avg_thing_amt ?? 0) > 0
        ? Number(((r1Data?.avg_thing_amt ?? 0) / 10000).toFixed(2))
        : 0;
      const r2Avg = (r2Data?.avg_thing_amt ?? 0) > 0
        ? Number(((r2Data?.avg_thing_amt ?? 0) / 10000).toFixed(2))
        : 0;

      return {
        baseDate,
        r1: {
          avgPrice: r1Avg,
          recentPrice: r1Avg,
          avgJeonsePrice: Number((r1Avg * 0.6).toFixed(2)),
          recentJeonsePrice: Number((r1Avg * 0.6).toFixed(2)),
          avgPyeongPrice: r1Data?.avg_pyeong_amt,
          totalCount: r1Data?.total_count,
        },
        r2: {
          avgPrice: r2Avg,
          recentPrice: r2Avg,
          avgJeonsePrice: Number((r2Avg * 0.6).toFixed(2)),
          recentJeonsePrice: Number((r2Avg * 0.6).toFixed(2)),
          avgPyeongPrice: r2Data?.avg_pyeong_amt,
          totalCount: r2Data?.total_count,
        },
      };
    }
  } catch (listErr) {
    console.warn("/fastApi/list Elasticsearch 조회 실패:", listErr);
  }

  // 3. 백엔드 /api/v1/price/compare 및 /api/v1/region-apt-compare 폴백
  try {
    const response = await apiMiddleware.get<CompareResponse>(
      "/api/v1/price/compare",
      {
        params: {
          guCode1,
          dongCode1: dongCode1 || undefined,
          guCode2,
          dongCode2: dongCode2 || undefined,
          sggCd1: guCode1 || undefined,
          dongCd1: dongCode1 || undefined,
          sggCd2: guCode2 || undefined,
          dongCd2: dongCode2 || undefined,
          r1Gu: r1.district,
          r1Dong: r1.dong || undefined,
          r2Gu: r2.district,
          r2Dong: r2.dong || undefined,
        },
      },
    );
    return response.data;
  } catch {
    return {
      baseDate: new Date().toISOString().slice(0, 10).replace(/-/g, "."),
      r1: { avgPrice: 0, recentPrice: 0, avgJeonsePrice: 0, recentJeonsePrice: 0 },
      r2: { avgPrice: 0, recentPrice: 0, avgJeonsePrice: 0, recentJeonsePrice: 0 },
    };
  }
}

/* 3. 커스텀 훅 (Data Hooks) */
/* 행정구역(자치구/자치동) 조회 훅 */
function useLocationData(
  r1SggCd: string,
  r2SggCd: string,
  r1District: string,
  r2District: string,
) {
  /* 자치구 목록 조회 (useQuery) */
  const {
    data: sggList = [],
    isLoading: isSggLoading,
    isError: isSggError,
  } = useQuery({
    queryKey: ["locationSggs"],
    queryFn: fetchSggsApi,
    staleTime: Infinity,
  });

  /* 자치구 옵션 가공 (useMemo) */
  const sggOptions: AutocompleteOption[] = useMemo(() => {
    return [...sggList]
      .sort((a, b) => a.sggNm.localeCompare(b.sggNm, "ko"))
      .map((item) => ({
        label: item.sggNm,
        value: item.sggNm,
        code: item.sggCd,
      }));
  }, [sggList]);

  /* 지역 1 자치동 목록 조회 (useQuery) */
  const { data: r1Dongs = [], isLoading: isR1DongLoading } = useQuery({
    queryKey: ["locationDongs", r1SggCd],
    queryFn: () => fetchDongsApi(r1SggCd),
    enabled: !!r1SggCd,
    staleTime: 1000 * 60 * 30,
  });

  /* 지역 2 자치동 목록 조회 (useQuery) */
  const { data: r2Dongs = [], isLoading: isR2DongLoading } = useQuery({
    queryKey: ["locationDongs", r2SggCd],
    queryFn: () => fetchDongsApi(r2SggCd),
    enabled: !!r2SggCd,
    staleTime: 1000 * 60 * 30,
  });

  /* 자치동 옵션 목록 가공 (useMemo) - 필수 선택으로 '전체' 옵션 제외 */
  const r1DongOptions: AutocompleteOption[] = useMemo(() => {
    if (!r1District || r1Dongs.length === 0) return [];
    const sorted = [...r1Dongs].sort((a, b) =>
      a.dongNm.localeCompare(b.dongNm, "ko"),
    );
    return sorted.map((d) => ({
      label: d.dongNm,
      value: d.dongNm,
      code: d.dongCd,
    }));
  }, [r1District, r1Dongs]);

  const r2DongOptions: AutocompleteOption[] = useMemo(() => {
    if (!r2District || r2Dongs.length === 0) return [];
    const sorted = [...r2Dongs].sort((a, b) =>
      a.dongNm.localeCompare(b.dongNm, "ko"),
    );
    return sorted.map((d) => ({
      label: d.dongNm,
      value: d.dongNm,
      code: d.dongCd,
    }));
  }, [r2District, r2Dongs]);

  return {
    sggList,
    sggOptions,
    r1DongOptions,
    r2DongOptions,
    isSggLoading,
    isSggError,
    isR1DongLoading,
    isR2DongLoading,
  };
}

/* 시세 비교 뮤테이션 및 분석 통계 계산 훅 */
function usePriceCompareMutation() {
  const [appliedRegions, setAppliedRegions] = useState<{
    r1: SelectedRegion;
    r2: SelectedRegion;
  } | null>(null);

  /* 시세 비교 실행 뮤테이션 (useMutation) */
  const compareMutation = useMutation({
    mutationFn: fetchPriceCompareApi,
    onSuccess: (_, variables) => {
      setAppliedRegions(variables);
    },
  });

  const compareData = compareMutation.data;
  const r1Metrics = compareData?.r1;
  const r2Metrics = compareData?.r2;
  const baseDate =
    compareData?.baseDate ||
    new Date().toISOString().slice(0, 10).replace(/-/g, ".");

  /* 지역 라벨 계산 (useMemo) */
  const r1Label = useMemo(() => {
    if (!appliedRegions) return "";
    return `${appliedRegions.r1.district} ${appliedRegions.r1.dong}`;
  }, [appliedRegions]);

  const r2Label = useMemo(() => {
    if (!appliedRegions) return "";
    return `${appliedRegions.r2.district} ${appliedRegions.r2.dong}`;
  }, [appliedRegions]);

  /* 평당가 계산 (useMemo) */
  const r1PyeongPrice = useMemo(() => {
    if (!r1Metrics) return 0;
    if (r1Metrics.avgPyeongPrice && r1Metrics.avgPyeongPrice > 0) {
      return Math.round(r1Metrics.avgPyeongPrice);
    }
    return r1Metrics.avgPrice > 0
      ? Math.round((r1Metrics.avgPrice * 10000) / 33)
      : 0;
  }, [r1Metrics]);

  const r2PyeongPrice = useMemo(() => {
    if (!r2Metrics) return 0;
    if (r2Metrics.avgPyeongPrice && r2Metrics.avgPyeongPrice > 0) {
      return Math.round(r2Metrics.avgPyeongPrice);
    }
    return r2Metrics.avgPrice > 0
      ? Math.round((r2Metrics.avgPrice * 10000) / 33)
      : 0;
  }, [r2Metrics]);

  /* 가격 차이 텍스트 계산 (자치구+자치동 전체 이름 및 삼각형 화살표 ▲ 표기) */
  const formatDiffText = useCallback(
    (
      val1: number,
      val2: number,
      name1: string,
      name2: string,
      unit: "억" | "만원" = "억",
    ) => {
      if (val1 === val2) return "두 지역의 시세가 동일함";
      const diff = Math.abs(val1 - val2);
      const diffStr =
        unit === "억"
          ? `${diff.toFixed(1)}억 원`
          : `${Math.round(diff).toLocaleString()}만 원`;
      if (val1 > val2) {
        return `${name1}이(가) ${name2}보다 ${diffStr} ▲`;
      }
      return `${name2}이(가) ${name1}보다 ${diffStr} ▲`;
    },
    [],
  );

  const avgDiffText = useMemo(() => {
    if (!r1Metrics || !r2Metrics || !appliedRegions) return "";
    const name1 = appliedRegions.r1.dong
      ? `${appliedRegions.r1.district} ${appliedRegions.r1.dong}`
      : appliedRegions.r1.district || "지역 1";
    const name2 = appliedRegions.r2.dong
      ? `${appliedRegions.r2.district} ${appliedRegions.r2.dong}`
      : appliedRegions.r2.district || "지역 2";
    return formatDiffText(
      r1Metrics.avgPrice,
      r2Metrics.avgPrice,
      name1,
      name2,
      "억",
    );
  }, [r1Metrics, r2Metrics, appliedRegions, formatDiffText]);

  const pyeongDiffText = useMemo(() => {
    if (!r1Metrics || !r2Metrics || !appliedRegions) return "";
    const name1 = appliedRegions.r1.dong
      ? `${appliedRegions.r1.district} ${appliedRegions.r1.dong}`
      : appliedRegions.r1.district || "지역 1";
    const name2 = appliedRegions.r2.dong
      ? `${appliedRegions.r2.district} ${appliedRegions.r2.dong}`
      : appliedRegions.r2.district || "지역 2";
    return formatDiffText(
      r1PyeongPrice,
      r2PyeongPrice,
      name1,
      name2,
      "만원",
    );
  }, [r1Metrics, r2Metrics, r1PyeongPrice, r2PyeongPrice, appliedRegions, formatDiffText]);

  const avgJeonseDiffText = useMemo(() => {
    return r1Metrics && r2Metrics && appliedRegions
      ? formatDiffText(
          r1Metrics.avgJeonsePrice,
          r2Metrics.avgJeonsePrice,
          appliedRegions.r1.dong,
          appliedRegions.r2.dong,
          "억",
        )
      : "";
  }, [r1Metrics, r2Metrics, appliedRegions, formatDiffText]);

  /* 차트 막대그래프 너비 비율 계산 (useMemo) */
  const { r1AvgWidth, r2AvgWidth, r1PyeongWidth, r2PyeongWidth } =
    useMemo(() => {
      const maxAvgPrice = Math.max(
        r1Metrics?.avgPrice || 10,
        r2Metrics?.avgPrice || 10,
      );
      const maxPyeongPrice = Math.max(
        r1PyeongPrice || 1000,
        r2PyeongPrice || 1000,
      );

      return {
        r1AvgWidth: r1Metrics
          ? `${Math.min(100, Math.max(15, (r1Metrics.avgPrice / maxAvgPrice) * 100))}%`
          : "50%",
        r2AvgWidth: r2Metrics
          ? `${Math.min(100, Math.max(15, (r2Metrics.avgPrice / maxAvgPrice) * 100))}%`
          : "50%",
        r1PyeongWidth: r1PyeongPrice > 0
          ? `${Math.min(100, Math.max(15, (r1PyeongPrice / maxPyeongPrice) * 100))}%`
          : "50%",
        r2PyeongWidth: r2PyeongPrice > 0
          ? `${Math.min(100, Math.max(15, (r2PyeongPrice / maxPyeongPrice) * 100))}%`
          : "50%",
      };
    }, [r1Metrics, r2Metrics, r1PyeongPrice, r2PyeongPrice]);

  /* 초기화 핸들러 */
  const resetCompare = useCallback(() => {
    setAppliedRegions(null);
    compareMutation.reset();
  }, [compareMutation]);

  return {
    compareMutation,
    appliedRegions,
    compareData,
    r1Metrics,
    r2Metrics,
    r1PyeongPrice,
    r2PyeongPrice,
    baseDate,
    r1Label,
    r2Label,
    avgDiffText,
    pyeongDiffText,
    avgJeonseDiffText,
    r1AvgWidth,
    r2AvgWidth,
    r1PyeongWidth,
    r2PyeongWidth,
    resetCompare,
  };
}

/* 4. UI 서브 컴포넌트 */
/* 사이드바 내비게이션 컴포넌트 */
/* 검색어 일치 강조 컴포넌트 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) return <span>{text}</span>;
  const q = query.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <span>{text}</span>;

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);

  return (
    <span>
      {before}
      <span className="font-extrabold text-inherit underline decoration-2 decoration-current underline-offset-2">
        {match}
      </span>
      {after}
    </span>
  );
}

/* 키보드 방향키 이동을 지원하는 오토컴플리트 드롭다운 컴포넌트 */
interface AutocompleteSelectProps {
  value: string;
  onChange: (value: string, option?: AutocompleteOption) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  disabled?: boolean;
  accentColor?: "indigo" | "orange" | "blue" | "green";
  className?: string;
}

function AutocompleteSelect({
  value,
  onChange,
  options,
  placeholder = "선택 또는 검색",
  disabled = false,
  accentColor = "indigo",
  className,
}: AutocompleteSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const displayQuery = searchQuery !== null ? searchQuery : value || "";

  /* 실시간 검색어 필터링 */
  const filteredOptions = useMemo(() => {
    if (searchQuery === null || searchQuery === value) return options;
    const cleanQ = searchQuery.trim().toLowerCase();
    if (!cleanQ) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(cleanQ));
  }, [options, searchQuery, value]);

  /* 활성화된 하이라이트 인덱스 유도 */
  const activeHighlightedIndex = useMemo(() => {
    if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
      return highlightedIndex;
    }
    const selectedIdx = filteredOptions.findIndex(
      (opt) => opt.label === value || opt.value === value,
    );
    return selectedIdx >= 0 ? selectedIdx : 0;
  }, [filteredOptions, highlightedIndex, value]);

  /* 외부 클릭 시 드롭다운 닫기 */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* 방향키 이동 시 활성 아이템 자동 스크롤 */
  useEffect(() => {
    if (isOpen && activeHighlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeHighlightedIndex] as
        | HTMLElement
        | undefined;
      activeEl?.scrollIntoView({ block: "nearest" });
    }
  }, [activeHighlightedIndex, isOpen]);

  /* 키보드 조작 핸들러 */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(0);
        } else {
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0,
          );
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(filteredOptions.length - 1);
        } else {
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1,
          );
        }
      } else if (e.key === "Enter") {
        if (
          isOpen &&
          activeHighlightedIndex >= 0 &&
          activeHighlightedIndex < filteredOptions.length
        ) {
          e.preventDefault();
          const selected = filteredOptions[activeHighlightedIndex];
          onChange(selected.label, selected);
          setSearchQuery(null);
          setIsOpen(false);
        }
      } else if (e.key === "Escape" || e.key === "Tab") {
        setIsOpen(false);
        setSearchQuery(null);
      }
    },
    [disabled, isOpen, filteredOptions, activeHighlightedIndex, onChange],
  );

  const selectedBg =
    accentColor === "blue" || accentColor === "indigo"
      ? "bg-blue-50 text-blue-700 font-bold"
      : "bg-emerald-50 text-emerald-700 font-bold";

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          value={displayQuery}
          onClick={() => {
            if (!disabled) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full h-9 pl-3 pr-8 bg-slate-100/90 hover:bg-slate-100 rounded-lg text-[13px] font-medium text-[#0F172A] outline-none border-0 transition-colors cursor-pointer",
            disabled && "bg-slate-100/60 text-[#94A3B8] cursor-not-allowed",
          )}
        />
        <ChevronDown
          onClick={() => {
            if (!disabled) {
              setIsOpen((prev) => !prev);
              if (!isOpen) inputRef.current?.focus();
            }
          }}
          className={cn(
            "size-4 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-200",
            isOpen && "rotate-180",
            disabled && "cursor-not-allowed opacity-50",
          )}
        />
      </div>

      {/* 드롭다운 옵션 목록 */}
      {isOpen && !disabled && (
        <div
          ref={listRef}
          className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-60 w-full overflow-y-auto rounded-lg border border-[#CBD5E1] bg-white p-1.5 shadow-lg animate-in fade-in-0 duration-100"
        >
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-3 text-center text-[12px] font-medium text-slate-400">
              일치하는 지역이 없습니다.
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected = opt.label === value || opt.value === value;
              const isHighlighted = idx === activeHighlightedIndex;

              return (
                <button
                  key={`${opt.code || opt.value}-${opt.label}`}
                  type="button"
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => {
                    onChange(opt.label, opt);
                    setSearchQuery(null);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[13px] font-medium text-slate-700 transition-all duration-100 cursor-pointer",
                    isHighlighted && !isSelected && "bg-slate-100 text-slate-900",
                    isSelected ? selectedBg : "hover:bg-slate-50",
                  )}
                >
                  <span className="truncate">
                    <HighlightMatch
                      text={opt.label}
                      query={searchQuery !== null ? searchQuery : ""}
                    />
                  </span>
                  {isSelected && (
                    <Check
                      className={cn(
                        "size-3.5 stroke-[3] ml-2 shrink-0",
                        accentColor === "blue" || accentColor === "indigo"
                          ? "text-blue-600"
                          : "text-emerald-600",
                      )}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* 지역 선택 카드 컴포넌트 */
interface RegionCardProps {
  regionNum: 1 | 2;
  title: string;
  district: string;
  dong: string;
  sggOptions: AutocompleteOption[];
  dongOptions: AutocompleteOption[];
  isSggLoading: boolean;
  isDongLoading: boolean;
  onDistrictChange: (name: string, opt?: AutocompleteOption) => void;
  onDongChange: (dong: string, opt?: AutocompleteOption) => void;
}

function RegionCard({
  regionNum,
  title,
  district,
  dong,
  sggOptions,
  dongOptions,
  isSggLoading,
  isDongLoading,
  onDistrictChange,
  onDongChange,
}: RegionCardProps) {
  const isRegion1 = regionNum === 1;
  const accentColor = isRegion1 ? "blue" : "green";
  return (
    <div className="flex flex-col justify-between rounded-[22px] border border-slate-200/80 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.04)] transition-all duration-300 hover:shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
      <div>
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-slate-600" />
            <h3 className="text-[15px] font-black tracking-tight text-slate-900">
              {title}
            </h3>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* 자치구 입력 */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center justify-between text-[13px] font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <span>자치구 선택</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-700">
                  필수
                </span>
              </span>
            </label>
            <AutocompleteSelect
              value={district}
              onChange={onDistrictChange}
              options={sggOptions}
              placeholder={
                isSggLoading
                  ? "목록 로딩 중..."
                  : isRegion1
                    ? "자치구 입력 (예: 강남구)"
                    : "자치구 입력 (예: 서초구)"
              }
              disabled={isSggLoading}
              accentColor={accentColor}
            />
          </div>

          {/* 자치동 입력 (선택) */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center justify-between text-[13px] font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <span>자치동 선택</span>
                <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-100">
                  선택
                </span>
              </span>
            </label>
            <AutocompleteSelect
              value={dong}
              onChange={onDongChange}
              options={dongOptions}
              placeholder={
                !district
                  ? "자치구를 먼저 선택하세요"
                  : isDongLoading
                    ? "자치동 목록 로딩 중..."
                    : "자치동 선택 (전체)"
              }
              disabled={!district || isDongLoading}
              accentColor={accentColor}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* 상대 지역 대비 금액 차이 괄호 표기 컴포넌트 ( (▲ 3.5) / (▼ 3.5) ) */
function PriceDiffBadge({
  myValue,
  targetValue,
  unit = "억",
}: {
  myValue: number;
  targetValue: number;
  unit?: "억" | "만원";
}) {
  if (!myValue || !targetValue || myValue === targetValue) {
    return (
      <span className="ml-1 text-[12px] font-bold text-slate-400">
        (-)
      </span>
    );
  }
  const diff = Math.abs(myValue - targetValue);
  const isHigher = myValue > targetValue;
  const diffNumStr =
    unit === "억"
      ? `${diff.toFixed(1)}`
      : `${Math.round(diff).toLocaleString()}`;

  return (
    <span
      className={cn(
        "ml-1.5 text-[12px] font-bold tracking-tight shrink-0",
        isHigher ? "text-rose-600" : "text-blue-600",
      )}
      title={isHigher ? `상대 지역 대비 ${diffNumStr} 높음` : `상대 지역 대비 ${diffNumStr} 낮음`}
    >
      ({diffNumStr} {isHigher ? "▲" : "▼"})
    </span>
  );
}

/* 시세 비교 표 컴포넌트 */
interface CompareTableProps {
  baseDate: string;
  r1Label: string;
  r2Label: string;
  r1Dong: string;
  r2Dong: string;
  r1Metrics: MetricResult;
  r2Metrics: MetricResult;
  r1PyeongPrice: number;
  r2PyeongPrice: number;
}

function CompareTable({
  baseDate,
  r1Label,
  r2Label,
  r1Dong,
  r2Dong,
  r1Metrics,
  r2Metrics,
  r1PyeongPrice,
  r2PyeongPrice,
}: CompareTableProps) {
  return (
    <div className="flex flex-col justify-between rounded-[24px] border border-slate-200/80 bg-white p-7 shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
      <div>
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F8AA8]/15 to-[#0F8AA8]/5 text-[#0F8AA8]">
              <BarChart3 className="size-5" />
            </div>
            <div>
              <h2 className="text-[19px] font-black tracking-tight text-slate-900">
                비교 리포트
              </h2>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-slate-50 px-3.5 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm">
            <Info className="size-3.5 text-[#0F8AA8]" />
            {baseDate} 기준 <span className="text-[#0F8AA8]">(최근 3개월)</span>
          </span>
        </div>

        <div className="flex flex-col gap-1">
          {/* 헤더 행 (비교 항목과 동일한 bg-[#F1F5F9] 배경색 + 지역1 블루, 지역2 그린 글씨) */}
          <div className="grid grid-cols-[180px_1fr_1fr] gap-1 text-[13px] font-black text-slate-800">
            <div className="flex items-center justify-center border border-[#CBD5E1] bg-[#F1F5F9] p-3 shadow-xs">
              비교 항목
            </div>
            <div className="flex items-center justify-center gap-1.5 border border-[#CBD5E1] bg-[#F1F5F9] p-3 shadow-xs">
              <span className="inline-block rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white shrink-0">
                지역 1
              </span>
              <span className="text-[14px] font-black text-blue-700 truncate">
                {r1Dong || "지역 1"}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                ({r1Label})
              </span>
            </div>
            <div className="flex items-center justify-center gap-1.5 border border-[#CBD5E1] bg-[#F1F5F9] p-3 shadow-xs">
              <span className="inline-block rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white shrink-0">
                지역 2
              </span>
              <span className="text-[14px] font-black text-emerald-700 truncate">
                {r2Dong || "지역 2"}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                ({r2Label})
              </span>
            </div>
          </div>

          {/* 1행: 평균 매매가 (각 개별 칸 분리 - 좁은 간격) */}
          <div className="grid grid-cols-[180px_1fr_1fr] gap-1">
            <div className="flex items-center justify-center gap-2 border border-[#CBD5E1] bg-[#F8FAFC] p-3 shadow-xs">
              <Building2 className="size-4 text-sky-600 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[13px] font-extrabold text-slate-800 leading-tight">
                  평균 매매가
                </span>
                <span className="text-[11px] font-semibold text-slate-400 leading-tight mt-0.5">
                  (단위: 억 원)
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 border border-[#CBD5E1] bg-white p-3 shadow-xs">
              <span className="text-[17px] font-black tracking-tight text-slate-900">
                {r1Metrics.avgPrice}
              </span>
              <PriceDiffBadge
                myValue={r1Metrics.avgPrice}
                targetValue={r2Metrics.avgPrice}
                unit="억"
              />
            </div>
            <div className="flex items-center justify-center gap-2 border border-[#CBD5E1] bg-white p-3 shadow-xs">
              <span className="text-[17px] font-black tracking-tight text-slate-900">
                {r2Metrics.avgPrice}
              </span>
              <PriceDiffBadge
                myValue={r2Metrics.avgPrice}
                targetValue={r1Metrics.avgPrice}
                unit="억"
              />
            </div>
          </div>

          {/* 2행: 평당가 (각 개별 칸 분리 - 좁은 간격) */}
          <div className="grid grid-cols-[180px_1fr_1fr] gap-1">
            <div className="flex items-center justify-center gap-2 border border-[#CBD5E1] bg-[#F8FAFC] p-3 shadow-xs">
              <TrendingUp className="size-4 text-indigo-600 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[13px] font-extrabold text-slate-800 leading-tight">
                  평당가
                </span>
                <span className="text-[11px] font-semibold text-slate-400 leading-tight mt-0.5">
                  (단위: 만 원)
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 border border-[#CBD5E1] bg-white p-3 shadow-xs">
              <span className="text-[17px] font-black tracking-tight text-slate-900">
                {(r1PyeongPrice || 0).toLocaleString()}
              </span>
              <PriceDiffBadge
                myValue={r1PyeongPrice}
                targetValue={r2PyeongPrice}
                unit="만원"
              />
            </div>
            <div className="flex items-center justify-center gap-2 border border-[#CBD5E1] bg-white p-3 shadow-xs">
              <span className="text-[17px] font-black tracking-tight text-slate-900">
                {(r2PyeongPrice || 0).toLocaleString()}
              </span>
              <PriceDiffBadge
                myValue={r2PyeongPrice}
                targetValue={r1PyeongPrice}
                unit="만원"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 요약 및 의견 카드 컴포넌트 */
interface SummaryCardProps {
  avgDiffText: string;
  pyeongDiffText: string;
  appliedRegions: { r1: SelectedRegion; r2: SelectedRegion };
  r1Metrics: MetricResult;
  r2Metrics: MetricResult;
}

function renderDiffTextFormatted(
  text: string,
) {
  if (!text) return null;
  if (text === "두 지역의 시세가 동일함") {
    return <span className="text-[14.5px] font-semibold text-slate-700">두 지역의 시세가 동일함</span>;
  }

  const hasUp = text.includes("▲");
  const hasDown = text.includes("▼");
  const baseText = text.replace(/[▲▼]/g, "").trim();

  // '이(가)' 와 '보다' 를 기준으로 분리하여 지역명과 숫자만 강조
  const match = baseText.match(/^(.*?)이\(가\)\s+(.*?)보다\s+(.*)$/);
  if (match) {
    const [, higherName, lowerName, diffStr] = match;
    return (
      <span className="text-[14.5px] font-medium text-slate-500 leading-normal">
        <span className="font-black text-slate-950">{higherName}</span>
        <span>이(가) </span>
        <span className="font-black text-slate-950">{lowerName}</span>
        <span>보다 </span>
        <span className="font-black text-slate-950">{diffStr}</span>
        {hasUp && <span className="ml-1 text-[13px] font-black text-rose-600">▲</span>}
        {hasDown && <span className="ml-1 text-[13px] font-black text-blue-600">▼</span>}
      </span>
    );
  }

  return (
    <span className="text-[14.5px] font-black leading-normal text-slate-950">
      {baseText}
      {hasUp && <span className="ml-1 text-[13px] font-black text-rose-600">▲</span>}
      {hasDown && <span className="ml-1 text-[13px] font-black text-blue-600">▼</span>}
    </span>
  );
}

function SummaryCard({
  avgDiffText,
  pyeongDiffText,
  appliedRegions,
  r1Metrics,
  r2Metrics,
}: SummaryCardProps) {
  const r1Text = appliedRegions.r1.dong
    ? `${appliedRegions.r1.district} ${appliedRegions.r1.dong}`
    : appliedRegions.r1.district || "지역 1";
  const r2Text = appliedRegions.r2.dong
    ? `${appliedRegions.r2.district} ${appliedRegions.r2.dong}`
    : appliedRegions.r2.district || "지역 2";

  return (
    <div className="flex flex-col justify-between rounded-[24px] border border-slate-200/80 bg-white p-7 shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
      <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
              <Sparkles className="size-4" />
            </div>
            <h3 className="text-[17px] font-black tracking-tight text-slate-900">
              한눈에 보는 요약
            </h3>
          </div>

          <div className="flex items-center gap-1.5 text-[12px] font-bold">
            <span className="font-black text-blue-700">
              {r1Text}
            </span>
            <span className="text-slate-400 font-black">vs</span>
            <span className="font-black text-emerald-700">
              {r2Text}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          {/* 평균 매매가 요약 */}
          <div className="group rounded-[16px] border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:border-slate-300">
            <div className="mb-1.5 flex items-center">
              <span className="flex items-center gap-1.5 text-[13px] font-bold text-slate-700">
                <Building2 className="size-4 text-sky-600" />
                평균 매매가 차이
              </span>
            </div>
            <p className="mt-0.5">
              {renderDiffTextFormatted(avgDiffText)}
            </p>
          </div>

          {/* 평균 평당가 요약 */}
          <div className="group rounded-[16px] border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:border-slate-300">
            <div className="mb-1.5 flex items-center">
              <span className="flex items-center gap-1.5 text-[13px] font-bold text-slate-700">
                <TrendingUp className="size-4 text-indigo-600" />
                평균 평당가 차이
              </span>
            </div>
            <p className="mt-0.5">
              {renderDiffTextFormatted(pyeongDiffText)}
            </p>
          </div>

          {/* 종합 의견 박스 */}
          <div className="rounded-[16px] border border-slate-200/80 bg-slate-50/70 p-5 shadow-xs">
            <div className="mb-2.5 flex items-center gap-1.5 text-[14px] font-black text-slate-800">
              <Sparkles className="size-4 text-amber-500" />
              <span>종합 의견</span>
            </div>
            <p className="text-[15px] leading-[1.65] text-slate-600">
              <span className="font-black text-slate-950">{r1Text}</span>과(와){" "}
              <span className="font-black text-slate-950">{r2Text}</span>의
              시세를 비교한 결과,{" "}
              {Number(r1Metrics.avgPrice) > Number(r2Metrics.avgPrice) ? (
                <>
                  <span className="font-black text-slate-950">{r1Text}</span>의
                  매매 시세가{" "}
                  <span className="font-black text-blue-700">
                    더 높게 형성
                  </span>
                  되어 있습니다.
                </>
              ) : Number(r1Metrics.avgPrice) < Number(r2Metrics.avgPrice) ? (
                <>
                  <span className="font-black text-slate-950">{r2Text}</span>의
                  매매 시세가{" "}
                  <span className="font-black text-emerald-700">
                    더 높게 형성
                  </span>
                  되어 있습니다.
                </>
              ) : (
                <>
                  두 지역의 평균 매매 시세가{" "}
                  <span className="font-black text-slate-950">
                    유사한 수준
                  </span>
                  입니다.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 시세 비교 막대그래프 컴포넌트 (구글 차트) */
interface CompareBarChartsProps {
  r1Metrics: MetricResult;
  r2Metrics: MetricResult;
  r1PyeongPrice: number;
  r2PyeongPrice: number;
  appliedRegions: { r1: SelectedRegion; r2: SelectedRegion };
  r1AvgWidth?: string;
  r2AvgWidth?: string;
  r1PyeongWidth?: string;
  r2PyeongWidth?: string;
}

function CompareBarCharts({
  r1Metrics,
  r2Metrics,
  r1PyeongPrice,
  r2PyeongPrice,
  appliedRegions,
}: CompareBarChartsProps) {
  const r1Text = appliedRegions.r1.dong
    ? `${appliedRegions.r1.district} ${appliedRegions.r1.dong}`
    : appliedRegions.r1.district || "지역 1";
  const r2Text = appliedRegions.r2.dong
    ? `${appliedRegions.r2.district} ${appliedRegions.r2.dong}`
    : appliedRegions.r2.district || "지역 2";

  // 1. 평균 매매가 비교 구글 차트 데이터 (단위: 억, 지역 1: 블루, 지역 2: 그린)
  const avgChartData = useMemo(() => {
    return [
      ["지역", "평균 매매가", { role: "style" }],
      [r1Text, Number(r1Metrics.avgPrice || 0), "#2563EB"],
      [r2Text, Number(r2Metrics.avgPrice || 0), "#10B981"],
    ];
  }, [r1Text, r2Text, r1Metrics.avgPrice, r2Metrics.avgPrice]);

  const avgChartOptions = useMemo(() => {
    return {
      legend: { position: "none" },
      hAxis: {
        textStyle: { color: "#334155", fontSize: 11, bold: true },
        gridlines: { color: "transparent" },
      },
      vAxis: {
        textStyle: { color: "#94A3B8", fontSize: 10, bold: true },
        gridlines: { color: "#F1F5F9" },
        format: "#,##0.0",
      },
      chartArea: { width: "82%", height: "70%", top: 20, bottom: 35 },
      backgroundColor: "transparent",
      bar: { groupWidth: "45%" },
    };
  }, []);

  // 2. 평단가 비교 구글 차트 데이터 (단위: 만 원, 지역 1: 블루, 지역 2: 그린)
  const pyeongChartData = useMemo(() => {
    return [
      ["지역", "평단가", { role: "style" }],
      [r1Text, Number(r1PyeongPrice || 0), "#2563EB"],
      [r2Text, Number(r2PyeongPrice || 0), "#10B981"],
    ];
  }, [r1Text, r2Text, r1PyeongPrice, r2PyeongPrice]);

  const pyeongChartOptions = useMemo(() => {
    return {
      legend: { position: "none" },
      hAxis: {
        textStyle: { color: "#334155", fontSize: 11, bold: true },
        gridlines: { color: "transparent" },
      },
      vAxis: {
        textStyle: { color: "#94A3B8", fontSize: 10, bold: true },
        gridlines: { color: "#F1F5F9" },
        format: "#,###",
      },
      chartArea: { width: "82%", height: "70%", top: 20, bottom: 35 },
      backgroundColor: "transparent",
      bar: { groupWidth: "45%" },
    };
  }, []);

  return (
    <div className="grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
      <style>{`
        @keyframes compareBarGrow {
          0% {
            transform: scaleY(0);
            opacity: 0.15;
          }
          100% {
            transform: scaleY(1);
            opacity: 1;
          }
        }
        .compare-bar-chart svg rect[fill="#2563EB"],
        .compare-bar-chart svg rect[fill="#10B981"],
        .compare-bar-chart svg rect[fill="#16A34A"],
        .compare-bar-chart svg rect[fill="#2563eb"],
        .compare-bar-chart svg rect[fill="#10b981"],
        .compare-bar-chart svg rect[stroke="none"]:not([width="100%"]) {
          transform-box: fill-box;
          transform-origin: bottom;
          animation: compareBarGrow 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      {/* 평균 매매가 비교 차트 */}
      <div className="flex flex-col justify-between rounded-[24px] border border-slate-200/80 bg-white p-7 shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
        <div>
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3.5">
            <h3 className="flex items-center gap-2 text-[16px] font-black text-slate-900">
              <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Building2 className="size-4" />
              </div>
              평균 매매가 비교
            </h3>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
              단위: 억 원
            </span>
          </div>

          <div className="mb-3 flex items-center justify-between px-2 text-[13px]">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-blue-600" />
              <span className="font-extrabold text-blue-700">{r1Text}</span>
              <span className="text-[16px] font-black text-slate-900">
                {r1Metrics.avgPrice}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-emerald-500" />
              <span className="font-extrabold text-emerald-700">{r2Text}</span>
              <span className="text-[16px] font-black text-slate-900">
                {r2Metrics.avgPrice}
              </span>
            </div>
          </div>

          <div className="compare-bar-chart min-h-[220px]">
            <Chart
              chartType="ColumnChart"
              width="100%"
              height="220px"
              data={avgChartData}
              options={avgChartOptions}
              loader={
                <div className="flex h-[220px] items-center justify-center text-[12px] font-medium text-slate-400">
                  차트 로딩 중...
                </div>
              }
            />
          </div>
        </div>
      </div>

      {/* 평단가 비교 차트 */}
      <div className="flex flex-col justify-between rounded-[24px] border border-slate-200/80 bg-white p-7 shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
        <div>
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3.5">
            <h3 className="flex items-center gap-2 text-[16px] font-black text-slate-900">
              <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <TrendingUp className="size-4" />
              </div>
              평단가 비교
            </h3>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
              단위: 만 원/평
            </span>
          </div>

          <div className="mb-3 flex items-center justify-between px-2 text-[13px]">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-blue-600" />
              <span className="font-extrabold text-blue-700">{r1Text}</span>
              <span className="text-[16px] font-black text-slate-900">
                {(r1PyeongPrice || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-emerald-500" />
              <span className="font-extrabold text-emerald-700">{r2Text}</span>
              <span className="text-[16px] font-black text-slate-900">
                {(r2PyeongPrice || 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="compare-bar-chart min-h-[220px]">
            <Chart
              chartType="ColumnChart"
              width="100%"
              height="220px"
              data={pyeongChartData}
              options={pyeongChartOptions}
              loader={
                <div className="flex h-[220px] items-center justify-center text-[12px] font-medium text-slate-400">
                  구글 차트 로딩 중...
                </div>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* 5. 메인 페이지 컴포넌트 */
export default function PriceCompareListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlR1Gu = searchParams.get("r1Gu") || "";
  const urlR1Dong = searchParams.get("r1Dong") || "";
  const urlR1GuCd = searchParams.get("r1GuCd") || "";
  const urlR1DongCd = searchParams.get("r1DongCd") || "";

  const urlR2Gu = searchParams.get("r2Gu") || "";
  const urlR2Dong = searchParams.get("r2Dong") || "";
  const urlR2GuCd = searchParams.get("r2GuCd") || "";
  const urlR2DongCd = searchParams.get("r2DongCd") || "";

  /* 1. 지역 선택 폼 상태 관리 */
  const [r1District, setR1District] = useState(urlR1Gu);
  const [r1SggCd, setR1SggCd] = useState(urlR1GuCd);
  const [r1Dong, setR1Dong] = useState(urlR1Dong);
  const [r1DongCd, setR1DongCd] = useState(urlR1DongCd);

  const [r2District, setR2District] = useState(urlR2Gu);
  const [r2SggCd, setR2SggCd] = useState(urlR2GuCd);
  const [r2Dong, setR2Dong] = useState(urlR2Dong);
  const [r2DongCd, setR2DongCd] = useState(urlR2DongCd);

  const hasAutoComparedRef = useRef(false);

  /* 2. 행정구역 데이터 조회 훅 (useQuery, useMemo) */
  const {
    sggList,
    sggOptions,
    r1DongOptions,
    r2DongOptions,
    isSggLoading,
    isSggError,
    isR1DongLoading,
    isR2DongLoading,
  } = useLocationData(r1SggCd, r2SggCd, r1District, r2District);

  /* 3. 시세 비교 뮤테이션 훅 (useMutation, useMemo) */
  const {
    compareMutation,
    appliedRegions,
    r1Metrics,
    r2Metrics,
    r1PyeongPrice,
    r2PyeongPrice,
    baseDate,
    r1Label,
    r2Label,
    avgDiffText,
    pyeongDiffText,
    r1AvgWidth,
    r2AvgWidth,
    r1PyeongWidth,
    r2PyeongWidth,
    resetCompare,
  } = usePriceCompareMutation();

  /* F5 새로고침 또는 URL 파라미터가 있을 때 자동 시세 비교 실행 */
  useEffect(() => {
    if (hasAutoComparedRef.current) return;
    if (!urlR1Gu || !urlR2Gu) return;

    hasAutoComparedRef.current = true;
    compareMutation.mutate({
      r1: {
        district: urlR1Gu,
        dong: urlR1Dong || "",
        sggCd:
          urlR1GuCd || sggList.find((s) => s.sggNm === urlR1Gu)?.sggCd || "",
        dongCd: urlR1DongCd || "",
      },
      r2: {
        district: urlR2Gu,
        dong: urlR2Dong || "",
        sggCd:
          urlR2GuCd || sggList.find((s) => s.sggNm === urlR2Gu)?.sggCd || "",
        dongCd: urlR2DongCd || "",
      },
    });
  }, [
    urlR1Gu,
    urlR1Dong,
    urlR1GuCd,
    urlR1DongCd,
    urlR2Gu,
    urlR2Dong,
    urlR2GuCd,
    urlR2DongCd,
    sggList,
    compareMutation,
  ]);

  /* 4. 이벤트 핸들러 (useCallback) */
  const handleR1DistrictChange = useCallback(
    (name: string, opt?: AutocompleteOption) => {
      setR1District(name);
      setR1SggCd(
        opt?.code || sggList.find((s) => s.sggNm === name)?.sggCd || "",
      );
      setR1Dong("");
      setR1DongCd("");
    },
    [sggList],
  );

  const handleR2DistrictChange = useCallback(
    (name: string, opt?: AutocompleteOption) => {
      setR2District(name);
      setR2SggCd(
        opt?.code || sggList.find((s) => s.sggNm === name)?.sggCd || "",
      );
      setR2Dong("");
      setR2DongCd("");
    },
    [sggList],
  );

  const handleR1DongChange = useCallback(
    (name: string, opt?: AutocompleteOption) => {
      setR1Dong(name);
      setR1DongCd(
        opt?.code || r1DongOptions.find((d) => d.label === name)?.code || "",
      );
    },
    [r1DongOptions],
  );

  const handleR2DongChange = useCallback(
    (name: string, opt?: AutocompleteOption) => {
      setR2Dong(name);
      setR2DongCd(
        opt?.code || r2DongOptions.find((d) => d.label === name)?.code || "",
      );
    },
    [r2DongOptions],
  );

  /* 시세 비교 실행 (URL searchParams 동기화 - 자치구만 필수) */
  const handleCompare = useCallback(() => {
    if (!r1District || !r2District) {
      alert("비교할 두 지역의 자치구를 모두 선택해 주세요.");
      return;
    }
    const resolvedR1SggCd =
      r1SggCd || sggList.find((s) => s.sggNm === r1District)?.sggCd || "";
    const resolvedR2SggCd =
      r2SggCd || sggList.find((s) => s.sggNm === r2District)?.sggCd || "";
    const resolvedR1DongCd =
      r1DongCd || r1DongOptions.find((d) => d.label === r1Dong)?.code || "";
    const resolvedR2DongCd =
      r2DongCd || r2DongOptions.find((d) => d.label === r2Dong)?.code || "";

    setSearchParams({
      r1Gu: r1District,
      ...(r1Dong ? { r1Dong } : {}),
      ...(resolvedR1SggCd ? { r1GuCd: resolvedR1SggCd } : {}),
      ...(resolvedR1DongCd ? { r1DongCd: resolvedR1DongCd } : {}),
      r2Gu: r2District,
      ...(r2Dong ? { r2Dong } : {}),
      ...(resolvedR2SggCd ? { r2GuCd: resolvedR2SggCd } : {}),
      ...(resolvedR2DongCd ? { r2DongCd: resolvedR2DongCd } : {}),
    });
    compareMutation.mutate({
      r1: {
        district: r1District,
        dong: r1Dong || "",
        sggCd: resolvedR1SggCd,
        dongCd: resolvedR1DongCd,
      },
      r2: {
        district: r2District,
        dong: r2Dong || "",
        sggCd: resolvedR2SggCd,
        dongCd: resolvedR2DongCd,
      },
    });
  }, [
    r1District,
    r1Dong,
    r1SggCd,
    r1DongCd,
    r2District,
    r2Dong,
    r2SggCd,
    r2DongCd,
    sggList,
    r1DongOptions,
    r2DongOptions,
    compareMutation,
    setSearchParams,
  ]);

  /* 전체 초기화 (지역 폼, URL searchParams, 하단 비교리포트 모두 완전 초기화) */
  const handleReset = useCallback(() => {
    setR1District("");
    setR1SggCd("");
    setR1Dong("");
    setR1DongCd("");
    setR2District("");
    setR2SggCd("");
    setR2Dong("");
    setR2DongCd("");
    setSearchParams({}, { replace: true });
    resetCompare();
  }, [resetCompare, setSearchParams]);

  return (
    <SectionSidebarLayout
      sectionTitle={PRICE_NAVIGATION.sectionTitle}
      menuItems={PRICE_NAVIGATION.menuItems}
    >
      <div className={cn("tw-scope min-w-0", "bg-[#F8FAFC]")}>
        <main className="py-8">
          {/* 사이드바 영역 */}


          {/* 메인 콘텐츠 영역 */}
          <section className="min-w-0">
            {/* 타이틀 및 초기화 버튼 */}
            <div className="mb-7 flex items-end justify-between">
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="rounded-md bg-[#0F8AA8]/10 px-2.5 py-0.5 text-[11px] font-black text-[#0F8AA8]">
                    시세 분석 리포트
                  </span>
                  <span className="text-[12px] font-bold text-slate-400">
                    실거래가 기반
                  </span>
                </div>
                <h1 className="text-[26px] font-black tracking-tight text-slate-900">
                  지역별 비교 (리스트)
                </h1>
                <p className="mt-1 text-[13px] font-medium text-slate-500">
                  자치구와 자치동을 선택하여 두 지역의 매매 및 평당 시세를 정밀 비교해보세요.
                </p>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="group flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-[12px] font-extrabold text-slate-600 shadow-sm transition-all duration-200 hover:border-[#0F8AA8] hover:bg-[#F0FDFA] hover:text-[#0F8AA8] hover:shadow-md cursor-pointer"
              >
                <RotateCcw className="size-3.5 transition-transform duration-500 group-hover:-rotate-180" />
                <span>초기화</span>
              </button>
            </div>

            {/* 지역 선택 카드 섹션 */}
            <div className="mb-8 rounded-[28px] border border-slate-200/90 bg-white p-7 shadow-[0_10px_35px_rgba(15,23,42,0.05)]">
              <div className="grid grid-cols-[1fr_auto_1fr_auto] items-stretch gap-6 max-[1200px]:grid-cols-1">
                {/* 지역 1 선택 카드 */}
                <RegionCard
                  regionNum={1}
                  title="지역 1 (기준)"
                  district={r1District}
                  dong={r1Dong}
                  sggOptions={sggOptions}
                  dongOptions={r1DongOptions}
                  isSggLoading={isSggLoading}
                  isDongLoading={isR1DongLoading}
                  onDistrictChange={handleR1DistrictChange}
                  onDongChange={handleR1DongChange}
                />

                {/* 중앙 VS 배지 (금색) */}
                <div className="flex items-center justify-center max-[1200px]:py-2">
                  <div className="flex size-13 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#FDE047] via-[#EAB308] to-[#B45309] text-[14px] font-black tracking-widest text-white shadow-[0_8px_20px_rgba(234,179,8,0.4)] ring-2 ring-amber-300">
                    VS
                  </div>
                </div>

                {/* 지역 2 선택 카드 */}
                <RegionCard
                  regionNum={2}
                  title="지역 2 (비교)"
                  district={r2District}
                  dong={r2Dong}
                  sggOptions={sggOptions}
                  dongOptions={r2DongOptions}
                  isSggLoading={isSggLoading}
                  isDongLoading={isR2DongLoading}
                  onDistrictChange={handleR2DistrictChange}
                  onDongChange={handleR2DongChange}
                />

                {/* 비교하기 액션 영역 */}
                <div className="flex flex-col items-center justify-center rounded-[22px] border border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-50/40 p-5 text-center max-[1200px]:py-6">
                  <button
                    type="button"
                    onClick={handleCompare}
                    disabled={compareMutation.isPending || isSggLoading || !r1District || !r2District}
                    className="flex h-[110px] w-full min-w-[135px] flex-col items-center justify-center gap-2 rounded-[12px] bg-[#2563EB] p-4 text-white shadow-[0_6px_20px_rgba(37,99,235,0.3)] transition-all duration-200 hover:bg-[#1D4ED8] hover:shadow-[0_8px_24px_rgba(37,99,235,0.4)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    {compareMutation.isPending ? (
                      <Loader2 className="size-5 animate-spin text-white" />
                    ) : (
                      <Search className="size-5 stroke-[2.5] text-white" />
                    )}
                    <span className="text-[15px] font-bold tracking-tight text-white">
                      {compareMutation.isPending ? "조회 중..." : "조회하기"}
                    </span>
                  </button>
                  <p className="mt-3 text-[11px] font-medium leading-tight text-slate-400">
                    자치구 필수 선택
                    <br />
                    (자치동은 선택 사항)
                  </p>
                </div>
              </div>
            </div>

            {/* 비교 리포트 출력 영역 */}
            {isSggError ? (
              <div className="rounded-[20px] border border-red-200 bg-red-50 p-8 text-center text-red-600">
                <AlertCircle className="mx-auto mb-2 size-8" />
                <p className="font-bold">
                  서울시 행정구역 목록을 불러오지 못했습니다.
                </p>
                <p className="mt-1 text-xs text-red-400">
                  백엔드 서버(/api/location/sggs) 상태를 확인해 주세요.
                </p>
              </div>
            ) : compareMutation.isPending ? (
              <div className="flex flex-col gap-6 animate-pulse">
                <div className="grid grid-cols-[1fr_340px] gap-6 max-[1100px]:grid-cols-1">
                  <div className="h-[260px] rounded-[20px] border border-[#E2E8F0] bg-white p-6" />
                  <div className="h-[260px] rounded-[20px] border border-[#E2E8F0] bg-white p-6" />
                </div>
                <div className="grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
                  <div className="h-[180px] rounded-[20px] border border-[#E2E8F0] bg-white p-6" />
                  <div className="h-[180px] rounded-[20px] border border-[#E2E8F0] bg-white p-6" />
                </div>
              </div>
            ) : compareMutation.isError ? (
              <div className="rounded-[20px] border border-red-200 bg-red-50 p-8 text-center text-red-600">
                <AlertCircle className="mx-auto mb-2 size-8" />
                <p className="font-bold">
                  시세 비교 데이터를 불러오는 데 실패했습니다.
                </p>
                <p className="mt-1 text-xs text-red-400">
                  백엔드 서버(/api/v1/price/compare) 상태를 확인해 주세요.
                </p>
              </div>
            ) : !appliedRegions || !r1Metrics || !r2Metrics ? (
              <div className="rounded-[28px] border border-slate-200/80 bg-white p-14 text-center shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
                <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#0F8AA8]/15 via-[#0F8AA8]/5 to-transparent text-[#0F8AA8] shadow-inner">
                  <BarChart3 className="size-10 stroke-[1.8]" />
                </div>
                <h3 className="text-[20px] font-black tracking-tight text-slate-900">
                  비교할 두 지역을 선택하고 &apos;시세 비교하기&apos;를 눌러주세요
                </h3>
                <p className="mx-auto mt-2.5 max-w-[460px] text-[13px] font-medium leading-relaxed text-slate-500">
                  기준 지역(지역 1)과 비교 지역(지역 2)의 자치구와 자치동을 선택한 뒤{" "}
                  <span className="font-extrabold text-[#0F8AA8]">
                    &apos;시세 비교하기&apos;
                  </span>{" "}
                  버튼을 클릭하면 매매가 및 평단가 비교 리포트가 표시됩니다.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-[1fr_360px] items-start gap-6 max-[1200px]:grid-cols-1">
                  {/* 좌측 메인 영역: 비교 리포트 표 + 구글 비교 차트 */}
                  <div className="flex flex-col gap-6">
                    {/* 비교 리포트 표 */}
                    <CompareTable
                      baseDate={baseDate}
                      r1Label={r1Label}
                      r2Label={r2Label}
                      r1Dong={appliedRegions.r1.dong || appliedRegions.r1.district}
                      r2Dong={appliedRegions.r2.dong || appliedRegions.r2.district}
                      r1Metrics={r1Metrics}
                      r2Metrics={r2Metrics}
                      r1PyeongPrice={r1PyeongPrice}
                      r2PyeongPrice={r2PyeongPrice}
                    />

                    {/* 평균 매매가 비교, 평단가 비교 구글 차트 영역 */}
                    <CompareBarCharts
                      appliedRegions={appliedRegions}
                      r1Metrics={r1Metrics}
                      r2Metrics={r2Metrics}
                      r1PyeongPrice={r1PyeongPrice}
                      r2PyeongPrice={r2PyeongPrice}
                      r1AvgWidth={r1AvgWidth}
                      r2AvgWidth={r2AvgWidth}
                      r1PyeongWidth={r1PyeongWidth}
                      r2PyeongWidth={r2PyeongWidth}
                    />
                  </div>

                  {/* 우측 사이드 영역: 한눈에 보는 요약 컨테이너 */}
                  <div className="sticky top-[96px] flex flex-col gap-6">
                    <SummaryCard
                      avgDiffText={avgDiffText}
                      pyeongDiffText={pyeongDiffText}
                      appliedRegions={appliedRegions}
                      r1Metrics={r1Metrics}
                      r2Metrics={r2Metrics}
                    />
                  </div>
                </div>

                {/* 출처 안내 */}
                <div className="flex items-center justify-between rounded-[20px] border border-slate-200/80 bg-white px-7 py-4.5 text-[12px] text-slate-500 shadow-sm max-[768px]:flex-col max-[768px]:gap-2 max-[768px]:text-center">
                  <div className="flex items-center gap-2">
                    <Info className="size-4 shrink-0 text-[#0F8AA8]" />
                    <span>
                      본 정보는 서울시 열린데이터광장 부동산 실거래가 공개시스템 데이터를 기반으로 제공되며, 실제 거래가와 차이가 있을 수 있습니다.
                    </span>
                  </div>
                  <span className="shrink-0 font-bold text-slate-400">
                    데이터 기준일: {baseDate}
                  </span>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </SectionSidebarLayout>
  );
}
