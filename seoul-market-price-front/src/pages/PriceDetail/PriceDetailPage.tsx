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
import {
  getSggsApi,
  getDongsApi,
  getComplexesApi,
  getApartmentMarketTrendApi,
  getAptCompareApi,
  type SggItem,
  type DongItem,
  type ComplexDetailItem,
  type ApartmentMarketTrendResponse,
  type AptCompareResponse,
} from "@/api/api";
import styles from "./PriceDetailPage.module.css";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { PRICE_NAVIGATION } from "@/config/sectionNavigation";

/* 검색어 일치 텍스트 하이라이트 컴포넌트 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  if (index === -1) return <>{text}</>;

  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);

  return (
    <span>
      {before}
      <span className="font-black text-[#0F8AA8] underline underline-offset-2">
        {match}
      </span>
      {after}
    </span>
  );
}

export interface AutocompleteOption {
  label: string;
  value: string;
  code?: string;
  extra?: string;
}

interface AutocompleteSelectProps {
  value: string;
  onChange: (value: string, option?: AutocompleteOption) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  disabled?: boolean;
  accentColor?: "teal" | "purple" | "blue";
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

  useEffect(() => {
    if (isOpen && activeHighlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeHighlightedIndex] as
        | HTMLElement
        | undefined;
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
          onClick={() => {
            if (!disabled) setIsOpen((prev) => !prev);
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

      {/* 드롭다운 카드형 옵션 목록 */}
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
              const isSelected =
                opt.label === value || opt.value === value;
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
                    <HighlightMatch
                      text={opt.label}
                      query={searchQuery !== null ? searchQuery : ""}
                    />
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

/* 금액 포맷 유틸리티 (e.g. 348000 -> 34억 8,000만 원) */
function formatPriceKRW(priceInMan?: number | null): string {
  if (!priceInMan || priceInMan <= 0) return "-";
  const eok = Math.floor(priceInMan / 10000);
  const remainderMan = Math.round(priceInMan % 10000);
  if (eok === 0) return `${remainderMan.toLocaleString()}만 원`;
  if (remainderMan === 0) return `${eok}억 원`;
  return `${eok}억 ${remainderMan.toLocaleString()}만 원`;
}

/* 비교 조건 라벨 포맷 유틸리티 */
function getCompareOptionLabel(type: "floor" | "pyeong" | "", value: string): string {
  if (type === "floor") {
    if (value === "LOW") return "저층 (1~5층)";
    if (value === "MID") return "중층 (6~15층)";
    if (value === "HIGH") return "고층 (16층 이상)";
  } else if (type === "pyeong") {
    if (value === "10") return "10평형대 (~59㎡)";
    if (value === "20") return "20평형대 (59~84㎡)";
    if (value === "30") return "30평형대 (84~114㎡)";
    if (value === "40") return "40평형 이상 (114㎡~)";
  }
  return value || "-";
}

