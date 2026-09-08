// 20260825 이명훈
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Building,
  RotateCcw,
  ChevronDown,
  MapPin,
  Sparkles,
  Search,
  Loader2,
  Check,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { PRICE_NAVIGATION } from "@/config/sectionNavigation";
import {
  getAptCompareApi,
  getSggsApi,
  getDongsApi,
  getApartmentMarketTrendApi,
  getPriceDetailComplexesApi,
  type AptCompareResponse,
  type SggItem,
  type DongItem,
  type ApartmentMarketTrendResponse,
  type PriceDetailComplexItem,
} from "@/api/api";

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

function isNoComparisonDataError(error: unknown): boolean {
  const errorMessages: string[] = [];

  if (error instanceof Error) {
    errorMessages.push(error.message);
  }

  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;
    if (typeof responseData === "string") {
      errorMessages.push(responseData);
    } else if (responseData && typeof responseData === "object") {
      const detail = (responseData as { detail?: unknown }).detail;
      const message = (responseData as { message?: unknown }).message;

      if (typeof detail === "string") errorMessages.push(detail);
      if (typeof message === "string") errorMessages.push(message);
    }
  }

  return errorMessages.some((message) => message.includes("데이터가 없습니다"));
}

function formatPyeongPrice(price?: number | null): string {
  if (!price || price <= 0) return "-";
  return `${Math.round(price).toLocaleString()}만 원/평`;
}

