// 20260825 이명훈
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Chart } from "react-google-charts";
import {
  Building2,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  MapPin,
  TrendingUp,
  Sparkles,
  Search,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { PRICE_NAVIGATION } from "@/config/sectionNavigation";
import apiMiddleware from "@/api/middleware";
import type { RetryableRequestConfig } from "@/api/middleware";
import {
  getSggsApi,
  getDongsApi,
  getApartmentMarketTrendApi,
  type SggItem,
  type DongItem,
  type ApartmentMarketTrendResponse,
} from "@/api/api";

/* 단지 정보 인터페이스 */
export interface PriceDetailComplexItem {
  id: string;
  name: string;
  sggNm: string;
  dongNm: string;
  sggCd?: string;
  dongCd?: string;
  mno?: string;
  sno?: string;
  address: string;
  baseSalePrice?: number;
  pyungs: Array<{
    name: string;
    area?: number;
    salePrice?: number;
    rentPrice?: number;
    pricePerPyung?: number;
  }>;
}

/** 아파트 단지 목록 조회 (Elasticsearch 연동) */
async function fetchPriceDetailComplexes(
  sggCd: string,
  dongCd: string,
  sggNm: string = "",
  dongNm: string = "",
  aptName: string = "",
): Promise<PriceDetailComplexItem[]> {
  if (!sggCd || !dongCd) return [];
  try {
    const response = await apiMiddleware.get<any>("/elasticSearch/aptname", {
      params: { apt_name: aptName, sgg_cd: sggCd, dong_cd: dongCd },
      silentAuthCheck: true,
    } as RetryableRequestConfig);
    const rawList = Array.isArray(response.data) ? response.data : (response.data?.data ?? []);
    const uniqueMap = new Map<string, PriceDetailComplexItem>();
    rawList.forEach((item: any) => {
      const name = String(item.apt_name || item.aptName || "").trim();
      if (!name || uniqueMap.has(name)) return;
      const itemSggCd = String(item.sgg_cd || sggCd);
      const itemDongCd = String(item.dong_cd || dongCd);
      const mno = String(item.mno || "");
      const sno = String(item.sno || "");
      uniqueMap.set(name, {
        id: `${itemSggCd}-${itemDongCd}-${name}-${mno}-${sno}`,
        name,
        sggCd: itemSggCd,
        sggNm: String(item.sgg_nm || sggNm),
        dongCd: itemDongCd,
        dongNm: String(item.dong_nm || dongNm),
        mno,
        sno,
        address: String(item.address || item.roadNmAddr || item.jibunAddr || `${sggNm} ${dongNm}`),
        pyungs: Array.isArray(item.pyungs) ? item.pyungs : [],
      });
    });
    return Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name, "ko"));
  } catch {
    return [];
  }
}

export interface AptCompareParams {
  guCode1: string;
  dongCode1: string;
  aptName1: string;
  mno1: string;
  sno1: string;
  guCode2: string;
  dongCode2: string;
  aptName2: string;
  mno2: string;
  sno2: string;
  queryType?: string;
  selectGroup1?: string;
  selectGroup2?: string;
  cgg_cd_1?: string;
  bjd_cd_1?: string;
  apt_nm_1?: string;
  mno_1?: string;
  sno_1?: string;
  cgg_cd_2?: string;
  bjd_cd_2?: string;
  apt_nm_2?: string;
  mno_2?: string;
  sno_2?: string;
  query_type?: string;
  grp?: string;
  grp2?: string;
  [key: string]: any;
}

export interface AptGroupItem {
  avg_deal_price?: number;
  average_deal_price?: number;
  avg_pyeong_price?: number;
  price_per_pyung?: number;
  deal_count?: number;
  total_deal_count?: number;
  total_households?: number;
  build_year?: number;
  use_aprv_ymd?: string;
  max_deal_price?: number;
  min_deal_price?: number;
  recent_deals?: Array<{
    deal_date: string;
    floor: number;
    deal_amount: number;
    exclusive_area?: string;
    pyeong?: number;
  }>;
  biweekly_trend?: Array<{
    biweekly_period: string;
    avg_price: number;
  }>;
}

export interface AptCompareResponse {
  status?: string;
  count?: number;
  aptGroup1?: AptGroupItem;
  aptGroup2?: AptGroupItem;
  data?: {
    aptGroup1?: AptGroupItem;
    aptGroup2?: AptGroupItem;
    group1?: AptGroupItem;
    group2?: AptGroupItem;
    [key: string]: any;
  } | AptGroupItem[];
  [key: string]: any;
}

/** 아파트 1:1 비교 분석 조회 (FastAPI /fastApi/aptcompare 연동) */
async function fetchPriceDetailAptCompare(params: AptCompareParams): Promise<AptCompareResponse> {
  const response = await apiMiddleware.get<AptCompareResponse>("/fastApi/aptcompare", { params });
  return response.data;
}

/* =========================================================
   1. Types & Interfaces
========================================================= */

export interface AutocompleteOption {
  label: string;
  value: string;
  code?: string;
  extra?: string;
}

export type CompareCategoryType = "floor" | "pyeong" | "";

interface PriceDetailQueryState {
  sggCd: string;
  dongCd: string;
  complexId: string | null;
  compareType: CompareCategoryType;
  val1: string;
  val2: string;
  isActive: boolean;
}

/* =========================================================
   2. Utility Functions
========================================================= */

/** 금액 포맷터 (e.g. 348000 -> 34억 8,000만 원) */
function formatPriceKRW(priceInMan?: number | null): string {
  if (!priceInMan || priceInMan <= 0) return "-";
  const eok = Math.floor(priceInMan / 10000);
  const remainderMan = Math.round(priceInMan % 10000);
  if (eok === 0) return `${remainderMan.toLocaleString()}만 원`;
  if (remainderMan === 0) return `${eok}억 원`;
  return `${eok}억 ${remainderMan.toLocaleString()}만 원`;
}

