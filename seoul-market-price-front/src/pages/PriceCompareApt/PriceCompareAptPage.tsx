import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowUpRight,
  Award,
  BarChart3,
  Building,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Coins,
  HelpCircle,
  Info,
  Layers,
  Loader2,
  Map,
  MapPin,
  Maximize2,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import apiMiddleware from "../../api/middleware";
import Header from "@/components/Header";

/* 1. 타입 정의 */

/* 서울 자치구 항목 */
export interface SggLocationItem {
  sggCd: string;
  sggNm: string;
}

/* 서울 자치동 항목 */
export interface DongLocationItem {
  dongCd?: string;
  dongNm: string;
  sggCd?: string;
}

/* 아파트 단지 기본 정보 */
export interface ApartmentComplexItem {
  complexNo: string | number;
  complexName: string;
  sggNm: string;
  dongNm: string;
  address?: string;
  totalHouseholds?: number;
  buildYear?: number;
  imageUrl?: string;
}

/* 단지 핵심 시세 및 스펙 지표 */
export interface ApartmentCompareMetrics {
  avgPrice: number;
  recentPrice: number;
  recent3MonthVolume: number;
  totalHouseholds: number;
  buildYear: number;
  pricePerPyeong: number;
}

/* 아파트 단지 상세 정보 */
export interface ApartmentDetailData {
  name: string;
  district: string;
  dong: string;
  address: string;
  totalHouseholds: number;
  buildYear: number;
  floorInfo: string;
  parkingPerHousehold: number;
  imageUrl: string;
  metrics: ApartmentCompareMetrics;
}

/* 최근 3년 매매가 추이 포인트 */
export interface ApartmentCompareTrendPoint {
  date: string;
  apt1Price: number;
  apt2Price: number;
}

/* 면적별 평균 매매가 항목 */
export interface ApartmentCompareAreaPrice {
  areaName: string;
  apt1Price: number;
  apt2Price: number;
}

/* 비교 대상 단지 파라미터 */
export interface ApartmentTargetParam {
  district: string;
  dong: string;
  complexName: string;
}

/* 아파트별 시세 비교 요청 DTO */
export interface ApartmentCompareRequest {
  apt1: ApartmentTargetParam;
  apt2: ApartmentTargetParam;
}

/* 아파트별 시세 비교 응답 DTO */
export interface ApartmentCompareApiResponse {
  apt1: ApartmentDetailData;
  apt2: ApartmentDetailData;
  yearlyTrends: ApartmentCompareTrendPoint[];
  areaPrices: ApartmentCompareAreaPrice[];
  baseDate: string;
}

/* 오토컴플리트 옵션 */
export interface AutocompleteOption {
  label: string;
  value: string;
  code?: string;
  extra?: string;
}

/* 2. 유틸리티 & API 연동 함수 */

/* 금액 포맷터 */
function formatPriceKRW(priceInEok: number): string {
  const eok = Math.floor(priceInEok);
  const remainderMan = Math.round((priceInEok - eok) * 10000);
  if (remainderMan === 0) return `${eok}억 원`;
  return `${eok}억 ${remainderMan.toLocaleString()}만 원`;
}

/* 서울 자치구 목록 조회 API (GET /api/location/sggs) */
async function fetchSggsApi(): Promise<SggLocationItem[]> {
  try {
    const response = await apiMiddleware.get<unknown>("/api/location/sggs");
    const raw = response.data;
    const list = Array.isArray(raw)
      ? raw
      : ((raw as Record<string, unknown>)?.data ??
          (raw as Record<string, unknown>)?.sggs ??
          (raw as Record<string, unknown>)?.items ??
          []) as unknown[];

    return list.map((item) => {
      if (typeof item === "string") return { sggCd: item, sggNm: item };
      const obj = item as Record<string, unknown>;
      return {
        sggCd: String(obj.sggCd ?? obj.code ?? obj.sggCode ?? obj.id ?? obj.sggNm ?? ""),
        sggNm: String(obj.sggNm ?? obj.name ?? obj.sggName ?? obj.label ?? obj.sgg ?? ""),
      };
    });
  } catch (err) {
    console.error("자치구 목록 조회 실패:", err);
    return [];
  }
}

/* 서울 자치동 목록 조회 API (GET /api/location/dongs) */
async function fetchDongsApi(
  sggCd: string,
  districtName?: string,
): Promise<DongLocationItem[]> {
  if (!sggCd && !districtName) return [];
  try {
    const response = await apiMiddleware.get<unknown>("/api/location/dongs", {
      params: { sggCd: sggCd || districtName },
    });
    const raw = response.data;
    const list = Array.isArray(raw)
      ? raw
      : ((raw as Record<string, unknown>)?.data ??
          (raw as Record<string, unknown>)?.dongs ??
          (raw as Record<string, unknown>)?.items ??
          []) as unknown[];

    return list.map((item) => {
      if (typeof item === "string") return { dongNm: item };
      const obj = item as Record<string, unknown>;
      return {
        dongCd: obj.dongCd ? String(obj.dongCd) : undefined,
        dongNm: String(obj.dongNm ?? obj.name ?? obj.dongName ?? obj.label ?? obj.dong ?? ""),
        sggCd: obj.sggCd ? String(obj.sggCd) : undefined,
      };
    });
  } catch (err) {
    console.error("자치동 목록 조회 실패:", err);
    return [];
  }
}