function formatDateString(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const cleaned = dateStr.replace(/[^0-9]/g, "");
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 4)}.${cleaned.slice(4, 6)}.${cleaned.slice(6, 8)}`;
  }
  return dateStr;
}

function formatSupplyPyeong(pyeong?: number | null): string {
  if (pyeong === null || pyeong === undefined || pyeong <= 0) return "-";
  return `${Math.round(pyeong)}평형`;
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
  accentColor?: "teal" | "indigo";
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
    accentColor === "indigo"
      ? "bg-[#F5F3FF] border-[#6366F1] text-[#4F46E5] font-black"
      : "bg-[#E0F2FE] border-[#0284C7] text-[#0369A1] font-black";

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          value={displayQuery}
          onClick={() => !disabled && setIsOpen(true)}
          onFocus={() => !disabled && setIsOpen(true)}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "h-9 w-full min-w-[150px] pl-3 pr-7 bg-white border border-[#CBD5E1] rounded-[10px] text-[12px] font-bold text-[#0F172A] outline-none transition-all cursor-pointer hover:border-[#94A3B8] focus:border-[#0F8AA8] focus:ring-2 focus:ring-[#0F8AA8]/15",
            disabled && "bg-[#F8FAFC] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed",
          )}
        />
        <ChevronDown
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (!disabled) {
              setIsOpen((prev) => !prev);
              if (!isOpen) inputRef.current?.focus();
            }
          }}
          className={cn(
            "size-3.5 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-200",
            isOpen && "rotate-180",
            disabled && "cursor-not-allowed opacity-50",
          )}
        />
      </div>

      {isOpen && !disabled && (
        <div
          ref={listRef}
          className="absolute left-0 top-[calc(100%+3px)] z-50 max-h-52 w-max min-w-full overflow-y-auto rounded-xl border border-[#CBD5E1] bg-white p-1.5 shadow-xl animate-in fade-in-0 duration-100"
        >
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-center text-[11.5px] font-medium text-slate-400">
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
                    "flex w-full items-center justify-between gap-2 rounded-lg border border-[#CBD5E1] bg-[#F1F5F9] px-3 py-1.5 mb-1 text-left text-[12px] font-bold text-[#1E293B] transition-all duration-100 cursor-pointer hover:bg-[#E2E8F0] hover:border-[#94A3B8] last:mb-0",
                    isHighlighted && !isSelected && "bg-[#E2E8F0] border-[#94A3B8] text-[#0F172A]",
                    isSelected && selectedItemStyle,
                  )}
                >
                  <span className="whitespace-nowrap">
                    <HighlightMatch text={opt.label} query={searchQuery !== null ? searchQuery : ""} />
                  </span>
                  {isSelected && (
                    <Check
                      className={cn(
                        "size-3 stroke-[3] shrink-0",
                        accentColor === "indigo" ? "text-[#6366F1]" : "text-[#0284C7]",
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
      getPriceDetailComplexesApi(
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

  /* 4. 아파트 실거래 시장 트렌드 조회 (FastAPI) - 비교하기 클릭 시 조회 */
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


  /* 5. 아파트 유형 비교 API 조회 */
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
      const queryType = query.compareType === "pyeong" ? "pyeong" : "floor";
      const selectGroup1 = queryType === "floor"
        ? query.val1.toUpperCase()
        : query.val1;
      const selectGroup2 = queryType === "floor"
        ? query.val2.toUpperCase()
        : query.val2;

      return getAptCompareApi({
        guCode: cggCd,
        dongCode: dongCd,
        aptName: name,
        mno,
        sno,
        queryType,
        selectGroup1,
        selectGroup2,
      });
    },
    enabled: Boolean(
      query.isActive &&
      currentComplex?.name &&
      query.compareType &&
      query.val1 &&
      query.val2,
    ),
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  /* 드롭다운 옵션 메모이제이션 */
  const isCompareNoDataError = isNoComparisonDataError(compareError);

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
        area: a.exclusive_area ? `${a.exclusive_area}㎡` : "-",
        pyeong: a.pyeong ? `${a.pyeong}평` : "-",
        salePrice: a.avg_deal_price,
        pricePerPyung: a.pyeong ? Math.round(a.avg_deal_price / a.pyeong) : 0,
      }));
    }
    return (currentComplex?.pyungs || []).map((p) => ({
      area: p.area ? `${p.area}㎡` : "-",
      pyeong: p.name || "-",
      salePrice: p.salePrice,
      pricePerPyung: p.pricePerPyung,
    }));
  }, [trendItem, currentComplex]);

  /* 유형별 비교 분석 데이터 계산 (/fastApi/aptcompare 응답) */
  const compareAnalysis = useMemo(() => {
    if (
      !query.isActive ||
      !query.compareType ||
      !compareData ||
      !compareData.grp ||
      !compareData.grp2
    ) {
      return null;
    }

    const group1 = compareData.grp;
    const group2 = compareData.grp2;
    const avg1 = group1.avg_thing_amt ?? 0;
    const avg2 = group2.avg_thing_amt ?? 0;
    const count1 = group1.deal_cnt ?? 0;
    const count2 = group2.deal_cnt ?? 0;

    const label1 = getCompareOptionLabel(query.compareType, query.val1);
    const label2 = getCompareOptionLabel(query.compareType, query.val2);
    const diffAvg = avg1 - avg2;
    const diffAvgPct = avg2 > 0 ? ((diffAvg / avg2) * 100).toFixed(1) : "0";

    return {
      label1,
      label2,
      avg1,
      avg2,
      recentPrice1: group1.recent_thing_amt,
      recentPrice2: group2.recent_thing_amt,
      recentDealDate1: group1.recent_deal_date,
      recentDealDate2: group2.recent_deal_date,
      recentPyeong1: group1.recent_supply_pyeong,
      recentPyeong2: group2.recent_supply_pyeong,
      recentPyeongPrice1: group1.recent_pyeong_amt,
      recentPyeongPrice2: group2.recent_pyeong_amt,
      pyeongPrice1: group1.avg_pyeong_amt,
      pyeongPrice2: group2.avg_pyeong_amt,
      count1,
      count2,
      diffAvg,
      diffAvgPct,
      hasData1: Boolean(avg1 > 0 || count1 > 0),
      hasData2: Boolean(avg2 > 0 || count2 > 0),
    };
  }, [query.isActive, query.compareType, query.val1, query.val2, compareData]);

  const handleReset = useCallback(() => {
    setQuery({
      sggCd: "",
      dongCd: "",
      complexId: null,
      compareType: "floor",
      val1: "low",
      val2: "high",
      isActive: false,
    });
  }, [setQuery]);

  return (
    <SectionSidebarLayout
      sectionTitle={PRICE_NAVIGATION.sectionTitle}
      menuItems={PRICE_NAVIGATION.menuItems}
    >
      <div className="tw-scope min-w-0 w-full bg-[#F8FAFC]">
        <main className="py-8">
          <section className="min-w-0">
            <div className="mb-6">
              <h1 className="text-[24px] font-black text-[#13202B]">단지별 비교</h1>
              <p className="mt-1 text-[13px] font-medium text-slate-500">
                선택한 자치구와 동 내 아파트 단지들의 층수 및 평형별 실거래 시세를 비교 분석하세요.
              </p>
            </div>

            {/* 옵션 선택 카드 */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (query.compareType && query.val1 && query.val2) setQuery({ isActive: true });
              }}
              className="mb-8 rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="grid grid-cols-[1fr_180px] gap-4 max-[1024px]:grid-cols-1">
                {/* 좌측: 조건 선택 폼 */}
                <div className="flex flex-col gap-2">
                  {/* 상단: 단지 선택 (기준) 카드 */}
                  <div className="rounded-[16px] border border-slate-200 bg-white p-3 sm:py-3 sm:px-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                      <div className="flex shrink-0 items-center gap-2 sm:min-w-[170px]">
                        <Building className="size-4 shrink-0 text-[#0F8AA8]" />
                        <h3 className="text-[15px] font-black tracking-tight whitespace-nowrap text-[#0F8AA8]">
                          {selectedSgg?.sggNm || selectedDong?.dongNm || currentComplex?.name
                            ? `${[selectedSgg?.sggNm, selectedDong?.dongNm, currentComplex?.name].filter(Boolean).join(" ")} (기준)`
                            : "아파트 단지 (기준)"}
                        </h3>
                      </div>
                      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                        {/* 1. 자치구 */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[12px] font-bold text-slate-700">
                            자치구 <span className="text-blue-600 text-[10px]">필수</span>
                          </label>
                          <AutocompleteSelect
                            value={selectedSgg?.sggNm || ""}
                            onChange={(_, opt) => setQuery({ sggCd: opt?.code || "", dongCd: "", complexId: null, isActive: false })}
                            options={sggOptions}
                            placeholder={isSggLoading ? "로딩 중..." : "자치구 선택"}
                            disabled={isSggLoading}
                            accentColor="teal"
                          />
                        </div>

                        {/* 2. 자치동 */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[12px] font-bold text-slate-700">
                            자치동 <span className="text-blue-600 text-[10px]">필수</span>
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
                        <div className="flex flex-col gap-1">
                          <label className="text-[12px] font-bold text-slate-700">
                            아파트 단지 <span className="text-blue-600 text-[10px]">필수</span>
                          </label>
                          <AutocompleteSelect
                            value={currentComplex?.name || ""}
                            onChange={(_, opt) => setQuery({ complexId: opt?.code || null, isActive: false })}
                            options={complexOptions}
                            placeholder={!query.dongCd ? "자치동 먼저 선택" : isComplexesLoading ? "로딩 중..." : "단지 선택"}
                            disabled={!query.dongCd || isComplexesLoading || complexList.length === 0}
                            accentColor="teal"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 하단: 1:1 비교 조건 카드 */}
                  <div className="rounded-[16px] border border-slate-200 bg-white p-3 sm:py-3 sm:px-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                      <div className="flex shrink-0 items-center gap-2 sm:min-w-[170px]">
                        <SlidersHorizontal className="size-4 shrink-0 text-[#6366F1]" />
                        <h3 className="text-[15px] font-black tracking-tight whitespace-nowrap text-[#4F46E5]">
                          1:1 비교 조건
                        </h3>
                      </div>
                      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                        {/* 1. 비교 기준 타입 */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[12px] font-bold text-slate-700">
                            비교 기준 <span className="text-indigo-600 text-[10px]">타입</span>
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
                            placeholder="비교 기준 선택"
                            disabled={!currentComplex}
                            accentColor="teal"
                          />
                        </div>

                        {/* 2. 선택 1 (기준) */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[12px] font-bold text-slate-700">
                            선택 1 <span className="text-[#0F8AA8] text-[10px]">기준</span>
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

                        {/* 3. 선택 2 (비교) */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[12px] font-bold text-slate-700">
                            선택 2 <span className="text-[#6366F1] text-[10px]">비교</span>
                          </label>
                          <AutocompleteSelect
                            value={getCompareOptionLabel(query.compareType, query.val2)}
                            onChange={(_, opt) => setQuery({ val2: opt?.value || "", isActive: false })}
                            options={query.compareType === "pyeong" ? pyeongCompareOptions : floorCompareOptions}
                            placeholder="조건 선택"
                            disabled={!currentComplex}
                            accentColor="indigo"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 우측: 검색 버튼 및 초기화 버튼 */}
                <div className="flex flex-col justify-center gap-2">
                  <button
                    type="submit"
                    disabled={!query.compareType || !query.val1 || !query.val2 || isCompareLoading}
                    className="flex h-full min-h-[50px] items-center justify-center gap-2 rounded-[14px] bg-blue-600 p-4 font-black text-white hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-600/20"
                  >
                    {isCompareLoading ? <Loader2 className="size-5 animate-spin" /> : <Search className="size-5" />}
                    <span>{isCompareLoading ? "조회 중..." : "시세 비교하기"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center justify-center gap-1.5 rounded-[10px] border border-slate-200 bg-white py-2 text-[12px] font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>초기화</span>
                  </button>
                </div>
              </div>
            </form>

            {/* 비교 분석 영역 */}
            {isCompareLoading ? (
              <div className="mb-8 flex flex-col items-center justify-center rounded-[20px] border border-slate-200 bg-white py-16 text-center">
                <Loader2 className="size-8 animate-spin text-[#0F8AA8]" />
                <p className="mt-3 text-[14px] font-bold text-slate-600">조건별 시세 데이터를 분석하는 중입니다...</p>
              </div>
            ) : !query.sggCd || !query.dongCd ? (
              <div className="mb-8 flex flex-col items-center justify-center rounded-[20px] border border-slate-200 bg-white py-14 text-center">
                <MapPin className="size-10 text-slate-300 mb-2" />
                <p className="text-[15px] font-bold text-slate-700">자치구와 자치동을 먼저 선택해 주세요</p>
                <p className="mt-1 text-[13px] text-slate-400">비교할 아파트 단지를 조회하기 위해 지역을 선택하세요.</p>
              </div>
            ) : !currentComplex ? (
              <div className="mb-8 flex flex-col items-center justify-center rounded-[20px] border border-slate-200 bg-white py-14 text-center">
                <Building className="size-10 text-slate-300 mb-2" />
                <p className="text-[15px] font-bold text-slate-700">비교할 아파트 단지를 선택해 주세요</p>
                <p className="mt-1 text-[13px] text-slate-400">단지를 선택하면 해당 단지의 층수 및 평형별 시세를 비교할 수 있습니다.</p>
              </div>
            ) : !query.isActive ? (
              <div className="mb-8 flex flex-col items-center justify-center rounded-[20px] border border-dashed border-slate-300 bg-slate-50/70 py-14 text-center">
                <Sparkles className="size-10 text-indigo-400 mb-2" />
                <p className="text-[15px] font-bold text-slate-700">1:1 비교 조건을 선택한 후 '시세 비교하기'를 눌러주세요</p>
                <p className="mt-1 text-[13px] text-slate-400">선택한 조건의 거래량, 최근 거래 정보 및 평당 단가 비교 분석 결과가 제공됩니다.</p>
              </div>
            ) : isCompareError && !isCompareNoDataError ? (
              <div className="mb-8 flex flex-col items-center justify-center rounded-[20px] border border-red-200 bg-red-50/50 py-12 text-center text-red-600">
                <p className="font-bold text-[15px]">비교 데이터를 불러오지 못했습니다.</p>
                <p className="mt-1 text-[13px] text-red-500">잠시 후 다시 시도해 주세요.</p>
              </div>
            ) : (
              <div className="mb-8 flex flex-col gap-5">

                {/* 1:1 비교 분석 결과 카드 */}
                {compareAnalysis ? (
                  <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-indigo-500" />
                        <h3 className="text-[16px] font-black text-[#0F172A]">1:1 조건 비교 분석 결과</h3>
                      </div>
                      <span className="text-[12px] font-medium text-slate-500">
                        기준: {query.compareType === "pyeong" ? "평형대" : "층수 구간"}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* 선택 1 카드 (기준) */}
                      <div className="rounded-2xl border border-teal-200 bg-gradient-to-b from-teal-50/40 to-white p-3.5">
                        <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                          <span className="rounded-md bg-[#0F8AA8] px-2.5 py-0.5 text-[11.5px] font-bold text-white">
                            선택 1 (기준)
                          </span>
                          <span className="text-[13.5px] font-black text-[#0F8AA8]">{compareAnalysis.label1}</span>
                        </div>
                        <div className="mt-2.5 grid grid-cols-2 gap-2">
                          {/* 1. 평균 매매가 */}
                          <div className="rounded-xl bg-white py-2 px-3 border border-teal-100/60 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-400">평균 매매가</span>
                              {compareAnalysis.avg1 > compareAnalysis.avg2 && compareAnalysis.avg2 > 0 && (
                                <span className="text-[10px] font-bold text-rose-500">
                                  ▲ {formatPriceKRW(compareAnalysis.avg1 - compareAnalysis.avg2)}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[14.5px] font-black text-slate-800">
                              {formatPriceKRW(compareAnalysis.avg1)}
                            </p>
                          </div>
                          {/* 2. 거래 건수 */}
                          <div className="rounded-xl bg-white py-2 px-3 border border-teal-100/60 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-400">거래 건수</span>
                              {compareAnalysis.count1 > compareAnalysis.count2 && (
                                <span className="text-[10px] font-bold text-rose-500">
                                  ▲ {(compareAnalysis.count1 - compareAnalysis.count2).toLocaleString()}건
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[14.5px] font-black text-slate-800">
                              {compareAnalysis.count1 ? `${compareAnalysis.count1.toLocaleString()}건` : "-"}
                            </p>
                          </div>
                          {/* 3. 최근 실거래가 */}
                          <div className="rounded-xl bg-white py-2 px-3 border border-teal-100/60 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-400">최근 실거래가</span>
                              {(compareAnalysis.recentPrice1 ?? 0) > (compareAnalysis.recentPrice2 ?? 0) && (compareAnalysis.recentPrice2 ?? 0) > 0 && (
                                <span className="text-[10px] font-bold text-rose-500">
                                  ▲ {formatPriceKRW((compareAnalysis.recentPrice1 ?? 0) - (compareAnalysis.recentPrice2 ?? 0))}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[14.5px] font-black text-slate-800">
                              {formatPriceKRW(compareAnalysis.recentPrice1)}
                            </p>
                          </div>
                          {/* 4. 최근 거래일 */}
                          <div className="rounded-xl bg-white py-2 px-3 border border-teal-100/60 shadow-xs">
                            <span className="text-[11px] font-bold text-slate-400">최근 거래일</span>
                            <p className="mt-0.5 text-[13px] font-black text-slate-800">
                              {formatDateString(compareAnalysis.recentDealDate1)}
                            </p>
                          </div>
                          {/* 5. 최근 거래 평형 */}
                          <div className="rounded-xl bg-white py-2 px-3 border border-teal-100/60 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-400">최근 거래 평형</span>
                              {(compareAnalysis.recentPyeong1 ?? 0) > (compareAnalysis.recentPyeong2 ?? 0) && (compareAnalysis.recentPyeong2 ?? 0) > 0 && (
                                <span className="text-[10px] font-bold text-rose-500">
                                  ▲ {Math.round((compareAnalysis.recentPyeong1 ?? 0) - (compareAnalysis.recentPyeong2 ?? 0))}평
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[13px] font-black text-slate-800">
                              {formatSupplyPyeong(compareAnalysis.recentPyeong1)}
                            </p>
                          </div>
                          {/* 6. 최근 거래 평당 단가 */}
                          <div className="rounded-xl bg-white py-2 px-3 border border-teal-100/60 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-400">최근 거래 평당 단가</span>
                              {(compareAnalysis.recentPyeongPrice1 || compareAnalysis.pyeongPrice1 || 0) > (compareAnalysis.recentPyeongPrice2 || compareAnalysis.pyeongPrice2 || 0) &&
                                (compareAnalysis.recentPyeongPrice2 || compareAnalysis.pyeongPrice2 || 0) > 0 && (
                                  <span className="text-[10px] font-bold text-rose-500">
                                    ▲ {formatPyeongPrice((compareAnalysis.recentPyeongPrice1 || compareAnalysis.pyeongPrice1 || 0) - (compareAnalysis.recentPyeongPrice2 || compareAnalysis.pyeongPrice2 || 0))}
                                  </span>
                                )}
                            </div>
                            <p className="mt-0.5 text-[13px] font-black text-slate-800">
                              {formatPyeongPrice(compareAnalysis.recentPyeongPrice1 || compareAnalysis.pyeongPrice1)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 선택 2 카드 (비교) */}
                      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/40 to-white p-3.5">
                        <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                          <span className="rounded-md bg-[#6366F1] px-2.5 py-0.5 text-[11.5px] font-bold text-white">
                            선택 2 (비교)
                          </span>
                          <span className="text-[13.5px] font-black text-[#6366F1]">{compareAnalysis.label2}</span>
                        </div>
                        <div className="mt-2.5 grid grid-cols-2 gap-2">
                          {/* 1. 평균 매매가 */}
                          <div className="rounded-xl bg-white py-2 px-3 border border-indigo-100/60 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-400">평균 매매가</span>
                              {compareAnalysis.avg2 > compareAnalysis.avg1 && compareAnalysis.avg1 > 0 && (
                                <span className="text-[10px] font-bold text-rose-500">
                                  ▲ {formatPriceKRW(compareAnalysis.avg2 - compareAnalysis.avg1)}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[14.5px] font-black text-slate-800">
                              {formatPriceKRW(compareAnalysis.avg2)}
                            </p>
                          </div>
                          {/* 2. 거래 건수 */}
                          <div className="rounded-xl bg-white py-2 px-3 border border-indigo-100/60 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-400">거래 건수</span>
                              {compareAnalysis.count2 > compareAnalysis.count1 && (
                                <span className="text-[10px] font-bold text-rose-500">
                                  ▲ {(compareAnalysis.count2 - compareAnalysis.count1).toLocaleString()}건
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[14.5px] font-black text-slate-800">
                              {compareAnalysis.count2 ? `${compareAnalysis.count2.toLocaleString()}건` : "-"}
                            </p>
                          </div>
                          {/* 3. 최근 실거래가 */}
                          <div className="rounded-xl bg-white py-2 px-3 border border-indigo-100/60 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-400">최근 실거래가</span>
                              {(compareAnalysis.recentPrice2 ?? 0) > (compareAnalysis.recentPrice1 ?? 0) && (compareAnalysis.recentPrice1 ?? 0) > 0 && (
                                <span className="text-[10px] font-bold text-rose-500">
                                  ▲ {formatPriceKRW((compareAnalysis.recentPrice2 ?? 0) - (compareAnalysis.recentPrice1 ?? 0))}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[14.5px] font-black text-slate-800">
                              {formatPriceKRW(compareAnalysis.recentPrice2)}
                            </p>
                          </div>
                          {/* 4. 최근 거래일 */}
                          <div className="rounded-xl bg-white py-2 px-3 border border-indigo-100/60 shadow-xs">
                            <span className="text-[11px] font-bold text-slate-400">최근 거래일</span>
                            <p className="mt-0.5 text-[13px] font-black text-slate-800">
                              {formatDateString(compareAnalysis.recentDealDate2)}
                            </p>
                          </div>
                          {/* 5. 최근 거래 평형 */}
                          <div className="rounded-xl bg-white py-2 px-3 border border-indigo-100/60 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-400">최근 거래 평형</span>
                              {(compareAnalysis.recentPyeong2 ?? 0) > (compareAnalysis.recentPyeong1 ?? 0) && (compareAnalysis.recentPyeong1 ?? 0) > 0 && (
                                <span className="text-[10px] font-bold text-rose-500">
                                  ▲ {Math.round((compareAnalysis.recentPyeong2 ?? 0) - (compareAnalysis.recentPyeong1 ?? 0))}평
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[13px] font-black text-slate-800">
                              {formatSupplyPyeong(compareAnalysis.recentPyeong2)}
                            </p>
                          </div>
                          {/* 6. 최근 거래 평당 단가 */}
                          <div className="rounded-xl bg-white py-2 px-3 border border-indigo-100/60 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-400">최근 거래 평당 단가</span>
                              {(compareAnalysis.recentPyeongPrice2 || compareAnalysis.pyeongPrice2 || 0) > (compareAnalysis.recentPyeongPrice1 || compareAnalysis.pyeongPrice1 || 0) &&
                                (compareAnalysis.recentPyeongPrice1 || compareAnalysis.pyeongPrice1 || 0) > 0 && (
                                  <span className="text-[10px] font-bold text-rose-500">
                                    ▲ {formatPyeongPrice((compareAnalysis.recentPyeongPrice2 || compareAnalysis.pyeongPrice2 || 0) - (compareAnalysis.recentPyeongPrice1 || compareAnalysis.pyeongPrice1 || 0))}
                                  </span>
                                )}
                            </div>
                            <p className="mt-0.5 text-[13px] font-black text-slate-800">
                              {formatPyeongPrice(compareAnalysis.recentPyeongPrice2 || compareAnalysis.pyeongPrice2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* 하단: 평형별 시세 테이블 & 최근 실거래 내역 (2열 그리드 배치로 세로 길이 단축) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 max-[1024px]:grid-cols-1 items-stretch">
              {/* 평형별 시세 정보 카드 */}
              <div className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm flex flex-col h-full">
                <div>
                  <h3 className="text-[14.5px] font-black text-[#0F172A]">평형별 시세 정보</h3>
                  <p className="mt-0.5 text-[11.5px] text-slate-500">
                    공급/전용 면적별 최근 매매 및 전세 실거래 기준 시세입니다.
                  </p>
                </div>

                {pyungs.length === 0 ? (
                  <div className="py-8 text-center text-[12px] text-slate-400">등록된 평형별 시세 정보가 없습니다.</div>
                ) : (
                  <div className="mt-3 overflow-x-auto max-h-[340px] overflow-y-auto rounded-lg border border-slate-100">
                    <table className="w-full text-left text-[12px]">
                      <thead>
                        <tr className="sticky top-0 border-b border-slate-200 bg-slate-50 text-[11.5px] font-extrabold text-slate-600">
                          <th className="py-2 px-2.5">전용면적</th>
                          <th className="py-2 px-2.5">평형</th>
                          <th className="py-2 px-2.5">평균 매매가</th>
                          <th className="py-2 px-2.5">평당가</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pyungs.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-2 px-2.5 font-semibold text-[#0F172A]">{p.area}</td>
                            <td className="py-2 px-2.5 font-semibold text-[#0F172A]">{p.pyeong}</td>
                            <td className="py-2 px-2.5 font-semibold text-[#0F172A]">{formatPriceKRW(p.salePrice)}</td>
                            <td className="py-2 px-2.5 font-semibold text-[#0F172A]">{formatPriceKRW(p.pricePerPyung)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 최근 실거래 내역 카드 */}
              <div className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm flex flex-col h-full">
                <div>
                  <h3 className="text-[14.5px] font-black text-[#0F172A]">최근 실거래 내역</h3>
                  <p className="mt-0.5 text-[11.5px] text-slate-500">
                    국토교통부 실거래가 기준 최근 체결된 매매 계약 내역입니다.
                  </p>
                </div>

                {!trendItem?.recent_deals || trendItem.recent_deals.length === 0 ? (
                  <div className="py-8 text-center text-[12px] text-slate-400">최근 실거래 내역이 없습니다.</div>
                ) : (
                  <div className="mt-3 overflow-x-auto max-h-[340px] overflow-y-auto rounded-lg border border-slate-100">
                    <table className="w-full text-left text-[12px]">
                      <thead>
                        <tr className="sticky top-0 border-b border-slate-200 bg-slate-50 text-[11.5px] font-extrabold text-slate-600">
                          <th className="py-2 px-2.5">계약일자</th>
                          <th className="py-2 px-2.5">전용면적</th>
                          <th className="py-2 px-2.5">평형</th>
                          <th className="py-2 px-2.5">층수</th>
                          <th className="py-2 px-2.5">거래금액</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {trendItem.recent_deals.map((trade, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-2 px-2.5 font-semibold text-[#0F172A]">{trade.deal_date}</td>
                            <td className="py-2 px-2.5 font-semibold text-[#0F172A]">{trade.exclusive_area}㎡</td>
                            <td className="py-2 px-2.5 font-semibold text-[#0F172A]">{trade.pyeong ? `${trade.pyeong}평` : "-"}</td>
                            <td className="py-2 px-2.5 font-semibold text-[#0F172A]">{trade.floor}층</td>
                            <td className="py-2 px-2.5 font-semibold text-[#0F172A]">{formatPriceKRW(trade.deal_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </SectionSidebarLayout>
  );
}
