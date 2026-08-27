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
import {
  getRegionCompareApi,
  type RegionCompareResponse,
} from "@/api/api";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { PRICE_NAVIGATION } from "@/config/sectionNavigation";

/* 1. 타입 정의 */
interface MetricResult {
  avgPrice: number;
  avgPyeongPrice: number | null;
  totalCount?: number;
}

interface CompareResponse {
  r1: MetricResult;
  r2: MetricResult;
  baseDate?: string;
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

/* 가격 비교 데이터 조회 API (/fastApi/compare) */
async function fetchPriceCompareApi(payload: {
  r1: SelectedRegion;
  r2: SelectedRegion;
}): Promise<CompareResponse> {
  const { r1, r2 } = payload;
  if (!r1.sggCd || !r1.dongCd || !r2.sggCd || !r2.dongCd) {
    throw new Error('비교할 두 지역의 자치구 코드와 법정동 코드가 필요합니다.');
  }

  const response: RegionCompareResponse = await getRegionCompareApi({
    guCode1: r1.sggCd,
    dongCode1: r1.dongCd,
    guCode2: r2.sggCd,
    dongCode2: r2.dongCd,
  });

  const toMetric = (region: RegionCompareResponse['region1']): MetricResult => ({
    avgPrice: region.avg_thing_amt / 10000,
    avgPyeongPrice: region.avg_pyeong_amt ?? null,
    totalCount: region.total_count,
  });

  return {
    baseDate: response.base_date,
    r1: toMetric(response.region1),
    r2: toMetric(response.region2),
  };
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
  const baseDate = compareData?.baseDate || "기준일 정보 없음";

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
  const r1PyeongPrice = r1Metrics?.avgPyeongPrice ?? null;
  const r2PyeongPrice = r2Metrics?.avgPyeongPrice ?? null;

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
    if (r1PyeongPrice === null || r2PyeongPrice === null) {
      return "평당가 데이터 없음";
    }
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

  /* 자치구, 자치동 선택에 따라 동적으로 변경되는 타이틀 */
  const dynamicTitle = useMemo(() => {
    if (district && dong) {
      return `${district} ${dong} (${isRegion1 ? "기준" : "비교"})`;
    }
    if (district) {
      return `${district} (${isRegion1 ? "기준" : "비교"})`;
    }
    return title;
  }, [district, dong, isRegion1, title]);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4 rounded-[16px] border border-slate-200/80 bg-white p-3 sm:py-3 sm:px-4 shadow-[0_3px_16px_rgba(15,23,42,0.03)] transition-all duration-300 hover:shadow-[0_6px_22px_rgba(15,23,42,0.05)]">
      {/* 타이틀 영역 (지역 1: 파란색, 지역 2: 그린색 / 선택 시 자치구·자치동 이름으로 동적 변경) */}
      <div className="flex items-center gap-2 shrink-0 sm:min-w-[160px]">
        <MapPin
          className={cn(
            "size-4 shrink-0",
            isRegion1 ? "text-blue-600" : "text-emerald-600",
          )}
        />
        <h3
          className={cn(
            "text-[15px] font-black tracking-tight whitespace-nowrap",
            isRegion1 ? "text-blue-700" : "text-emerald-700",
          )}
        >
          {dynamicTitle}
        </h3>
      </div>

      {/* 자치구 및 자치동 선택창 영역 (타이틀 옆 가로 배치) */}
      <div className="grid flex-1 grid-cols-2 gap-4 w-full max-[640px]:grid-cols-1">
        {/* 자치구 입력 */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center justify-between text-[12.5px] font-bold text-slate-700">
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

        {/* 자치동 입력 */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center justify-between text-[12.5px] font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <span>자치동 선택</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-700">
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
                ? "자치구를 먼저 선택하세요"
                : isDongLoading
                  ? "자치동 목록 로딩 중..."
                  : "자치동을 선택하세요"
            }
            disabled={!district || isDongLoading}
            accentColor={accentColor}
          />
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
  myValue: number | null;
  targetValue: number | null;
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
  r1PyeongPrice: number | null;
  r2PyeongPrice: number | null;
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
    <div className="flex flex-col justify-between rounded-[24px] border border-slate-200/80 bg-white p-4 sm:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
      <div>
        <div className="mb-4 sm:mb-5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 sm:size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F8AA8]/15 to-[#0F8AA8]/5 text-[#0F8AA8]">
              <BarChart3 className="size-4.5 sm:size-5" />
            </div>
            <div>
              <h2 className="text-[17px] sm:text-[19px] font-black tracking-tight text-slate-900">
                비교 리포트
              </h2>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-slate-50 px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-bold text-slate-600 shadow-xs">
            <Info className="size-3 sm:size-3.5 text-[#0F8AA8]" />
            {baseDate} 기준 <span className="text-[#0F8AA8]">(최근 3개월)</span>
          </span>
        </div>

        <div className="flex flex-col gap-1">
          {/* 헤더 행 */}
          <div className="grid grid-cols-[95px_1fr_1fr] sm:grid-cols-[180px_1fr_1fr] gap-1 text-[11px] sm:text-[13px] font-black text-slate-800">
            <div className="flex items-center justify-center border border-[#CBD5E1] bg-[#F1F5F9] p-2 sm:p-3 shadow-xs">
              비교 항목
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 border border-[#CBD5E1] bg-[#F1F5F9] p-2 sm:p-3 shadow-xs text-center">
              <span className="inline-block rounded-full bg-blue-600 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-white shrink-0">
                지역 1
              </span>
              <span className="text-[12px] sm:text-[14px] font-black text-blue-700 truncate max-w-[70px] sm:max-w-none">
                {r1Dong || "지역 1"}
              </span>
              <span className="text-[9.5px] sm:text-[11px] font-semibold text-slate-500 shrink-0">
                ({r1Label})
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 border border-[#CBD5E1] bg-[#F1F5F9] p-2 sm:p-3 shadow-xs text-center">
              <span className="inline-block rounded-full bg-emerald-600 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-white shrink-0">
                지역 2
              </span>
              <span className="text-[12px] sm:text-[14px] font-black text-emerald-700 truncate max-w-[70px] sm:max-w-none">
                {r2Dong || "지역 2"}
              </span>
              <span className="text-[9.5px] sm:text-[11px] font-semibold text-slate-500 shrink-0">
                ({r2Label})
              </span>
            </div>
          </div>

          {/* 1행: 평균 매매가 */}
          <div className="grid grid-cols-[95px_1fr_1fr] sm:grid-cols-[180px_1fr_1fr] gap-1">
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 border border-[#CBD5E1] bg-[#F8FAFC] p-2 sm:p-3 shadow-xs">
              <Building2 className="size-3.5 sm:size-4 text-sky-600 shrink-0 hidden xs:block sm:block" />
              <div className="flex flex-col text-center sm:text-left">
                <span className="text-[11.5px] sm:text-[13px] font-extrabold text-slate-800 leading-tight">
                  평균 매매가
                </span>
                <span className="text-[9.5px] sm:text-[11px] font-semibold text-slate-400 leading-tight mt-0.5">
                  (단위: 억 원)
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 border border-[#CBD5E1] bg-white p-2 sm:p-3 shadow-xs">
              <span className="text-[14px] sm:text-[17px] font-black tracking-tight text-slate-900">
                {r1Metrics.avgPrice}
              </span>
              <PriceDiffBadge
                myValue={r1Metrics.avgPrice}
                targetValue={r2Metrics.avgPrice}
                unit="억"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 border border-[#CBD5E1] bg-white p-2 sm:p-3 shadow-xs">
              <span className="text-[14px] sm:text-[17px] font-black tracking-tight text-slate-900">
                {r2Metrics.avgPrice}
              </span>
              <PriceDiffBadge
                myValue={r2Metrics.avgPrice}
                targetValue={r1Metrics.avgPrice}
                unit="억"
              />
            </div>
          </div>

          {/* 2행: 평당가 */}
          <div className="grid grid-cols-[95px_1fr_1fr] sm:grid-cols-[180px_1fr_1fr] gap-1">
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 border border-[#CBD5E1] bg-[#F8FAFC] p-2 sm:p-3 shadow-xs">
              <TrendingUp className="size-3.5 sm:size-4 text-indigo-600 shrink-0 hidden xs:block sm:block" />
              <div className="flex flex-col text-center sm:text-left">
                <span className="text-[11.5px] sm:text-[13px] font-extrabold text-slate-800 leading-tight">
                  평당가
                </span>
                <span className="text-[9.5px] sm:text-[11px] font-semibold text-slate-400 leading-tight mt-0.5">
                  (단위: 만 원)
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 border border-[#CBD5E1] bg-white p-2 sm:p-3 shadow-xs text-center">
              <span className="text-[13px] sm:text-[17px] font-black tracking-tight text-slate-900">
                {r1PyeongPrice?.toLocaleString() ?? "없음"}
              </span>
              <PriceDiffBadge
                myValue={r1PyeongPrice}
                targetValue={r2PyeongPrice}
                unit="만원"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 border border-[#CBD5E1] bg-white p-2 sm:p-3 shadow-xs text-center">
              <span className="text-[13px] sm:text-[17px] font-black tracking-tight text-slate-900">
                {r2PyeongPrice?.toLocaleString() ?? "없음"}
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
  r1Text?: string,
) {
  if (!text) return null;
  if (text === "두 지역의 시세가 동일함" || text === "평당가 데이터 없음") {
    return (
      <div className="flex items-center justify-between pt-0.5">
        <span className="text-[12.5px] font-bold text-slate-600 break-keep">{text}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-500">동일/없음</span>
      </div>
    );
  }

  const baseText = text.replace(/[▲▼]/g, "").trim();

  // '이(가)' 와 '보다' 를 기준으로 분리하여 깔끔하고 가독성 높은 텍스트 표현
  const match = baseText.match(/^(.*?)이\(가\)\s+(.*?)보다\s+(.*)$/);
  if (match) {
    const [, higherName, lowerName, diffStr] = match;
    const isHigherR1 = r1Text ? higherName.includes(r1Text) : true;

    const higherColorClass = isHigherR1 ? "text-blue-700 font-black" : "text-emerald-700 font-black";
    const lowerColorClass = isHigherR1 ? "text-emerald-700 font-black" : "text-blue-700 font-black";

    return (
      <p className="text-[12.5px] font-semibold text-slate-700 leading-snug break-keep pt-0.5">
        <span className={higherColorClass}>{higherName}</span>이(가){" "}
        <span className={lowerColorClass}>{lowerName}</span>보다{" "}
        <span className="font-black text-rose-600">{diffStr}</span> 더 높게 형성되어 있습니다.
      </p>
    );
  }

  return (
    <span className="text-[13px] font-black leading-snug text-slate-900 break-keep">
      {baseText}
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

  /* 실시간 조회 데이터 기반 AI 요약 브리핑 생성 */
  const aiReportText = useMemo(() => {
    const p1 = Number(r1Metrics.avgPrice || 0);
    const p2 = Number(r2Metrics.avgPrice || 0);
    const py1 = r1Metrics.avgPyeongPrice ?? 0;
    const py2 = r2Metrics.avgPyeongPrice ?? 0;
    const diffP = Math.abs(p1 - p2).toFixed(1);
    const diffPy = Math.abs(py1 - py2).toLocaleString();

    if (p1 === p2) {
      return `${r1Text}과(와) ${r2Text}은(는) 평균 매매가가 동일한 시세 수준을 유지하고 있습니다. 입지 선호도 및 단지별 조건에 맞춰 탐색해보시는 것을 권장합니다.`;
    }
    const higherText = p1 > p2 ? r1Text : r2Text;
    const lowerText = p1 > p2 ? r2Text : r1Text;
    const percentDiff = p2 > 0 ? ((Math.abs(p1 - p2) / p2) * 100).toFixed(1) : "0";

    let pyComment = "";
    if (py1 > 0 && py2 > 0) {
      const pyHigher = py1 > py2 ? r1Text : r2Text;
      pyComment = ` 평당가 또한 ${pyHigher}이(가) 평당 ${diffPy}만 원 높게 형성되어 전반적인 주거 가치가 더 높게 평가받고 있습니다.`;
    }

    return `${higherText}의 평균 매매가는 약 ${p1 > p2 ? p1.toFixed(1) : p2.toFixed(1)}억 원으로, ${lowerText} 대비 약 ${diffP}억 원(${percentDiff}%) 상회하고 있습니다.${pyComment}`;
  }, [r1Text, r2Text, r1Metrics, r2Metrics]);

  return (
    <div className="flex flex-col justify-between rounded-[20px] border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs transition-all hover:shadow-md">
      <div>
        {/* 헤더: AI 요약 타이틀 및 AI 라벨 */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-7.5 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xs">
              <Sparkles className="size-4" />
            </div>
            <h3 className="text-[16px] font-black tracking-tight text-slate-900">
              한눈에 보는 AI 요약
            </h3>
          </div>

          <span className="flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50/90 px-2.5 py-0.5 text-[10.5px] font-black text-blue-600 shadow-xs">
            <Sparkles className="size-3 text-blue-600 animate-pulse" />
            AI 스마트 분석
          </span>
        </div>

        {/* 비교 대상 명시 */}
        <div className="mb-3.5 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-1.5 text-[11.5px] font-bold border border-slate-100">
          <span className="text-slate-500 font-medium">비교 대상</span>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-blue-700">{r1Text}</span>
            <span className="text-slate-400 font-black">vs</span>
            <span className="font-black text-emerald-700">{r2Text}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {/* 평균 매매가 차이 AI 브리핑 */}
          <div className="group rounded-[14px] border border-slate-200/80 bg-white p-3.5 shadow-2xs transition-all hover:border-slate-300">
            <div className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[12px] font-black text-slate-800">
                <Building2 className="size-3.5 text-sky-600" />
                평균 매매가 AI 분석
              </span>
              <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[9.5px] font-black text-sky-600 border border-sky-100">
                매매 시세
              </span>
            </div>
            <div className="mt-0.5">
              {renderDiffTextFormatted(avgDiffText, r1Text)}
            </div>
          </div>

          {/* 평균 평당가 차이 AI 브리핑 */}
          <div className="group rounded-[14px] border border-slate-200/80 bg-white p-3.5 shadow-2xs transition-all hover:border-slate-300">
            <div className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[12px] font-black text-slate-800">
                <TrendingUp className="size-3.5 text-indigo-600" />
                평균 평당가 AI 분석
              </span>
              <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9.5px] font-black text-indigo-600 border border-indigo-100">
                단위 가치
              </span>
            </div>
            <div className="mt-0.5">
              {renderDiffTextFormatted(pyeongDiffText, r1Text)}
            </div>
          </div>

          {/* AI 종합 인사이트 카드 */}
          <div className="rounded-[14px] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-4 text-white shadow-md">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[12px] font-black text-amber-400">
                <Sparkles className="size-3.5 text-amber-400" />
                <span>AI 스마트 리포트 종합</span>
              </div>
              <span className="text-[9.5px] font-extrabold text-slate-400">
                실시간 데이터 분석
              </span>
            </div>
            <p className="text-[12.5px] leading-relaxed font-medium text-slate-200 break-keep">
              {aiReportText}
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
  r1PyeongPrice: number | null;
  r2PyeongPrice: number | null;
  appliedRegions: { r1: SelectedRegion; r2: SelectedRegion };
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

  // 1. 평균 매매가 비교 차이 뱃지 데이터 (v1 vs v2)
  const avgV1 = Number(r1Metrics.avgPrice || 0);
  const avgV2 = Number(r2Metrics.avgPrice || 0);
  const avgDiffVal = Math.abs(avgV1 - avgV2).toFixed(1);

  const r1AvgBadge =
    avgV1 > avgV2
      ? { text: `▲ ${avgDiffVal}억`, colorClass: "bg-rose-50 text-rose-700 border-rose-200" }
      : avgV1 < avgV2
        ? { text: `▼ ${avgDiffVal}억`, colorClass: "bg-blue-50 text-blue-700 border-blue-200" }
        : { text: "동일", colorClass: "bg-slate-100 text-slate-600 border-slate-200" };

  const r2AvgBadge =
    avgV2 > avgV1
      ? { text: `▲ ${avgDiffVal}억`, colorClass: "bg-rose-50 text-rose-700 border-rose-200" }
      : avgV2 < avgV1
        ? { text: `▼ ${avgDiffVal}억`, colorClass: "bg-blue-50 text-blue-700 border-blue-200" }
        : { text: "동일", colorClass: "bg-slate-100 text-slate-600 border-slate-200" };

  // 2. 평단가 비교 차이 뱃지 데이터 (py1 vs py2)
  const pyV1 = Number(r1PyeongPrice || 0);
  const pyV2 = Number(r2PyeongPrice || 0);
  const pyDiffVal = Math.abs(pyV1 - pyV2).toLocaleString();

  const r1PyBadge =
    pyV1 > 0 && pyV2 > 0
      ? pyV1 > pyV2
        ? { text: `▲ ${pyDiffVal}만`, colorClass: "bg-rose-50 text-rose-700 border-rose-200" }
        : pyV1 < pyV2
          ? { text: `▼ ${pyDiffVal}만`, colorClass: "bg-blue-50 text-blue-700 border-blue-200" }
          : { text: "동일", colorClass: "bg-slate-100 text-slate-600 border-slate-200" }
      : { text: "-", colorClass: "bg-slate-100 text-slate-500 border-slate-200" };

  const r2PyBadge =
    pyV1 > 0 && pyV2 > 0
      ? pyV2 > pyV1
        ? { text: `▲ ${pyDiffVal}만`, colorClass: "bg-rose-50 text-rose-700 border-rose-200" }
        : pyV2 < pyV1
          ? { text: `▼ ${pyDiffVal}만`, colorClass: "bg-blue-50 text-blue-700 border-blue-200" }
          : { text: "동일", colorClass: "bg-slate-100 text-slate-600 border-slate-200" }
      : { text: "-", colorClass: "bg-slate-100 text-slate-500 border-slate-200" };

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
      [r1Text, r1PyeongPrice, "#2563EB"],
      [r2Text, r2PyeongPrice, "#10B981"],
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
        .compare-bar-chart svg rect[fill="#10b981"] {
          transform-box: fill-box;
          transform-origin: bottom;
          animation: compareBarGrow 1.2s cubic-bezier(0.16, 1, 0.3, 1) 1 forwards;
        }
        /* 마우스 올려놨을 때 깜빡임 동작 방지 (애니메이션 재실행 차단) */
        .compare-bar-chart:hover svg rect,
        .compare-bar-chart svg rect:hover,
        .compare-bar-chart svg rect[stroke="none"] {
          animation: none !important;
        }
      `}</style>
      {/* 평균 매매가 비교 차트 */}
      <div className="flex flex-col justify-between rounded-[24px] border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs transition-all hover:shadow-md">
        <div>
          {/* 차트 헤더 */}
          <div className="mb-3 border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
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

            {/* 타이틀 바로 하단: 조회된 지역 1, 지역 2 비교 (상하 삼각형 및 차이 뱃지 표기) */}
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-[12.5px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="size-2 shrink-0 rounded-full bg-blue-600" />
                <span className="font-bold text-blue-700 truncate max-w-[110px] sm:max-w-[140px]">{r1Text}</span>
                <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-black shrink-0", r1AvgBadge.colorClass)}>
                  {r1AvgBadge.text}
                </span>
              </div>

              <div className="flex items-center gap-1.5 min-w-0">
                <span className="size-2 shrink-0 rounded-full bg-emerald-500" />
                <span className="font-bold text-emerald-700 truncate max-w-[110px] sm:max-w-[140px]">{r2Text}</span>
                <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-black shrink-0", r2AvgBadge.colorClass)}>
                  {r2AvgBadge.text}
                </span>
              </div>
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
      <div className="flex flex-col justify-between rounded-[24px] border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs transition-all hover:shadow-md">
        <div>
          {/* 차트 헤더 */}
          <div className="mb-3 border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
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

            {/* 타이틀 바로 하단: 조회된 지역 1, 지역 2 비교 (상하 삼각형 및 차이 뱃지 표기) */}
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-[12.5px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="size-2 shrink-0 rounded-full bg-blue-600" />
                <span className="font-bold text-blue-700 truncate max-w-[110px] sm:max-w-[140px]">{r1Text}</span>
                <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-black shrink-0", r1PyBadge.colorClass)}>
                  {r1PyBadge.text}
                </span>
              </div>

              <div className="flex items-center gap-1.5 min-w-0">
                <span className="size-2 shrink-0 rounded-full bg-emerald-500" />
                <span className="font-bold text-emerald-700 truncate max-w-[110px] sm:max-w-[140px]">{r2Text}</span>
                <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-black shrink-0", r2PyBadge.colorClass)}>
                  {r2PyBadge.text}
                </span>
              </div>
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
    resetCompare,
  } = usePriceCompareMutation();

  /* F5 새로고침 또는 URL 파라미터가 있을 때 자동 시세 비교 실행 */
  useEffect(() => {
    if (hasAutoComparedRef.current) return;
    if (!urlR1Gu || !urlR1Dong || !urlR1DongCd || !urlR2Gu || !urlR2Dong || !urlR2DongCd) {
      return;
    }

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

  /* 시세 비교 실행 (URL searchParams 동기화) */
  const handleCompare = useCallback(() => {
    if (!r1District || !r2District) {
      alert("비교할 두 지역의 자치구를 모두 선택해 주세요.");
      return;
    }
    if (!r1Dong || !r2Dong) {
      alert("비교할 두 지역의 자치동을 모두 선택해 주세요.");
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

    if (!resolvedR1DongCd || !resolvedR2DongCd) {
      alert("선택한 자치동의 코드를 확인할 수 없습니다. 자치동을 다시 선택해 주세요.");
      return;
    }

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
            <div className="mb-8 rounded-[20px] border border-slate-200/90 bg-white p-4 sm:p-4.5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <div className="grid grid-cols-[1fr_auto] items-stretch gap-4 max-[1100px]:grid-cols-1">
                {/* 좌측 영역: 지역 1 (기준) + VS + 지역 2 (비교) 상하 스택 */}
                <div className="flex flex-col gap-1.5">
                  {/* 지역 1 선택 카드 (기준) */}
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

                  {/* 세련된 세미 글로우 VS 배지 */}
                  <div className="flex items-center justify-center py-0">
                    <div className="group relative flex items-center justify-center">
                      {/* 소프트 앰비언트 글로우 */}
                      <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500/25 via-indigo-500/20 to-sky-500/25 blur-sm transition-all duration-300 group-hover:scale-110 opacity-80" />
                      {/* 메인 VS 배지 (이탈릭 볼드 폰트 + 입체 그라데이션) */}
                      <div className="relative flex size-9 items-center justify-center rounded-full border border-white/60 bg-gradient-to-br from-[#3B82F6] via-[#2563EB] to-[#1D4ED8] text-[11px] font-black italic tracking-widest text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] ring-2 ring-blue-100/90">
                        VS
                      </div>
                    </div>
                  </div>

                  {/* 지역 2 선택 카드 (비교) */}
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
                </div>

                {/* 우측 영역: 시세 비교 조회하기 버튼 (크기 확대) */}
                <div className="flex flex-col items-center justify-center shrink-0 w-[140px] sm:w-[155px]">
                  <button
                    type="button"
                    onClick={handleCompare}
                    disabled={compareMutation.isPending || isSggLoading || !r1District || !r2District || !r1Dong || !r2Dong}
                    className="flex h-full min-h-[125px] w-full flex-col items-center justify-center gap-3 rounded-[22px] bg-[#2563EB] p-5 text-white shadow-[0_6px_20px_rgba(37,99,235,0.3)] transition-all duration-200 hover:bg-[#1D4ED8] hover:shadow-[0_8px_24px_rgba(37,99,235,0.4)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    {compareMutation.isPending ? (
                      <Loader2 className="size-6 animate-spin text-white" />
                    ) : (
                      <Search className="size-6 stroke-[2.5] text-white" />
                    )}
                    <span className="text-[16px] font-black tracking-tight text-white">
                      {compareMutation.isPending ? "조회 중..." : "조회하기"}
                    </span>
                  </button>
                  <p className="mt-2.5 text-[11.5px] font-bold text-slate-400 text-center leading-tight whitespace-nowrap">
                    자치구·자치동 <span className="text-blue-500 font-bold">필수 선택</span>
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
                  백엔드 서버(/fastApi/compare) 상태를 확인해 주세요.
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
