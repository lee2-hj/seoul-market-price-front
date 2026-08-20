import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Info,
  Layers,
  Loader2,
  Map,
  MapPin,
  RotateCcw,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import apiMiddleware from "../../api/middleware";

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

/* 가격 비교 데이터 조회 API (FastAPI /fastApi/compare 우선 호출 및 /fastApi/list 폴백) */
async function fetchPriceCompareApi(payload: {
  r1: SelectedRegion;
  r2: SelectedRegion;
}): Promise<CompareResponse> {
  const { r1, r2 } = payload;
  const guCode1 = r1.sggCd || "";
  const dongCode1 = r1.dongCd || "";
  const guCode2 = r2.sggCd || "";
  const dongCode2 = r2.dongCd || "";

  // 1. /fastApi/compare 호출 시도
  if (guCode1 && dongCode1 && guCode2 && dongCode2) {
    try {
      const response = await apiMiddleware.get<FastApiCompareResponse>(
        "/fastApi/compare",
        {
          params: {
            guCode1,
            dongCode1,
            guCode2,
            dongCode2,
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
      console.warn("/fastApi/compare 호출 실패, /fastApi/list 폴백 시도:", fastApiErr);
    }
  }

  // 2. /fastApi/list 폴백 시도
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
      r1Data = (dongCode1 && groups[dongCode1]) ||
        Object.values(groups).find((g: FastApiListSummaryDto) => g.name === r1.dong || g.name?.includes(r1.dong));
    }

    if (list2.status === "fulfilled" && list2.value?.groups) {
      baseDate = baseDate || list2.value.base_date;
      const groups: Record<string, FastApiListSummaryDto> = list2.value.groups;
      r2Data = (dongCode2 && groups[dongCode2]) ||
        Object.values(groups).find((g: FastApiListSummaryDto) => g.name === r2.dong || g.name?.includes(r2.dong));
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
    console.warn("/fastApi/list 조회 실패:", listErr);
  }

  // 3. 기존 /api/v1/price/compare 최후 폴백
  try {
    const response = await apiMiddleware.get<CompareResponse>(
      "/api/v1/price/compare",
      {
        params: {
          r1Gu: r1.district,
          r1Dong: r1.dong,
          r2Gu: r2.district,
          r2Dong: r2.dong,
        },
      },
    );
    return response.data;
  } catch {
    return {
      baseDate: new Date().toISOString().slice(0, 7),
      r1: { avgPrice: 0, recentPrice: 0, avgJeonsePrice: 0, recentJeonsePrice: 0 },
      r2: { avgPrice: 0, recentPrice: 0, avgJeonsePrice: 0, recentJeonsePrice: 0 },
    };
  }
}

/* 금액 포맷터 유틸 */
function formatPriceKRW(priceInEok: number): string {
  if (!priceInEok || isNaN(priceInEok)) return "0원";
  const eok = Math.floor(priceInEok);
  const remainderMan = Math.round((priceInEok - eok) * 10000);
  if (remainderMan === 0) return `${eok}억 원`;
  return `${eok}억 ${remainderMan.toLocaleString()}만 원`;
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

  /* 가격 차이 텍스트 계산 (자치동 이름 및 ▲ 표시 적용) */
  const formatDiffText = useCallback(
    (
      val1: number,
      val2: number,
      dong1: string,
      dong2: string,
      unit: "억" | "만원" = "억",
    ) => {
      if (val1 === val2) return "동일함";
      const diff = Math.abs(val1 - val2);
      const diffStr =
        unit === "억"
          ? `${diff.toFixed(1)}억`
          : `${Math.round(diff).toLocaleString()}만 원`;
      if (val1 > val2) {
        return `${dong1 || "지역 1"} ${diffStr} ▲`;
      }
      return `${dong2 || "지역 2"} ${diffStr} ▲`;
    },
    [],
  );

  const avgDiffText = useMemo(() => {
    return r1Metrics && r2Metrics && appliedRegions
      ? formatDiffText(
          r1Metrics.avgPrice,
          r2Metrics.avgPrice,
          appliedRegions.r1.dong,
          appliedRegions.r2.dong,
          "억",
        )
      : "";
  }, [r1Metrics, r2Metrics, appliedRegions, formatDiffText]);

  const pyeongDiffText = useMemo(() => {
    return r1Metrics && r2Metrics && appliedRegions
      ? formatDiffText(
          r1PyeongPrice,
          r2PyeongPrice,
          appliedRegions.r1.dong,
          appliedRegions.r2.dong,
          "만원",
        )
      : "";
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
function SidebarNav() {
  return (
    <aside className="w-[240px] shrink-0 max-[900px]:w-full">
      <div className="sticky top-[96px] rounded-[16px] border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
        <h2 className="mb-4 text-[16px] font-black text-[#0F172A]">가격정보</h2>

        <nav className="flex flex-col gap-1">
          <Link
            to="/price/compare-list"
            className="flex items-center gap-2.5 rounded-[10px] bg-[#E8F6F9] px-3.5 py-3 text-[13px] font-extrabold text-[#0F8AA8] no-underline"
          >
            <BarChart3 className="size-4" />
            <span>지역별 비교(리스트)</span>
          </Link>
          <Link
            to="/region-map"
            className="flex items-center gap-2.5 rounded-[10px] px-3.5 py-3 text-[13px] font-semibold text-[#64748B] no-underline hover:bg-[#F1F5F9] hover:text-[#0F172A]"
          >
            <Map className="size-4" />
            <span>지역별 비교(지도)</span>
          </Link>
          <Link
            to="/price/detail"
            className="flex items-center gap-2.5 rounded-[10px] px-3.5 py-3 text-[13px] font-semibold text-[#64748B] no-underline hover:bg-[#F1F5F9] hover:text-[#0F172A]"
          >
            <Building2 className="size-4" />
            <span>단지별 시세</span>
          </Link>
          <Link
            to="/price/compare-apartment"
            className="flex items-center gap-2.5 rounded-[10px] px-3.5 py-3 text-[13px] font-semibold text-[#64748B] no-underline hover:bg-[#F1F5F9] hover:text-[#0F172A]"
          >
            <Layers className="size-4" />
            <span>아파트별 비교</span>
          </Link>
        </nav>

        <div className="mt-6 rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-[#475569]">
            <HelpCircle className="size-3.5 text-[#0F8AA8]" />
            <span>이용 가이드</span>
          </div>
          <p className="text-[11px] leading-relaxed text-[#64748B]">
            비교할 두 지역의 자치구와 자치동을 검색하거나 선택하고
            &apos;비교하기&apos; 버튼을 눌러보세요. 매매 및 전세 시세 차이를
            한눈에 확인할 수 있습니다.
          </p>
        </div>
      </div>
    </aside>
  );
}

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
  accentColor?: "blue" | "green";
  className?: string;
}

function AutocompleteSelect({
  value,
  onChange,
  options,
  placeholder = "선택 또는 검색",
  disabled = false,
  accentColor = "blue",
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

  const focusRing =
    accentColor === "blue"
      ? "focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/15 focus-within:bg-white focus-within:shadow-[0_4px_16px_rgba(37,99,235,0.08)]"
      : "focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/15 focus-within:bg-white focus-within:shadow-[0_4px_16px_rgba(16,185,129,0.08)]";

  const selectedBg =
    accentColor === "blue"
      ? "bg-gradient-to-r from-blue-50 to-indigo-50/80 text-blue-700 font-extrabold border border-blue-200/70 shadow-xs"
      : "bg-gradient-to-r from-emerald-50 to-teal-50/80 text-emerald-700 font-extrabold border border-emerald-200/70 shadow-xs";

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-[14px] border border-slate-200/90 bg-slate-50/60 px-3.5 transition-all duration-200 hover:border-slate-300 hover:bg-white",
          focusRing,
          disabled &&
            "bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed opacity-70 hover:border-slate-200 hover:bg-slate-100/70",
        )}
      >
        <input
          ref={inputRef}
          type="text"
          value={displayQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent text-[13px] font-bold text-slate-900 outline-none placeholder:text-slate-400 placeholder:font-medium"
        />
        <div className="flex items-center gap-1 ml-1.5 shrink-0">
          {displayQuery && !disabled && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setSearchQuery("");
                onChange("");
                setIsOpen(true);
                inputRef.current?.focus();
              }}
              className="flex size-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200/80 hover:text-slate-700 transition-colors cursor-pointer"
              title="초기화"
            >
              <X className="size-3.5 stroke-[2.5]" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (!disabled) {
                setIsOpen((prev) => !prev);
              }
            }}
            className={cn(
              "flex size-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200/80 hover:text-slate-700 transition-all cursor-pointer",
              isOpen && "bg-slate-200/80 text-slate-700",
            )}
            aria-label={isOpen ? "목록 닫기" : "목록 열기"}
          >
            <ChevronDown
              className={cn(
                "size-4 stroke-[2.2] transition-transform duration-300",
                isOpen && "rotate-180",
              )}
            />
          </button>
        </div>
      </div>

      {/* 드롭다운 옵션 목록 */}
      {isOpen && !disabled && (
        <div
          ref={listRef}
          className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-64 w-full overflow-y-auto rounded-[18px] border border-slate-200/90 bg-white/98 backdrop-blur-md p-2 shadow-[0_16px_40px_rgba(15,23,42,0.14)] animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-4 text-center text-[12px] font-semibold text-slate-400">
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
                    "flex w-full items-center justify-between rounded-[12px] px-3.5 py-2.5 text-left text-[13px] font-semibold text-slate-700 transition-all duration-150 cursor-pointer",
                    isHighlighted && !isSelected && "bg-slate-100/90 text-slate-900",
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
                    <div
                      className={cn(
                        "flex size-4.5 items-center justify-center rounded-full ml-2 shrink-0 shadow-xs",
                        accentColor === "blue"
                          ? "bg-blue-600 text-white"
                          : "bg-emerald-600 text-white",
                      )}
                    >
                      <Check className="size-3 stroke-[3]" />
                    </div>
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
    <div
      className={cn(
        "flex flex-col justify-between rounded-[22px] border p-6 transition-all duration-300",
        isRegion1
          ? "border-blue-200/80 bg-gradient-to-b from-blue-50/50 via-white to-white shadow-[0_4px_20px_rgba(37,99,235,0.04)] hover:shadow-[0_8px_28px_rgba(37,99,235,0.08)]"
          : "border-emerald-200/80 bg-gradient-to-b from-emerald-50/50 via-white to-white shadow-[0_4px_20px_rgba(16,185,129,0.04)] hover:shadow-[0_8px_28px_rgba(16,185,129,0.08)]",
      )}
    >
      <div>
        <div className="mb-5 flex items-center justify-between">
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[12px] font-black text-white shadow-sm",
              isRegion1
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-[0_2px_10px_rgba(37,99,235,0.3)]"
                : "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-[0_2px_10px_rgba(16,185,129,0.3)]",
            )}
          >
            <MapPin className="size-3.5" />
            {title}
          </span>
          {district && (
            <span
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-black tracking-tight",
                isRegion1
                  ? "border border-blue-200 bg-blue-100/70 text-blue-700"
                  : "border border-emerald-200 bg-emerald-100/70 text-emerald-700",
              )}
            >
              {district} {dong ? dong : ""}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {/* 자치구 입력 */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center justify-between text-[13px] font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <span>자치구</span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-black",
                    isRegion1
                      ? "bg-blue-100 text-blue-700"
                      : "bg-emerald-100 text-emerald-700",
                  )}
                >
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
                    ? "자치구 검색 (예: 강남구)"
                    : "자치구 검색 (예: 서초구)"
              }
              disabled={isSggLoading}
              accentColor={accentColor}
            />
          </div>

          {/* 자치동 입력 */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center justify-between text-[13px] font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <span>자치동</span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-black",
                    isRegion1
                      ? "bg-blue-100 text-blue-700"
                      : "bg-emerald-100 text-emerald-700",
                  )}
                >
                  필수
                </span>
              </span>
            </label>
            <AutocompleteSelect
              value={dong}
              onChange={onDongChange}
              options={dongOptions}
              placeholder={
                !district
                  ? "자치구를 먼저 선택해 주세요"
                  : isDongLoading
                    ? "자치동 목록 로딩 중..."
                    : isRegion1
                      ? "자치동 검색 또는 선택 (예: 역삼동)"
                      : "자치동 검색 또는 선택 (예: 서초동)"
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

/* 상대 지역 대비 금액 차이 배지 컴포넌트 (▲ / ▼) */
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
      <span className="ml-2 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
        동일
      </span>
    );
  }
  const diff = Math.abs(myValue - targetValue);
  const isHigher = myValue > targetValue;
  const diffStr =
    unit === "억"
      ? `${diff.toFixed(1)}억`
      : `${Math.round(diff).toLocaleString()}만 원`;

  return (
    <span
      className={cn(
        "ml-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold shadow-sm transition-all shrink-0",
        isHigher
          ? "border border-rose-200/80 bg-gradient-to-r from-rose-50 to-red-50 text-rose-600"
          : "border border-blue-200/80 bg-gradient-to-r from-blue-50 to-sky-50 text-blue-600",
      )}
      title={isHigher ? `상대 지역 대비 ${diffStr} 높음` : `상대 지역 대비 ${diffStr} 낮음`}
    >
      <span className="text-[9px]">{isHigher ? "▲" : "▼"}</span>
      <span>{diffStr}</span>
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
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F8AA8]/15 to-[#0F8AA8]/5 text-[#0F8AA8]">
              <BarChart3 className="size-5" />
            </div>
            <div>
              <h2 className="text-[19px] font-black tracking-tight text-slate-900">
                비교 리포트
              </h2>
              <p className="text-[12px] font-medium text-slate-400">
                주요 시세 지표 상세 대조
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-slate-50 px-3.5 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm">
            <Info className="size-3.5 text-[#0F8AA8]" />
            {baseDate} 기준 <span className="text-[#0F8AA8]">(최근 3개월)</span>
          </span>
        </div>

        <div className="overflow-hidden rounded-[16px] border border-slate-200/90 shadow-sm">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-slate-200/90 bg-gradient-to-r from-slate-50 via-slate-50/50 to-slate-50">
                <th className="w-[140px] px-6 py-4 font-bold text-slate-600">
                  항목
                </th>
                <th className="px-6 py-4 bg-blue-50/40">
                  <div className="flex items-center gap-2">
                    <span className="flex size-2.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
                    <span className="text-[14px] font-black text-blue-700">
                      {r1Dong || "지역 1"}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      ({r1Label})
                    </span>
                  </div>
                </th>
                <th className="px-6 py-4 bg-emerald-50/40">
                  <div className="flex items-center gap-2">
                    <span className="flex size-2.5 rounded-full bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[14px] font-black text-emerald-700">
                      {r2Dong || "지역 2"}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      ({r2Label})
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              <tr className="transition-colors hover:bg-slate-50/70">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2.5 font-extrabold text-slate-800">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                      <Building2 className="size-4" />
                    </div>
                    <span>평균 매매가</span>
                  </div>
                </td>
                <td className="px-6 py-5 bg-blue-50/15">
                  <div className="flex flex-wrap items-center">
                    <span className="text-[16px] font-black tracking-tight text-blue-700">
                      {r1Metrics.avgPrice}억 원
                    </span>
                    <span className="ml-2 text-[12px] font-medium text-slate-500">
                      ({formatPriceKRW(r1Metrics.avgPrice)})
                    </span>
                    <PriceDiffBadge
                      myValue={r1Metrics.avgPrice}
                      targetValue={r2Metrics.avgPrice}
                      unit="억"
                    />
                  </div>
                </td>
                <td className="px-6 py-5 bg-emerald-50/15">
                  <div className="flex flex-wrap items-center">
                    <span className="text-[16px] font-black tracking-tight text-emerald-700">
                      {r2Metrics.avgPrice}억 원
                    </span>
                    <span className="ml-2 text-[12px] font-medium text-slate-500">
                      ({formatPriceKRW(r2Metrics.avgPrice)})
                    </span>
                    <PriceDiffBadge
                      myValue={r2Metrics.avgPrice}
                      targetValue={r1Metrics.avgPrice}
                      unit="억"
                    />
                  </div>
                </td>
              </tr>

              <tr className="transition-colors hover:bg-slate-50/70">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2.5 font-extrabold text-slate-800">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <TrendingUp className="size-4" />
                    </div>
                    <span>평당가</span>
                  </div>
                </td>
                <td className="px-6 py-5 bg-blue-50/15">
                  <div className="flex flex-wrap items-center">
                    <span className="text-[16px] font-black tracking-tight text-blue-700">
                      {(r1PyeongPrice || 0).toLocaleString()}만 원
                    </span>
                    <span className="ml-1 text-[12px] font-semibold text-slate-400">
                      /평
                    </span>
                    <PriceDiffBadge
                      myValue={r1PyeongPrice}
                      targetValue={r2PyeongPrice}
                      unit="만원"
                    />
                  </div>
                </td>
                <td className="px-6 py-5 bg-emerald-50/15">
                  <div className="flex flex-wrap items-center">
                    <span className="text-[16px] font-black tracking-tight text-emerald-700">
                      {(r2PyeongPrice || 0).toLocaleString()}만 원
                    </span>
                    <span className="ml-1 text-[12px] font-semibold text-slate-400">
                      /평
                    </span>
                    <PriceDiffBadge
                      myValue={r2PyeongPrice}
                      targetValue={r1PyeongPrice}
                      unit="만원"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
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

function SummaryCard({
  avgDiffText,
  pyeongDiffText,
  appliedRegions,
  r1Metrics,
  r2Metrics,
}: SummaryCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-[24px] border border-slate-200/80 bg-white p-7 shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
      <div>
        <div className="mb-5 flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
            <Sparkles className="size-4" />
          </div>
          <h3 className="text-[17px] font-black tracking-tight text-slate-900">
            한눈에 보는 요약
          </h3>
        </div>

        <div className="flex flex-col gap-3.5">
          {/* 평균 매매가 요약 */}
          <div className="group rounded-[14px] border border-slate-200/70 bg-gradient-to-r from-slate-50 to-white p-4 transition-all hover:border-slate-300 hover:shadow-sm">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[12px] font-bold text-slate-600">
                <Building2 className="size-3.5 text-sky-600" />
                평균 매매가 차이
              </span>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Compare
              </span>
            </div>
            <p className="text-[13px] font-extrabold text-rose-600">
              {avgDiffText}.
            </p>
          </div>

          {/* 평균 평당가 요약 */}
          <div className="group rounded-[14px] border border-slate-200/70 bg-gradient-to-r from-slate-50 to-white p-4 transition-all hover:border-slate-300 hover:shadow-sm">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[12px] font-bold text-slate-600">
                <TrendingUp className="size-3.5 text-indigo-600" />
                평균 평당가 차이
              </span>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Per Pyeong
              </span>
            </div>
            <p className="text-[13px] font-extrabold text-blue-600">
              {pyeongDiffText}.
            </p>
          </div>

          {/* 종합 의견 박스 */}
          <div className="rounded-[16px] border border-[#0F8AA8]/20 bg-gradient-to-br from-[#F0FDFA] via-[#F0FDF4] to-[#E0F2FE] p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-1.5 text-[12px] font-black text-[#0F8AA8]">
              <Sparkles className="size-4 animate-pulse" />
              <span>종합 분석 코멘트</span>
            </div>
            <p className="text-[12px] font-medium leading-relaxed text-[#0F5C70]">
              <span className="font-extrabold text-[#0B4A5A]">
                {r1Metrics.avgPrice >= r2Metrics.avgPrice
                  ? `${appliedRegions.r1.district} ${appliedRegions.r1.dong}`
                  : `${appliedRegions.r2.district} ${appliedRegions.r2.dong}`}
              </span>
              이(가) 매매가 및 평당가가 상대적으로 더 높게 형성되어 있으며, 두 지역 모두 서울 주요 선호 주거 권역입니다.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-1.5 rounded-xl bg-emerald-50/80 px-3.5 py-2 text-[11px] font-bold text-emerald-700">
        <CheckCircle2 className="size-3.5 shrink-0" />
        <span>실시간 데이터 비교 분석이 완료되었습니다.</span>
      </div>
    </div>
  );
}

