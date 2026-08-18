import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Home,
  Info,
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

  /* 가격 차이 텍스트 계산 */
  const formatDiffText = useCallback((val1: number, val2: number) => {
    const diff = Math.abs(val1 - val2).toFixed(1);
    if (val1 > val2) return `지역1이 ${diff}억 높음`;
    if (val1 < val2) return `지역2가 ${diff}억 높음`;
    return "동일함";
  }, []);

  const avgDiffText = useMemo(() => {
    return r1Metrics && r2Metrics
      ? formatDiffText(r1Metrics.avgPrice, r2Metrics.avgPrice)
      : "";
  }, [r1Metrics, r2Metrics, formatDiffText]);

  const recentDiffText = useMemo(() => {
    return r1Metrics && r2Metrics
      ? formatDiffText(r1Metrics.recentPrice, r2Metrics.recentPrice)
      : "";
  }, [r1Metrics, r2Metrics, formatDiffText]);

  const avgJeonseDiffText = useMemo(() => {
    return r1Metrics && r2Metrics
      ? formatDiffText(r1Metrics.avgJeonsePrice, r2Metrics.avgJeonsePrice)
      : "";
  }, [r1Metrics, r2Metrics, formatDiffText]);

  /* 차트 막대그래프 너비 비율 계산 (useMemo) */
  const { r1AvgWidth, r2AvgWidth, r1JeonseWidth, r2JeonseWidth } =
    useMemo(() => {
      const maxAvgPrice = Math.max(
        r1Metrics?.avgPrice || 10,
        r2Metrics?.avgPrice || 10,
      );
      const maxAvgJeonse = Math.max(
        r1Metrics?.avgJeonsePrice || 5,
        r2Metrics?.avgJeonsePrice || 5,
      );

      return {
        r1AvgWidth: r1Metrics
          ? `${Math.min(100, Math.max(15, (r1Metrics.avgPrice / maxAvgPrice) * 100))}%`
          : "50%",
        r2AvgWidth: r2Metrics
          ? `${Math.min(100, Math.max(15, (r2Metrics.avgPrice / maxAvgPrice) * 100))}%`
          : "50%",
        r1JeonseWidth: r1Metrics
          ? `${Math.min(100, Math.max(15, (r1Metrics.avgJeonsePrice / maxAvgJeonse) * 100))}%`
          : "50%",
        r2JeonseWidth: r2Metrics
          ? `${Math.min(100, Math.max(15, (r2Metrics.avgJeonsePrice / maxAvgJeonse) * 100))}%`
          : "50%",
      };
    }, [r1Metrics, r2Metrics]);

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
    baseDate,
    r1Label,
    r2Label,
    avgDiffText,
    recentDiffText,
    avgJeonseDiffText,
    r1AvgWidth,
    r2AvgWidth,
    r1JeonseWidth,
    r2JeonseWidth,
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
      ? "focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#2563EB]/20 shadow-sm"
      : "focus-within:border-[#16A34A] focus-within:ring-2 focus-within:ring-[#16A34A]/20 shadow-sm";

  const selectedBg =
    accentColor === "blue"
      ? "bg-[#EFF6FF] text-[#2563EB] font-bold"
      : "bg-[#F0FDF4] text-[#16A34A] font-bold";

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-[10px] border border-[#CBD5E1] bg-white px-3 transition-all",
          focusRing,
          disabled && "bg-[#F1F5F9] cursor-not-allowed opacity-60",
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
          className="w-full bg-transparent text-[13px] font-semibold text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
        />
        <div className="flex items-center gap-1.5 ml-1">
          {displayQuery && !disabled && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                onChange("");
                setIsOpen(true);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-full text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#64748B] transition-colors cursor-pointer"
              title="초기화"
            >
              <X className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              if (!disabled) {
                setIsOpen((prev) => !prev);
                inputRef.current?.focus();
              }
            }}
            className="p-1 rounded-full text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#64748B] transition-colors cursor-pointer"
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform duration-200",
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
          className="absolute left-0 top-[calc(100%+6px)] z-50 max-h-60 w-full overflow-y-auto rounded-[12px] border border-[#CBD5E1] bg-white p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-3 text-center text-[12px] font-semibold text-[#94A3B8]">
              검색 결과가 없습니다.
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
                    "flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-left text-[13px] font-medium text-[#0F172A] transition-colors cursor-pointer",
                    isHighlighted && "bg-[#F1F5F9]",
                    isSelected && selectedBg,
                  )}
                >
                  <span className="truncate">
                    <HighlightMatch
                      text={opt.label}
                      query={searchQuery !== null ? searchQuery : ""}
                    />
                  </span>
                  {isSelected && <Check className="size-4 shrink-0 ml-2" />}
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
        "flex flex-col justify-between rounded-[20px] border p-6 shadow-sm transition-all",
        isRegion1
          ? "border-[#2563EB]/25 bg-gradient-to-b from-[#F0F6FF] to-white"
          : "border-[#16A34A]/25 bg-gradient-to-b from-[#F0FDF4] to-white",
      )}
    >
      <div>
        <div className="mb-4 flex items-center justify-between">
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[12px] font-black text-white shadow-sm",
              isRegion1 ? "bg-[#2563EB]" : "bg-[#16A34A]",
            )}
          >
            <MapPin className="size-3.5" />
            {title}
          </span>
          {district && (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-bold",
                isRegion1
                  ? "bg-[#DBEAFE] text-[#1D4ED8]"
                  : "bg-[#DCFCE7] text-[#15803D]",
              )}
            >
              {district} {dong ? dong : ""}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {/* 자치구 입력 */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-[13px] font-bold text-[#334155]">
              <span>자치구</span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-extrabold",
                  isRegion1
                    ? "bg-[#DBEAFE] text-[#1D4ED8]"
                    : "bg-[#DCFCE7] text-[#15803D]",
                )}
              >
                필수 선택
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
            <label className="flex items-center gap-1.5 text-[13px] font-bold text-[#334155]">
              <span>자치동</span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-extrabold",
                  isRegion1
                    ? "bg-[#DBEAFE] text-[#1D4ED8]"
                    : "bg-[#DCFCE7] text-[#15803D]",
                )}
              >
                필수 선택
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