/* 아파트 단지 목록 조회 API (GET /api/location/apartments) */
async function fetchApartmentsApi(
  district: string,
  dong: string,
): Promise<ApartmentComplexItem[]> {
  if (!district) return [];
  try {
    const response = await apiMiddleware.get<ApartmentComplexItem[]>(
      "/api/location/apartments",
      { params: { district, dong } },
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    console.error("단지 목록 조회 실패:", err);
    return [];
  }
}

/* 아파트별 비교 데이터 조회 API (GET /api/v1/price/compare-apartment) */
async function fetchApartmentCompareApi(
  payload: ApartmentCompareRequest,
): Promise<ApartmentCompareApiResponse> {
  const response = await apiMiddleware.get<ApartmentCompareApiResponse>(
    "/api/v1/price/compare-apartment",
    {
      params: {
        apt1District: payload.apt1.district,
        apt1Dong: payload.apt1.dong,
        apt1Name: payload.apt1.complexName,
        apt2District: payload.apt2.district,
        apt2Dong: payload.apt2.dong,
        apt2Name: payload.apt2.complexName,
      },
    },
  );
  return response.data;
}

/* 3. 커스텀 훅 */

/* 행정구역 및 아파트 단지 목록 조회 훅 */
function useLocationAndApartmentQuery(
  r1District: string,
  r1SggCd: string,
  r1Dong: string,
  r2District: string,
  r2SggCd: string,
  r2Dong: string,
) {
  /* 자치구 목록 조회 */
  const { data: sggList = [], isLoading: isSggLoading } = useQuery({
    queryKey: ["locationSggs"],
    queryFn: fetchSggsApi,
    staleTime: Infinity,
  });

  const sggOptions: AutocompleteOption[] = useMemo(() => {
    return [...sggList]
      .sort((a, b) => a.sggNm.localeCompare(b.sggNm, "ko"))
      .map((item) => ({
        label: item.sggNm,
        value: item.sggNm,
        code: item.sggCd,
      }));
  }, [sggList]);

  /* 자치동 목록 조회 (아파트 1 / 2) */
  const { data: r1Dongs = [], isLoading: isR1DongLoading } = useQuery({
    queryKey: ["locationDongs", r1SggCd, r1District],
    queryFn: () => fetchDongsApi(r1SggCd, r1District),
    enabled: !!r1District,
  });

  const { data: r2Dongs = [], isLoading: isR2DongLoading } = useQuery({
    queryKey: ["locationDongs", r2SggCd, r2District],
    queryFn: () => fetchDongsApi(r2SggCd, r2District),
    enabled: !!r2District,
  });

  const r1DongOptions: AutocompleteOption[] = useMemo(() => {
    return r1Dongs.map((d) => ({
      label: d.dongNm,
      value: d.dongNm,
      code: d.dongCd,
    }));
  }, [r1Dongs]);

  const r2DongOptions: AutocompleteOption[] = useMemo(() => {
    return r2Dongs.map((d) => ({
      label: d.dongNm,
      value: d.dongNm,
      code: d.dongCd,
    }));
  }, [r2Dongs]);

  /* 아파트 단지 목록 조회 (아파트 1 / 2) */
  const { data: r1Apartments = [], isLoading: isR1AptLoading } = useQuery({
    queryKey: ["locationApartments", r1District, r1Dong],
    queryFn: () => fetchApartmentsApi(r1District, r1Dong),
    enabled: !!r1District,
  });

  const { data: r2Apartments = [], isLoading: isR2AptLoading } = useQuery({
    queryKey: ["locationApartments", r2District, r2Dong],
    queryFn: () => fetchApartmentsApi(r2District, r2Dong),
    enabled: !!r2District,
  });

  const r1AptOptions: AutocompleteOption[] = useMemo(() => {
    return r1Apartments.map((apt) => ({
      label: apt.complexName,
      value: String(apt.complexNo || apt.complexName),
      extra: `${apt.dongNm || ""} · ${apt.totalHouseholds || ""}세대`,
    }));
  }, [r1Apartments]);

  const r2AptOptions: AutocompleteOption[] = useMemo(() => {
    return r2Apartments.map((apt) => ({
      label: apt.complexName,
      value: String(apt.complexNo || apt.complexName),
      extra: `${apt.dongNm || ""} · ${apt.totalHouseholds || ""}세대`,
    }));
  }, [r2Apartments]);

  return {
    sggOptions,
    r1DongOptions,
    r2DongOptions,
    r1AptOptions,
    r2AptOptions,
    isSggLoading,
    isR1DongLoading,
    isR2DongLoading,
    isR1AptLoading,
    isR2AptLoading,
  };
}

/* 아파트 비교 뮤테이션 훅 */
function useApartmentCompareMutation() {
  return useMutation({
    mutationFn: fetchApartmentCompareApi,
  });
}

/* 4. UI 서브 컴포넌트 */

/* 사이드바 내비게이션 */
function SidebarNav() {
  return (
    <aside className="w-[240px] shrink-0 max-[900px]:w-full">
      <div className="sticky top-[96px] rounded-[16px] border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
        <h2 className="mb-4 text-[16px] font-black text-[#0F172A]">가격정보</h2>

        <nav className="flex flex-col gap-1" aria-label="가격정보 메뉴">
          <Link
            to="/price/compare-list"
            className="flex items-center gap-2.5 rounded-[10px] px-3.5 py-3 text-[13px] font-semibold text-[#64748B] no-underline hover:bg-[#F1F5F9] hover:text-[#0F172A]"
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
            className="flex items-center gap-2.5 rounded-[10px] bg-[#E8F6F9] px-3.5 py-3 text-[13px] font-extrabold text-[#0F8AA8] no-underline"
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
            비교할 두 아파트의 자치구, 자치동, 단지명을 선택하고
            &apos;단지 비교하기&apos; 버튼을 누르면 실거래가, 세대수, 3년 가격 추이와
            평형별 시세를 한눈에 비교할 수 있습니다.
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

/* 오토컴플리트 드롭다운 */
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

  /* 검색어 필터링 */
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

  /* 외부 클릭 시 닫기 */
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

  /* 방향키 이동 시 자동 스크롤 */
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
              const isSelected = opt.label === value;
              const isHighlighted = idx === activeHighlightedIndex;

              return (
                <button
                  key={`${opt.value}-${idx}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(opt.label, opt);
                    setSearchQuery(null);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-left text-[13px] transition-colors cursor-pointer",
                    isSelected
                      ? selectedBg
                      : isHighlighted
                        ? "bg-[#F8FAFC] text-[#0F172A]"
                        : "text-[#334155] hover:bg-[#F8FAFC]",
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      <HighlightMatch
                        text={opt.label}
                        query={searchQuery || ""}
                      />
                    </span>
                    {opt.extra && (
                      <span className="text-[11px] text-[#94A3B8]">
                        {opt.extra}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="size-4 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* 아파트 선택 카드 컴포넌트 */
interface ApartmentSelectCardProps {
  aptNum: 1 | 2;
  title: string;
  district: string;
  dong: string;
  complexName: string;
  sggOptions: AutocompleteOption[];
  dongOptions: AutocompleteOption[];
  aptOptions: AutocompleteOption[];
  isSggLoading: boolean;
  isDongLoading: boolean;
  isAptLoading: boolean;
  onDistrictChange: (district: string) => void;
  onDongChange: (dong: string) => void;
  onComplexChange: (complex: string) => void;
}

function ApartmentSelectCard({
  aptNum,
  title,
  district,
  dong,
  complexName,
  sggOptions,
  dongOptions,
  aptOptions,
  isSggLoading,
  isDongLoading,
  isAptLoading,
  onDistrictChange,
  onDongChange,
  onComplexChange,
}: ApartmentSelectCardProps) {
  const isApt1 = aptNum === 1;
  const accentColor = isApt1 ? "blue" : "green";

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-[20px] border p-6 shadow-sm transition-all",
        isApt1
          ? "border-[#2563EB]/25 bg-gradient-to-b from-[#F0F6FF] to-white"
          : "border-[#16A34A]/25 bg-gradient-to-b from-[#F0FDF4] to-white",
      )}
    >
      <div>
        <div className="mb-4 flex items-center justify-between">
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[12px] font-black text-white shadow-sm",
              isApt1 ? "bg-[#2563EB]" : "bg-[#16A34A]",
            )}
          >
            <Building className="size-3.5" />
            {title}
          </span>
          {complexName && (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-bold truncate max-w-[160px]",
                isApt1
                  ? "bg-[#DBEAFE] text-[#1D4ED8]"
                  : "bg-[#DCFCE7] text-[#15803D]",
              )}
            >
              {complexName}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {/* 자치구 */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-[13px] font-bold text-[#334155]">
              <span>자치구</span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-extrabold",
                  isApt1 ? "bg-[#DBEAFE] text-[#1D4ED8]" : "bg-[#DCFCE7] text-[#15803D]",
                )}
              >
                필수
              </span>
            </label>
            <AutocompleteSelect
              value={district}
              onChange={onDistrictChange}
              options={sggOptions}
              placeholder={
                isSggLoading
                  ? "자치구 목록 로딩 중..."
                  : isApt1
                    ? "자치구 검색 (예: 서초구)"
                    : "자치구 검색 (예: 강남구)"
              }
              disabled={isSggLoading}
              accentColor={accentColor}
            />
          </div>

          {/* 자치동 */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-[13px] font-bold text-[#334155]">
              <span>자치동</span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-extrabold",
                  isApt1 ? "bg-[#DBEAFE] text-[#1D4ED8]" : "bg-[#DCFCE7] text-[#15803D]",
                )}
              >
                필수
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
                    ? "동 목록 로딩 중..."
                    : isApt1
                      ? "자치동 검색 (예: 반포동)"
                      : "자치동 검색 (예: 대치동)"
              }
              disabled={!district || isDongLoading}
              accentColor={accentColor}
            />
          </div>

          {/* 아파트 단지 */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-[13px] font-bold text-[#334155]">
              <span>아파트 단지</span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-extrabold",
                  isApt1 ? "bg-[#DBEAFE] text-[#1D4ED8]" : "bg-[#DCFCE7] text-[#15803D]",
                )}
              >
                필수
              </span>
            </label>
            <AutocompleteSelect
              value={complexName}
              onChange={onComplexChange}
              options={aptOptions}
              placeholder={
                !district
                  ? "지역을 먼저 선택하세요"
                  : isAptLoading
                    ? "단지 목록 로딩 중..."
                    : isApt1
                      ? "단지명 검색 (예: 래미안 원베일리)"
                      : "단지명 검색 (예: 래미안 대치 팰리스)"
              }
              disabled={!district || isAptLoading}
              accentColor={accentColor}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* 아파트 프로필 & 5대 핵심 비교 지표 표 */
interface ApartmentProfileComparisonProps {
  apt1: ApartmentDetailData;
  apt2: ApartmentDetailData;
}

function ApartmentProfileComparison({
  apt1,
  apt2,
}: ApartmentProfileComparisonProps) {
  const { avgDiff, recentDiff, volDiff, householdDiff, yearDiff } = useMemo(() => {
    return {
      avgDiff: Number((apt1.metrics.avgPrice - apt2.metrics.avgPrice).toFixed(1)),
      recentDiff: Number((apt1.metrics.recentPrice - apt2.metrics.recentPrice).toFixed(1)),
      volDiff: apt1.metrics.recent3MonthVolume - apt2.metrics.recent3MonthVolume,
      householdDiff: apt1.metrics.totalHouseholds - apt2.metrics.totalHouseholds,
      yearDiff: apt1.metrics.buildYear - apt2.metrics.buildYear,
    };
  }, [apt1.metrics, apt2.metrics]);

  return (
    <div className="flex flex-col gap-6">
      {/* 아파트 대표 사진 & 기본 정보 카드 */}
      <div className="grid grid-cols-2 gap-6 max-[1024px]:grid-cols-1">
        {/* 아파트 1 프로필 */}
        <div className="overflow-hidden rounded-[20px] border border-[#2563EB]/30 bg-white shadow-sm transition-all hover:shadow-md">
          <div className="relative h-48 w-full bg-[#1E293B]">
            <img
              src={apt1.imageUrl}
              alt={apt1.name}
              className="h-full w-full object-cover opacity-90 transition-transform duration-500 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute left-4 top-4">
              <span className="flex items-center gap-1.5 rounded-full bg-[#2563EB] px-3 py-1 text-[12px] font-black text-white shadow-md">
                <Building className="size-3.5" />
                아파트 1 (기준)
              </span>
            </div>
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <div className="flex items-center gap-2 text-[12px] font-medium text-slate-300">
                <MapPin className="size-3.5 text-[#60A5FA]" />
                <span>
                  {apt1.district} {apt1.dong}
                </span>
              </div>
              <h2 className="mt-1 text-[22px] font-black tracking-tight text-white">
                {apt1.name}
              </h2>
            </div>
          </div>

          <div className="p-5">
            <div className="mb-4 flex items-center justify-between border-b border-[#F1F5F9] pb-3 text-[12px] text-[#64748B]">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-[#94A3B8]" />
                {apt1.address}
              </span>
              <span className="font-semibold text-[#0F172A]">
                {apt1.floorInfo}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[12px] bg-[#EFF6FF] p-3.5">
                <span className="text-[11px] font-bold text-[#3B82F6]">
                  총 세대수
                </span>
                <div className="mt-1 flex items-baseline gap-1 text-[18px] font-black text-[#1E3A8A]">
                  {apt1.totalHouseholds.toLocaleString()}
                  <span className="text-[12px] font-bold text-[#64748B]">세대</span>
                </div>
              </div>
              <div className="rounded-[12px] bg-[#EFF6FF] p-3.5">
                <span className="text-[11px] font-bold text-[#3B82F6]">
                  준공 연도
                </span>
                <div className="mt-1 flex items-baseline gap-1 text-[18px] font-black text-[#1E3A8A]">
                  {apt1.buildYear}
                  <span className="text-[12px] font-bold text-[#64748B]">년</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 아파트 2 프로필 */}
        <div className="overflow-hidden rounded-[20px] border border-[#16A34A]/30 bg-white shadow-sm transition-all hover:shadow-md">
          <div className="relative h-48 w-full bg-[#1E293B]">
            <img
              src={apt2.imageUrl}
              alt={apt2.name}
              className="h-full w-full object-cover opacity-90 transition-transform duration-500 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute left-4 top-4">
              <span className="flex items-center gap-1.5 rounded-full bg-[#16A34A] px-3 py-1 text-[12px] font-black text-white shadow-md">
                <Building className="size-3.5" />
                아파트 2 (비교)
              </span>
            </div>
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <div className="flex items-center gap-2 text-[12px] font-medium text-slate-300">
                <MapPin className="size-3.5 text-[#4ADE80]" />
                <span>
                  {apt2.district} {apt2.dong}
                </span>
              </div>
              <h2 className="mt-1 text-[22px] font-black tracking-tight text-white">
                {apt2.name}
              </h2>
            </div>
          </div>

          <div className="p-5">
            <div className="mb-4 flex items-center justify-between border-b border-[#F1F5F9] pb-3 text-[12px] text-[#64748B]">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-[#94A3B8]" />
                {apt2.address}
              </span>
              <span className="font-semibold text-[#0F172A]">
                {apt2.floorInfo}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[12px] bg-[#F0FDF4] p-3.5">
                <span className="text-[11px] font-bold text-[#16A34A]">
                  총 세대수
                </span>
                <div className="mt-1 flex items-baseline gap-1 text-[18px] font-black text-[#14532D]">
                  {apt2.totalHouseholds.toLocaleString()}
                  <span className="text-[12px] font-bold text-[#64748B]">세대</span>
                </div>
              </div>
              <div className="rounded-[12px] bg-[#F0FDF4] p-3.5">
                <span className="text-[11px] font-bold text-[#16A34A]">
                  준공 연도
                </span>
                <div className="mt-1 flex items-baseline gap-1 text-[18px] font-black text-[#14532D]">
                  {apt2.buildYear}
                  <span className="text-[12px] font-bold text-[#64748B]">년</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5대 핵심 항목 비교 표 */}
      <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
        <div className="mb-5 flex items-center justify-between border-b border-[#F1F5F9] pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-[#0F8AA8]" />
            <h3 className="text-[17px] font-black text-[#0F172A]">
              핵심 시세 및 단지 지표 비교
            </h3>
          </div>
          <span className="text-[12px] font-bold text-[#64748B]">
            국토교통부 실거래가 기준
          </span>
        </div>

        <div className="overflow-hidden rounded-[16px] border border-[#CBD5E1] shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#CBD5E1] bg-[#F1F5F9] text-[13px] font-black text-[#334155]">
                  <th className="w-[22%] border-r border-[#CBD5E1] p-3.5 text-center">비교 항목</th>
                  <th className="w-[26%] border-r border-[#CBD5E1] bg-[#EFF6FF] p-3.5 text-center text-[#1E40AF]">
                    <span className="mr-1.5 inline-block rounded-full bg-[#2563EB] px-2.5 py-0.5 text-[11px] font-black text-white">
                      아파트 1
                    </span>
                    {apt1.name}
                  </th>
                  <th className="w-[26%] border-r border-[#CBD5E1] bg-[#F0FDF4] p-3.5 text-center text-[#15803D]">
                    <span className="mr-1.5 inline-block rounded-full bg-[#16A34A] px-2.5 py-0.5 text-[11px] font-black text-white">
                      아파트 2
                    </span>
                    {apt2.name}
                  </th>
                  <th className="w-[26%] bg-[#F8FAFC] p-3.5 text-center text-[#475569]">격차 및 우위 분석</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CBD5E1] font-medium text-[#0F172A]">
                {/* 1. 평균 매매가 */}
                <tr className="transition-colors hover:bg-[#F8FAFC]">
                  <td className="border-r border-[#CBD5E1] bg-[#F8FAFC] p-3.5 font-bold text-[#334155]">
                    <div className="flex items-center gap-2">
                      <Coins className="size-4 text-[#F59E0B]" />
                      <span>평균 매매가 (84㎡)</span>
                    </div>
                  </td>
                  <td className="border-r border-[#CBD5E1] bg-white p-3.5 text-center text-[15px] font-black text-[#1E3A8A]">
                    {formatPriceKRW(apt1.metrics.avgPrice)}
                  </td>
                  <td className="border-r border-[#CBD5E1] bg-white p-3.5 text-center text-[15px] font-black text-[#14532D]">
                    {formatPriceKRW(apt2.metrics.avgPrice)}
                  </td>
                  <td className="bg-white p-3.5 text-center">
                    {avgDiff === 0 ? (
                      <span className="font-bold text-[#64748B]">시세 동일</span>
                    ) : (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black shadow-xs",
                          avgDiff > 0
                            ? "border border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]"
                            : "border border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A]",
                        )}
                      >
                        <ArrowUpRight className="size-3.5" />
                        {avgDiff > 0
                          ? `${apt1.name} +${Math.abs(avgDiff)}억 높음`
                          : `${apt2.name} +${Math.abs(avgDiff)}억 높음`}
                      </span>
                    )}
                  </td>
                </tr>

                {/* 2. 최근 실거래가 */}
                <tr className="transition-colors hover:bg-[#F8FAFC]">
                  <td className="border-r border-[#CBD5E1] bg-[#F8FAFC] p-3.5 font-bold text-[#334155]">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="size-4 text-[#0F8AA8]" />
                      <span>최근 실거래가</span>
                    </div>
                  </td>
                  <td className="border-r border-[#CBD5E1] bg-white p-3.5 text-center text-[15px] font-black text-[#0F172A]">
                    {formatPriceKRW(apt1.metrics.recentPrice)}
                  </td>
                  <td className="border-r border-[#CBD5E1] bg-white p-3.5 text-center text-[15px] font-black text-[#0F172A]">
                    {formatPriceKRW(apt2.metrics.recentPrice)}
                  </td>
                  <td className="bg-white p-3.5 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-bold",
                        recentDiff > 0
                          ? "border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]"
                          : "border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A]",
                      )}
                    >
                      격차 {Math.abs(recentDiff)}억 원
                    </span>
                  </td>
                </tr>

                {/* 3. 최근 3개월 거래량 */}
                <tr className="transition-colors hover:bg-[#F8FAFC]">
                  <td className="border-r border-[#CBD5E1] bg-[#F8FAFC] p-3.5 font-bold text-[#334155]">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="size-4 text-[#6366F1]" />
                      <span>최근 3개월 거래량</span>
                    </div>
                  </td>
                  <td className="border-r border-[#CBD5E1] bg-white p-3.5 text-center font-black text-[#0F172A]">
                    {apt1.metrics.recent3MonthVolume}건
                  </td>
                  <td className="border-r border-[#CBD5E1] bg-white p-3.5 text-center font-black text-[#0F172A]">
                    {apt2.metrics.recent3MonthVolume}건
                  </td>
                  <td className="bg-white p-3.5 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-bold",
                        volDiff >= 0
                          ? "border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]"
                          : "border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A]",
                      )}
                    >
                      {volDiff >= 0
                        ? `${apt1.name} +${volDiff}건 더 활발`
                        : `${apt2.name} +${Math.abs(volDiff)}건 더 활발`}
                    </span>
                  </td>
                </tr>

                {/* 4. 총 세대수 */}
                <tr className="transition-colors hover:bg-[#F8FAFC]">
                  <td className="border-r border-[#CBD5E1] bg-[#F8FAFC] p-3.5 font-bold text-[#334155]">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-[#10B981]" />
                      <span>단지 규모 (총 세대수)</span>
                    </div>
                  </td>
                  <td className="border-r border-[#CBD5E1] bg-white p-3.5 text-center font-black text-[#0F172A]">
                    {apt1.metrics.totalHouseholds.toLocaleString()}세대
                  </td>
                  <td className="border-r border-[#CBD5E1] bg-white p-3.5 text-center font-black text-[#0F172A]">
                    {apt2.metrics.totalHouseholds.toLocaleString()}세대
                  </td>
                  <td className="bg-white p-3.5 text-center">
                    <span className="inline-block rounded-full border border-[#CBD5E1] bg-[#F1F5F9] px-3 py-1 text-[11px] font-bold text-[#475569]">
                      {householdDiff >= 0
                        ? `${apt1.name} +${householdDiff.toLocaleString()}세대`
                        : `${apt2.name} +${Math.abs(householdDiff).toLocaleString()}세대`}
                    </span>
                  </td>
                </tr>

                {/* 5. 준공 연도 */}
                <tr className="transition-colors hover:bg-[#F8FAFC]">
                  <td className="border-r border-[#CBD5E1] bg-[#F8FAFC] p-3.5 font-bold text-[#334155]">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4 text-[#8B5CF6]" />
                      <span>준공 연도 (연식)</span>
                    </div>
                  </td>
                  <td className="border-r border-[#CBD5E1] bg-white p-3.5 text-center font-black text-[#0F172A]">
                    {apt1.metrics.buildYear}년 ({2026 - apt1.metrics.buildYear}년차)
                  </td>
                  <td className="border-r border-[#CBD5E1] bg-white p-3.5 text-center font-black text-[#0F172A]">
                    {apt2.metrics.buildYear}년 ({2026 - apt2.metrics.buildYear}년차)
                  </td>
                  <td className="bg-white p-3.5 text-center">
                    <span className="inline-block rounded-full border border-[#CBD5E1] bg-[#F1F5F9] px-3 py-1 text-[11px] font-bold text-[#475569]">
                      {yearDiff > 0
                        ? `${apt1.name} ${yearDiff}년 더 신축`
                        : yearDiff < 0
                          ? `${apt2.name} ${Math.abs(yearDiff)}년 더 신축`
                          : "동일 연식"}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 최근 3년 매매가 추이그래프 */
interface PriceTrendChartProps {
  apt1: ApartmentDetailData;
  apt2: ApartmentDetailData;
  yearlyTrends: ApartmentCompareTrendPoint[];
}

function PriceTrendChart({
  apt1,
  apt2,
  yearlyTrends,
}: PriceTrendChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<ApartmentCompareTrendPoint | null>(null);

  const svgWidth = 500;
  const svgHeight = 220;
  const paddingX = 32;
  const paddingY = 25;

  const {
    maxVal,
    range,
    chartH,
    apt1Points,
    apt2Points,
    apt1Path,
    apt2Path,
    p1Rate,
    p2Rate,
  } = useMemo(() => {
    const allPrices = yearlyTrends.flatMap((p) => [p.apt1Price, p.apt2Price]);
    const min = Math.floor(Math.min(...(allPrices.length ? allPrices : [0])) * 0.92);
    const max = Math.ceil(Math.max(...(allPrices.length ? allPrices : [10])) * 1.06);
    const r = max - min || 1;
    const cw = svgWidth - paddingX * 2;
    const ch = svgHeight - paddingY * 2;

    const getCoords = (price: number, index: number) => {
      const x = paddingX + (index / Math.max(1, yearlyTrends.length - 1)) * cw;
      const y = svgHeight - paddingY - ((price - min) / r) * ch;
      return { x, y };
    };

    const pts1 = yearlyTrends.map((p, idx) => getCoords(p.apt1Price, idx));
    const pts2 = yearlyTrends.map((p, idx) => getCoords(p.apt2Price, idx));

    const path1 = pts1.map((pt, idx) => `${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");
    const path2 = pts2.map((pt, idx) => `${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");

    const p1Start = yearlyTrends[0]?.apt1Price || 1;
    const p1End = yearlyTrends[yearlyTrends.length - 1]?.apt1Price || 1;
    const rate1 = (((p1End - p1Start) / p1Start) * 100).toFixed(1);

    const p2Start = yearlyTrends[0]?.apt2Price || 1;
    const p2End = yearlyTrends[yearlyTrends.length - 1]?.apt2Price || 1;
    const rate2 = (((p2End - p2Start) / p2Start) * 100).toFixed(1);

    return {
      minVal: min,
      maxVal: max,
      range: r,
      chartW: cw,
      chartH: ch,
      apt1Points: pts1,
      apt2Points: pts2,
      apt1Path: path1,
      apt2Path: path2,
      p1Rate: rate1,
      p2Rate: rate2,
    };
  }, [yearlyTrends]);

  return (
    <div className="flex h-full flex-col rounded-[20px] border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
      <div className="mb-4 flex flex-col gap-2 border-b border-[#F1F5F9] pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-[#0F8AA8]" />
            <h3 className="text-[16px] font-black text-[#0F172A]">
              최근 3년 매매가 추이
            </h3>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 rounded-[8px] bg-[#EFF6FF] px-2.5 py-1">
            <span className="size-2.5 rounded-full bg-[#2563EB]" />
            <span className="font-extrabold text-[#1E40AF]">
              {apt1.name} ({Number(p1Rate) >= 0 ? `+${p1Rate}%` : `${p1Rate}%`})
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-[8px] bg-[#F0FDF4] px-2.5 py-1">
            <span className="size-2.5 rounded-full bg-[#16A34A]" />
            <span className="font-extrabold text-[#15803D]">
              {apt2.name} ({Number(p2Rate) >= 0 ? `+${p2Rate}%` : `${p2Rate}%`})
            </span>
          </div>
        </div>
      </div>

      <div className="relative flex-1">
        {hoveredPoint && (
          <div className="absolute right-2 top-1 z-20 flex items-center gap-2 rounded-[10px] border border-[#CBD5E1] bg-white/95 px-3 py-1.5 text-[11px] shadow-md backdrop-blur-sm">
            <span className="font-black text-[#0F172A]">{hoveredPoint.date}</span>
            <span className="font-bold text-[#2563EB]">{hoveredPoint.apt1Price}억</span>
            <span className="font-bold text-[#16A34A]">{hoveredPoint.apt2Price}억</span>
          </div>
        )}

        <div className="w-full">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="h-[230px] w-full">
            {/* 가이드라인 */}
            {[0, 0.33, 0.66, 1].map((ratio) => {
              const y = paddingY + ratio * chartH;
              const priceLabel = (maxVal - ratio * range).toFixed(0);
              return (
                <g key={`grid-${ratio}`}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={svgWidth - paddingX}
                    y2={y}
                    stroke="#F1F5F9"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={paddingX - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-[#94A3B8] text-[9px] font-bold"
                  >
                    {priceLabel}억
                  </text>
                </g>
              );
            })}

            {/* 아파트 1 꺾은선 */}
            <path
              d={apt1Path}
              fill="none"
              stroke="#2563EB"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* 아파트 2 꺾은선 */}
            <path
              d={apt2Path}
              fill="none"
              stroke="#16A34A"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* 데이터 포인트 */}
            {yearlyTrends.map((p, idx) => {
              const pt1 = apt1Points[idx];
              const pt2 = apt2Points[idx];
              const isHovered = hoveredPoint?.date === p.date;

              return (
                <g
                  key={`pts-${p.date}`}
                  onMouseEnter={() => setHoveredPoint(p)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="cursor-pointer"
                >
                  <rect
                    x={pt1.x - 15}
                    y={0}
                    width={30}
                    height={svgHeight}
                    fill="transparent"
                  />

                  {isHovered && (
                    <line
                      x1={pt1.x}
                      y1={paddingY}
                      x2={pt1.x}
                      y2={svgHeight - paddingY}
                      stroke="#0F8AA8"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  )}

                  <circle
                    cx={pt1.x}
                    cy={pt1.y}
                    r={isHovered ? 5 : 3.5}
                    fill="#2563EB"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />

                  <circle
                    cx={pt2.x}
                    cy={pt2.y}
                    r={isHovered ? 5 : 3.5}
                    fill="#16A34A"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />

                  {(idx % 2 === 0 || isHovered || idx === yearlyTrends.length - 1) && (
                    <text
                      x={pt1.x}
                      y={svgHeight - 8}
                      textAnchor="middle"
                      className={cn(
                        "text-[9px] font-bold",
                        isHovered ? "fill-[#0F8AA8] font-black" : "fill-[#94A3B8]",
                      )}
                    >
                      {p.date}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

/* 면적별 평균 매매가 (평형별 막대그래프) */
interface AreaPriceComparisonProps {
  apt1: ApartmentDetailData;
  apt2: ApartmentDetailData;
  areaPrices: ApartmentCompareAreaPrice[];
}

function AreaPriceComparison({
  apt1,
  apt2,
  areaPrices,
}: AreaPriceComparisonProps) {
  const maxPrice = useMemo(() => {
    return Math.max(...areaPrices.flatMap((a) => [a.apt1Price, a.apt2Price]), 1);
  }, [areaPrices]);

  return (
    <div className="flex h-full flex-col rounded-[20px] border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
      <div className="mb-4 flex items-center justify-between border-b border-[#F1F5F9] pb-3">
        <div className="flex items-center gap-2">
          <Maximize2 className="size-5 text-[#0F8AA8]" />
          <h3 className="text-[16px] font-black text-[#0F172A]">
            면적별 평균 매매가
          </h3>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-bold">
          <div className="flex items-center gap-1">
            <span className="size-2.5 rounded-[3px] bg-[#2563EB]" />
            <span className="text-[#1E40AF]">{apt1.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-2.5 rounded-[3px] bg-[#16A34A]" />
            <span className="text-[#15803D]">{apt2.name}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3">
        {areaPrices.map((item, idx) => {
          const p1Ratio = Math.round((item.apt1Price / maxPrice) * 100);
          const p2Ratio = Math.round((item.apt2Price / maxPrice) * 100);
          const diff = Number((item.apt1Price - item.apt2Price).toFixed(1));

          return (
            <div
              key={`area-${idx}`}
              className="rounded-[12px] border border-[#F1F5F9] bg-[#F8FAFC] p-3 transition-all hover:border-[#E2E8F0]"
            >
              <div className="mb-2 flex items-center justify-between text-[11px]">
                <span className="rounded-full bg-white px-2.5 py-0.5 font-black text-[#0F172A] shadow-xs">
                  {item.areaName}
                </span>
                <span className="font-bold text-[#64748B]">
                  {diff === 0 ? (
                    "동일"
                  ) : diff > 0 ? (
                    <span className="font-bold text-[#2563EB]">{apt1.name} +{diff}억</span>
                  ) : (
                    <span className="font-bold text-[#16A34A]">{apt2.name} +{Math.abs(diff)}억</span>
                  )}
                </span>
              </div>

              {/* 아파트 1 막대 */}
              <div className="mb-1.5">
                <div className="mb-0.5 flex items-center justify-between text-[10px]">
                  <span className="font-bold text-[#2563EB]">{apt1.name}</span>
                  <span className="font-black text-[#0F172A]">
                    {formatPriceKRW(item.apt1Price)}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                  <div
                    className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
                    style={{ width: `${p1Ratio}%` }}
                  />
                </div>
              </div>

              {/* 아파트 2 막대 */}
              <div>
                <div className="mb-0.5 flex items-center justify-between text-[10px]">
                  <span className="font-bold text-[#16A34A]">{apt2.name}</span>
                  <span className="font-black text-[#0F172A]">
                    {formatPriceKRW(item.apt2Price)}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                  <div
                    className="h-full rounded-full bg-[#16A34A] transition-all duration-500"
                    style={{ width: `${p2Ratio}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* 한눈에 보는 비교 총평 */
interface QuickVerdictProps {
  apt1: ApartmentDetailData;
  apt2: ApartmentDetailData;
}

function QuickVerdict({ apt1, apt2 }: QuickVerdictProps) {
  const { pyeongDiff, ageDiff, volDiff } = useMemo(() => {
    return {
      pyeongDiff: apt1.metrics.pricePerPyeong - apt2.metrics.pricePerPyeong,
      ageDiff: apt1.metrics.buildYear - apt2.metrics.buildYear,
      volDiff: apt1.metrics.recent3MonthVolume - apt2.metrics.recent3MonthVolume,
    };
  }, [apt1.metrics, apt2.metrics]);

  return (
    <div className="flex h-full flex-col rounded-[20px] border border-[#0F8AA8]/30 bg-gradient-to-br from-[#F0F9FB] via-white to-[#F0FDF4] p-5 shadow-[0_4px_24px_rgba(15,138,168,0.08)]">
      <div className="mb-4 flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
        <Award className="size-5 text-[#0F8AA8]" />
        <h3 className="text-[16px] font-black text-[#0F172A]">
          한눈에 보는 비교 총평
        </h3>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3">
        {/* 카드 1: 평당가 경쟁력 */}
        <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-3.5 shadow-xs">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-[#0F8AA8]">
            <Coins className="size-3.5" />
            <span>평당가 경쟁력</span>
          </div>
          <div className="text-[13px] font-black text-[#0F172A]">
            {pyeongDiff > 0 ? (
              <>
                <span className="text-[#2563EB]">{apt1.name}</span>이 평당{" "}
                {Math.abs(pyeongDiff).toLocaleString()}만 원 더 높음
              </>
            ) : pyeongDiff < 0 ? (
              <>
                <span className="text-[#16A34A]">{apt2.name}</span>이 평당{" "}
                {Math.abs(pyeongDiff).toLocaleString()}만 원 더 높음
              </>
            ) : (
              "두 단지의 평당가가 유사합니다."
            )}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-[#64748B]">
            {pyeongDiff > 0
              ? `${apt2.name}이 상대적으로 진입 장벽이 낮아 가성비 관점에서 유리합니다.`
              : `${apt1.name}이 가격 대비 우수한 입지 선호도를 나타냅니다.`}
          </p>
        </div>

        {/* 카드 2: 단지 규모 & 유동성 */}
        <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-3.5 shadow-xs">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-[#0F8AA8]">
            <BarChart3 className="size-3.5" />
            <span>단지 규모 & 유동성</span>
          </div>
          <div className="text-[13px] font-black text-[#0F172A]">
            {volDiff >= 0 ? (
              <>
                <span className="text-[#2563EB]">{apt1.name}</span> 최근 거래 활발 ({apt1.metrics.recent3MonthVolume}건)
              </>
            ) : (
              <>
                <span className="text-[#16A34A]">{apt2.name}</span> 최근 거래 활발 ({apt2.metrics.recent3MonthVolume}건)
              </>
            )}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-[#64748B]">
            최근 3개월간 실거래 회전율이 더 높아 향후 환금성에서 우위를 점합니다.
          </p>
        </div>

        {/* 카드 3: 연식 & 신축 프리미엄 */}
        <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-3.5 shadow-xs">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-[#0F8AA8]">
            <Building2 className="size-3.5" />
            <span>연식 & 신축 프리미엄</span>
          </div>
          <div className="text-[13px] font-black text-[#0F172A]">
            {ageDiff > 0 ? (
              <>
                <span className="text-[#2563EB]">{apt1.name}</span> 신축 프리미엄 ({apt1.metrics.buildYear}년식)
              </>
            ) : ageDiff < 0 ? (
              <>
                <span className="text-[#16A34A]">{apt2.name}</span> 신축 프리미엄 ({apt2.metrics.buildYear}년식)
              </>
            ) : (
              `동일 연식 (${apt1.metrics.buildYear}년)`
            )}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-[#64748B]">
            {Math.abs(ageDiff) >= 10
              ? "연식 차이가 커 커뮤니티 및 주차 시설에서 체감 차이가 발생합니다."
              : "두 단지 모두 쾌적한 주거 인프라를 보유하고 있습니다."}
          </p>
        </div>
      </div>
    </div>
  );
}

/* 5. 메인 페이지 컴포넌트 */

export default function PriceCompareAptPage() {
  /* 아파트 1 선택 상태 */
  const [r1District, setR1District] = useState("");
  const [r1SggCd, setR1SggCd] = useState("");
  const [r1Dong, setR1Dong] = useState("");
  const [r1Complex, setR1Complex] = useState("");

  /* 아파트 2 선택 상태 */
  const [r2District, setR2District] = useState("");
  const [r2SggCd, setR2SggCd] = useState("");
  const [r2Dong, setR2Dong] = useState("");
  const [r2Complex, setR2Complex] = useState("");

  /* 행정구역 & 아파트 단지 목록 커스텀 훅 */
  const {
    sggOptions,
    r1DongOptions,
    r2DongOptions,
    r1AptOptions,
    r2AptOptions,
    isSggLoading,
    isR1DongLoading,
    isR2DongLoading,
    isR1AptLoading,
    isR2AptLoading,
  } = useLocationAndApartmentQuery(
    r1District,
    r1SggCd,
    r1Dong,
    r2District,
    r2SggCd,
    r2Dong,
  );

  /* 아파트 비교 뮤테이션 훅 */
  const compareMutation = useApartmentCompareMutation();

  /* 자치구 변경 핸들러 */
  const handleR1DistrictChange = useCallback((district: string, opt?: AutocompleteOption) => {
    setR1District(district);
    setR1SggCd(opt?.code || "");
    setR1Dong("");
    setR1Complex("");
  }, []);

  const handleR2DistrictChange = useCallback((district: string, opt?: AutocompleteOption) => {
    setR2District(district);
    setR2SggCd(opt?.code || "");
    setR2Dong("");
    setR2Complex("");
  }, []);

  /* '단지 비교하기' 실행 */
  const handleCompare = useCallback(() => {
    if (!r1District || !r1Complex) {
      alert("아파트 1(기준)의 자치구와 단지명을 선택해 주세요.");
      return;
    }
    if (!r2District || !r2Complex) {
      alert("아파트 2(비교)의 자치구와 단지명을 선택해 주세요.");
      return;
    }

    compareMutation.mutate({
      apt1: {
        district: r1District,
        dong: r1Dong,
        complexName: r1Complex,
      },
      apt2: {
        district: r2District,
        dong: r2Dong,
        complexName: r2Complex,
      },
    });
  }, [r1District, r1Dong, r1Complex, r2District, r2Dong, r2Complex, compareMutation]);

  /* '초기화' 실행 */
  const handleReset = useCallback(() => {
    setR1District("");
    setR1SggCd("");
    setR1Dong("");
    setR1Complex("");
    setR2District("");
    setR2SggCd("");
    setR2Dong("");
    setR2Complex("");
    compareMutation.reset();
  }, [compareMutation]);

  /* 비교 가능 여부 */
  const canCompare = useMemo(() => {
    return Boolean(r1District && r1Complex && r2District && r2Complex);
  }, [r1District, r1Complex, r2District, r2Complex]);

  const resultData = compareMutation.data;

  return (
    <div className={cn("tw-scope flex min-h-screen w-full flex-col bg-[#F8FAFC]")}>
      <Header />

      <main className="flex-1 py-8">
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
            {/* 상단 타이틀 & 초기화 버튼 */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h1 className="text-[24px] font-black text-[#0F172A]">
                  아파트별 비교
                </h1>
                <p className="mt-1 text-[13px] font-medium text-[#64748B]">
                  두 아파트 단지의 시세와 거래 정보를 한눈에 비교해보세요.
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

            {/* 아파트 선택 카드 섹션 */}
            <div className="mb-8 rounded-[24px] border border-[#E2E8F0] bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
              <div className="grid grid-cols-[1fr_auto_1fr_auto] items-stretch gap-6 max-[1200px]:grid-cols-1">
                {/* 아파트 1 선택 카드 */}
                <ApartmentSelectCard
                  aptNum={1}
                  title="아파트 1 (기준)"
                  district={r1District}
                  dong={r1Dong}
                  complexName={r1Complex}
                  sggOptions={sggOptions}
                  dongOptions={r1DongOptions}
                  aptOptions={r1AptOptions}
                  isSggLoading={isSggLoading}
                  isDongLoading={isR1DongLoading}
                  isAptLoading={isR1AptLoading}
                  onDistrictChange={handleR1DistrictChange}
                  onDongChange={(d) => {
                    setR1Dong(d);
                    setR1Complex("");
                  }}
                  onComplexChange={(c) => setR1Complex(c)}
                />

                {/* 중앙 VS 배지 */}
                <div className="flex items-center justify-center max-[1200px]:py-2">
                  <div className="flex size-12 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[#0F8AA8] to-[#0B5E73] font-black text-white shadow-[0_4px_16px_rgba(15,138,168,0.3)]">
                    VS
                  </div>
                </div>

                {/* 아파트 2 선택 카드 */}
                <ApartmentSelectCard
                  aptNum={2}
                  title="아파트 2 (비교)"
                  district={r2District}
                  dong={r2Dong}
                  complexName={r2Complex}
                  sggOptions={sggOptions}
                  dongOptions={r2DongOptions}
                  aptOptions={r2AptOptions}
                  isSggLoading={isSggLoading}
                  isDongLoading={isR2DongLoading}
                  isAptLoading={isR2AptLoading}
                  onDistrictChange={handleR2DistrictChange}
                  onDongChange={(d) => {
                    setR2Dong(d);
                    setR2Complex("");
                  }}
                  onComplexChange={(c) => setR2Complex(c)}
                />

                {/* 단지 비교하기 버튼 영역 */}
                <div className="flex flex-col items-center justify-center rounded-[20px] border border-[#E2E8F0] bg-[#F8FAFC] p-5 text-center max-[1200px]:py-6">
                  <button
                    type="button"
                    onClick={handleCompare}
                    disabled={!canCompare || compareMutation.isPending || isSggLoading}
                    className="flex h-[115px] w-full min-w-[130px] flex-col items-center justify-center gap-2.5 rounded-[16px] border border-[#0B5E73] bg-gradient-to-b from-[#0F8AA8] to-[#0B5E73] p-4 text-white shadow-[0_8px_20px_rgba(15,138,168,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,138,168,0.4)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {compareMutation.isPending ? (
                      <Loader2 className="size-6 animate-spin" />
                    ) : (
                      <BarChart3 className="size-6 stroke-[2.2]" />
                    )}
                    <span className="text-[15px] font-black tracking-tight">
                      {compareMutation.isPending ? "분석 중..." : "단지 비교하기"}
                    </span>
                  </button>
                  <p className="mt-3 text-[11px] font-medium leading-tight text-[#64748B]">
                    두 아파트 단지의
                    <br />
                    상세 시세를 비교합니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 비교 리포트 출력 영역 */}
            {compareMutation.isPending ? (
              <div className="flex flex-col gap-6 animate-pulse">
                <div className="grid grid-cols-2 gap-6 max-[1024px]:grid-cols-1">
                  <div className="h-[300px] rounded-[20px] border border-[#E2E8F0] bg-white p-6" />
                  <div className="h-[300px] rounded-[20px] border border-[#E2E8F0] bg-white p-6" />
                </div>
                <div className="grid grid-cols-3 gap-6 max-[1280px]:grid-cols-1">
                  <div className="h-[320px] rounded-[20px] border border-[#E2E8F0] bg-white p-6" />
                  <div className="h-[320px] rounded-[20px] border border-[#E2E8F0] bg-white p-6" />
                  <div className="h-[320px] rounded-[20px] border border-[#E2E8F0] bg-white p-6" />
                </div>
              </div>
            ) : compareMutation.isError ? (
              <div className="rounded-[20px] border border-red-200 bg-red-50 p-8 text-center text-red-600">
                <AlertCircle className="mx-auto mb-2 size-8" />
                <p className="font-bold">
                  아파트 시세 비교 데이터를 불러오는 데 실패했습니다.
                </p>
                <p className="mt-1 text-xs text-red-400">
                  서버 연결 상태를 확인해 주세요.
                </p>
              </div>
            ) : !resultData ? (
              <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-12 text-center shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-[#E8F6F9] text-[#0F8AA8]">
                  <Layers className="size-8" />
                </div>
                <h3 className="text-[18px] font-black text-[#0F172A]">
                  비교할 두 아파트 단지를 선택하고 &apos;단지 비교하기&apos; 버튼을 눌러주세요
                </h3>
                <p className="mx-auto mt-2 max-w-[420px] text-[13px] font-medium leading-relaxed text-[#64748B]">
                  두 아파트 단지를 지정한 뒤{" "}
                  <span className="font-extrabold text-[#0F8AA8]">
                    &apos;단지 비교하기&apos;
                  </span>{" "}
                  버튼을 클릭하면 단지 프로필, 3개년 가격 추이, 평형별 매매가 분석 결과가 나타납니다.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {/* 1. 아파트 프로필 & 5대 핵심 비교 지표 표 */}
                <ApartmentProfileComparison
                  apt1={resultData.apt1}
                  apt2={resultData.apt2}
                />

                {/* 2. 최근 3년 추이 차트 + 면적별 평균 매매가 + 한눈에 보는 비교 */}
                <div className="grid grid-cols-3 gap-6 max-[1280px]:grid-cols-1">
                  <PriceTrendChart
                    apt1={resultData.apt1}
                    apt2={resultData.apt2}
                    yearlyTrends={resultData.yearlyTrends}
                  />

                  <AreaPriceComparison
                    apt1={resultData.apt1}
                    apt2={resultData.apt2}
                    areaPrices={resultData.areaPrices}
                  />

                  <QuickVerdict
                    apt1={resultData.apt1}
                    apt2={resultData.apt2}
                  />
                </div>

                {/* 데이터 출처 안내 */}
                <div className="flex items-center justify-between rounded-[16px] border border-[#E2E8F0] bg-white px-6 py-4 text-[11px] text-[#94A3B8]">
                  <div className="flex items-center gap-1.5">
                    <Info className="size-3.5 text-[#0F8AA8]" />
                    <span>
                      본 정보는 국토교통부 아파트 실거래가 공개시스템 및 부동산 공공데이터를 기반으로 제공됩니다.
                    </span>
                  </div>
                  <span>데이터 기준일: {resultData.baseDate}</span>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
