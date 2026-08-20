import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  RotateCcw,
  TrendingUp,
  BarChart3,
  Star,
  MapPin,
  Building2,
  ChevronRight,
  Info,
  HelpCircle,
} from "lucide-react";
import {
  SEOUL_POPULAR_APARTMENTS,
  searchApartments,
  getApartmentTrendDetail,
} from "@/features/trends/services/trendsService";
import { getApartmentComplexesApi, getComplexesApi } from "@/api/api";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import type {
  ApartmentSearchItem,
  MonthlyVolumeAndPricePoint,
  AreaDistributionItem,
} from "@/features/trends/types/trends.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PERIOD_OPTIONS = ["최근 6개월", "최근 1년", "최근 2년", "최근 3년"];
const SEARCH_DEBOUNCE_MS = 300;

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timerId = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timerId);
  }, [delay, value]);

  return debouncedValue;
}

export default function MarketTrendsPage() {
  const isAuthenticated = useAuthStore((state) => state.user !== null);

  // 검색어 및 선택된 아파트 상태
  const [searchInput, setSearchInput] = useState("래미안대치팰리스");
  const [selectedApartment, setSelectedApartment] = useState<ApartmentSearchItem>(
    SEOUL_POPULAR_APARTMENTS[0]
  );
  const [selectedPeriod, setSelectedPeriod] = useState<string>("최근 1년");
  const debouncedSearchInput = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  // 자동완성 드롭다운 상태
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // 모달 상태 (전체 실거래 / 전체 면적별 현황)
  const [isTradesModalOpen, setIsTradesModalOpen] = useState(false);
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);

  // 차트 호버 툴팁 상태
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);

  const { data: apartmentComplexes = [] } = useQuery({
    queryKey: ["apartmentComplexes", selectedApartment.gu, selectedApartment.dong],
    queryFn: () => getApartmentComplexesApi(selectedApartment.gu, selectedApartment.dong),
    enabled: isAuthenticated && Boolean(selectedApartment.gu && selectedApartment.dong),
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  const { data: complexDetails = [], isLoading: isComplexDetailsLoading } = useQuery({
    queryKey: ["apartmentComplexDetails", selectedApartment.gu, selectedApartment.dong],
    queryFn: () => getComplexesApi(selectedApartment.gu, selectedApartment.dong),
    enabled: isAuthenticated && Boolean(selectedApartment.gu && selectedApartment.dong),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const complexApartments = useMemo<ApartmentSearchItem[]>(
    () =>
      apartmentComplexes.map((complex) => ({
        name: complex.complexName,
        gu: complex.sggNm || selectedApartment.gu,
        dong: complex.dongNm || selectedApartment.dong,
        complexId: String(complex.complexNo),
      })),
    [apartmentComplexes, selectedApartment.dong, selectedApartment.gu],
  );

  // 백엔드 단지 목록을 우선 사용하고, 아직 조회하지 않은 지역은 기존 후보로 보완한다.
  const suggestions = useMemo(() => {
    const keyword = (isEditingSearch ? debouncedSearchInput : "").trim().toLowerCase();
    const uniqueCandidates = new Map<string, ApartmentSearchItem>();
    [...complexApartments, ...SEOUL_POPULAR_APARTMENTS].forEach((item) => {
      uniqueCandidates.set(`${item.gu}-${item.dong}-${item.name}`, item);
    });
    const allList = [...uniqueCandidates.values()];
    if (!keyword) {
      return allList.slice(0, 10);
    }
    return allList.filter(
      (item) =>
        item.name.toLowerCase().includes(keyword) ||
        item.gu.toLowerCase().includes(keyword) ||
        item.dong.toLowerCase().includes(keyword),
    );
  }, [complexApartments, debouncedSearchInput, isEditingSearch]);

  // React Query 기반 아파트별 거래동향 데이터 로드
  const { data, isLoading } = useQuery({
    queryKey: [
      "apartmentTrendDetail",
      selectedApartment.complexId ?? selectedApartment.name,
      selectedPeriod,
    ],
    queryFn: () => getApartmentTrendDetail(selectedApartment, selectedPeriod),
    staleTime: 1000 * 60 * 5,
  });

  // 검색창 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setHighlightedSuggestionIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 아파트 선택 핸들러
  const handleSelectApartment = (apt: ApartmentSearchItem) => {
    setSelectedApartment(apt);
    setSearchInput(apt.name);
    setIsDropdownOpen(false);
    setIsEditingSearch(false);
    setHighlightedSuggestionIndex(-1);
  };

  // 검색 실행 핸들러
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (suggestions.length > 0) {
      handleSelectApartment(suggestions[0]);
    } else if (searchInput.trim()) {
      handleSelectApartment({
        name: searchInput.trim(),
        gu: "서울시",
        dong: "주요동",
      });
    }
  };

  // 초기화 핸들러
  const handleReset = () => {
    const defaultApt = SEOUL_POPULAR_APARTMENTS[0];
    setSelectedApartment(defaultApt);
    setSearchInput(defaultApt.name);
    setSelectedPeriod("최근 1년");
    setIsDropdownOpen(false);
    setIsEditingSearch(false);
    setHighlightedSuggestionIndex(-1);
  };

  const selectedComplexDetail = complexDetails.find(
    (complex) =>
      String(complex.id) === selectedApartment.complexId ||
      complex.name.trim() === selectedApartment.name.trim(),
  );
  const apiAveragePrice = selectedComplexDetail?.baseSalePrice ?? 0;
  const apiHighestPrice = Math.max(
    apiAveragePrice,
    ...(selectedComplexDetail?.recentTrades?.map((trade) => trade.price) ?? []),
    ...(selectedComplexDetail?.pyungs.map((pyung) => pyung.salePrice) ?? []),
  );
  const kpi = data?.kpi
    ? {
        ...data.kpi,
        ...(selectedComplexDetail
          ? {
              totalTradeCount:
                selectedComplexDetail.recentTrades?.length ?? data.kpi.totalTradeCount,
              avgTradePriceEok: Math.floor(apiAveragePrice / 10000),
              avgTradePriceMan: apiAveragePrice % 10000,
              maxTradePriceEok: Math.floor(apiHighestPrice / 10000),
              maxTradePriceMan: apiHighestPrice % 10000,
            }
          : {}),
      }
    : undefined;
  const monthlyTrends = data?.monthlyTrends || [];
  const areaDist = data?.areaDistribution || [];
  const recentTrades = data?.recentTrades || [];
  const areaStats = data?.areaStats || [];
  const insights = data?.insights || [];
  const isDataLoading = isLoading || isComplexDetailsLoading;

  return (
    <div className="tw-scope min-h-screen bg-[#F8FAFC] text-[#0F172A] [font-family:'Pretendard','Noto_Sans_KR',Arial,sans-serif]">
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[224px_minmax(0,1fr)]">
          {/* =========================================================
              좌측 사이드바: 거래동향 네비게이션
          ========================================================= */}
          <aside className="h-fit w-full shrink-0 lg:sticky lg:top-[96px] lg:w-[224px]">
            <Card className="rounded-xl border-[#E2E8F0] shadow-none">
              <CardContent className="p-4">
              <h2 className="mb-4 text-[16px] font-black text-[#0F172A]">
                거래동향
              </h2>
              <nav className="flex flex-col gap-1" aria-label="거래동향 메뉴">
                {/* 1. 아파트별 거래동향 (활성) */}
                <Link
                  to="/trends"
                  className="flex items-center gap-2.5 rounded-lg bg-[#E8F6F9] px-3 py-2.5 text-[13px] font-bold text-[#0F8AA8] no-underline"
                >
                  <BarChart3 className="size-4 shrink-0 stroke-[2.2]" />
                  아파트별 거래동향
                </Link>

                {/* 2. 지역별 거래동향 (링크) */}
                <Link
                  to="/trends/region"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#64748B] no-underline hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                >
                  <MapPin className="size-4 shrink-0 stroke-[1.8]" />
                  지역별 거래동향
                </Link>
              </nav>
              <div className="mt-5 rounded-lg bg-[#F8FAFC] p-3.5">
                <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-[#475569]">
                  <HelpCircle className="size-3.5 text-[#0F8AA8]" />
                  <span>이용 가이드</span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#64748B]">
                  아파트를 검색하면 거래량, 평균 거래가와 전용면적별 거래 현황을 한눈에 확인할 수 있어요.
                </p>
              </div>
              </CardContent>
            </Card>
          </aside>

          {/* =========================================================
              우측 메인 콘텐츠
          ========================================================= */}
          <main className="min-w-0 space-y-4">
            {/* 1. 상단 페이지 타이틀 */}
            <div className="space-y-1">
              <h1 className="text-[24px] font-extrabold tracking-[-0.02em] text-[#0F172A]">
                아파트별 거래동향
              </h1>
              <p className="mt-1 text-[13px] font-medium text-[#64748B]">
                관심 아파트의 실거래 흐름과 가격 변화를 확인하세요.
              </p>
            </div>

            {/* 2. 검색 & 필터 바 */}
            <Card className="rounded-xl border-[#E2E8F0] shadow-none">
              <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                {/* 아파트명 입력창 + 자동완성 드롭다운 */}
                <div ref={searchContainerRef} className="relative flex-1">
                  <form onSubmit={handleSearchSubmit} className="relative">
                    <Input
                      type="text"
                      value={searchInput}
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={isDropdownOpen}
                      aria-controls="apartment-suggestions"
                      aria-activedescendant={
                        isDropdownOpen && highlightedSuggestionIndex >= 0
                          ? `apartment-suggestion-${highlightedSuggestionIndex}`
                          : undefined
                      }
                      onChange={(e) => {
                        setSearchInput(e.target.value);
                        setIsDropdownOpen(true);
                        setIsEditingSearch(true);
                        setHighlightedSuggestionIndex(-1);
                      }}
                      onFocus={() => {
                        setIsDropdownOpen(true);
                        setIsEditingSearch(false);
                        setHighlightedSuggestionIndex(-1);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowDown") {
                          event.preventDefault();
                          setIsDropdownOpen(true);
                          setHighlightedSuggestionIndex((index) =>
                            suggestions.length === 0 ? -1 : (index + 1) % suggestions.length,
                          );
                        } else if (event.key === "ArrowUp") {
                          event.preventDefault();
                          setIsDropdownOpen(true);
                          setHighlightedSuggestionIndex((index) =>
                            suggestions.length === 0
                              ? -1
                              : index <= 0
                                ? suggestions.length - 1
                                : index - 1,
                          );
                        } else if (event.key === "Enter" && isDropdownOpen && highlightedSuggestionIndex >= 0) {
                          const suggestion = suggestions[highlightedSuggestionIndex];
                          if (suggestion) {
                            event.preventDefault();
                            handleSelectApartment(suggestion);
                          }
                        } else if (event.key === "Escape") {
                          setIsDropdownOpen(false);
                          setHighlightedSuggestionIndex(-1);
                        }
                      }}
                      placeholder="아파트명을 입력해 주세요"
                      className="h-11 rounded-lg border-[#CBD5E1] bg-white px-4 text-[14px] shadow-none focus-visible:border-[#0F8AA8] focus-visible:ring-[#0F8AA8]/15"
                    />
                  </form>

                  {/* 자동완성 드롭다운 레이어 */}
                  {isDropdownOpen && (
                    <div
                      id="apartment-suggestions"
                      role="listbox"
                      className="relative mt-2 max-h-[260px] w-full overflow-y-auto rounded-lg border border-[#E2E8F0] bg-white py-1.5 shadow-sm"
                    >
                      {isComplexDetailsLoading ? (
                        <div className="flex items-center justify-center gap-2 py-6 text-[13px] text-[#64748B]">
                          <div className="size-4 animate-spin rounded-full border-2 border-[#0F8AA8] border-t-transparent" />
                          <span>단지 목록을 불러오는 중입니다...</span>
                        </div>
                      ) : suggestions.length > 0 ? (
                        suggestions.map((item, idx) => (
                          <Button
                            key={`${item.name}-${idx}`}
                            id={`apartment-suggestion-${idx}`}
                            type="button"
                            variant="ghost"
                            role="option"
                            aria-selected={idx === highlightedSuggestionIndex}
                            onClick={() => handleSelectApartment(item)}
                            onMouseEnter={() => setHighlightedSuggestionIndex(idx)}
                            className={`h-auto w-full justify-between rounded-none border-0 px-4 py-2.5 text-left text-[14px] shadow-none focus-visible:ring-0 ${
                              idx === highlightedSuggestionIndex
                                ? "bg-white text-[#0F8AA8] shadow-[inset_3px_0_0_#0F8AA8]"
                                : "bg-white hover:bg-white focus-visible:bg-white"
                            }`}
                          >
                            <span className="font-semibold text-[#0F172A]">
                              {item.name}
                            </span>
                            <span className="text-[12px] text-[#6B7280]">
                              {item.gu} {item.dong}
                            </span>
                          </Button>
                        ))
                      ) : (
                        <div className="py-6 px-4 text-center text-[13px] text-[#64748B]">
                          <Building2 className="mx-auto mb-2 size-6 text-[#94A3B8]" />
                          <p className="font-semibold text-[#1E293B]">
                            일치하는 아파트 단지가 없습니다.
                          </p>
                          <p className="mt-0.5 text-[12px] text-[#94A3B8]">
                            단지명 또는 구/동 이름을 확인해 주세요.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 검색 버튼 */}
                <Button
                  type="button"
                  onClick={() => handleSearchSubmit()}
                  className="h-11 rounded-lg bg-[#0F8AA8] px-6 text-[14px] font-bold text-white shadow-none hover:bg-[#0B7285]"
                >
                  검색
                </Button>

                {/* 기간 선택 드롭다운 */}
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="h-11 min-w-[140px] rounded-lg border-[#CBD5E1] bg-white px-4 text-[14px] font-medium shadow-none">
                    <SelectValue aria-label="조회 기간 선택" />
                  </SelectTrigger>
                  <SelectContent position="popper" align="start" className="bg-white">
                    {PERIOD_OPTIONS.map((option) => (
                      <SelectItem
                        key={option}
                        value={option}
                        className="bg-transparent focus:bg-transparent focus:text-[#0F172A] data-[state=checked]:bg-transparent"
                      >
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 초기화 버튼 */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="ml-auto h-11 rounded-lg border-[#CBD5E1] px-4 text-[13px] font-medium text-[#475569] shadow-none hover:bg-[#F8FAFC]"
                >
                  <RotateCcw className="size-4" />
                  초기화
                </Button>
              </div>

              {/* 선택된 아파트 태그 뱃지 */}
              <div className="mt-4 flex items-center gap-2 border-t border-[#F1F5F9] pt-4">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[#F1F5F9] px-3 py-1.5 text-[13px] font-semibold text-[#334155]">
                  <Building2 className="size-3.5 text-[#0F8AA8]" />
                  {selectedApartment.name} · {selectedApartment.gu}{" "}
                  {selectedApartment.dong}
                </span>
              </div>
              </CardContent>
            </Card>

            {/* 3. 5대 KPI 요약 지표 카드 */}
            <Card className="grid grid-cols-1 overflow-hidden rounded-xl border-[#E2E8F0] shadow-none sm:grid-cols-2 lg:grid-cols-5 lg:divide-x lg:divide-[#E2E8F0]">
              {/* KPI 1: 총 거래 건수 */}
              <div className="border-b border-[#E2E8F0] p-4 lg:border-b-0">
                <span className="text-[12px] font-medium text-[#6B7280] block">
                  총 거래 건수
                </span>
                <div className="mt-2 text-[21px] font-extrabold tracking-[-0.02em] text-[#0F172A]">
                  {isDataLoading ? "-" : `${kpi?.totalTradeCount}건`}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#E11D48]">
                  <span>전년 대비 ▲ {kpi?.totalTradeCountChangeRate}%</span>
                </div>
                <span className="text-[10px] text-[#9CA3AF] block mt-0.5">
                  {kpi?.periodLabel}
                </span>
              </div>

              {/* KPI 2: 총 거래 금액 */}
              <div className="border-b border-[#E2E8F0] p-4 lg:border-b-0">
                <span className="text-[12px] font-medium text-[#6B7280] block">
                  총 거래 금액
                </span>
                <div className="mt-2 text-[21px] font-extrabold tracking-[-0.02em] text-[#0F172A]">
                  {isDataLoading
                    ? "-"
                    : `${kpi?.totalTradeAmountEok.toLocaleString()}억원`}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#E11D48]">
                  <span>전년 대비 ▲ {kpi?.totalTradeAmountChangeRate}%</span>
                </div>
                <span className="text-[10px] text-[#9CA3AF] block mt-0.5">
                  {kpi?.periodLabel}
                </span>
              </div>

              {/* KPI 3: 평균 거래가 */}
              <div className="border-b border-[#E2E8F0] p-4 lg:border-b-0">
                <span className="text-[12px] font-medium text-[#6B7280] block">
                  평균 거래가
                </span>
                <div className="mt-2 text-[21px] font-extrabold tracking-[-0.02em] text-[#0F172A]">
                  {isDataLoading
                    ? "-"
                    : kpi?.avgTradePriceMan === 0
                    ? `${kpi?.avgTradePriceEok}억원`
                    : `${kpi?.avgTradePriceEok}억 ${kpi?.avgTradePriceMan.toLocaleString()}만원`}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#E11D48]">
                  <span>전년 대비 ▲ {kpi?.avgTradePriceChangeRate}%</span>
                </div>
                <span className="text-[10px] text-[#9CA3AF] block mt-0.5">
                  {kpi?.periodLabel}
                </span>
              </div>

              {/* KPI 4: 최고 거래가 */}
              <div className="border-b border-[#E2E8F0] p-4 lg:border-b-0">
                <span className="text-[12px] font-medium text-[#6B7280] block">
                  최고 거래가
                </span>
                <div className="mt-2 text-[21px] font-extrabold tracking-[-0.02em] text-[#0F172A]">
                  {isDataLoading
                    ? "-"
                    : kpi?.maxTradePriceMan === 0
                    ? `${kpi?.maxTradePriceEok}억원`
                    : `${kpi?.maxTradePriceEok}억 ${kpi?.maxTradePriceMan.toLocaleString()}만원`}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#E11D48]">
                  <span>전년 대비 ▲ {kpi?.maxTradePriceChangeRate}%</span>
                </div>
                <span className="text-[10px] text-[#9CA3AF] block mt-0.5">
                  {kpi?.periodLabel}
                </span>
              </div>

              {/* KPI 5: 거래량 증감률 */}
              <div className="p-4">
                <span className="text-[12px] font-medium text-[#6B7280] block">
                  거래량 증감률
                </span>
                <div className="mt-2 text-[21px] font-extrabold tracking-[-0.02em] text-[#0F172A]">
                  {isDataLoading ? "-" : `${kpi?.tradeVolumeChangeRate}%`}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#E11D48]">
                  <span>전년 대비 ▲ {kpi?.tradeVolumeChangeRate}%</span>
                </div>
                <span className="text-[10px] text-[#9CA3AF] block mt-0.5">
                  {kpi?.periodLabel}
                </span>
              </div>
            </Card>

            {/* 4. 시각화 차트 섹션 (2분할 그리드) */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* 좌측 (2열): 거래량 및 평균 거래가 추이 */}
              <Card className="flex flex-col justify-between rounded-xl border-[#E2E8F0] shadow-none lg:col-span-2">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h3 className="text-[15px] font-semibold text-[#0F172A]">
                      거래량 및 평균 거래가 추이
                    </h3>
                    {/* 범례 */}
                    <div className="flex items-center gap-4 text-[12px] text-[#6B7280]">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block size-3 rounded-xs bg-[#2563EB]" />
                        거래량(건)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block size-2.5 rounded-full bg-[#16A34A]" />
                        평균 거래가(만원)
                      </span>
                    </div>
                  </div>

                  {/* SVG 복합 차트 */}
                  <MonthlyMixedChart
                    data={monthlyTrends}
                    hoveredIndex={hoveredMonthIndex}
                    onHoverIndex={setHoveredMonthIndex}
                  />
                </CardContent>
              </Card>

              {/* 우측 (1열): 전용면적별 거래 비중 도넛 차트 */}
              <Card className="flex flex-col rounded-xl border-[#E2E8F0] shadow-none">
                <CardContent className="p-5">
                  <h3 className="mb-4 text-[15px] font-semibold text-[#0F172A]">
                    전용면적별 거래 비중
                  </h3>
                  <AreaDonutChart
                    items={areaDist}
                    totalCount={kpi?.totalTradeCount || 128}
                  />
                </CardContent>
              </Card>
            </div>

            {/* 5. 하단 상세 데이터 그리드 (3단 구성) */}
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
              {/* 5-1. 최근 실거래 내역 */}
              <Card className="flex flex-col rounded-xl border-[#E2E8F0] shadow-none">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-[15px] font-semibold text-[#0F172A]">
                    최근 실거래 내역
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid flex-1 grid-rows-[1fr_auto] p-3 pt-1">
                    <Table className="h-full text-[13px]">
                      <TableHeader>
                        <TableRow className="text-[#6B7280] hover:bg-transparent">
                          <TableHead className="h-8 border border-[#E2E8F0] px-2 text-center">계약일</TableHead>
                          <TableHead className="h-8 border border-[#E2E8F0] px-2 text-center">전용면적(㎡)</TableHead>
                          <TableHead className="h-8 border border-[#E2E8F0] px-2 text-center">층</TableHead>
                          <TableHead className="h-8 border border-[#E2E8F0] px-2 text-center">거래가(만원)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentTrades.slice(0, 5).map((trade, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="border border-[#E2E8F0] px-2 py-1.5 text-center text-[#374151]">
                              {trade.dealDate}
                            </TableCell>
                            <TableCell className="border border-[#E2E8F0] px-2 py-1.5 text-center text-[#374151]">
                              {trade.area.toFixed(2)}
                            </TableCell>
                            <TableCell className="border border-[#E2E8F0] px-2 py-1.5 text-center text-[#374151]">
                              {trade.floor}층
                            </TableCell>
                            <TableCell className="border border-[#E2E8F0] px-2 py-1.5 text-right font-semibold text-[#123047]">
                              {trade.price.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsTradesModalOpen(true)}
                  className="mt-1 h-8 w-full rounded-md border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#0F8AA8] shadow-none hover:bg-[#F8FAFC] hover:text-[#0B7285]"
                >
                  전체 실거래 내역 보기 <ChevronRight className="size-4" />
                </Button>
                </CardContent>
              </Card>

              {/* 5-2. 면적별 거래 현황 */}
              <Card className="flex flex-col rounded-xl border-[#E2E8F0] shadow-none">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-[15px] font-semibold text-[#0F172A]">
                    면적별 거래 현황
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid flex-1 grid-rows-[1fr_auto] p-3 pt-1">
                    <Table className="h-full text-[13px]">
                      <TableHeader>
                        <TableRow className="text-[#6B7280] hover:bg-transparent">
                          <TableHead className="h-8 border border-[#E2E8F0] px-2 text-center">전용면적(㎡)</TableHead>
                          <TableHead className="h-8 border border-[#E2E8F0] px-2 text-center">거래건수(건)</TableHead>
                          <TableHead className="h-8 border border-[#E2E8F0] px-2 text-center">평균 거래가(만원)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {areaStats.slice(0, 5).map((stat, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="border border-[#E2E8F0] px-2 py-1.5 text-center font-medium text-[#374151]">
                              {stat.areaRange}
                            </TableCell>
                            <TableCell className="border border-[#E2E8F0] px-2 py-1.5 text-center text-[#374151]">
                              {stat.dealCount}
                            </TableCell>
                            <TableCell className="border border-[#E2E8F0] px-2 py-1.5 text-right font-semibold text-[#123047]">
                              {stat.avgPrice.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsAreaModalOpen(true)}
                  className="mt-1 h-8 w-full rounded-md border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#0F8AA8] shadow-none hover:bg-[#F8FAFC] hover:text-[#0B7285]"
                >
                  전체 면적별 현황 보기 <ChevronRight className="size-4" />
                </Button>
                </CardContent>
              </Card>

              {/* 5-3. 거래 동향 요약 (AI 인사이트) */}
              <Card className="space-y-3 rounded-xl border-[#E2E8F0] shadow-none">
                <CardHeader className="p-3 pb-1">
                <CardTitle className="text-[15px] font-semibold text-[#0F172A]">
                  거래 동향 요약
                </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 p-3 pt-1">
                  {insights.map((insight) => (
                    <div
                      key={insight.id}
                      className="flex items-start gap-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 transition-colors hover:bg-[#F1F5F9]"
                    >
                      {/* 아이콘 */}
                      <div className="shrink-0 mt-0.5">
                        {insight.iconType === "up" && (
                          <div className="flex size-7 items-center justify-center rounded-full bg-[#DCFCE7] text-[#16A34A]">
                            <TrendingUp className="size-4" />
                          </div>
                        )}
                        {insight.iconType === "chart" && (
                          <div className="flex size-7 items-center justify-center rounded-full bg-[#DBEAFE] text-[#2563EB]">
                            <BarChart3 className="size-4" />
                          </div>
                        )}
                        {insight.iconType === "star" && (
                          <div className="flex size-7 items-center justify-center rounded-full bg-[#F3E8FF] text-[#7C3AED]">
                            <Star className="size-4 fill-current" />
                          </div>
                        )}
                      </div>

                      {/* 텍스트 */}
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-[#111827]">
                          {insight.title}
                        </p>
                        <p className="text-[12px] text-[#6B7280] mt-0.5">
                          {insight.subtitle}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* 6. 하단 데이터 안내 푸터 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-[12px] text-[#6B7280]">
              <span className="flex items-center gap-1.5">
                <Info className="size-4 text-[#2563EB]" />
                본 정보는 국토교통부 실거래가 공개시스템 데이터를 기반으로 제공됩니다.
              </span>
              <span>
                데이터 기준일: {selectedComplexDetail?.recentTrades?.[0]?.date || data?.baseDate || "2024.05.20"}
              </span>
            </div>
          </main>
        </div>
      </div>

      {/* =========================================================
          모달 1: 전체 실거래 내역 모달
      ========================================================= */}
      {isTradesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-[16px] border border-[#DCE8ED] bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <h3 className="text-[18px] font-bold text-[#123047]">
                {selectedApartment.name} 전체 실거래 내역
              </h3>
              <button
                type="button"
                onClick={() => setIsTradesModalOpen(false)}
                className="text-[20px] font-bold text-[#9CA3AF] hover:text-[#111827] cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left text-[13px] border-collapse">
                <thead className="sticky top-0 bg-[#F9FAFB]">
                  <tr className="border-b border-[#E5E7EB] text-[#6B7280] font-semibold">
                    <th className="py-2.5 px-3">계약일</th>
                    <th className="py-2.5 px-3">전용면적(㎡)</th>
                    <th className="py-2.5 px-3">층</th>
                    <th className="py-2.5 px-3 text-right">거래가(만원)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {recentTrades.map((trade, idx) => (
                    <tr key={idx} className="hover:bg-[#F9FAFB]">
                      <td className="py-2.5 px-3">{trade.dealDate}</td>
                      <td className="py-2.5 px-3">{trade.area.toFixed(2)}</td>
                      <td className="py-2.5 px-3">{trade.floor}층</td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#123047]">
                        {trade.price.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          모달 2: 전체 면적별 현황 모달
      ========================================================= */}
      {isAreaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-[16px] border border-[#DCE8ED] bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <h3 className="text-[18px] font-bold text-[#123047]">
                {selectedApartment.name} 면적별 상세 통계
              </h3>
              <button
                type="button"
                onClick={() => setIsAreaModalOpen(false)}
                className="text-[20px] font-bold text-[#9CA3AF] hover:text-[#111827] cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div>
              <table className="w-full text-left text-[13px] border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-[#6B7280] font-semibold">
                    <th className="py-2.5 px-3">전용면적(㎡)</th>
                    <th className="py-2.5 px-3 text-center">거래건수(건)</th>
                    <th className="py-2.5 px-3 text-right">평균 거래가(만원)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {areaStats.map((stat, idx) => (
                    <tr key={idx}>
                      <td className="py-3 px-3 font-medium text-[#374151]">
                        {stat.areaRange}
                      </td>
                      <td className="py-3 px-3 text-center">{stat.dealCount}건</td>
                      <td className="py-3 px-3 text-right font-bold text-[#123047]">
                        {stat.avgPrice.toLocaleString()}만원
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SVG 컴포넌트 1: 거래량(바) + 평균 거래가(라인) 복합 차트
// ============================================================================
function MonthlyMixedChart({
  data,
  hoveredIndex,
  onHoverIndex,
}: {
  data: MonthlyVolumeAndPricePoint[];
  hoveredIndex: number | null;
  onHoverIndex: (idx: number | null) => void;
}) {
  if (!data || data.length === 0) return null;

  const width = 640;
  const height = 240;
  const padding = { top: 20, right: 55, bottom: 35, left: 35 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVolume = 40;
  const maxPrice = 400000;

  const xStep = chartW / Math.max(1, data.length - 1);

  // 라인 차트 좌표 계산
  const linePoints = data.map((d, i) => {
    const x = padding.left + i * xStep;
    const y = padding.top + chartH - (d.avgPrice / maxPrice) * chartH;
    return { x, y, ...d };
  });

  const linePathD = linePoints.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, "");

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto min-w-[580px]"
      >
        {/* Y축 그리드 라인 & 좌우 라벨 (0, 10, 20, 30, 40 건 / 0, 10만, 20만, 30만, 40만 만원) */}
        {[0, 10, 20, 30, 40].map((vol) => {
          const y = padding.top + chartH - (vol / maxVolume) * chartH;
          const priceLabel = (vol * 10000).toLocaleString();

          return (
            <g key={vol}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#F0F2F5"
                strokeWidth="1"
              />
              {/* 좌측 거래량 Y축 라벨 */}
              <text
                x={padding.left - 8}
                y={y + 3.5}
                textAnchor="end"
                className="text-[11px] fill-[#9CA3AF]"
              >
                {vol}
              </text>
              {/* 우측 가격 Y축 라벨 */}
              <text
                x={width - padding.right + 8}
                y={y + 3.5}
                textAnchor="start"
                className="text-[11px] fill-[#9CA3AF]"
              >
                {priceLabel}
              </text>
            </g>
          );
        })}

        {/* 바 차트 (거래량 건수) */}
        {data.map((d, i) => {
          const x = padding.left + i * xStep - 8;
          const barH = (d.volume / maxVolume) * chartH;
          const y = padding.top + chartH - barH;
          const isHovered = hoveredIndex === i;

          return (
            <rect
              key={`bar-${i}`}
              x={x}
              y={y}
              width={16}
              height={Math.max(2, barH)}
              rx={3}
              className={`transition-all cursor-pointer ${
                isHovered ? "fill-[#1D4ED8]" : "fill-[#2563EB]"
              }`}
              onMouseEnter={() => onHoverIndex(i)}
              onMouseLeave={() => onHoverIndex(null)}
            />
          );
        })}

        {/* 라인 차트 (평균 거래가 추이) */}
        <path
          d={linePathD}
          fill="none"
          stroke="#16A34A"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 라인 차트 꼭짓점 포인트 & 인터랙션 */}
        {linePoints.map((pt, i) => {
          const isHovered = hoveredIndex === i;

          return (
            <g key={`pt-${i}`}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 6 : 4}
                fill="#16A34A"
                stroke="#FFFFFF"
                strokeWidth={isHovered ? 2.5 : 1.5}
                className="cursor-pointer transition-all"
                onMouseEnter={() => onHoverIndex(i)}
                onMouseLeave={() => onHoverIndex(null)}
              />
            </g>
          );
        })}

        {/* X축 월별 라벨 */}
        {data.map((d, i) => {
          const x = padding.left + i * xStep;
          const y = height - 10;

          return (
            <text
              key={`month-${i}`}
              x={x}
              y={y}
              textAnchor="middle"
              className="text-[10px] fill-[#6B7280]"
            >
              {d.month}
            </text>
          );
        })}

        {/* 축 단위 라벨 */}
        <text
          x={padding.left - 10}
          y={padding.top - 8}
          textAnchor="start"
          className="text-[10px] fill-[#6B7280]"
        >
          (건)
        </text>
        <text
          x={width - padding.right + 5}
          y={padding.top - 8}
          textAnchor="end"
          className="text-[10px] fill-[#6B7280]"
        >
          (만원)
        </text>
      </svg>

      {/* 호버 툴팁 */}
      {hoveredIndex !== null && data[hoveredIndex] && (
        <div
          className="absolute z-20 pointer-events-none rounded-[8px] bg-[#123047] p-2.5 text-white shadow-xl text-[12px] space-y-1"
          style={{
            left: `${padding.left + hoveredIndex * xStep + 10}px`,
            top: "20px",
          }}
        >
          <div className="font-bold text-[#7CC9D8]">
            {data[hoveredIndex].month}
          </div>
          <div>거래량: <span className="font-bold text-white">{data[hoveredIndex].volume}건</span></div>
          <div>평균가: <span className="font-bold text-white">{data[hoveredIndex].avgPrice.toLocaleString()}만원</span></div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SVG 컴포넌트 2: 전용면적별 거래 비중 도넛 차트
// ============================================================================
function AreaDonutChart({
  items,
  totalCount,
}: {
  items: AreaDistributionItem[];
  totalCount: number;
}) {
  const size = 180;
  const center = size / 2;
  const outerR = 75;
  const innerR = 46;

  // 도넛 세그먼트 각도 계산 (순수 함수 연산)
  const slices = useMemo(() => {
    return items.map((item, index) => {
      const prevPercentageSum = items
        .slice(0, index)
        .reduce((sum, prev) => sum + prev.percentage, 0);

      const startAngle = -Math.PI / 2 + (prevPercentageSum / 100) * 2 * Math.PI;
      const endAngle = startAngle + (item.percentage / 100) * 2 * Math.PI;
      const angle = (item.percentage / 100) * 2 * Math.PI;

      const x1 = center + outerR * Math.cos(startAngle);
      const y1 = center + outerR * Math.sin(startAngle);
      const x2 = center + outerR * Math.cos(endAngle);
      const y2 = center + outerR * Math.sin(endAngle);

      const x3 = center + innerR * Math.cos(endAngle);
      const y3 = center + innerR * Math.sin(endAngle);
      const x4 = center + innerR * Math.cos(startAngle);
      const y4 = center + innerR * Math.sin(startAngle);

      const largeArc = angle > Math.PI ? 1 : 0;

      const pathData = [
        `M ${x1} ${y1}`,
        `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}`,
        "Z",
      ].join(" ");

      return {
        ...item,
        pathData,
      };
    });
  }, [items, center, outerR, innerR]);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
      {/* 도넛 SVG */}
      <div className="relative shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {slices.map((slice, idx) => (
            <path
              key={idx}
              d={slice.pathData}
              fill={slice.color}
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          ))}
        </svg>

        {/* 도넛 중앙 텍스트 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[11px] font-bold text-[#6B7280]">총 거래</span>
          <span className="text-[16px] font-black text-[#123047]">
            {totalCount}건
          </span>
        </div>
      </div>

      {/* 우측 범례 */}
      <div className="space-y-2 text-[13px] min-w-[130px]">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="size-3 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[#374151]">{item.range}</span>
            </div>
            <span className="font-bold text-[#111827]">
              {item.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