/* 시세 비교 막대그래프 컴포넌트 */
interface CompareBarChartsProps {
  appliedRegions: { r1: SelectedRegion; r2: SelectedRegion };
  r1Metrics: MetricResult;
  r2Metrics: MetricResult;
  r1PyeongPrice: number;
  r2PyeongPrice: number;
  r1AvgWidth: string;
  r2AvgWidth: string;
  r1PyeongWidth: string;
  r2PyeongWidth: string;
}

function CompareBarCharts({
  appliedRegions,
  r1Metrics,
  r2Metrics,
  r1PyeongPrice,
  r2PyeongPrice,
  r1AvgWidth,
  r2AvgWidth,
  r1PyeongWidth,
  r2PyeongWidth,
}: CompareBarChartsProps) {
  return (
    <div className="grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
      {/* 평균 매매가 비교 차트 */}
      <div className="rounded-[24px] border border-slate-200/80 bg-white p-7 shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-3.5">
          <h3 className="flex items-center gap-2 text-[16px] font-black text-slate-900">
            <div className="flex size-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <Building2 className="size-4" />
            </div>
            평균 매매가 비교
          </h3>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
            단위: 억 원
          </span>
        </div>

        <div className="flex flex-col gap-6">
          {/* 지역 1 바 */}
          <div>
            <div className="mb-2 flex items-center justify-between text-[13px]">
              <div className="flex items-center gap-1.5">
                <span className="flex size-2 rounded-full bg-blue-600" />
                <span className="font-bold text-blue-700">
                  {appliedRegions.r1.dong}
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  ({appliedRegions.r1.district})
                </span>
              </div>
              <span className="text-[15px] font-black tracking-tight text-slate-900">
                {r1Metrics.avgPrice}억 원
              </span>
            </div>
            <div className="h-7 w-full overflow-hidden rounded-full bg-slate-100 p-1 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 shadow-sm transition-all duration-700 ease-out"
                style={{ width: r1AvgWidth }}
              />
            </div>
          </div>

          {/* 지역 2 바 */}
          <div>
            <div className="mb-2 flex items-center justify-between text-[13px]">
              <div className="flex items-center gap-1.5">
                <span className="flex size-2 rounded-full bg-emerald-600" />
                <span className="font-bold text-emerald-700">
                  {appliedRegions.r2.dong}
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  ({appliedRegions.r2.district})
                </span>
              </div>
              <span className="text-[15px] font-black tracking-tight text-slate-900">
                {r2Metrics.avgPrice}억 원
              </span>
            </div>
            <div className="h-7 w-full overflow-hidden rounded-full bg-slate-100 p-1 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 shadow-sm transition-all duration-700 ease-out"
                style={{ width: r2AvgWidth }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 평단가 비교 차트 */}
      <div className="rounded-[24px] border border-slate-200/80 bg-white p-7 shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-3.5">
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

        <div className="flex flex-col gap-6">
          {/* 지역 1 평당가 바 */}
          <div>
            <div className="mb-2 flex items-center justify-between text-[13px]">
              <div className="flex items-center gap-1.5">
                <span className="flex size-2 rounded-full bg-blue-600" />
                <span className="font-bold text-blue-700">
                  {appliedRegions.r1.dong}
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  ({appliedRegions.r1.district})
                </span>
              </div>
              <span className="text-[15px] font-black tracking-tight text-slate-900">
                {(r1PyeongPrice || 0).toLocaleString()}만 원
              </span>
            </div>
            <div className="h-7 w-full overflow-hidden rounded-full bg-slate-100 p-1 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-600 shadow-sm transition-all duration-700 ease-out"
                style={{ width: r1PyeongWidth }}
              />
            </div>
          </div>

          {/* 지역 2 평당가 바 */}
          <div>
            <div className="mb-2 flex items-center justify-between text-[13px]">
              <div className="flex items-center gap-1.5">
                <span className="flex size-2 rounded-full bg-emerald-600" />
                <span className="font-bold text-emerald-700">
                  {appliedRegions.r2.dong}
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  ({appliedRegions.r2.district})
                </span>
              </div>
              <span className="text-[15px] font-black tracking-tight text-slate-900">
                {(r2PyeongPrice || 0).toLocaleString()}만 원
              </span>
            </div>
            <div className="h-7 w-full overflow-hidden rounded-full bg-slate-100 p-1 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-400 via-emerald-500 to-green-600 shadow-sm transition-all duration-700 ease-out"
                style={{ width: r2PyeongWidth }}
              />
            </div>
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
    if (!urlR1Gu || !urlR1Dong || !urlR2Gu || !urlR2Dong) return;

    hasAutoComparedRef.current = true;
    compareMutation.mutate({
      r1: {
        district: urlR1Gu,
        dong: urlR1Dong,
        sggCd:
          urlR1GuCd || sggList.find((s) => s.sggNm === urlR1Gu)?.sggCd || "",
        dongCd: urlR1DongCd,
      },
      r2: {
        district: urlR2Gu,
        dong: urlR2Dong,
        sggCd:
          urlR2GuCd || sggList.find((s) => s.sggNm === urlR2Gu)?.sggCd || "",
        dongCd: urlR2DongCd,
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

  /* 시세 비교 실행 (URL searchParams 동기화) */
  const handleCompare = useCallback(() => {
    if (!r1District || !r1Dong || !r2District || !r2Dong) {
      alert("비교할 두 지역의 자치구와 자치동을 모두 선택해 주세요.");
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
      r1Dong: r1Dong,
      ...(resolvedR1SggCd ? { r1GuCd: resolvedR1SggCd } : {}),
      ...(resolvedR1DongCd ? { r1DongCd: resolvedR1DongCd } : {}),
      r2Gu: r2District,
      r2Dong: r2Dong,
      ...(resolvedR2SggCd ? { r2GuCd: resolvedR2SggCd } : {}),
      ...(resolvedR2DongCd ? { r2DongCd: resolvedR2DongCd } : {}),
    });
    compareMutation.mutate({
      r1: {
        district: r1District,
        dong: r1Dong,
        sggCd: resolvedR1SggCd,
        dongCd: resolvedR1DongCd,
      },
      r2: {
        district: r2District,
        dong: r2Dong,
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
    <div className={cn("tw-scope", "min-h-screen", "bg-[#F8FAFC]")}>
      <main className="py-8">
        <div
          className={cn(
            "mx-auto flex w-[min(1490px,calc(100%-48px))] gap-8",
            "max-[1240px]:w-[min(980px,calc(100%-36px))]",
            "max-[760px]:w-[calc(100%-24px)]",
            "max-[900px]:flex-col",
          )}
        >
          {/* 사이드바 영역 */}
          <SidebarNav />

          {/* 메인 콘텐츠 영역 */}
          <section className="min-w-0 flex-1">
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

                {/* 중앙 VS 배지 */}
                <div className="flex items-center justify-center max-[1200px]:py-2">
                  <div className="flex size-13 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-slate-800 via-slate-900 to-black text-[14px] font-black tracking-widest text-white shadow-[0_8px_20px_rgba(15,23,42,0.25)] ring-2 ring-slate-100">
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
                    disabled={compareMutation.isPending || isSggLoading}
                    className="flex h-[120px] w-full min-w-[135px] flex-col items-center justify-center gap-2 rounded-[18px] border border-[#096277] bg-gradient-to-b from-[#0F8AA8] via-[#0B7791] to-[#07596E] p-4 text-white shadow-[0_10px_25px_rgba(15,138,168,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(15,138,168,0.45)] active:translate-y-0 disabled:opacity-70 cursor-pointer"
                  >
                    {compareMutation.isPending ? (
                      <Loader2 className="size-6 animate-spin" />
                    ) : (
                      <BarChart3 className="size-6 stroke-[2.4]" />
                    )}
                    <span className="text-[15px] font-black tracking-tight">
                      {compareMutation.isPending
                        ? "분석 중..."
                        : "시세 비교하기"}
                    </span>
                  </button>
                  <p className="mt-3 text-[11px] font-semibold leading-tight text-slate-400">
                    두 지역의 시세를
                    <br />
                    정밀 비교 분석합니다.
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
                <div className="grid grid-cols-[1fr_340px] gap-6 max-[1100px]:grid-cols-1">
                  {/* 비교 표 */}
                  <CompareTable
                    baseDate={baseDate}
                    r1Label={r1Label}
                    r2Label={r2Label}
                    r1Dong={appliedRegions.r1.dong}
                    r2Dong={appliedRegions.r2.dong}
                    r1Metrics={r1Metrics}
                    r2Metrics={r2Metrics}
                    r1PyeongPrice={r1PyeongPrice}
                    r2PyeongPrice={r2PyeongPrice}
                  />

                  {/* 요약 카드 */}
                  <SummaryCard
                    avgDiffText={avgDiffText}
                    pyeongDiffText={pyeongDiffText}
                    appliedRegions={appliedRegions}
                    r1Metrics={r1Metrics}
                    r2Metrics={r2Metrics}
                  />
                </div>

                {/* 차트 영역 */}
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
        </div>
      </main>
    </div>
  );
}