/** 비교 조건 라벨 포맷터 */
function getCompareOptionLabel(type: CompareCategoryType, value: string): string {
  const v = (value || "").toLowerCase();
  if (type === "floor") {
    if (v === "low") return "저층 (1~5층)";
    if (v === "mid") return "중층 (6~15층)";
    if (v === "high") return "고층 (16층 이상)";
  } else if (type === "pyeong") {
    if (v === "10") return "10평형대 (~59㎡)";
    if (v === "20") return "20평형대 (59~84㎡)";
    if (v === "30") return "30평형대 (84~114㎡)";
    if (v === "40") return "40평형 이상 (114㎡~)";
  }
  return value || "-";
}

/* =========================================================
   3. Sub-Components
========================================================= */

/** 검색어 일치 텍스트 하이라이트 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return <>{text}</>;

  return (
    <span>
      {text.slice(0, index)}
      <span className="font-black text-[#0F8AA8] underline underline-offset-2">
        {text.slice(index, index + query.length)}
      </span>
      {text.slice(index + query.length)}
    </span>
  );
}

/** 커스텀 카드형 Autocomplete 드롭다운 셀렉트 */
interface AutocompleteSelectProps {
  value: string;
  onChange: (value: string, option?: AutocompleteOption) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  disabled?: boolean;
  accentColor?: "teal" | "purple";
  className?: string;
}