export default function PriceDetailPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  /* URL 파라미터 기반 초기 상태 복원 (F5 새로고침 시 유지) */
  const urlSgg = searchParams.get("sgg") || "";
  const urlDong = searchParams.get("dong") || "";
  const urlComplex = searchParams.get("complex") || null;
  const urlCompareType = (searchParams.get("type") as "floor" | "pyeong" | "") || "";
  const urlVal1 = searchParams.get("val1") || "";
  const urlVal2 = searchParams.get("val2") || "";
  const urlActive = searchParams.get("active") === "1";

  /* 1. 자치구 API 조회 (100.98.111.49 DB tb_sgg_master: sgg_cd, sgg_nm) */
  const { data: sggList = [], isLoading: isSggLoading } = useQuery<SggItem[]>({
    queryKey: ["locationSggs"],
    queryFn: getSggsApi,
    staleTime: 1000 * 60 * 30,
  });

  /* 콤보박스 선택 상태 */
  const [selectedSggCd, setSelectedSggCd] = useState<string>(urlSgg);
  const [selectedDongCd, setSelectedDongCd] = useState<string>(urlDong);

  /* 현재 선택된 자치구 객체 */
  const selectedSgg = useMemo(() => {
    if (!selectedSggCd) return null;
    return sggList.find((s) => s.sggCd === selectedSggCd) || null;
  }, [selectedSggCd, sggList]);

  /* 2. 자치동 API 조회 (DB 100.98.111.49 tb_dong_master: dong_cd, dong_nm, sgg_cd) */
  const { data: dongList = [], isLoading: isDongLoading } = useQuery<DongItem[]>({
    queryKey: ["locationDongs", selectedSggCd],
    queryFn: () => getDongsApi(selectedSggCd),
    enabled: Boolean(selectedSggCd),
    staleTime: 1000 * 60 * 30,
  });

  /* 현재 선택된 자치동 객체 */
  const selectedDong = useMemo(() => {
    if (!selectedDongCd) return null;
    return dongList.find((d) => d.dongCd === selectedDongCd) || null;
  }, [selectedDongCd, dongList]);

  const selectedDongNm = selectedDong?.dongNm || "";

  /* 선택된 아파트 단지 ID */
  const [selectedComplexId, setSelectedComplexId] = useState<string | null>(urlComplex);

  /* 타입(층수/평형) 및 선택1, 선택2 비교 상태 */
  const [compareType, setCompareType] = useState<"floor" | "pyeong" | "">(urlCompareType);
  const [compareValue1, setCompareValue1] = useState<string>(urlVal1);
  const [compareValue2, setCompareValue2] = useState<string>(urlVal2);

  /* 비교 모드 활성화 상태 및 적용된 비교 파라미터 */
  const [isCompareActive, setIsCompareActive] = useState<boolean>(urlActive);
  const [appliedCompareType, setAppliedCompareType] = useState<"floor" | "pyeong" | "">(urlActive ? urlCompareType : "");
  const [appliedCompareValue1, setAppliedCompareValue1] = useState<string>(urlActive ? urlVal1 : "");
  const [appliedCompareValue2, setAppliedCompareValue2] = useState<string>(urlActive ? urlVal2 : "");

  /* URL 파라미터 일괄 업데이트 헬퍼 */
  const updateUrlParams = (updates: {
    sgg?: string;
    dong?: string;
    complex?: string | null;
    type?: string;
    val1?: string;
    val2?: string;
    active?: boolean;
  }) => {
    const nextSgg = updates.sgg !== undefined ? updates.sgg : selectedSggCd;
    const nextDong = updates.dong !== undefined ? updates.dong : selectedDongCd;
    const nextComplex = updates.complex !== undefined ? updates.complex : selectedComplexId;
    const nextType = updates.type !== undefined ? updates.type : compareType;
    const nextVal1 = updates.val1 !== undefined ? updates.val1 : compareValue1;
    const nextVal2 = updates.val2 !== undefined ? updates.val2 : compareValue2;
    const nextActive = updates.active !== undefined ? updates.active : isCompareActive;

    const params = new URLSearchParams();
    if (nextSgg) params.set("sgg", nextSgg);
    if (nextDong) params.set("dong", nextDong);
    if (nextComplex) params.set("complex", nextComplex);
    if (nextType) params.set("type", nextType);
    if (nextVal1) params.set("val1", nextVal1);
    if (nextVal2) params.set("val2", nextVal2);
    if (nextActive) params.set("active", "1");

    setSearchParams(params, { replace: true });
  };

  /* 3. 엘라스틱서치를 통한 자치동 관할 아파트 단지 목록 조회 API (/elasticSearch/aptname) */
  const { data: complexList = [], isLoading: isComplexesLoading } = useQuery<ComplexDetailItem[]>({
    queryKey: ["locationComplexes", selectedSggCd, selectedDongCd],
    queryFn: () =>
      getComplexesApi(
        selectedSggCd,
        selectedDongCd,
        selectedSgg?.sggNm || "",
        selectedDongNm,
      ),
    enabled: Boolean(selectedSggCd && selectedDongCd),
    staleTime: 1000 * 60 * 10,
  });

  /* 현재 선택된 아파트 단지 */
  const currentComplex = useMemo(() => {
    if (!complexList.length || !selectedComplexId) return null;
    return complexList.find((c) => c.id === selectedComplexId) || null;
  }, [selectedComplexId, complexList]);

  /* 4. 선택된 아파트 단지의 실거래가 및 시장 트렌드 조회 (FastAPI) */
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
        guCode: currentComplex?.sggCd || selectedSggCd,
        dongCode:
          currentComplex?.dongCd ||
          (selectedDongCd.length === 10 ? selectedDongCd.slice(-5) : selectedDongCd),
        aptName: currentComplex?.name || "",
        mno: currentComplex?.mno || "",
        sno: currentComplex?.sno || "",
      }),
    enabled: Boolean(currentComplex?.name),
    staleTime: 1000 * 60 * 5,
  });

  const trendItem = trendData?.data?.[0];

  /* 5-1. 아파트 타입별 비교 API 조회 (선택 1 - 조회하기 클릭 시에만 호출) */
  const { data: compareData1 } = useQuery<AptCompareResponse>({
    queryKey: [
      "aptCompare1",
      currentComplex?.sggCd,
      currentComplex?.dongCd,
      currentComplex?.name,
      currentComplex?.mno,
      currentComplex?.sno,
      appliedCompareType,
      appliedCompareValue1,
    ],
    queryFn: () =>
      getAptCompareApi({
        query_type: appliedCompareType,
        query_value: appliedCompareValue1,
        pyeong: appliedCompareType === "pyeong" ? appliedCompareValue1 : undefined,
        floor: appliedCompareType === "floor" ? appliedCompareValue1 : undefined,
        guCode: currentComplex?.sggCd || selectedSggCd,
        dongCode:
          currentComplex?.dongCd ||
          (selectedDongCd.length === 10 ? selectedDongCd.slice(-5) : selectedDongCd),
        aptName: currentComplex?.name || "",
        mno: currentComplex?.mno || "",
        sno: currentComplex?.sno || "",
      }),
    enabled: Boolean(
      isCompareActive &&
      currentComplex?.name &&
      appliedCompareType &&
      appliedCompareValue1,
    ),
    staleTime: 1000 * 60 * 5,
  });

  /* 5-2. 아파트 타입별 비교 API 조회 (선택 2 - 조회하기 클릭 시에만 호출) */
  const { data: compareData2 } = useQuery<AptCompareResponse>({
    queryKey: [
      "aptCompare2",
      currentComplex?.sggCd,
      currentComplex?.dongCd,
      currentComplex?.name,
      currentComplex?.mno,
      currentComplex?.sno,
      appliedCompareType,
      appliedCompareValue2,
    ],
    queryFn: () =>
      getAptCompareApi({
        query_type: appliedCompareType,
        query_value: appliedCompareValue2,
        pyeong: appliedCompareType === "pyeong" ? appliedCompareValue2 : undefined,
        floor: appliedCompareType === "floor" ? appliedCompareValue2 : undefined,
        guCode: currentComplex?.sggCd || selectedSggCd,
        dongCode:
          currentComplex?.dongCd ||
          (selectedDongCd.length === 10 ? selectedDongCd.slice(-5) : selectedDongCd),
        aptName: currentComplex?.name || "",
        mno: currentComplex?.mno || "",
        sno: currentComplex?.sno || "",
      }),
    enabled: Boolean(
      isCompareActive &&
      currentComplex?.name &&
      appliedCompareType &&
      appliedCompareValue2,
    ),
    staleTime: 1000 * 60 * 5,
  });

  /* 자치구 목록 옵션 */
  const sggOptions = useMemo<AutocompleteOption[]>(() => {
    return sggList.map((s) => ({
      label: s.sggNm,
      value: s.sggCd,
      code: s.sggCd,
    }));
  }, [sggList]);

  /* 자치동 목록 옵션 */
  const dongOptions = useMemo<AutocompleteOption[]>(() => {
    return dongList.map((d) => ({
      label: d.dongNm,
      value: d.dongCd,
      code: d.dongCd,
    }));
  }, [dongList]);

  /* 아파트 단지 목록 옵션 */
  const complexOptions = useMemo<AutocompleteOption[]>(() => {
    return complexList.map((c) => ({
      label: c.name,
      value: c.id,
      code: c.id,
    }));
  }, [complexList]);

  /* 비교 기준 타입 옵션 */
  const compareTypeOptions = useMemo<AutocompleteOption[]>(() => [
    { label: "단지 전체 (기본)", value: "" },
    { label: "층수별 비교", value: "floor" },
    { label: "평형별 비교", value: "pyeong" },
  ], []);

  /* 층수 비교 옵션 */
  const floorCompareOptions = useMemo<AutocompleteOption[]>(() => [
    { label: "저층 (1~5층)", value: "LOW" },
    { label: "중층 (6~15층)", value: "MID" },
    { label: "고층 (16층 이상)", value: "HIGH" },
  ], []);

  /* 평형대 비교 옵션 */
  const pyeongCompareOptions = useMemo<AutocompleteOption[]>(() => [
    { label: "10평형대 (~59㎡)", value: "10" },
    { label: "20평형대 (59~84㎡)", value: "20" },
    { label: "30평형대 (84~114㎡)", value: "30" },
    { label: "40평형 이상 (114㎡~)", value: "40" },
  ], []);

  /* 콤보 박스: 자치구 변경 이벤트 */
  const handleSggSelect = (_name: string, opt?: AutocompleteOption) => {
    const nextSggCd = opt?.code || opt?.value || "";
    setSelectedSggCd(nextSggCd);
    setSelectedDongCd("");
    setSelectedComplexId(null);
    setCompareType("");
    setCompareValue1("");
    setCompareValue2("");
    setIsCompareActive(false);
    updateUrlParams({ sgg: nextSggCd, dong: "", complex: "", type: "", val1: "", val2: "", active: false });
  };

  /* 콤보 박스: 자치동 변경 이벤트 */
  const handleDongSelect = (_name: string, opt?: AutocompleteOption) => {
    const nextDongCd = opt?.code || opt?.value || "";
    setSelectedDongCd(nextDongCd);
    setSelectedComplexId(null);
    setCompareType("");
    setCompareValue1("");
    setCompareValue2("");
    setIsCompareActive(false);
    updateUrlParams({ dong: nextDongCd, complex: "", type: "", val1: "", val2: "", active: false });
  };

  /* 콤보 박스: 아파트 단지 변경 이벤트 */
  const handleComplexSelect = (_name: string, opt?: AutocompleteOption) => {
    const nextComplexId = opt?.code || opt?.value || null;
    setSelectedComplexId(nextComplexId);
    setIsCompareActive(false);
    updateUrlParams({ complex: nextComplexId, active: false });
  };

  /* 콤보 박스: 타입 선택(층수/평형) 변경 이벤트 */
  const handleCompareTypeSelect = (_name: string, opt?: AutocompleteOption) => {
    const nextType = (opt?.value ?? "") as "floor" | "pyeong" | "";
    setCompareType(nextType);
    let v1 = "";
    let v2 = "";
    if (nextType === "floor") {
      v1 = "LOW";
      v2 = "HIGH";
    } else if (nextType === "pyeong") {
      v1 = "20";
      v2 = "30";
    }
    setCompareValue1(v1);
    setCompareValue2(v2);
    setIsCompareActive(false);
    updateUrlParams({ type: nextType, val1: v1, val2: v2, active: false });
  };

  /* 콤보 박스: 세부 조건 1 변경 이벤트 */
  const handleCompareValue1Select = (_name: string, opt?: AutocompleteOption) => {
    const v1 = opt?.value || "";
    setCompareValue1(v1);
    updateUrlParams({ val1: v1, active: false });
  };

  /* 콤보 박스: 세부 조건 2 변경 이벤트 */
  const handleCompareValue2Select = (_name: string, opt?: AutocompleteOption) => {
    const v2 = opt?.value || "";
    setCompareValue2(v2);
    updateUrlParams({ val2: v2, active: false });
  };

  /* 비교 버튼 클릭 핸들러 */
  const handleCompareClick = () => {
    if (compareType && compareValue1 && compareValue2) {
      setAppliedCompareType(compareType);
      setAppliedCompareValue1(compareValue1);
      setAppliedCompareValue2(compareValue2);
      setIsCompareActive(true);
      updateUrlParams({
        type: compareType,
        val1: compareValue1,
        val2: compareValue2,
        active: true,
      });
    }
  };

  /* 비교 모드 해제 핸들러 */
  const handleExitCompare = () => {
    setIsCompareActive(false);
    updateUrlParams({ active: false });
  };

  /* 선택 초기화 핸들러 */
  const handleReset = () => {
    setSelectedSggCd("");
    setSelectedDongCd("");
    setSelectedComplexId(null);
    setCompareType("");
    setCompareValue1("");
    setCompareValue2("");
    setIsCompareActive(false);
    setSearchParams({}, { replace: true });
  };

  /* 평형 목록 구성 */
  const pyungs = useMemo(() => {
    if (trendItem?.area_deals && trendItem.area_deals.length > 0) {
      return trendItem.area_deals.map((a) => ({
        name: `${a.exclusive_area}㎡${a.pyeong ? ` (${a.pyeong}평)` : ""}`,
        area: Number(a.exclusive_area),
        salePrice: a.avg_deal_price,
        rentPrice: 0,
        recentTradeDate: "",
        recentFloor: 0,
        pricePerPyung: a.pyeong ? Math.round(a.avg_deal_price / a.pyeong) : 0,
      }));
    }
    return currentComplex?.pyungs || [];
  }, [trendItem, currentComplex]);

  const compareItem1 = useMemo(() => {
    if (!compareData1) return null;
    const raw = Array.isArray(compareData1)
      ? compareData1[0]
      : Array.isArray(compareData1?.data)
      ? compareData1.data[0]
      : compareData1?.data || compareData1;
    return raw || null;
  }, [compareData1]);

  const compareItem2 = useMemo(() => {
    if (!compareData2) return null;
    const raw = Array.isArray(compareData2)
      ? compareData2[0]
      : Array.isArray(compareData2?.data)
      ? compareData2.data[0]
      : compareData2?.data || compareData2;
    return raw || null;
  }, [compareData2]);

  /* =========================================================
      비교 모드 데이터 가공 및 필터링 Fallback 로직
  ========================================================= */
  const compareAnalysis = useMemo(() => {
    if (!isCompareActive || !appliedCompareType) return null;

    const allDeals = trendItem?.recent_deals || [];

    // 조건에 따라 실거래 목록을 필터링하는 함수 (백엔드 fallback 지원)
    const filterDeals = (val: string) => {
      if (appliedCompareType === "floor") {
        if (val === "LOW") return allDeals.filter((d) => d.floor <= 5);
        if (val === "MID") return allDeals.filter((d) => d.floor >= 6 && d.floor <= 15);
        if (val === "HIGH") return allDeals.filter((d) => d.floor >= 16);
      } else if (appliedCompareType === "pyeong") {
        if (val === "10") {
          return allDeals.filter(
            (d) => (d.pyeong && d.pyeong < 20) || parseFloat(d.exclusive_area) < 59,
          );
        }
        if (val === "20") {
          return allDeals.filter(
            (d) =>
              (d.pyeong && d.pyeong >= 20 && d.pyeong < 30) ||
              (parseFloat(d.exclusive_area) >= 59 && parseFloat(d.exclusive_area) < 84),
          );
        }
        if (val === "30") {
          return allDeals.filter(
            (d) =>
              (d.pyeong && d.pyeong >= 30 && d.pyeong < 40) ||
              (parseFloat(d.exclusive_area) >= 84 && parseFloat(d.exclusive_area) < 114),
          );
        }
        if (val === "40") {
          return allDeals.filter(
            (d) =>
              (d.pyeong && d.pyeong >= 40) ||
              parseFloat(d.exclusive_area) >= 114,
          );
        }
      }
      return allDeals;
    };

    const deals1 = compareItem1?.recent_deals && compareItem1.recent_deals.length > 0
      ? compareItem1.recent_deals
      : filterDeals(appliedCompareValue1);

    const deals2 = compareItem2?.recent_deals && compareItem2.recent_deals.length > 0
      ? compareItem2.recent_deals
      : filterDeals(appliedCompareValue2);

    // 평균 매매가
    const avg1 =
      compareItem1?.average_deal_price ||
      (deals1.length > 0
        ? Math.round(deals1.reduce((sum: number, d: any) => sum + (d.deal_amount || 0), 0) / deals1.length)
        : 0);

    const avg2 =
      compareItem2?.average_deal_price ||
      (deals2.length > 0
        ? Math.round(deals2.reduce((sum: number, d: any) => sum + (d.deal_amount || 0), 0) / deals2.length)
        : 0);

    // 최고가
    const max1 =
      compareItem1?.max_deal_price ||
      (deals1.length > 0 ? Math.max(...deals1.map((d: any) => d.deal_amount || 0)) : 0);
    const max2 =
      compareItem2?.max_deal_price ||
      (deals2.length > 0 ? Math.max(...deals2.map((d: any) => d.deal_amount || 0)) : 0);

    // 최저가
    const min1 =
      compareItem1?.min_deal_price ||
      (deals1.length > 0 ? Math.min(...deals1.map((d: any) => d.deal_amount || 0)) : 0);
    const min2 =
      compareItem2?.min_deal_price ||
      (deals2.length > 0 ? Math.min(...deals2.map((d: any) => d.deal_amount || 0)) : 0);

    // 거래 건수
    const count1 =
      compareItem1?.deal_count || compareItem1?.total_deal_count || deals1.length;
    const count2 =
      compareItem2?.deal_count || compareItem2?.total_deal_count || deals2.length;

    // 차트 데이터 (12개월 기간별 시세 추이 비교)
    const trendMap1 = new Map<string, number>();
    const trendMap2 = new Map<string, number>();

    if (compareItem1?.biweekly_trend && compareItem1.biweekly_trend.length > 0) {
      compareItem1.biweekly_trend.forEach((t: any) => trendMap1.set(t.biweekly_period, t.avg_price));
    }
    if (compareItem2?.biweekly_trend && compareItem2.biweekly_trend.length > 0) {
      compareItem2.biweekly_trend.forEach((t: any) => trendMap2.set(t.biweekly_period, t.avg_price));
    }

    // 기본 biweekly_trend 기간 목록 수집
    const basePeriods = (trendItem?.biweekly_trend || []).map((b) => b.biweekly_period);
    const allPeriods = Array.from(
      new Set([...basePeriods, ...trendMap1.keys(), ...trendMap2.keys()]),
    );

    const compareChartPoints = allPeriods.map((period) => {
      let sale1 = trendMap1.get(period) || 0;
      let sale2 = trendMap2.get(period) || 0;

      // Fallback: biweekly_trend가 분리되어 있지 않을 경우 전체 대비 비율 가산 추정
      if (!sale1 && avg1 > 0) {
        const base = trendItem?.biweekly_trend?.find((b) => b.biweekly_period === period)?.avg_price || avg1;
        sale1 = Math.round((base * avg1) / (trendItem?.average_deal_price || avg1));
      }
      if (!sale2 && avg2 > 0) {
        const base = trendItem?.biweekly_trend?.find((b) => b.biweekly_period === period)?.avg_price || avg2;
        sale2 = Math.round((base * avg2) / (trendItem?.average_deal_price || avg2));
      }

      return {
        month: period,
        sale1,
        sale2,
      };
    });

    const label1 = getCompareOptionLabel(appliedCompareType, appliedCompareValue1);
    const label2 = getCompareOptionLabel(appliedCompareType, appliedCompareValue2);

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
    };
  }, [
    isCompareActive,
    appliedCompareType,
    appliedCompareValue1,
    appliedCompareValue2,
    trendItem,
    compareItem1,
    compareItem2,
  ]);

  /* 최근 12개월 통합 꺾은선 비교 차트 데이터 */
  const combinedChartData = useMemo(() => {
    if (!compareAnalysis?.compareChartPoints?.length) return [];
    const header = [
      "기간",
      `선택 1 (${compareAnalysis.label1})`,
      `선택 2 (${compareAnalysis.label2})`,
    ];
    const rows = compareAnalysis.compareChartPoints.map((pt) => {
      let displayPeriod = pt.month;
      if (displayPeriod.includes("/")) {
        const parts = displayPeriod.split("/");
        if (parts.length === 2) {
          displayPeriod = parts[1].slice(-5).replace("-", ".");
        }
      } else if (displayPeriod.length >= 7) {
        displayPeriod = displayPeriod.slice(-5).replace("-", ".");
      }
      return [
        displayPeriod,
        Number(pt.sale1 || 0),
        Number(pt.sale2 || 0),
      ];
    });
    return [header, ...rows];
  }, [compareAnalysis]);

  const combinedChartOptions = useMemo(() => {
    return {
      curveType: "function",
      legend: { position: "none" },
      colors: ["#0F8AA8", "#6366F1"],
      lineWidth: 3,
      pointSize: 6,
      hAxis: {
        textStyle: { color: "#64748B", fontSize: 11, bold: true },
        gridlines: { color: "transparent" },
      },
      vAxis: {
        textStyle: { color: "#94A3B8", fontSize: 10, bold: true },
        gridlines: { color: "#F1F5F9" },
        format: "#,##0",
      },
      chartArea: { width: "90%", height: "72%", top: 20, bottom: 35 },
      backgroundColor: "transparent",
    };
  }, []);

  return (
    <SectionSidebarLayout
      sectionTitle={PRICE_NAVIGATION.sectionTitle}
      menuItems={PRICE_NAVIGATION.menuItems}
    >
      <main className={styles.pageContainer}>
        <div className={styles.mainGrid}>
          {/* =========================================
              메인 콘텐츠
          ========================================= */}
          <section className="min-w-0 space-y-6">
            {/* 헤더 타이틀 */}
            <header className={styles.sectionHeader}>
              <div>
                <div className={styles.breadcrumb}>
                  <span>서울시 아파트 시세 정보</span>
                  <ChevronRight className="size-3 text-[#94A3B8]" />
                  <span>{selectedSgg ? selectedSgg.sggNm : "자치구 선택"}</span>
                  <ChevronRight className="size-3 text-[#94A3B8]" />
                  <span>{selectedDongNm ? selectedDongNm : "자치동 선택"}</span>
                  {currentComplex?.name && (
                    <>
                      <ChevronRight className="size-3 text-[#94A3B8]" />
                      <span>{currentComplex.name}</span>
                    </>
                  )}
                </div>
                <h1 className={styles.pageTitle}>단지별 시세 분석</h1>
                <p className={styles.pageSubtitle}>
                  선택한 자치구와 동 내 아파트 단지들의 실거래가와 매매/전세 시세를 확인하세요.
                </p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className={styles.resetBtn}
              >
                <RotateCcw className="size-3.5" />
                선택 초기화
              </button>
            </header>

            {/* =========================================
                지역 및 옵션 선택 카드 섹션 (4분할 그리드)
            ========================================= */}
            <div className="mb-8 rounded-[24px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
              {/* 4분할 옵션 선택 그리드 */}
              <div className="grid grid-cols-4 gap-4 max-[1024px]:grid-cols-2 max-[640px]:grid-cols-1">
                {/* 1. 자치구 선택 */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="sgg-select" className="flex items-center justify-between text-[13px] font-extrabold text-[#0F172A]">
                    <span className="flex items-center gap-1.5">
                      <span>자치구 선택</span>
                      <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-black text-[#475569]">
                        필수
                      </span>
                    </span>
                  </label>
                  <AutocompleteSelect
                    value={selectedSgg?.sggNm || ""}
                    onChange={handleSggSelect}
                    options={sggOptions}
                    placeholder={isSggLoading ? "자치구 목록 로딩 중..." : "자치구 입력 (예: 강남구)"}
                    disabled={isSggLoading}
                    accentColor="teal"
                  />
                </div>

                {/* 2. 자치동 선택 */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="dong-select" className="flex items-center justify-between text-[13px] font-extrabold text-[#0F172A]">
                    <span className="flex items-center gap-1.5">
                      <span>자치동 선택</span>
                      <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-black text-[#475569]">
                        필수
                      </span>
                    </span>
                  </label>
                  <AutocompleteSelect
                    value={selectedDongNm}
                    onChange={handleDongSelect}
                    options={dongOptions}
                    placeholder={
                      !selectedSggCd
                        ? "자치구를 먼저 선택하세요"
                        : isDongLoading
                        ? "자치동 목록 로딩 중..."
                        : "자치동 선택 (전체)"
                    }
                    disabled={!selectedSggCd || isDongLoading}
                    accentColor="teal"
                  />
                </div>

                {/* 3. 아파트 단지 */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="complex-select" className="flex items-center justify-between text-[13px] font-extrabold text-[#0F172A]">
                    <span className="flex items-center gap-1.5">
                      <span>아파트 단지</span>
                      <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-black text-[#475569]">
                        필수
                      </span>
                    </span>
                  </label>
                  <AutocompleteSelect
                    value={currentComplex?.name || ""}
                    onChange={handleComplexSelect}
                    options={complexOptions}
                    placeholder={
                      !selectedDongCd
                        ? "자치동을 먼저 선택하세요"
                        : isComplexesLoading
                        ? "단지 목록 불러오는 중..."
                        : complexList.length === 0
                        ? "등록된 단지가 없습니다"
                        : "아파트 단지 선택"
                    }
                    disabled={!selectedDongCd || isComplexesLoading || complexList.length === 0}
                    accentColor="teal"
                  />
                </div>

                {/* 4. 비교 기준 타입 */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="compare-type-select" className="flex items-center justify-between text-[13px] font-extrabold text-[#0F172A]">
                    <span className="flex items-center gap-1.5">
                      <span>비교 기준 타입</span>
                      <span className="rounded bg-[#EEF2FF] px-1.5 py-0.5 text-[10px] font-black text-[#4F46E5]">
                        타입
                      </span>
                    </span>
                  </label>
                  <AutocompleteSelect
                    value={
                      compareType === "floor"
                        ? "층수별 비교"
                        : compareType === "pyeong"
                        ? "평형별 비교"
                        : "단지 전체 (기본)"
                    }
                    onChange={handleCompareTypeSelect}
                    options={compareTypeOptions}
                    placeholder="비교 기준 타입 선택"
                    disabled={!currentComplex}
                    accentColor="teal"
                  />
                </div>
              </div>

              {/* 비교 모드일 때만 표시되는 1:1 비교 조건 지정 섹션 */}
              {Boolean(compareType) && (
                <div className="mt-6 border-t border-slate-100 pt-6 grid grid-cols-[1fr_auto_1fr_auto] items-stretch gap-6 max-[1200px]:grid-cols-1">
                  {/* 선택 1 카드 */}
                  <div className="flex flex-col justify-between rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] transition-all duration-300 hover:shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4 shrink-0 text-[#0F8AA8]" />
                          <h3 className="text-[15px] font-black tracking-tight text-[#0F172A]">
                            선택 1 (기준)
                          </h3>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="flex items-center justify-between text-[13px] font-bold text-slate-700">
                            <span className="flex items-center gap-1.5">
                              <span>
                                {compareType === "floor"
                                  ? "층수 구간 선택"
                                  : "평형대 구간 선택"}
                              </span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-700">
                                필수
                              </span>
                            </span>
                          </label>
                          <AutocompleteSelect
                            value={getCompareOptionLabel(compareType, compareValue1)}
                            onChange={handleCompareValue1Select}
                            options={compareType === "floor" ? floorCompareOptions : pyeongCompareOptions}
                            placeholder="조건 선택"
                            disabled={!currentComplex}
                            accentColor="teal"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 중앙 VS 배지 (금색) */}
                  <div className="flex items-center justify-center max-[1200px]:py-2">
                    <div className="flex size-12 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#FDE047] via-[#EAB308] to-[#B45309] text-[13px] font-black tracking-widest text-white shadow-[0_6px_18px_rgba(234,179,8,0.4)] ring-2 ring-amber-300">
                      VS
                    </div>
                  </div>

                  {/* 선택 2 카드 */}
                  <div className="flex flex-col justify-between rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] transition-all duration-300 hover:shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4 shrink-0 text-[#6366F1]" />
                          <h3 className="text-[15px] font-black tracking-tight text-[#0F172A]">
                            선택 2 (비교)
                          </h3>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="flex items-center justify-between text-[13px] font-bold text-slate-700">
                            <span className="flex items-center gap-1.5">
                              <span>
                                {compareType === "floor"
                                  ? "층수 구간 선택"
                                  : "평형대 구간 선택"}
                              </span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-700">
                                필수
                              </span>
                            </span>
                          </label>
                          <AutocompleteSelect
                            value={getCompareOptionLabel(compareType, compareValue2)}
                            onChange={handleCompareValue2Select}
                            options={compareType === "floor" ? floorCompareOptions : pyeongCompareOptions}
                            placeholder="조건 선택"
                            disabled={!currentComplex}
                            accentColor="purple"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 비교하기 액션 영역 */}
                  <div className="flex flex-col items-center justify-center rounded-[20px] border border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-50/40 p-4 text-center max-[1200px]:py-6">
                    <button
                      type="button"
                      onClick={handleCompareClick}
                      disabled={
                        !currentComplex ||
                        !compareType ||
                        !compareValue1 ||
                        !compareValue2
                      }
                      className="flex h-[100px] w-full min-w-[130px] flex-col items-center justify-center gap-2 rounded-[12px] bg-[#2563EB] p-4 text-white shadow-[0_6px_20px_rgba(37,99,235,0.3)] transition-all duration-200 hover:bg-[#1D4ED8] hover:shadow-[0_8px_24px_rgba(37,99,235,0.4)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                      <Search className="size-5 stroke-[2.5] text-white" />
                      <span className="text-[14px] font-bold tracking-tight text-white">
                        조회하기
                      </span>
                    </button>
                    <p className="mt-2.5 text-[11px] font-medium leading-tight text-slate-400">
                      비교 조건 지정 후
                      <br />
                      조회하기 클릭
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 자치구/동/단지 선택 단계별 안내 카드 */}
            {!selectedSggCd || !selectedDongCd ? (
              <div className={styles.emptyCard}>
                <div className={styles.emptyIconCircle}>
                  <Building2 className="size-8" />
                </div>
                <h3 className={styles.emptyTitle}>자치구와 자치동을 선택해 주세요</h3>
                <p className={styles.emptySubtitle}>
                  상단의 콤보 박스에서 자치구와 자치동을 차례로 선택하시면, 해당 동에 위치한 아파트 단지 목록이 활성화됩니다.
                </p>
                <div className={styles.guideStepsGrid}>
                  <div className={styles.guideStepCard}>
                    <span className={styles.guideStepNum}>STEP 1</span>
                    <p className={styles.guideStepText}>자치구 선택</p>
                  </div>
                  <div className={styles.guideStepCard}>
                    <span className={styles.guideStepNum}>STEP 2</span>
                    <p className={styles.guideStepText}>자치동 선택</p>
                  </div>
                  <div className={styles.guideStepCard}>
                    <span className={styles.guideStepNum}>STEP 3</span>
                    <p className={styles.guideStepText}>아파트 단지 확인</p>
                  </div>
                </div>
              </div>
            ) : !currentComplex ? (
              <div className={styles.emptyCard}>
                <div className={styles.emptyIconCircle}>
                  <Building2 className="size-8" />
                </div>
                <h3 className={styles.emptyTitle}>아파트 단지를 선택해 주세요</h3>
                <p className={styles.emptySubtitle}>
                  상단의 <strong>Step 3. 아파트 단지 선택</strong> 콤보 박스에서 시세를 조회할 아파트 단지를 선택하시면 실거래 시세 분석 결과가 표시됩니다.
                </p>
              </div>
            ) : (
              /* =========================================================
                  아파트 단지 프로필 정보 (항상 유지) 및 비교 결과 영역
              ========================================================= */
              <div className="space-y-6">
                {/* 1. 단지 상단 프로필 카드 */}
                <div className={styles.profileCard}>
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#F1F5F9] pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#123047] px-3 py-0.5 text-[11px] font-extrabold text-white">
                          아파트 단지
                        </span>
                        <span className="text-[13px] font-semibold text-[#64748B]">
                          {currentComplex.address || `${selectedSgg?.sggNm || ""} ${selectedDongNm}`}
                        </span>
                      </div>
                      <h2 className="mt-2 text-[26px] font-black text-[#0F172A] tracking-tight">
                        {currentComplex.name}
                      </h2>
                    </div>

                    <div className="flex flex-wrap gap-2 text-[12px]">
                      {currentComplex.buildYear ? (
                        <div className="rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2 font-bold text-[#475569]">
                          준공: <span className="text-[#0F172A] font-black">{currentComplex.buildYear}년</span>
                        </div>
                      ) : null}
                      {currentComplex.totalHouseholds ? (
                        <div className="rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2 font-bold text-[#475569]">
                          총 세대수: <span className="text-[#0F172A] font-black">{currentComplex.totalHouseholds.toLocaleString()}세대</span>
                        </div>
                      ) : null}
                      {currentComplex.totalBuildings ? (
                        <div className="rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2 font-bold text-[#475569]">
                          동 수: <span className="text-[#0F172A] font-black">{currentComplex.totalBuildings}개동</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* 평형(전용면적) 목록 뱃지 */}
                  {pyungs && pyungs.length > 0 && (
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <span className="mr-2 text-[12px] font-black text-[#475569]">보유 전용면적:</span>
                      {pyungs.map((p, idx) => (
                        <span
                          key={p.name || idx}
                          className="rounded-[10px] bg-[#F1F5F9] border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-bold text-[#475569]"
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. [비교 모드 활성화 시] 프로필 카드 아래에 1:1 비교 결과 레이아웃 표시 */}
                {isCompareActive && compareAnalysis && (
                  <div className="space-y-6 pt-2">
                    {/* 2-1. 상단 비교 요약 배너 */}
                    <div className={styles.compareSummaryBanner}>
                      <div className={styles.compareSummaryHeader}>
                        <div className={styles.compareBannerTitleArea}>
                          <span className={styles.compareBannerBadge}>비교 분석 모드</span>
                          <h2 className={styles.compareBannerTitle}>
                            {currentComplex.name} · {appliedCompareType === "floor" ? "층수별 비교" : "평형별 비교"}
                          </h2>
                        </div>
                        <button
                          type="button"
                          onClick={handleExitCompare}
                          className={styles.exitCompareBtn}
                        >
                          <X className="size-4" />
                          <span>단지 전체 시세 보기</span>
                        </button>
                      </div>

                      {/* 비교 핵심 인사이트 */}
                      <div className={styles.compareInsightBox}>
                        <div className={styles.compareInsightTitle}>
                          <Sparkles className="inline size-3.5 mr-1" />
                          비교 분석 인사이트
                        </div>
                        <div className={styles.compareInsightText}>
                          {compareAnalysis.diffAvg === 0 ? (
                            <span>
                              <strong>{compareAnalysis.label1}</strong>과{" "}
                              <strong>{compareAnalysis.label2}</strong>의 평균 매매 거래 가격이 동일합니다.
                            </span>
                          ) : compareAnalysis.diffAvg > 0 ? (
                            <span>
                              <strong>{compareAnalysis.label2}</strong>가{" "}
                              <strong>{compareAnalysis.label1}</strong> 대비 평균{" "}
                              <strong className="text-[#38BDF8]">
                                {formatPriceKRW(compareAnalysis.diffAvg)} (+{compareAnalysis.diffAvgPct}%)
                              </strong>{" "}
                              높게 형성되어 있습니다.
                            </span>
                          ) : (
                            <span>
                              <strong>{compareAnalysis.label1}</strong>이{" "}
                              <strong>{compareAnalysis.label2}</strong> 대비 평균{" "}
                              <strong className="text-[#38BDF8]">
                                {formatPriceKRW(Math.abs(compareAnalysis.diffAvg))} ({Math.abs(Number(compareAnalysis.diffAvgPct))}%)
                              </strong>{" "}
                              높게 형성되어 있습니다.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 2-2. 메인: 선택 1 박스 vs 선택 2 박스 1:1 대칭 비교 그리드 */}
                    <div className={styles.dualBoxCompareGrid}>
                      {/* [좌측 박스] 선택 1 (청록 테마) */}
                      <div className={styles.compareMainBox1}>
                        <div className={styles.boxHeader1}>
                          <span className={styles.boxHeaderBadge1}>선택 1</span>
                          <h3 className={styles.boxHeaderName}>{compareAnalysis.label1}</h3>
                        </div>

                        <div className={styles.boxBody}>
                          <div className={styles.boxMetricsStack}>
                            {/* Row 1: 평균 매매가 */}
                            <div className={styles.boxMetricItem}>
                              <span className={styles.boxMetricLabel}>평균 매매가</span>
                              <div className={styles.boxMetricValueArea}>
                                <span className={styles.boxMetricValue1}>
                                  {formatPriceKRW(compareAnalysis.avg1)}
                                </span>
                                {compareAnalysis.diffAvg < 0 ? (
                                  <span className={styles.diffBadgeUp}>
                                    <TrendingUp className="size-3" />
                                    +{Math.abs(Number(compareAnalysis.diffAvgPct))}% 우세
                                  </span>
                                ) : compareAnalysis.diffAvg === 0 ? (
                                  <span className={styles.diffBadgeSame}>동일</span>
                                ) : null}
                              </div>
                            </div>

                            {/* Row 2: 최고 실거래가 */}
                            <div className={styles.boxMetricItem}>
                              <span className={styles.boxMetricLabel}>최고 실거래가</span>
                              <div className={styles.boxMetricValueArea}>
                                <span className={styles.boxMetricValue1}>
                                  {formatPriceKRW(compareAnalysis.max1)}
                                </span>
                              </div>
                            </div>

                            {/* Row 3: 최저 실거래가 */}
                            <div className={styles.boxMetricItem}>
                              <span className={styles.boxMetricLabel}>최저 실거래가</span>
                              <div className={styles.boxMetricValueArea}>
                                <span className={styles.boxMetricValue1}>
                                  {formatPriceKRW(compareAnalysis.min1)}
                                </span>
                              </div>
                            </div>

                            {/* Row 4: 최근 거래 건수 */}
                            <div className={styles.boxMetricItem}>
                              <span className={styles.boxMetricLabel}>최근 거래 건수</span>
                              <div className={styles.boxMetricValueArea}>
                                <span className={styles.boxMetricValue1}>
                                  {compareAnalysis.count1}건
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Row 5: 최근 실거래 상세 내역 테이블 */}
                          <div>
                            <div className={styles.boxSectionTitle}>
                              <span>최근 실거래 상세 내역 ({compareAnalysis.deals1.length}건)</span>
                            </div>
                            <div className={styles.boxTableContainer}>
                              {compareAnalysis.deals1.length === 0 ? (
                                <div className="py-8 text-center text-[12px] text-[#94A3B8]">
                                  해당 조건에 부합하는 최근 실거래 내역이 없습니다.
                                </div>
                              ) : (
                                <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
                                  <table className="w-full text-left text-[12px]">
                                    <thead className="sticky top-0 bg-[#F8FAFC]">
                                      <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                                        <th className="py-2.5 px-3 font-bold">계약일</th>
                                        <th className="py-2.5 px-2 font-bold">층수</th>
                                        <th className="py-2.5 px-2 font-bold">전용면적</th>
                                        <th className="py-2.5 px-3 font-bold text-right">거래금액</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F1F5F9]">
                                      {compareAnalysis.deals1.map((d: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-[#F0FDFA]">
                                          <td className="py-2.5 px-3 font-medium text-[#475569]">{d.deal_date}</td>
                                          <td className="py-2.5 px-2 text-[#475569]">{d.floor}층</td>
                                          <td className="py-2.5 px-2 text-[#475569]">
                                            {d.exclusive_area}㎡{d.pyeong ? ` (${d.pyeong}평)` : ""}
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-extrabold text-[#0F8AA8]">
                                            {formatPriceKRW(d.deal_amount)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* [우측 박스] 선택 2 (보라 테마) */}
                      <div className={styles.compareMainBox2}>
                        <div className={styles.boxHeader2}>
                          <span className={styles.boxHeaderBadge2}>선택 2</span>
                          <h3 className={styles.boxHeaderName}>{compareAnalysis.label2}</h3>
                        </div>

                        <div className={styles.boxBody}>
                          <div className={styles.boxMetricsStack}>
                            {/* Row 1: 평균 매매가 */}
                            <div className={styles.boxMetricItem}>
                              <span className={styles.boxMetricLabel}>평균 매매가</span>
                              <div className={styles.boxMetricValueArea}>
                                <span className={styles.boxMetricValue2}>
                                  {formatPriceKRW(compareAnalysis.avg2)}
                                </span>
                                {compareAnalysis.diffAvg > 0 ? (
                                  <span className={styles.diffBadgeUp}>
                                    <TrendingUp className="size-3" />
                                    +{compareAnalysis.diffAvgPct}% 우세
                                  </span>
                                ) : compareAnalysis.diffAvg === 0 ? (
                                  <span className={styles.diffBadgeSame}>동일</span>
                                ) : null}
                              </div>
                            </div>

                            {/* Row 2: 최고 실거래가 */}
                            <div className={styles.boxMetricItem}>
                              <span className={styles.boxMetricLabel}>최고 실거래가</span>
                              <div className={styles.boxMetricValueArea}>
                                <span className={styles.boxMetricValue2}>
                                  {formatPriceKRW(compareAnalysis.max2)}
                                </span>
                              </div>
                            </div>

                            {/* Row 3: 최저 실거래가 */}
                            <div className={styles.boxMetricItem}>
                              <span className={styles.boxMetricLabel}>최저 실거래가</span>
                              <div className={styles.boxMetricValueArea}>
                                <span className={styles.boxMetricValue2}>
                                  {formatPriceKRW(compareAnalysis.min2)}
                                </span>
                              </div>
                            </div>

                            {/* Row 4: 최근 거래 건수 */}
                            <div className={styles.boxMetricItem}>
                              <span className={styles.boxMetricLabel}>최근 거래 건수</span>
                              <div className={styles.boxMetricValueArea}>
                                <span className={styles.boxMetricValue2}>
                                  {compareAnalysis.count2}건
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Row 5: 최근 실거래 상세 내역 테이블 */}
                          <div>
                            <div className={styles.boxSectionTitle}>
                              <span>최근 실거래 상세 내역 ({compareAnalysis.deals2.length}건)</span>
                            </div>
                            <div className={styles.boxTableContainer}>
                              {compareAnalysis.deals2.length === 0 ? (
                                <div className="py-8 text-center text-[12px] text-[#94A3B8]">
                                  해당 조건에 부합하는 최근 실거래 내역이 없습니다.
                                </div>
                              ) : (
                                <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
                                  <table className="w-full text-left text-[12px]">
                                    <thead className="sticky top-0 bg-[#F8FAFC]">
                                      <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                                        <th className="py-2.5 px-3 font-bold">계약일</th>
                                        <th className="py-2.5 px-2 font-bold">층수</th>
                                        <th className="py-2.5 px-2 font-bold">전용면적</th>
                                        <th className="py-2.5 px-3 font-bold text-right">거래금액</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F1F5F9]">
                                      {compareAnalysis.deals2.map((d: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-[#F5F3FF]">
                                          <td className="py-2.5 px-3 font-medium text-[#475569]">{d.deal_date}</td>
                                          <td className="py-2.5 px-2 text-[#475569]">{d.floor}층</td>
                                          <td className="py-2.5 px-2 text-[#475569]">
                                            {d.exclusive_area}㎡{d.pyeong ? ` (${d.pyeong}평)` : ""}
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-extrabold text-[#6366F1]">
                                            {formatPriceKRW(d.deal_amount)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2-3. 하단: 최근 12개월 시세 추이 통합 꺾은선 비교 차트 */}
                    <div className="rounded-[24px] border border-slate-200/90 bg-white p-7 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 items-center justify-center rounded-xl bg-[#0F8AA8]/10 text-[#0F8AA8]">
                            <TrendingUp className="size-4" />
                          </div>
                          <div>
                            <h3 className="text-[16px] font-black text-slate-900">
                              최근 12개월 시세 추이 비교
                            </h3>
                            <p className="text-[12px] font-medium text-slate-500">
                              {currentComplex.name} · {compareAnalysis.label1} vs {compareAnalysis.label2} 시세 변동 비교
                            </p>
                          </div>
                        </div>

                        {/* 범례 뱃지 */}
                        <div className="flex flex-wrap items-center gap-4 text-[13px]">
                          <div className="flex items-center gap-2">
                            <span className="size-3 rounded-full bg-[#0F8AA8]" />
                            <span className="font-extrabold text-slate-700">
                              선택 1 ({compareAnalysis.label1}):
                            </span>
                            <span className="font-black text-[#0F8AA8]">
                              {formatPriceKRW(compareAnalysis.avg1)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="size-3 rounded-full bg-[#6366F1]" />
                            <span className="font-extrabold text-slate-700">
                              선택 2 ({compareAnalysis.label2}):
                            </span>
                            <span className="font-black text-[#6366F1]">
                              {formatPriceKRW(compareAnalysis.avg2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="min-h-[280px] w-full">
                        {combinedChartData.length > 1 ? (
                          <Chart
                            chartType="LineChart"
                            width="100%"
                            height="280px"
                            data={combinedChartData}
                            options={combinedChartOptions}
                            loader={
                              <div className="flex h-[280px] items-center justify-center text-[12px] font-medium text-slate-400">
                                시세 추이 차트 불러오는 중...
                              </div>
                            }
                          />
                        ) : (
                          <div className="flex h-[280px] items-center justify-center text-[12px] text-slate-400">
                            추이 데이터를 불러오는 중입니다.
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                        <span>* 최근 실거래 기반 2주/월 단위 평균 거래가 추이</span>
                        <span className="font-semibold text-slate-500">(단위: 만 원)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </SectionSidebarLayout>
  );
}