/* 시세 비교 표 컴포넌트 */
interface CompareTableProps {
  baseDate: string;
  r1Label: string;
  r2Label: string;
  r1Metrics: MetricResult;
  r2Metrics: MetricResult;
  avgDiffText: string;
  recentDiffText: string;
}

function CompareTable({
  baseDate,
  r1Label,
  r2Label,
  r1Metrics,
  r2Metrics,
  avgDiffText,
  recentDiffText,
}: CompareTableProps) {
  return (
    <div className="flex flex-col justify-between rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
      <div>
        <div className="mb-5 flex items-center justify-between border-b border-[#F1F5F9] pb-4">
          <h2 className="text-[18px] font-black text-[#0F172A]">비교 리포트</h2>
          <span className="flex items-center gap-1 rounded-full bg-[#F1F5F9] px-3 py-1 text-[11px] font-bold text-[#64748B]">
            <Info className="size-3 text-[#0F8AA8]" />
            {baseDate} 기준 (최근 1개월)
          </span>
        </div>

        <div className="overflow-hidden rounded-[14px] border border-[#E2E8F0]">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <th className="w-[140px] px-5 py-3.5 font-bold text-[#475569]">
                  항목
                </th>
                <th className="px-5 py-3.5 font-extrabold text-[#2563EB]">
                  <span className="mr-2 inline-block size-2 rounded-full bg-[#2563EB]" />
                  지역 1{" "}
                  <span className="font-bold text-[#475569]">{r1Label}</span>
                </th>
                <th className="px-5 py-3.5 font-extrabold text-[#16A34A]">
                  <span className="mr-2 inline-block size-2 rounded-full bg-[#16A34A]" />
                  지역 2{" "}
                  <span className="font-bold text-[#475569]">{r2Label}</span>
                </th>
                <th className="w-[160px] px-5 py-3.5 font-bold text-[#475569]">
                  비교
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] bg-white">
              <tr className="hover:bg-[#F8FAFC]">
                <td className="flex items-center gap-2 px-5 py-4 font-extrabold text-[#0F172A]">
                  <Building2 className="size-4 text-[#0F8AA8]" />
                  평균 매매가
                </td>
                <td className="px-5 py-4 font-black text-[#2563EB]">
                  {r1Metrics.avgPrice}억 원
                  <span className="ml-1.5 text-[11px] font-normal text-[#64748B]">
                    ({formatPriceKRW(r1Metrics.avgPrice)})
                  </span>
                </td>
                <td className="px-5 py-4 font-black text-[#16A34A]">
                  {r2Metrics.avgPrice}억 원
                  <span className="ml-1.5 text-[11px] font-normal text-[#64748B]">
                    ({formatPriceKRW(r2Metrics.avgPrice)})
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className="inline-block rounded-full bg-[#FEE2E2] px-3 py-1 text-[12px] font-extrabold text-[#DC2626]">
                    {avgDiffText}
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-[#F8FAFC]">
                <td className="flex items-center gap-2 px-5 py-4 font-extrabold text-[#0F172A]">
                  <TrendingUp className="size-4 text-[#0F8AA8]" />
                  최근 실거래가
                </td>
                <td className="px-5 py-4 font-black text-[#2563EB]">
                  {r1Metrics.recentPrice}억 원
                  <span className="ml-1.5 text-[11px] font-normal text-[#64748B]">
                    ({formatPriceKRW(r1Metrics.recentPrice)})
                  </span>
                </td>
                <td className="px-5 py-4 font-black text-[#16A34A]">
                  {r2Metrics.recentPrice}억 원
                  <span className="ml-1.5 text-[11px] font-normal text-[#64748B]">
                    ({formatPriceKRW(r2Metrics.recentPrice)})
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className="inline-block rounded-full bg-[#FEE2E2] px-3 py-1 text-[12px] font-extrabold text-[#DC2626]">
                    {recentDiffText}
                  </span>
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
  avgJeonseDiffText: string;
  appliedRegions: { r1: SelectedRegion; r2: SelectedRegion };
  r1Metrics: MetricResult;
  r2Metrics: MetricResult;
}

function SummaryCard({
  avgDiffText,
  avgJeonseDiffText,
  appliedRegions,
  r1Metrics,
  r2Metrics,
}: SummaryCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
      <div>
        <h3 className="mb-4 text-[16px] font-black text-[#0F172A]">
          한눈에 보는 요약
        </h3>
        <div className="flex flex-col gap-3">
          <div className="rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
            <div className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-[#0F172A]">
              <Building2 className="size-4 text-[#0F8AA8]" />
              <span>평균 매매가</span>
            </div>
            <p className="text-[12px] font-extrabold text-[#DC2626]">
              {avgDiffText}.
            </p>
          </div>

          <div className="rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
            <div className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-[#0F172A]">
              <Home className="size-4 text-[#0F8AA8]" />
              <span>평균 전세가</span>
            </div>
            <p className="text-[12px] font-extrabold text-[#0284C7]">
              {avgJeonseDiffText}.
            </p>
          </div>

          <div className="rounded-[12px] border border-[#0F8AA8]/30 bg-[#E8F6F9] p-3.5">
            <div className="mb-1 flex items-center gap-1.5 text-[12px] font-black text-[#0F8AA8]">
              <Sparkles className="size-4" />
              <span>종합 의견</span>
            </div>
            <p className="text-[11px] font-semibold leading-relaxed text-[#0F5C70]">
              {r1Metrics.avgPrice >= r2Metrics.avgPrice
                ? `${appliedRegions.r1.district} ${appliedRegions.r1.dong}`
                : `${appliedRegions.r2.district} ${appliedRegions.r2.dong}`}
              이(가) 매매가 및 전세가가 상대적으로 더 높게 형성되어 있으며, 두
              지역 모두 서울 주요 선호 주거 지역입니다.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-[#16A34A]">
        <CheckCircle2 className="size-3.5" />
        <span>비교 분석이 반영되었습니다.</span>
      </div>
    </div>
  );
}

/* 시세 비교 막대그래프 컴포넌트 */
interface CompareBarChartsProps {
  appliedRegions: { r1: SelectedRegion; r2: SelectedRegion };
  r1Metrics: MetricResult;
  r2Metrics: MetricResult;
  r1AvgWidth: string;
  r2AvgWidth: string;
  r1JeonseWidth: string;
  r2JeonseWidth: string;
}

function CompareBarCharts({
  appliedRegions,
  r1Metrics,
  r2Metrics,
  r1AvgWidth,
  r2AvgWidth,
  r1JeonseWidth,
  r2JeonseWidth,
}: CompareBarChartsProps) {
  return (
    <div className="grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
      {/* 평균 매매가 비교 차트 */}
      <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[15px] font-black text-[#0F172A]">
            <Building2 className="size-4 text-[#0F8AA8]" />
            평균 매매가 비교
          </h3>
          <span className="text-[11px] font-bold text-[#94A3B8]">
            (단위: 억 원)
          </span>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <div className="mb-1.5 flex justify-between text-[12px] font-bold">
              <span className="text-[#2563EB]">
                지역 1 ({appliedRegions.r1.district} {appliedRegions.r1.dong})
              </span>
              <span className="font-black text-[#0F172A]">
                {r1Metrics.avgPrice}억 원
              </span>
            </div>
            <div className="h-6 w-full rounded-full bg-[#F1F5F9] p-1">
              <div
                className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
                style={{ width: r1AvgWidth }}
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex justify-between text-[12px] font-bold">
              <span className="text-[#16A34A]">
                지역 2 ({appliedRegions.r2.district} {appliedRegions.r2.dong})
              </span>
              <span className="font-black text-[#0F172A]">
                {r2Metrics.avgPrice}억 원
              </span>
            </div>
            <div className="h-6 w-full rounded-full bg-[#F1F5F9] p-1">
              <div
                className="h-full rounded-full bg-[#16A34A] transition-all duration-500"
                style={{ width: r2AvgWidth }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 평균 전세가 비교 차트 */}
      <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[15px] font-black text-[#0F172A]">
            <Home className="size-4 text-[#0F8AA8]" />
            평균 전세가 비교
          </h3>
          <span className="text-[11px] font-bold text-[#94A3B8]">
            (단위: 억 원)
          </span>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <div className="mb-1.5 flex justify-between text-[12px] font-bold">
              <span className="text-[#2563EB]">
                지역 1 ({appliedRegions.r1.district} {appliedRegions.r1.dong})
              </span>
              <span className="font-black text-[#0F172A]">
                {r1Metrics.avgJeonsePrice}억 원
              </span>
            </div>
            <div className="h-6 w-full rounded-full bg-[#F1F5F9] p-1">
              <div
                className="h-full rounded-full bg-[#3B82F6] transition-all duration-500"
                style={{ width: r1JeonseWidth }}
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex justify-between text-[12px] font-bold">
              <span className="text-[#16A34A]">
                지역 2 ({appliedRegions.r2.district} {appliedRegions.r2.dong})
              </span>
              <span className="font-black text-[#0F172A]">
                {r2Metrics.avgJeonsePrice}억 원
              </span>
            </div>
            <div className="h-6 w-full rounded-full bg-[#F1F5F9] p-1">
              <div
                className="h-full rounded-full bg-[#22C55E] transition-all duration-500"
                style={{ width: r2JeonseWidth }}
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
  /* 1. 지역 선택 폼 상태 관리 */
  const [r1District, setR1District] = useState("");
  const [r1SggCd, setR1SggCd] = useState("");
  const [r1Dong, setR1Dong] = useState("");
  const [r1DongCd, setR1DongCd] = useState("");

  const [r2District, setR2District] = useState("");
  const [r2SggCd, setR2SggCd] = useState("");
  const [r2Dong, setR2Dong] = useState("");
  const [r2DongCd, setR2DongCd] = useState("");

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
    baseDate,
    r1Label,
    r2Label,
    avgDiffText,
    recentDiffText,
    avgJeonseDiffText,
    r1AvgWidth,
    r2AvgWidth,
    r1JeonseWidth,
    r2JeonseWidth,
    resetCompare,
  } = usePriceCompareMutation();

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
      setR1DongCd(opt?.code || r1DongOptions.find((d) => d.label === name)?.code || "");
    },
    [r1DongOptions],
  );

  const handleR2DongChange = useCallback(
    (name: string, opt?: AutocompleteOption) => {
      setR2Dong(name);
      setR2DongCd(opt?.code || r2DongOptions.find((d) => d.label === name)?.code || "");
    },
    [r2DongOptions],
  );

  /* 시세 비교 실행 */
  const handleCompare = useCallback(() => {
    if (!r1District || !r1Dong || !r2District || !r2Dong) {
      alert("비교할 두 지역의 자치구와 자치동을 모두 선택해 주세요.");
      return;
    }
    compareMutation.mutate({
      r1: { district: r1District, dong: r1Dong, sggCd: r1SggCd, dongCd: r1DongCd },
      r2: { district: r2District, dong: r2Dong, sggCd: r2SggCd, dongCd: r2DongCd },
    });
  }, [r1District, r1Dong, r1SggCd, r1DongCd, r2District, r2Dong, r2SggCd, r2DongCd, compareMutation]);

  /* 전체 초기화 */
  const handleReset = useCallback(() => {
    setR1District("");
    setR1SggCd("");
    setR1Dong("");
    setR1DongCd("");
    setR2District("");
    setR2SggCd("");
    setR2Dong("");
    setR2DongCd("");
    resetCompare();
  }, [resetCompare]);

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
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h1 className="text-[24px] font-black text-[#0F172A]">
                  지역별 비교(리스트)
                </h1>
                <p className="mt-1 text-[13px] font-medium text-[#64748B]">
                  자치구와 자치동을 선택하여 두 지역의 매매/전세 시세를 비교해보세요.
                </p>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 py-2 text-[12px] font-bold text-[#475569] shadow-sm transition-all hover:border-[#0F8AA8] hover:bg-[#F8FAFC] hover:text-[#0F8AA8] cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                <span>초기화</span>
              </button>
            </div>

            {/* 지역 선택 카드 섹션 */}
            <div className="mb-8 rounded-[24px] border border-[#E2E8F0] bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
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
                  <div className="flex size-12 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[#0F8AA8] to-[#0B5E73] font-black text-white shadow-[0_4px_16px_rgba(15,138,168,0.3)]">
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
                <div className="flex flex-col items-center justify-center rounded-[20px] border border-[#E2E8F0] bg-[#F8FAFC] p-5 text-center max-[1200px]:py-6">
                  <button
                    type="button"
                    onClick={handleCompare}
                    disabled={compareMutation.isPending || isSggLoading}
                    className="flex h-[115px] w-full min-w-[130px] flex-col items-center justify-center gap-2.5 rounded-[16px] border border-[#0B5E73] bg-gradient-to-b from-[#0F8AA8] to-[#0B5E73] p-4 text-white shadow-[0_8px_20px_rgba(15,138,168,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,138,168,0.4)] active:translate-y-0 disabled:opacity-75 cursor-pointer"
                  >
                    {compareMutation.isPending ? (
                      <Loader2 className="size-6 animate-spin" />
                    ) : (
                      <BarChart3 className="size-6 stroke-[2.2]" />
                    )}
                    <span className="text-[15px] font-black tracking-tight">
                      {compareMutation.isPending
                        ? "분석 중..."
                        : "시세 비교하기"}
                    </span>
                  </button>
                  <p className="mt-3 text-[11px] font-medium leading-tight text-[#64748B]">
                    두 지역의 시세정보를
                    <br />
                    비교 분석합니다.
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
              <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-12 text-center shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-[#E8F6F9] text-[#0F8AA8]">
                  <BarChart3 className="size-8" />
                </div>
                <h3 className="text-[18px] font-black text-[#0F172A]">
                  비교할 지역을 선택하고 &apos;비교하기&apos; 버튼을 눌러주세요
                </h3>
                <p className="mx-auto mt-2 max-w-[420px] text-[13px] font-medium leading-relaxed text-[#64748B]">
                  두 지역(자치구, 자치동)을 지정한 뒤{" "}
                  <span className="font-extrabold text-[#0F8AA8]">
                    &apos;비교하기&apos;
                  </span>{" "}
                  버튼을 클릭하면 매매 및 전세 시세 비교 표와 그래프가
                  나타납니다.
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
                    r1Metrics={r1Metrics}
                    r2Metrics={r2Metrics}
                    avgDiffText={avgDiffText}
                    recentDiffText={recentDiffText}
                  />

                  {/* 요약 카드 */}
                  <SummaryCard
                    avgDiffText={avgDiffText}
                    avgJeonseDiffText={avgJeonseDiffText}
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
                  r1AvgWidth={r1AvgWidth}
                  r2AvgWidth={r2AvgWidth}
                  r1JeonseWidth={r1JeonseWidth}
                  r2JeonseWidth={r2JeonseWidth}
                />

                {/* 출처 안내 */}
                <div className="flex items-center justify-between rounded-[16px] border border-[#E2E8F0] bg-white px-6 py-4 text-[11px] text-[#94A3B8]">
                  <div className="flex items-center gap-1.5">
                    <Info className="size-3.5 text-[#0F8AA8]" />
                    <span>
                      본 정보는 국토교통부 실거래가 공개시스템 데이터를 기반으로
                      제공되며, 실제 거래가와 차이가 있을 수 있습니다.
                    </span>
                  </div>
                  <span>데이터 기준일: {baseDate}</span>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