function AutocompleteSelect({
  value,
  onChange,
  options,
  placeholder = "선택 또는 검색",
  disabled = false,
  accentColor = "teal",
  className,
}: AutocompleteSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const displayQuery = searchQuery !== null ? searchQuery : value || "";

  const filteredOptions = useMemo(() => {
    if (searchQuery === null || searchQuery.trim() === "") return options;
    const q = searchQuery.trim().toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.extra && opt.extra.toLowerCase().includes(q)),
    );
  }, [options, searchQuery]);

  const activeHighlightedIndex = Math.min(
    highlightedIndex,
    Math.max(0, filteredOptions.length - 1),
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && activeHighlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeHighlightedIndex] as HTMLElement | undefined;
      activeEl?.scrollIntoView({ block: "nearest" });
    }
  }, [activeHighlightedIndex, isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(0);
        } else {
          setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(filteredOptions.length - 1);
        } else {
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        }
      } else if (e.key === "Enter") {
        if (isOpen && activeHighlightedIndex >= 0 && activeHighlightedIndex < filteredOptions.length) {
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

  const selectedItemStyle =
    accentColor === "purple"
      ? "bg-[#F5F3FF] border-[#6366F1] text-[#4F46E5] font-black"
      : "bg-[#E0F2FE] border-[#0284C7] text-[#0369A1] font-black";

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          value={displayQuery}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          onFocus={() => !disabled && setIsOpen(true)}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "h-[46px] w-full pl-3.5 pr-9 bg-white border border-[#CBD5E1] rounded-[12px] text-[13px] font-bold text-[#0F172A] outline-none transition-all cursor-pointer hover:border-[#94A3B8] focus:border-[#0F8AA8] focus:ring-2 focus:ring-[#0F8AA8]/15",
            disabled && "bg-[#F8FAFC] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed",
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
            "size-4 text-[#64748B] absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-200",
            isOpen && "rotate-180",
            disabled && "cursor-not-allowed opacity-50",
          )}
        />
      </div>

      {isOpen && !disabled && (
        <div
          ref={listRef}
          className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-60 w-full overflow-y-auto rounded-xl border border-[#CBD5E1] bg-white p-2 shadow-xl animate-in fade-in-0 duration-100"
        >
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-3 text-center text-[12px] font-medium text-slate-400">
              일치하는 항목이 없습니다.
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected = opt.label === value || opt.value === value;
              const isHighlighted = idx === activeHighlightedIndex;

              return (
                <button
                  key={`${opt.code || opt.value}-${opt.label}-${idx}`}
                  type="button"
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => {
                    onChange(opt.label, opt);
                    setSearchQuery(null);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border border-[#CBD5E1] bg-[#F1F5F9] px-3.5 py-2.5 mb-1.5 text-left text-[13px] font-bold text-[#1E293B] transition-all duration-100 cursor-pointer hover:bg-[#E2E8F0] hover:border-[#94A3B8] last:mb-0",
                    isHighlighted && !isSelected && "bg-[#E2E8F0] border-[#94A3B8] text-[#0F172A]",
                    isSelected && selectedItemStyle,
                  )}
                >
                  <span className="truncate">
                    <HighlightMatch text={opt.label} query={searchQuery !== null ? searchQuery : ""} />
                  </span>
                  {isSelected && (
                    <Check
                      className={cn(
                        "size-3.5 stroke-[3] ml-2 shrink-0",
                        accentColor === "purple" ? "text-[#6366F1]" : "text-[#0284C7]",
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

/* =========================================================
   4. Main Component: PriceDetailPage
========================================================= */

export default function PriceDetailPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  /* URL 파라미터 기반 상태 동기화 */
  const query: PriceDetailQueryState = useMemo(() => ({
    sggCd: searchParams.get("sgg") || "",
    dongCd: searchParams.get("dong") || "",
    complexId: searchParams.get("complex") || null,
    compareType: (searchParams.get("type") as CompareCategoryType) || "floor",
    val1: searchParams.get("val1") || (searchParams.get("type") === "pyeong" ? "20" : "low"),
    val2: searchParams.get("val2") || (searchParams.get("type") === "pyeong" ? "30" : "high"),
    isActive: searchParams.get("active") === "1",
  }), [searchParams]);

  const setQuery = useCallback(
    (updates: Partial<PriceDetailQueryState>) => {
      const next = { ...query, ...updates };
      const params = new URLSearchParams();
      if (next.sggCd) params.set("sgg", next.sggCd);
      if (next.dongCd) params.set("dong", next.dongCd);
      if (next.complexId) params.set("complex", next.complexId);
      if (next.compareType) params.set("type", next.compareType);
      if (next.val1) params.set("val1", next.val1);
      if (next.val2) params.set("val2", next.val2);
      if (next.isActive) params.set("active", "1");
      setSearchParams(params, { replace: true });
    },
    [query, setSearchParams],
  );

  /* 1. 자치구 목록 조회 */
  const { data: sggList = [], isLoading: isSggLoading } = useQuery<SggItem[]>({
    queryKey: ["locationSggs"],
    queryFn: getSggsApi,
    staleTime: 1000 * 60 * 30,
  });

  const selectedSgg = useMemo(
    () => sggList.find((s) => s.sggCd === query.sggCd) || null,
    [query.sggCd, sggList],
  );

  /* 2. 자치동 목록 조회 */
  const { data: dongList = [], isLoading: isDongLoading } = useQuery<DongItem[]>({
    queryKey: ["locationDongs", query.sggCd],
    queryFn: () => getDongsApi(query.sggCd),
    enabled: Boolean(query.sggCd),
    staleTime: 1000 * 60 * 30,
  });

  const selectedDong = useMemo(
    () => dongList.find((d) => d.dongCd === query.dongCd) || null,
    [query.dongCd, dongList],
  );

  /* 3. 아파트 단지 목록 조회 */
  const { data: complexList = [], isLoading: isComplexesLoading } = useQuery<PriceDetailComplexItem[]>({
    queryKey: ["locationComplexes", query.sggCd, query.dongCd],
    queryFn: () =>
      fetchPriceDetailComplexes(
        query.sggCd,
        query.dongCd,
        selectedSgg?.sggNm || "",
        selectedDong?.dongNm || "",
      ),
    enabled: Boolean(query.sggCd && query.dongCd),
    staleTime: 1000 * 60 * 10,
  });

  const currentComplex = useMemo(
    () => (complexList.length && query.complexId ? complexList.find((c) => c.id === query.complexId) || null : null),
    [query.complexId, complexList],
  );

  /* 4. 아파트 실거래 시장 트렌드 조회 (FastAPI) - 비교하기 클릭 시에만 호출 */
  const { data: trendData } = useQuery<ApartmentMarketTrendResponse>({
    queryKey: [
      "apartmentMarketTrend",
      currentComplex?.sggCd,
      currentComplex?.dongCd,
      currentComplex?.name,
      currentComplex?.mno,
      currentComplex?.sno,
    ],
    queryFn: () =>
      getApartmentMarketTrendApi({
        guCode: currentComplex?.sggCd || query.sggCd,
        dongCode: currentComplex?.dongCd || (query.dongCd.length === 10 ? query.dongCd.slice(-5) : query.dongCd),
        aptName: currentComplex?.name || "",
        mno: currentComplex?.mno || "",
        sno: currentComplex?.sno || "",
      }),
    enabled: Boolean(query.isActive && currentComplex?.name),
    staleTime: 1000 * 60 * 5,
  });

  const trendItem = trendData?.data?.[0];

  /* 실시간 FastAPI 기반 단지 요약 지표 (최고 층수, 거래 건수, 평형대 종류) */
  const maxFloor = useMemo(() => {
    if (!trendItem?.recent_deals || trendItem.recent_deals.length === 0) return 0;
    const floors = trendItem.recent_deals.map((d: any) => Number(d.floor) || 0);
    return Math.max(...floors, 0);
  }, [trendItem]);

  const dealCount = trendItem?.total_deal_count ?? 0;
  const pyeongTypeCount = trendItem?.area_ratio?.length || trendItem?.area_deals?.length || 0;

  /* 5. 아파트 타입별 1:1 비교 API 조회 (단일 /fastApi/aptcompare 호출 - BoardPage 스타일) */
  const {
    data: compareData,
    isLoading: isCompareLoading,
    isError: isCompareError,
    error: compareError,
  } = useQuery<AptCompareResponse>({
    queryKey: [
      "aptCompare",
      currentComplex?.sggCd || query.sggCd,
      currentComplex?.dongCd || query.dongCd,
      currentComplex?.name,
      currentComplex?.mno,
      currentComplex?.sno,
      query.compareType,
      query.val1,
      query.val2,
    ],
    queryFn: () => {
      const cggCd = currentComplex?.sggCd || query.sggCd;
      const dongCd = currentComplex?.dongCd || (query.dongCd.length === 10 ? query.dongCd.slice(-5) : query.dongCd);
      const name = currentComplex?.name || "";
      const mno = currentComplex?.mno || "";
      const sno = currentComplex?.sno || "";
      const queryType = query.compareType === "pyeong" ? "평" : "층수";
      const grp1 = query.compareType === "pyeong" ? query.val1 : (query.val1 || "low").toLowerCase();
      const grp2 = query.compareType === "pyeong" ? query.val2 : (query.val2 || "high").toLowerCase();

      return fetchPriceDetailAptCompare({
        // 1. Spring Boot 백엔드 DTO 규격 (guCode1 / guCode2 카멜케이스)
        guCode1: cggCd,
        dongCode1: dongCd,
        aptName1: name,
        mno1: mno,
        sno1: sno,
        guCode2: cggCd,
        dongCode2: dongCd,
        aptName2: name,
        mno2: mno,
        sno2: sno,
        queryType,
        selectGroup1: grp1,
        selectGroup2: grp2,

        // 2. 게이트웨이 및 FastAPI 직접 호환 파라미터 (안전 병합)
        guCode: cggCd,
        dongCode: dongCd,
        aptName: name,
        mno,
        sno,
        cgg_cd: cggCd,
        stdg_cd: dongCd,
        bldg_nm: name,
        cgg_cd_1: cggCd,
        bjd_cd_1: dongCd,
        apt_nm_1: name,
        mno_1: mno,
        sno_1: sno,
        cgg_cd_2: cggCd,
        bjd_cd_2: dongCd,
        apt_nm_2: name,
        mno_2: mno,
        sno_2: sno,
        query_type: queryType,
        grp: grp1,
        grp2: grp2,
      });
    },
    enabled: Boolean(
      query.isActive &&
      currentComplex?.name &&
      query.compareType &&
      query.val1 &&
      query.val2,
    ),
    staleTime: 1000 * 60 * 5,
  });

  /* 드롭다운 옵션 메모이제이션 */
  const sggOptions = useMemo<AutocompleteOption[]>(
    () => sggList.map((s) => ({ label: s.sggNm, value: s.sggCd, code: s.sggCd })),
    [sggList],
  );

  const dongOptions = useMemo<AutocompleteOption[]>(
    () => dongList.map((d) => ({ label: d.dongNm, value: d.dongCd, code: d.dongCd })),
    [dongList],
  );

  const complexOptions = useMemo<AutocompleteOption[]>(
    () => complexList.map((c) => ({ label: c.name, value: c.id, code: c.id })),
    [complexList],
  );

  const compareTypeOptions = useMemo<AutocompleteOption[]>(() => [
    { label: "층수별 비교", value: "floor" },
    { label: "평형별 비교", value: "pyeong" },
  ], []);

  const floorCompareOptions = useMemo<AutocompleteOption[]>(() => [
    { label: "저층 (1~5층)", value: "low" },
    { label: "중층 (6~15층)", value: "mid" },
    { label: "고층 (16층 이상)", value: "high" },
  ], []);

  const pyeongCompareOptions = useMemo<AutocompleteOption[]>(() => [
    { label: "10평형대 (~59㎡)", value: "10" },
    { label: "20평형대 (59~84㎡)", value: "20" },
    { label: "30평형대 (84~114㎡)", value: "30" },
    { label: "40평형 이상 (114㎡~)", value: "40" },
  ], []);

  /* 평형 목록 구성 */
  const pyungs = useMemo(() => {
    if (trendItem?.area_deals && trendItem.area_deals.length > 0) {
      return trendItem.area_deals.map((a) => ({
        name: `${a.exclusive_area}㎡${a.pyeong ? ` (${a.pyeong}평)` : ""}`,
        area: Number(a.exclusive_area),
        salePrice: a.avg_deal_price,
        recentFloor: 0,
        recentTradeDate: "",
        pricePerPyung: a.pyeong ? Math.round(a.avg_deal_price / a.pyeong) : 0,
      }));
    }
    return currentComplex?.pyungs || [];
  }, [trendItem, currentComplex]);

  /* 1:1 비교 분석 데이터 계산 (aptGroup1 / aptGroup2 응답 매핑, 목/더미 폴백 없음) */
  const compareAnalysis = useMemo(() => {
    if (!query.isActive || !query.compareType || !compareData) return null;

    const dataObj = (compareData as any).data;
    const g1: any =
      compareData.aptGroup1 ||
      dataObj?.aptGroup1 ||
      dataObj?.group1 ||
      (Array.isArray(dataObj) ? dataObj[0] : null) ||
      (compareData as any).group1;

    const g2: any =
      compareData.aptGroup2 ||
      dataObj?.aptGroup2 ||
      dataObj?.group2 ||
      (Array.isArray(dataObj) ? dataObj[1] : null) ||
      (compareData as any).group2;

    const deals1: any[] = g1?.recent_deals || g1?.deals || [];
    const deals2: any[] = g2?.recent_deals || g2?.deals || [];

    const avg1 = Number(g1?.avg_deal_price || g1?.average_deal_price || g1?.avgPrice || 0);
    const avg2 = Number(g2?.avg_deal_price || g2?.average_deal_price || g2?.avgPrice || 0);

    const max1 = Number(g1?.max_deal_price || g1?.maxPrice || (deals1.length ? Math.max(...deals1.map((d: any) => d.deal_amount || 0)) : 0));
    const max2 = Number(g2?.max_deal_price || g2?.maxPrice || (deals2.length ? Math.max(...deals2.map((d: any) => d.deal_amount || 0)) : 0));

    const min1 = Number(g1?.min_deal_price || g1?.minPrice || (deals1.length ? Math.min(...deals1.map((d: any) => d.deal_amount || 0)) : 0));
    const min2 = Number(g2?.min_deal_price || g2?.minPrice || (deals2.length ? Math.min(...deals2.map((d: any) => d.deal_amount || 0)) : 0));

    const count1 = Number(g1?.deal_count || g1?.total_deal_count || deals1.length || 0);
    const count2 = Number(g2?.deal_count || g2?.total_deal_count || deals2.length || 0);

    const trendMap1 = new Map<string, number>();
    const trendMap2 = new Map<string, number>();
    (g1?.biweekly_trend || g1?.monthly_trend || [])?.forEach((t: any) => trendMap1.set(t.biweekly_period || t.period, t.avg_price || t.price));
    (g2?.biweekly_trend || g2?.monthly_trend || [])?.forEach((t: any) => trendMap2.set(t.biweekly_period || t.period, t.avg_price || t.price));

    const basePeriods = (trendItem?.biweekly_trend || []).map((b) => b.biweekly_period);
    const allPeriods = Array.from(new Set([...basePeriods, ...trendMap1.keys(), ...trendMap2.keys()]));

    const compareChartPoints = allPeriods.map((period) => {
      const sale1 = trendMap1.get(period) || 0;
      const sale2 = trendMap2.get(period) || 0;
      return { month: period, sale1, sale2 };
    });

    const label1 = getCompareOptionLabel(query.compareType, query.val1);
    const label2 = getCompareOptionLabel(query.compareType, query.val2);
    const diffAvg = avg2 - avg1;
    const diffAvgPct = avg1 > 0 ? ((diffAvg / avg1) * 100).toFixed(1) : "0";

    return {
      label1,
      label2,
      avg1,
      avg2,
      max1,
      max2,
      min1,
      min2,
      count1,
      count2,
      deals1,
      deals2,
      diffAvg,
      diffAvgPct,
      compareChartPoints,
      hasData1: Boolean(avg1 > 0 || count1 > 0 || deals1.length > 0),
      hasData2: Boolean(avg2 > 0 || count2 > 0 || deals2.length > 0),
    };
  }, [query.isActive, query.compareType, query.val1, query.val2, compareData, trendItem]);

  /* 차트 데이터 */
  const combinedChartData = useMemo(() => {
    if (!compareAnalysis?.compareChartPoints?.length) return [];
    const header = ["기간", `선택 1 (${compareAnalysis.label1})`, `선택 2 (${compareAnalysis.label2})`];
    const rows = compareAnalysis.compareChartPoints.map((pt) => {
      let displayPeriod = pt.month;
      if (displayPeriod.includes("/")) {
        const parts = displayPeriod.split("/");
        if (parts.length === 2) displayPeriod = parts[1].slice(-5).replace("-", ".");
      } else if (displayPeriod.length >= 7) {
        displayPeriod = displayPeriod.slice(-5).replace("-", ".");
      }
      return [displayPeriod, Number(pt.sale1 || 0), Number(pt.sale2 || 0)];
    });
    return [header, ...rows];
  }, [compareAnalysis]);

  const combinedChartOptions = useMemo(() => ({
    curveType: "function" as const,
    legend: { position: "none" as const },
    colors: ["#0F8AA8", "#6366F1"],
    lineWidth: 3,
    pointSize: 6,
    hAxis: { textStyle: { color: "#64748B", fontSize: 11, bold: true }, gridlines: { color: "transparent" } },
    vAxis: { textStyle: { color: "#94A3B8", fontSize: 10, bold: true }, gridlines: { color: "#F1F5F9" }, format: "#,##0" },
    chartArea: { width: "90%", height: "72%", top: 20, bottom: 35 },
    backgroundColor: "transparent",
  }), []);

  return (
    <SectionSidebarLayout
      sectionTitle={PRICE_NAVIGATION.sectionTitle}
      menuItems={PRICE_NAVIGATION.menuItems}
    >
      <main className="w-full max-w-[1400px] px-6 py-8">
        <section className="space-y-6">
          {/* 상단 헤더 */}
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-slate-400">
                <span>서울시 아파트 시세 정보</span>
                <ChevronRight className="size-3" />
                <span>{selectedSgg ? selectedSgg.sggNm : "자치구 선택"}</span>
                <ChevronRight className="size-3" />
                <span>{selectedDong ? selectedDong.dongNm : "자치동 선택"}</span>
                {currentComplex?.name && (
                  <>
                    <ChevronRight className="size-3" />
                    <span className="text-[#0F8AA8]">{currentComplex.name}</span>
                  </>
                )}
              </div>
              <h1 className="mt-1 text-[26px] font-black tracking-tight text-[#0F172A]">단지별 시세 분석</h1>
              <p className="text-[13px] font-semibold text-[#64748B]">
                선택한 자치구와 동 내 아파트 단지들의 실거래가와 매매/전세 시세를 확인하세요.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setQuery({ sggCd: "", dongCd: "", complexId: null, compareType: "floor", val1: "LOW", val2: "HIGH", isActive: false })}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              선택 초기화
            </button>
          </header>

          {/* 4분할 옵션 선택 카드 */}
          <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
            <div className="grid grid-cols-4 gap-4 max-[1024px]:grid-cols-2 max-[640px]:grid-cols-1">
              {/* 1. 자치구 */}
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center justify-between text-[13px] font-extrabold text-[#0F172A]">
                  <span>자치구 선택</span>
                  <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-black text-[#475569]">필수</span>
                </label>
                <AutocompleteSelect
                  value={selectedSgg?.sggNm || ""}
                  onChange={(_, opt) => setQuery({ sggCd: opt?.code || "", dongCd: "", complexId: null, isActive: false })}
                  options={sggOptions}
                  placeholder={isSggLoading ? "로딩 중..." : "자치구 입력 (예: 강남구)"}
                  disabled={isSggLoading}
                  accentColor="teal"
                />
              </div>

              {/* 2. 자치동 */}
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center justify-between text-[13px] font-extrabold text-[#0F172A]">
                  <span>자치동 선택</span>
                  <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-black text-[#475569]">필수</span>
                </label>
                <AutocompleteSelect
                  value={selectedDong?.dongNm || ""}
                  onChange={(_, opt) => setQuery({ dongCd: opt?.code || "", complexId: null, isActive: false })}
                  options={dongOptions}
                  placeholder={!query.sggCd ? "자치구 먼저 선택" : isDongLoading ? "로딩 중..." : "자치동 선택"}
                  disabled={!query.sggCd || isDongLoading}
                  accentColor="teal"
                />
              </div>

              {/* 3. 단지 */}
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center justify-between text-[13px] font-extrabold text-[#0F172A]">
                  <span>아파트 단지</span>
                  <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-black text-[#475569]">필수</span>
                </label>
                <AutocompleteSelect
                  value={currentComplex?.name || ""}
                  onChange={(_, opt) => setQuery({ complexId: opt?.code || null, isActive: false })}
                  options={complexOptions}
                  placeholder={!query.dongCd ? "자치동 먼저 선택" : isComplexesLoading ? "로딩 중..." : "아파트 단지 선택"}
                  disabled={!query.dongCd || isComplexesLoading || complexList.length === 0}
                  accentColor="teal"
                />
              </div>

              {/* 4. 비교 기준 타입 */}
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center justify-between text-[13px] font-extrabold text-[#0F172A]">
                  <span>비교 기준 타입</span>
                  <span className="rounded bg-[#EEF2FF] px-1.5 py-0.5 text-[10px] font-black text-[#4F46E5]">타입</span>
                </label>
                <AutocompleteSelect
                  value={query.compareType === "pyeong" ? "평형별 비교" : "층수별 비교"}
                  onChange={(_, opt) => {
                    const nextType = ((opt?.value ?? "") as CompareCategoryType) || "floor";
                    const v1 = nextType === "pyeong" ? "20" : "low";
                    const v2 = nextType === "pyeong" ? "30" : "high";
                    setQuery({ compareType: nextType, val1: v1, val2: v2, isActive: false });
                  }}
                  options={compareTypeOptions}
                  placeholder="비교 기준 타입 선택"
                  disabled={!currentComplex}
                  accentColor="teal"
                />
              </div>
            </div>

            {/* 1:1 비교 조건 지정 섹션 (첫 화면 로딩 시 상시 노출) */}
            <div className="mt-6 border-t border-slate-100 pt-6 grid grid-cols-[1fr_auto_1fr_auto] items-stretch gap-6 max-[1200px]:grid-cols-1">
              {/* 선택 1 카드 */}
              <div className="rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <MapPin className="size-4 text-[#0F8AA8]" />
                  <h3 className="text-[15px] font-black text-[#0F172A]">선택 1 (기준)</h3>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-slate-700">
                    {query.compareType === "pyeong" ? "평형대 구간 선택" : "층수 구간 선택"}
                  </label>
                  <AutocompleteSelect
                    value={getCompareOptionLabel(query.compareType, query.val1)}
                    onChange={(_, opt) => setQuery({ val1: opt?.value || "", isActive: false })}
                    options={query.compareType === "pyeong" ? pyeongCompareOptions : floorCompareOptions}
                    placeholder="조건 선택"
                    disabled={!currentComplex}
                    accentColor="teal"
                  />
                </div>
              </div>

              {/* 중앙 VS */}
              <div className="flex items-center justify-center max-[1200px]:py-2">
                <div className="flex size-12 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#FDE047] via-[#EAB308] to-[#B45309] text-[13px] font-black text-white shadow-md">
                  VS
                </div>
              </div>

              {/* 선택 2 카드 */}
              <div className="rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <MapPin className="size-4 text-[#6366F1]" />
                  <h3 className="text-[15px] font-black text-[#0F172A]">선택 2 (비교)</h3>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-slate-700">
                    {query.compareType === "pyeong" ? "평형대 구간 선택" : "층수 구간 선택"}
                  </label>
                  <AutocompleteSelect
                    value={getCompareOptionLabel(query.compareType, query.val2)}
                    onChange={(_, opt) => setQuery({ val2: opt?.value || "", isActive: false })}
                    options={query.compareType === "pyeong" ? pyeongCompareOptions : floorCompareOptions}
                    placeholder="조건 선택"
                    disabled={!currentComplex}
                    accentColor="purple"
                  />
                </div>
              </div>

              {/* 비교하기 버튼 */}
              <div className="flex flex-col items-center justify-center rounded-[20px] border border-slate-200/80 bg-slate-50 p-4 text-center">
                <button
                  type="button"
                  onClick={() => query.compareType && query.val1 && query.val2 && setQuery({ isActive: true })}
                  disabled={!currentComplex || !query.compareType || !query.val1 || !query.val2}
                  className="flex h-[100px] w-full min-w-[130px] flex-col items-center justify-center gap-2 rounded-[12px] bg-[#2563EB] p-4 text-white shadow-md transition-all hover:bg-[#1D4ED8] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  <Search className="size-5 stroke-[2.5]" />
                  <span className="text-[14px] font-bold">비교하기</span>
                </button>
                <p className="mt-2 text-[11px] font-medium text-slate-400">조건 지정 후 클릭</p>
              </div>
            </div>
          </div>

          {/* 안내 및 데이터 영역 */}
          {!query.sggCd || !query.dongCd ? (
            <div className="rounded-[24px] border border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Building2 className="size-8" />
              </div>
              <h3 className="text-[18px] font-black text-[#0F172A]">자치구와 자치동을 선택해 주세요</h3>
              <p className="mt-1 text-[13px] text-slate-500">
                상단의 콤보 박스에서 자치구와 자치동을 선택하시면 단지 목록이 활성화됩니다.
              </p>
            </div>
          ) : !currentComplex ? (
            <div className="rounded-[24px] border border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Building2 className="size-8" />
              </div>
              <h3 className="text-[18px] font-black text-[#0F172A]">아파트 단지를 선택해 주세요</h3>
              <p className="mt-1 text-[13px] text-slate-500">
                시세를 조회할 아파트 단지를 선택하시면 실거래 시세 분석 결과가 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 단지 프로필 카드 (상시 유지) */}
              <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-extrabold text-blue-600 border border-blue-100">
                    단지 정보
                  </span>
                  <h2 className="text-[20px] font-black text-[#0F172A]">{currentComplex.name}</h2>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-500">
                  <MapPin className="size-3.5" />
                  <span>{currentComplex.address || `${selectedSgg?.sggNm || ""} ${selectedDong?.dongNm || ""}`.trim()}</span>
                </p>

                <div className="mt-5 grid grid-cols-4 gap-4 max-[900px]:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <span className="block text-[11px] font-bold text-slate-400">최고 층수</span>
                    <span className="text-[16px] font-black text-[#0F172A]">
                      {maxFloor > 0 ? `${maxFloor}층` : "-"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <span className="block text-[11px] font-bold text-slate-400">거래 건수</span>
                    <span className="text-[16px] font-black text-[#0F172A]">
                      {dealCount > 0 ? `${dealCount.toLocaleString()}건` : "-"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <span className="block text-[11px] font-bold text-slate-400">평형대 종류</span>
                    <span className="text-[16px] font-black text-[#0F172A]">
                      {pyeongTypeCount > 0 ? `${pyeongTypeCount}개 타입` : "-"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <span className="block text-[11px] font-bold text-slate-400">평균 거래가 (최근)</span>
                    <span className="text-[16px] font-black text-[#0F172A]">
                      {trendItem?.average_deal_price ? formatPriceKRW(trendItem.average_deal_price) : formatPriceKRW(currentComplex.baseSalePrice)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 비교 모드 결과 영역 (로딩 / 에러 / 성공 상태) */}
              {query.isActive && isCompareLoading ? (
                <div className="rounded-[24px] border border-blue-100 bg-white p-12 text-center shadow-sm">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 animate-spin">
                    <Search className="size-6" />
                  </div>
                  <h4 className="text-[16px] font-black text-[#0F172A]">1:1 비교 데이터를 분석 중입니다...</h4>
                  <p className="mt-1 text-[13px] text-slate-500">선택하신 조건에 맞춰 실거래 시세를 비교하고 있습니다.</p>
                </div>
              ) : query.isActive && isCompareError ? (
                <div className="rounded-[24px] border border-rose-200 bg-rose-50/70 p-8 text-center shadow-sm">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                    <X className="size-6 stroke-[2.5]" />
                  </div>
                  <h4 className="text-[17px] font-black text-rose-900">검색에 실패했습니다</h4>
                  <p className="mt-1.5 text-[13px] font-semibold text-rose-700">
                    {(compareError as any)?.response?.data?.message || (compareError as Error)?.message || "1:1 비교 API 호출 중 오류가 발생했습니다."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setQuery({ isActive: false })}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-4 py-2 text-[12px] font-bold text-rose-700 shadow-sm transition-all hover:bg-rose-50 cursor-pointer"
                  >
                    비교 닫기
                  </button>
                </div>
              ) : query.isActive && compareAnalysis ? (
                <div className="space-y-6 animate-in fade-in-0 duration-300">
                  {/* 비교 요약 카드 */}
                  <div className="rounded-[24px] border border-blue-100 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
                          <Sparkles className="size-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-bold text-blue-600">1:1 조건 비교 분석 결과</span>
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-extrabold text-blue-700">
                              {query.compareType === "floor" ? "층수별 비교" : "평형별 비교"}
                            </span>
                          </div>
                          <h3 className="text-[18px] font-black text-[#0F172A]">
                            <span className="text-[#0F8AA8]">{compareAnalysis.label1}</span>
                            <span className="mx-2 text-slate-400">VS</span>
                            <span className="text-[#6366F1]">{compareAnalysis.label2}</span>
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-right shadow-sm">
                          <span className="block text-[11px] font-bold text-slate-500">평균 가격 격차</span>
                          <span className={cn("text-[16px] font-black", compareAnalysis.diffAvg > 0 ? "text-rose-600" : compareAnalysis.diffAvg < 0 ? "text-blue-600" : "text-slate-700")}>
                            {compareAnalysis.diffAvg > 0 ? "+" : ""}{formatPriceKRW(Math.abs(compareAnalysis.diffAvg))} ({compareAnalysis.diffAvg > 0 ? "+" : ""}{compareAnalysis.diffAvgPct}%)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setQuery({ isActive: false })}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 cursor-pointer"
                        >
                          <X className="size-3.5" />
                          비교 닫기
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 듀얼 지표 비교 카드 (2열) */}
                  <div className="grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
                    {/* 선택 1 카드 */}
                    <div className="rounded-[24px] border-2 border-[#0F8AA8]/30 bg-gradient-to-b from-[#E6F4F7]/40 to-white p-6 shadow-sm">
                      <div className="mb-4 flex items-center justify-between border-b border-teal-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 items-center justify-center rounded-lg bg-[#0F8AA8] text-[12px] font-black text-white">1</span>
                          <h4 className="text-[16px] font-black text-[#0F172A]">{compareAnalysis.label1}</h4>
                        </div>
                        <span className="rounded-md bg-teal-50 px-2.5 py-1 text-[11px] font-extrabold text-[#0F8AA8] border border-teal-200/60">기준 조건</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                          <span className="block text-[11px] font-bold text-slate-400">평균 매매가</span>
                          <span className="text-[18px] font-black text-[#0F8AA8]">{formatPriceKRW(compareAnalysis.avg1)}</span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                          <span className="block text-[11px] font-bold text-slate-400">거래 건수</span>
                          <span className="text-[18px] font-black text-slate-800">{compareAnalysis.count1}건</span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                          <span className="block text-[11px] font-bold text-slate-400">최고 실거래가</span>
                          <span className="text-[15px] font-black text-rose-600">{formatPriceKRW(compareAnalysis.max1)}</span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                          <span className="block text-[11px] font-bold text-slate-400">최저 실거래가</span>
                          <span className="text-[15px] font-black text-blue-600">{formatPriceKRW(compareAnalysis.min1)}</span>
                        </div>
                      </div>

                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <span className="mb-2 block text-[12px] font-bold text-slate-500">
                          최근 실거래 내역 ({compareAnalysis.deals1.length}건)
                        </span>
                        <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1 text-[12px]">
                          {compareAnalysis.deals1.length === 0 ? (
                            <div className="py-3 text-center text-slate-400">거래 내역이 없습니다.</div>
                          ) : (
                            compareAnalysis.deals1.slice(0, 5).map((deal: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                                <span className="font-semibold text-slate-600">{deal.deal_date || deal.contract_date || "-"} ({deal.floor}층)</span>
                                <span className="font-bold text-[#0F8AA8]">{formatPriceKRW(deal.deal_amount)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 선택 2 카드 */}
                    <div className="rounded-[24px] border-2 border-[#6366F1]/30 bg-gradient-to-b from-[#EEF2FF]/40 to-white p-6 shadow-sm">
                      <div className="mb-4 flex items-center justify-between border-b border-indigo-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 items-center justify-center rounded-lg bg-[#6366F1] text-[12px] font-black text-white">2</span>
                          <h4 className="text-[16px] font-black text-[#0F172A]">{compareAnalysis.label2}</h4>
                        </div>
                        <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-[11px] font-extrabold text-[#6366F1] border border-indigo-200/60">비교 조건</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                          <span className="block text-[11px] font-bold text-slate-400">평균 매매가</span>
                          <span className="text-[18px] font-black text-[#6366F1]">{formatPriceKRW(compareAnalysis.avg2)}</span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                          <span className="block text-[11px] font-bold text-slate-400">거래 건수</span>
                          <span className="text-[18px] font-black text-slate-800">{compareAnalysis.count2}건</span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                          <span className="block text-[11px] font-bold text-slate-400">최고 실거래가</span>
                          <span className="text-[15px] font-black text-rose-600">{formatPriceKRW(compareAnalysis.max2)}</span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                          <span className="block text-[11px] font-bold text-slate-400">최저 실거래가</span>
                          <span className="text-[15px] font-black text-blue-600">{formatPriceKRW(compareAnalysis.min2)}</span>
                        </div>
                      </div>

                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <span className="mb-2 block text-[12px] font-bold text-slate-500">
                          최근 실거래 내역 ({compareAnalysis.deals2.length}건)
                        </span>
                        <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1 text-[12px]">
                          {compareAnalysis.deals2.length === 0 ? (
                            <div className="py-3 text-center text-slate-400">거래 내역이 없습니다.</div>
                          ) : (
                            compareAnalysis.deals2.slice(0, 5).map((deal: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                                <span className="font-semibold text-slate-600">{deal.deal_date || deal.contract_date || "-"} ({deal.floor}층)</span>
                                <span className="font-bold text-[#6366F1]">{formatPriceKRW(deal.deal_amount)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 하단 1:1 통합 꺾은선 차트 */}
                  <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="size-4 text-[#0F8AA8]" />
                        <h4 className="text-[15px] font-black text-[#0F172A]">최근 12개월 실거래 시세 추이 1:1 비교</h4>
                      </div>
                      <div className="flex items-center gap-4 text-[12px] font-bold">
                        <span className="flex items-center gap-1.5 text-[#0F8AA8]">
                          <span className="inline-block size-2.5 rounded-full bg-[#0F8AA8]" />
                          선택 1: {compareAnalysis.label1}
                        </span>
                        <span className="flex items-center gap-1.5 text-[#6366F1]">
                          <span className="inline-block size-2.5 rounded-full bg-[#6366F1]" />
                          선택 2: {compareAnalysis.label2}
                        </span>
                      </div>
                    </div>

                    {combinedChartData.length > 1 ? (
                      <div className="h-[280px] w-full">
                        <Chart chartType="LineChart" width="100%" height="100%" data={combinedChartData} options={combinedChartOptions} />
                      </div>
                    ) : (
                      <div className="flex h-48 items-center justify-center text-[13px] text-slate-400">
                        표시할 시세 추이 데이터가 충분하지 않습니다.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* 기본 모드: 평형별 시세 테이블 & 최근 실거래 내역 */
                <div className="space-y-6">
                  {/* 평형별 시세 정보 카드 */}
                  <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-[16px] font-black text-[#0F172A]">평형별 시세 정보</h3>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      공급/전용 면적별 최근 매매 및 전세 실거래 기준 시세입니다.
                    </p>

                    {pyungs.length === 0 ? (
                      <div className="py-8 text-center text-[13px] text-slate-400">등록된 평형별 시세 정보가 없습니다.</div>
                    ) : (
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-left text-[13px]">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-[12px] font-extrabold text-slate-500">
                              <th className="p-3">평형 / 타입</th>
                              <th className="p-3">전용면적</th>
                              <th className="p-3">평균 매매가</th>
                              <th className="p-3">평당가</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {pyungs.map((p, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/60">
                                <td className="p-3 font-bold text-[#0F172A]">{p.name}</td>
                                <td className="p-3 text-slate-600">{p.area ? `${p.area}㎡` : "-"}</td>
                                <td className="p-3 font-bold text-[#0F8AA8]">{formatPriceKRW(p.salePrice)}</td>
                                <td className="p-3 font-bold text-slate-700">{formatPriceKRW(p.pricePerPyung)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* 최근 실거래 내역 카드 */}
                  {trendItem?.recent_deals && trendItem.recent_deals.length > 0 && (
                    <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="text-[16px] font-black text-[#0F172A]">최근 실거래 내역</h3>
                      <p className="mt-0.5 text-[12px] text-slate-500">
                        국토교통부 실거래가 기준 최근 체결된 매매 계약 내역입니다.
                      </p>

                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-left text-[13px]">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-[12px] font-extrabold text-slate-500">
                              <th className="p-3">계약일자</th>
                              <th className="p-3">전용면적</th>
                              <th className="p-3">평형</th>
                              <th className="p-3">층수</th>
                              <th className="p-3">거래금액</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {trendItem.recent_deals.map((trade, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/60">
                                <td className="p-3 text-slate-600">{trade.deal_date}</td>
                                <td className="p-3 text-slate-600">{trade.exclusive_area}㎡</td>
                                <td className="p-3 text-slate-600">{trade.pyeong ? `${trade.pyeong}평` : "-"}</td>
                                <td className="p-3 text-slate-600">{trade.floor}층</td>
                                <td className="p-3 font-bold text-[#0F8AA8]">{formatPriceKRW(trade.deal_amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </SectionSidebarLayout>
  );
}
