import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  RotateCcw,
  Search,
  ChevronDown,
  Building2,
  MapPin,
  TrendingUp,
  BarChart2,
  ArrowUpDown,
  Info,
  ChevronRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  getSggs,
  getDongs,
} from "@/features/location/services/locationService";
import {
  getDongPriceAnalysis,
  getRegionPriceList,
} from "@/features/trends/services/trendsApiService";
import apiMiddleware from "@/api/middleware";

/* 타입 및 상수 정의 */
type PeriodType = "3M" | "6M" | "1Y" | "3Y";

interface PeriodOption {
  value: PeriodType;
  label: string;
  rangeText: string;
}

/* 현재 날짜 기준 기간 문자열 계산 유틸 함수 */
function formatYearMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}.${m}`;
}

function formatYearMonthDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

function calculateRangeText(monthsAgo: number): string {
  const now = new Date();
  const currentStr = formatYearMonth(now);
  const startDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  return `${formatYearMonth(startDate)} ~ ${currentStr}`;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: "3M", label: "최근 3개월", rangeText: calculateRangeText(2) },
  { value: "6M", label: "최근 6개월", rangeText: calculateRangeText(5) },
  { value: "1Y", label: "최근 1년", rangeText: calculateRangeText(12) },
  { value: "3Y", label: "최근 3년", rangeText: calculateRangeText(36) },
];

const TREND_NAV_ITEMS = [
  {
    label: "아파트별 거래동향",
    to: "/trends/apartment",
    icon: Building2,
    active: false,
  },
  {
    label: "지역별 거래동향",
    to: "/trends/region",
    icon: MapPin,
    active: true,
  },
];

interface MonthlyPoint {
  period: string;
  volume: number;
  avgPrice: number; /* 만원 단위 */
}

/* 검색일 기준 동적 월별 기간 생성 유틸 */
function getDynamicMonthlyPeriods(period: PeriodType): string[] {
  const now = new Date();
  const periods: string[] = [];

  if (period === "3M") {
    for (let i = 2; i >= 0; i--) {
      periods.push(
        formatYearMonth(new Date(now.getFullYear(), now.getMonth() - i, 1)),
      );
    }
  } else if (period === "6M") {
    for (let i = 5; i >= 0; i--) {
      periods.push(
        formatYearMonth(new Date(now.getFullYear(), now.getMonth() - i, 1)),
      );
    }
  } else if (period === "1Y") {
    for (let i = 12; i >= 0; i -= 2) {
      periods.push(
        formatYearMonth(new Date(now.getFullYear(), now.getMonth() - i, 1)),
      );
    }
  } else if (period === "3Y") {
    for (let i = 36; i >= 0; i -= 6) {
      periods.push(
        formatYearMonth(new Date(now.getFullYear(), now.getMonth() - i, 1)),
      );
    }
  }

  return periods;
}

interface AreaItem {
  name: string;
  percentage: number;
  color: string;
}

interface TrendDataset {
  summary: {
    totalCount: number;
    totalCountDiff: number;
    totalAmountText: string;
    totalAmountDiff: number;
    avgPriceText: string;
    avgPriceDiff: number;
    maxPriceText: string;
    maxPriceDiff: number;
    volumeGrowthRate: number;
    volumeGrowthDiff: number;
  };
  monthlyTrends: MonthlyPoint[];
  areaDistribution: AreaItem[];
  recentTrades: Array<{
    contractDate: string;
    complexName: string;
    area: string;
    floor: string;
    status: string;
    price?: string;
  }>;
  topComplexes: Array<{
    rank: number;
    complexName: string;
    count: number;
  }>;
  insights: Array<{
    id: string;
    title: string;
    subtitle: string;
    type: "up" | "chart" | "swap";
  }>;
}

function getDefaultTrendData(period: PeriodType): TrendDataset {
  return {
    summary: {
      totalCount: 0,
      totalCountDiff: 0,
      totalAmountText: "-",
      totalAmountDiff: 0,
      avgPriceText: "-",
      avgPriceDiff: 0,
      maxPriceText: "-",
      maxPriceDiff: 0,
      volumeGrowthRate: 0,
      volumeGrowthDiff: 0,
    },
    monthlyTrends: getDynamicMonthlyPeriods(period).map((p) => ({
      period: p,
      volume: 0,
      avgPrice: 0,
    })),
    areaDistribution: [],
    recentTrades: [],
    topComplexes: [],
    insights: [],
  };
}

/* React Query 커스텀 훅 */
function useSggList() {
  return useQuery({
    queryKey: ["location", "sggs"],
    queryFn: getSggs,
    staleTime: Infinity,
  });
}

function useDongList(guCode: string) {
  return useQuery({
    queryKey: ["location", "dongs", guCode],
    queryFn: () => getDongs(guCode),
    enabled: Boolean(guCode),
    staleTime: Infinity,
  });
}

function useDongPriceAnalysis(guCode: string, dongCode: string) {
  return useQuery({
    queryKey: ["dongPriceAnalysis", guCode, dongCode],
    queryFn: () => getDongPriceAnalysis(guCode, dongCode),
    enabled: Boolean(guCode && dongCode),
    staleTime: 1000 * 60 * 5,
  });
}

function useRegionPriceListQuery(guCode: string) {
  return useQuery({
    queryKey: ["regionPriceList", guCode],
    queryFn: () => getRegionPriceList(guCode),
    enabled: Boolean(guCode),
    staleTime: 1000 * 60 * 5,
  });
}

/* 지역별 월별 거래량 및 평균 거래가 추이 백엔드 API 연동 */
async function fetchRegionalMonthlyTrends(
  guCode: string,
  dongCode: string,
  period: PeriodType,
): Promise<MonthlyPoint[]> {
  const now = new Date();
  const endDate = formatYearMonth(now);
  const monthsAgo =
    period === "3M" ? 2 : period === "6M" ? 5 : period === "1Y" ? 12 : 36;
  const startDate = formatYearMonth(
    new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1),
  );

  try {
    const { data } = await apiMiddleware.get<{
      list?: Array<{
        period?: string;
        deal_cnt?: number;
        avg_thing_amt?: number;
      }>;
    }>("/fastApi/regional/monthly-trends", {
      params: {
        guCode,
        dongCode,
        period,
        startDate,
        endDate,
      },
    });

    if (data?.list && Array.isArray(data.list) && data.list.length > 0) {
      return data.list.map((item) => ({
        period: item.period || "",
        volume: Number(item.deal_cnt) || 0,
        avgPrice: Number(item.avg_thing_amt) || 0,
      }));
    }
    return [];
  } catch (error) {
    console.warn(
      "월별 거래량 및 평균 거래가 API 호출 실패(동적 날짜 기준 폴백 사용):",
      error,
    );
    return [];
  }
}

function useRegionalMonthlyTrendsQuery(
  guCode: string,
  dongCode: string,
  period: PeriodType,
) {
  return useQuery({
    queryKey: ["regionalMonthlyTrends", guCode, dongCode, period],
    queryFn: () => fetchRegionalMonthlyTrends(guCode, dongCode, period),
    enabled: Boolean(guCode && dongCode),
    staleTime: 1000 * 60 * 5,
  });
}

export interface RegionalSummaryResponse {
  totalCount?: number;
  totalCountDiff?: number;
  totalAmountText?: string;
  totalAmountDiff?: number;
  avgPriceText?: string;
  avgPriceDiff?: number;
  maxPriceText?: string;
  maxPriceDiff?: number;
  volumeGrowthRate?: number;
  volumeGrowthDiff?: number;
  insights?: Array<{
    id: string;
    title: string;
    subtitle: string;
    type: "up" | "chart" | "swap";
  }>;
}

/* 지역별 5대 요약 KPI 지표 및 인사이트 백엔드 API 연동 */
async function fetchRegionalSummary(
  guCode: string,
  dongCode: string,
  period: PeriodType,
): Promise<RegionalSummaryResponse | null> {
  try {
    const { data } = await apiMiddleware.get<RegionalSummaryResponse>(
      "/fastApi/regional/summary",
      {
        params: { guCode, dongCode, period },
      },
    );
    return data || null;
  } catch (error) {
    console.warn(
      "지역 요약 지표 API 호출 (백엔드 연동 대기/폴백 사용):",
      error,
    );
    return null;
  }
}

function useRegionalSummaryQuery(
  guCode: string,
  dongCode: string,
  period: PeriodType,
) {
  return useQuery({
    queryKey: ["regionalSummary", guCode, dongCode, period],
    queryFn: () => fetchRegionalSummary(guCode, dongCode, period),
    enabled: Boolean(guCode && dongCode),
    staleTime: 1000 * 60 * 5,
  });
}

export interface RegionalRecentTrade {
  contractDate: string;
  complexName: string;
  area: string;
  floor: string;
  status: string;
  price?: string;
}

export interface RegionalTopComplex {
  rank: number;
  complexName: string;
  count: number;
}

/* 최근 실거래 내역 백엔드 API 연동 */
async function fetchRegionalRecentTrades(
  guCode: string,
  dongCode: string,
): Promise<RegionalRecentTrade[]> {
  try {
    const { data } = await apiMiddleware.get<{
      list?: Array<{
        contract_date?: string;
        complex_name?: string;
        area?: string;
        floor?: string;
        status?: string;
        price?: string;
      }>;
    }>("/fastApi/regional/recent-trades", {
      params: { guCode, dongCode },
    });

    if (data?.list && Array.isArray(data.list) && data.list.length > 0) {
      return data.list.map((item) => ({
        contractDate: item.contract_date || "",
        complexName: item.complex_name || "",
        area: item.area || "",
        floor: item.floor || "",
        status: item.status || "거래 완료",
        price: item.price || "",
      }));
    }
    return [];
  } catch (error) {
    console.warn(
      "최근 실거래 내역 API 호출 (백엔드 연동 대기/폴백 사용):",
      error,
    );
    return [];
  }
}

function useRegionalRecentTradesQuery(guCode: string, dongCode: string) {
  return useQuery({
    queryKey: ["regionalRecentTrades", guCode, dongCode],
    queryFn: () => fetchRegionalRecentTrades(guCode, dongCode),
    enabled: Boolean(guCode && dongCode),
    staleTime: 1000 * 60 * 5,
  });
}

/* 거래량 상위 단지 TOP 5 백엔드 API 연동 */
async function fetchRegionalTopComplexes(
  guCode: string,
  dongCode: string,
  period: PeriodType,
): Promise<RegionalTopComplex[]> {
  try {
    const { data } = await apiMiddleware.get<{
      list?: Array<{
        rank?: number;
        complex_name?: string;
        count?: number;
      }>;
    }>("/fastApi/regional/top-complexes", {
      params: { guCode, dongCode, period },
    });

    if (data?.list && Array.isArray(data.list) && data.list.length > 0) {
      return data.list.map((item, idx) => ({
        rank: item.rank || idx + 1,
        complexName: item.complex_name || "",
        count: item.count || 0,
      }));
    }
    return [];
  } catch (error) {
    console.warn(
      "거래량 상위 단지 TOP 5 API 호출 (백엔드 연동 대기/폴백 사용):",
      error,
    );
    return [];
  }
}

function useRegionalTopComplexesQuery(
  guCode: string,
  dongCode: string,
  period: PeriodType,
) {
  return useQuery({
    queryKey: ["regionalTopComplexes", guCode, dongCode, period],
    queryFn: () => fetchRegionalTopComplexes(guCode, dongCode, period),
    enabled: Boolean(guCode && dongCode),
    staleTime: 1000 * 60 * 5,
  });
}

/* 지역별 거래동향 메인 컴포넌트 */
export default function MarketTrendsregionPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: sggList = [] } = useSggList();
  const urlGu = searchParams.get("gu") || "";
  const urlDong = searchParams.get("dong") || "";
  const urlPeriod = (searchParams.get("period") as PeriodType) || "1Y";

  const [customGuCode, setCustomGuCode] = useState<string | null>(null);
  const [customDongCode, setCustomDongCode] = useState<string | null>(null);
  const [typedGuText, setTypedGuText] = useState<string | null>(null);
  const [typedDongText, setTypedDongText] = useState<string | null>(null);
  const [isGuDropdownOpen, setIsGuDropdownOpen] = useState<boolean>(false);
  const [isDongDropdownOpen, setIsDongDropdownOpen] = useState<boolean>(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>(urlPeriod);
  const [isAllTradesModalOpen, setIsAllTradesModalOpen] =
    useState<boolean>(false);

  const todayFormatted = useMemo(() => formatYearMonthDay(new Date()), []);

  const guDropdownRef = useRef<HTMLDivElement>(null);
  const dongDropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        guDropdownRef.current &&
        !guDropdownRef.current.contains(event.target as Node)
      ) {
        setIsGuDropdownOpen(false);
      }
      if (
        dongDropdownRef.current &&
        !dongDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDongDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedGuCode = useMemo(() => {
    if (customGuCode !== null) {
      return customGuCode;
    }
    if (urlGu && sggList.length > 0) {
      const found = sggList.find((g) => g.sggNm === urlGu || g.sggCd === urlGu);
      if (found) return found.sggCd;
    }
    return "";
  }, [customGuCode, sggList, urlGu]);

  const guSearchText = useMemo(() => {
    if (typedGuText !== null) return typedGuText;
    if (selectedGuCode) {
      return sggList.find((g) => g.sggCd === selectedGuCode)?.sggNm || "";
    }
    return "";
  }, [typedGuText, selectedGuCode, sggList]);

  const { data: dongList = [] } = useDongList(selectedGuCode);

  const selectedDongCode = useMemo(() => {
    if (customDongCode !== null) {
      return customDongCode;
    }
    if (urlDong && dongList.length > 0) {
      const found = dongList.find(
        (d) => d.dongNm === urlDong || d.dongCd === urlDong,
      );
      if (found) return found.dongCd;
    }
    return "";
  }, [customDongCode, dongList, urlDong]);

  const dongSearchText = useMemo(() => {
    if (typedDongText !== null) return typedDongText;
    if (selectedDongCode) {
      return dongList.find((d) => d.dongCd === selectedDongCode)?.dongNm || "";
    }
    return "";
  }, [typedDongText, selectedDongCode, dongList]);

  const selectedGuName = useMemo(() => {
    return (
      sggList.find((g) => g.sggCd === selectedGuCode)?.sggNm || guSearchText
    );
  }, [sggList, selectedGuCode, guSearchText]);

  const selectedDongName = useMemo(() => {
    return (
      dongList.find((d) => d.dongCd === selectedDongCode)?.dongNm ||
      dongSearchText
    );
  }, [dongList, selectedDongCode, dongSearchText]);

  // 글자 입력 시 일치하는 자치구 목록 필터링 (화살표 클릭 시에는 전체 25개 자치구 목록 노출)
  const filteredSggList = useMemo(() => {
    if (!typedGuText || !typedGuText.trim()) return sggList;
    return sggList.filter((sgg) =>
      sgg.sggNm.toLowerCase().includes(typedGuText.trim().toLowerCase()),
    );
  }, [sggList, typedGuText]);

  // 글자 입력 시 일치하는 자치동 목록 필터링 (화살표 클릭 시에는 해당 구의 전체 동 목록 노출)
  const filteredDongList = useMemo(() => {
    if (!typedDongText || !typedDongText.trim()) return dongList;
    return dongList.filter((dong) =>
      dong.dongNm.toLowerCase().includes(typedDongText.trim().toLowerCase()),
    );
  }, [dongList, typedDongText]);

  const { data: dongAnalysis } = useDongPriceAnalysis(
    selectedGuCode,
    selectedDongCode,
  );
  useRegionPriceListQuery(selectedGuCode);

  /* 백엔드 월별 거래량 및 평균 거래가 데이터 쿼리 */
  const { data: backendMonthlyTrends } = useRegionalMonthlyTrendsQuery(
    selectedGuCode,
    selectedDongCode,
    selectedPeriod,
  );

  /* 백엔드 5대 요약 KPI 지표 및 인사이트 데이터 쿼리 */
  const { data: backendSummary } = useRegionalSummaryQuery(
    selectedGuCode,
    selectedDongCode,
    selectedPeriod,
  );

  /* 백엔드 최근 실거래 내역 쿼리 */
  const { data: backendRecentTrades } = useRegionalRecentTradesQuery(
    selectedGuCode,
    selectedDongCode,
  );

  /* 백엔드 거래량 상위 단지 TOP 5 쿼리 */
  const { data: backendTopComplexes } = useRegionalTopComplexesQuery(
    selectedGuCode,
    selectedDongCode,
    selectedPeriod,
  );

  const selectedPeriodOption = useMemo(() => {
    return (
      PERIOD_OPTIONS.find((opt) => opt.value === selectedPeriod) ||
      PERIOD_OPTIONS[2]
    );
  }, [selectedPeriod]);

  const syncToUrl = useCallback(
    (gu: string, dong: string, period: PeriodType) => {
      const params = new URLSearchParams();
      if (gu) params.set("gu", gu);
      if (dong) params.set("dong", dong);
      if (period) params.set("period", period);
      setSearchParams(params, { replace: true });
    },
    [setSearchParams],
  );

  const handleSearch = () => {
    syncToUrl(selectedGuName, selectedDongName, selectedPeriod);
  };

  const handleReset = () => {
    setCustomGuCode("");
    setCustomDongCode("");
    setTypedGuText("");
    setTypedDongText("");
    setSelectedPeriod("1Y");
    setSearchParams({}, { replace: true });
  };

  const currentData = useMemo<TrendDataset>(() => {
    const base = getDefaultTrendData(selectedPeriod);
    const monthlyList =
      backendMonthlyTrends && backendMonthlyTrends.length > 0
        ? backendMonthlyTrends
        : base.monthlyTrends;

    const avgPriceMillion =
      dongAnalysis && dongAnalysis.averageTradePrice > 0
        ? Math.round(dongAnalysis.averageTradePrice)
        : 0;
    const avgPriceFormatted =
      avgPriceMillion > 0
        ? avgPriceMillion >= 10000
          ? `${Math.floor(avgPriceMillion / 10000)}억 ${(avgPriceMillion % 10000).toLocaleString()}만원`
          : `${avgPriceMillion.toLocaleString()}만원`
        : "-";

    const topComplexesList = (dongAnalysis?.top || [])
      .slice(0, 5)
      .map((item, idx) => ({
        rank: idx + 1,
        complexName: item.name,
        count: item.dealCount || 0,
      }));

    const recentTradesList = (dongAnalysis?.top || [])
      .slice(0, 5)
      .map((item) => ({
        contractDate: "-",
        complexName: item.name,
        area: "-",
        floor: "-",
        status: "거래 완료",
        price:
          item.averageTradePrice > 0
            ? `${Math.round(item.averageTradePrice / 10000)}억 ${Math.round(item.averageTradePrice % 10000).toLocaleString()}`
            : "-",
      }));

    const maxTopPrice = dongAnalysis?.top?.[0]?.averageTradePrice
      ? Math.round(dongAnalysis.top[0].averageTradePrice)
      : 0;
    const maxPriceFormatted =
      maxTopPrice > 0
        ? maxTopPrice >= 10000
          ? `${Math.floor(maxTopPrice / 10000)}억 ${(maxTopPrice % 10000).toLocaleString()}만원`
          : `${maxTopPrice.toLocaleString()}만원`
        : "-";

    const mergedSummary = {
      totalCount:
        backendSummary?.totalCount ??
        dongAnalysis?.totalCount ??
        base.summary.totalCount,
      totalCountDiff:
        backendSummary?.totalCountDiff ?? base.summary.totalCountDiff,
      totalAmountText:
        backendSummary?.totalAmountText ?? base.summary.totalAmountText,
      totalAmountDiff:
        backendSummary?.totalAmountDiff ?? base.summary.totalAmountDiff,
      avgPriceText:
        backendSummary?.avgPriceText ??
        (dongAnalysis && avgPriceFormatted !== "-"
          ? avgPriceFormatted
          : base.summary.avgPriceText),
      avgPriceDiff: backendSummary?.avgPriceDiff ?? base.summary.avgPriceDiff,
      maxPriceText:
        backendSummary?.maxPriceText ??
        (dongAnalysis && maxPriceFormatted !== "-"
          ? maxPriceFormatted
          : base.summary.maxPriceText),
      maxPriceDiff: backendSummary?.maxPriceDiff ?? base.summary.maxPriceDiff,
      volumeGrowthRate:
        backendSummary?.volumeGrowthRate ?? base.summary.volumeGrowthRate,
      volumeGrowthDiff:
        backendSummary?.volumeGrowthDiff ?? base.summary.volumeGrowthDiff,
    };

    const mergedInsights =
      backendSummary?.insights && backendSummary.insights.length > 0
        ? backendSummary.insights
        : base.insights;

    const finalRecentTrades =
      backendRecentTrades && backendRecentTrades.length > 0
        ? backendRecentTrades
        : recentTradesList.length > 0
          ? recentTradesList
          : base.recentTrades;

    const finalTopComplexes =
      backendTopComplexes && backendTopComplexes.length > 0
        ? backendTopComplexes
        : topComplexesList.length > 0
          ? topComplexesList
          : base.topComplexes;

    return {
      ...base,
      monthlyTrends: monthlyList,
      summary: mergedSummary,
      insights: mergedInsights,
      topComplexes: finalTopComplexes,
      recentTrades: finalRecentTrades,
    };
  }, [
    dongAnalysis,
    backendMonthlyTrends,
    backendSummary,
    backendRecentTrades,
    backendTopComplexes,
    selectedPeriod,
  ]);

  /* 도넛 차트 conic-gradient 계산 */
  const donutConicGradient = useMemo(() => {
    const stops = currentData.areaDistribution.map((item, idx) => {
      const start = currentData.areaDistribution
        .slice(0, idx)
        .reduce((sum, seg) => sum + seg.percentage, 0);
      const end = start + item.percentage;
      return `${item.color} ${start}% ${end}%`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  }, [currentData.areaDistribution]);

  /* 콤보 차트 스케일 계산 (백엔드 실제 데이터 기반 동적 스케일링) */
  const maxVolume = useMemo(() => {
    const max = Math.max(...currentData.monthlyTrends.map((d) => d.volume), 0);
    if (max <= 0) return 250;
    return Math.ceil((max * 1.25) / 50) * 50;
  }, [currentData.monthlyTrends]);

  const maxPriceScale = useMemo(() => {
    const max = Math.max(
      ...currentData.monthlyTrends.map((d) => d.avgPrice),
      0,
    );
    if (max <= 0) return 120000;
    return Math.ceil((max * 1.15) / 10000) * 10000;
  }, [currentData.monthlyTrends]);

  const volumeTicks = useMemo(() => {
    return [
      maxVolume,
      Math.round(maxVolume * 0.8),
      Math.round(maxVolume * 0.6),
      Math.round(maxVolume * 0.4),
      Math.round(maxVolume * 0.2),
      0,
    ];
  }, [maxVolume]);

  const priceTicks = useMemo(() => {
    return [
      maxPriceScale,
      Math.round(maxPriceScale * 0.8),
      Math.round(maxPriceScale * 0.6),
      Math.round(maxPriceScale * 0.4),
      Math.round(maxPriceScale * 0.2),
      0,
    ];
  }, [maxPriceScale]);

  return (
    <div
      className={cn(
        "w-full",
        "min-h-screen",
        "bg-[#F8FAFC]",
        "text-[#0F172A]",
        "py-7",
        "px-4",
        "sm:px-6",
        "lg:px-8",
      )}
    >
      <div
        className={cn(
          "max-w-[1380px]",
          "mx-auto",
          "grid",
          "grid-cols-1",
          "lg:grid-cols-[210px_1fr]",
          "gap-6",
          "items-start",
        )}
      >
        {/* 좌측 사이드바 메뉴 */}
        <aside className={cn("w-full", "lg:sticky", "lg:top-20")}>
          <div
            className={cn(
              "rounded-xl",
              "border",
              "border-[#E2E8F0]",
              "bg-white",
              "p-4",
              "shadow-xs",
            )}
          >
            <h2
              className={cn(
                "text-[16px]",
                "font-bold",
                "text-[#0F172A]",
                "pb-3",
                "mb-2",
                "border-b",
                "border-[#F1F5F9]",
              )}
            >
              거래동향
            </h2>
            <nav
              className={cn("flex", "flex-col", "gap-1")}
              aria-label="거래동향 메뉴"
            >
              {TREND_NAV_ITEMS.map(({ label, to, icon: Icon, active }) => (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors no-underline",
                    active
                      ? "bg-[#EFF6FF] text-[#2563EB] font-bold"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]",
                  )}
                >
                  <Icon className={cn("size-4", "shrink-0")} />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {/* 우측 메인 콘텐츠 영역 */}
        <main className={cn("min-w-0", "space-y-5")}>
          {/* 상단 타이틀 & 초기화 버튼 */}
          <div className={cn("flex", "items-start", "justify-between")}>
            <div>
              <h1
                className={cn(
                  "text-[22px]",
                  "sm:text-[24px]",
                  "font-black",
                  "tracking-tight",
                  "text-[#0F172A]",
                )}
              >
                지역별 거래동향
              </h1>
              <p
                className={cn(
                  "mt-1",
                  "text-[13px]",
                  "font-normal",
                  "text-[#64748B]",
                )}
              >
                선택한 지역의 실거래 흐름과 가격 변화를 확인하세요.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className={cn(
                "h-8",
                "gap-1.5",
                "rounded-md",
                "border-[#CBD5E1]",
                "bg-white",
                "text-xs",
                "font-semibold",
                "text-[#475569]",
                "shadow-xs",
                "hover:bg-slate-50",
                "cursor-pointer",
              )}
            >
              <RotateCcw className="size-3.5" />
              <span>초기화</span>
            </Button>
          </div>

          {/* 필터 선택 바 */}
          <Card
            className={cn(
              "border-[#E2E8F0]",
              "bg-white",
              "shadow-xs",
              "rounded-xl",
            )}
          >
            <CardContent className={cn("p-3.5", "sm:p-4")}>
              <div className={cn("flex", "flex-wrap", "items-center", "gap-3")}>
                {/* 자치구 검색 및 선택 */}
                <div
                  ref={guDropdownRef}
                  className={cn(
                    "flex",
                    "items-center",
                    "gap-2",
                    "flex-1",
                    "min-w-[170px]",
                    "relative",
                  )}
                >
                  <span
                    className={cn(
                      "text-[13px]",
                      "font-semibold",
                      "text-[#475569]",
                      "shrink-0",
                    )}
                  >
                    자치구 선택
                  </span>
                  <div className={cn("relative", "flex-1")}>
                    <input
                      type="text"
                      value={guSearchText}
                      placeholder="자치구 입력 (예: 강남구)"
                      onClick={() => {
                        setTypedGuText(null);
                        setIsGuDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setTypedGuText(null);
                        setIsGuDropdownOpen(true);
                      }}
                      onChange={(e) => {
                        setTypedGuText(e.target.value);
                        setIsGuDropdownOpen(true);
                        setCustomGuCode("");
                        setCustomDongCode("");
                        setTypedDongText("");
                      }}
                      className={cn(
                        "w-full",
                        "h-9",
                        "pl-3",
                        "pr-8",
                        "bg-white",
                        "border",
                        "border-[#CBD5E1]",
                        "rounded-lg",
                        "text-[13px]",
                        "font-medium",
                        "text-[#0F172A]",
                        "outline-none",
                        "focus:border-[#2563EB]",
                      )}
                    />
                    <ChevronDown
                      onClick={() => {
                        setIsGuDropdownOpen((prev) => {
                          if (!prev) {
                            setTypedGuText(null);
                          }
                          return !prev;
                        });
                      }}
                      className={cn(
                        "size-4",
                        "text-[#64748B]",
                        "absolute",
                        "right-2.5",
                        "top-1/2",
                        "-translate-y-1/2",
                        "cursor-pointer",
                      )}
                    />

                    {isGuDropdownOpen && (
                      <div
                        className={cn(
                          "absolute",
                          "z-50",
                          "top-full",
                          "left-0",
                          "right-0",
                          "mt-1",
                          "max-h-56",
                          "overflow-y-auto",
                          "bg-white",
                          "border",
                          "border-[#CBD5E1]",
                          "rounded-lg",
                          "shadow-lg",
                          "py-1",
                        )}
                      >
                        {filteredSggList.length > 0 ? (
                          filteredSggList.map((sgg) => (
                            <button
                              key={sgg.sggCd}
                              type="button"
                              onClick={() => {
                                setCustomGuCode(sgg.sggCd);
                                setTypedGuText(null);
                                setIsGuDropdownOpen(false);
                                setCustomDongCode("");
                                setTypedDongText(null);
                              }}
                              className={cn(
                                "w-full",
                                "text-left",
                                "px-3",
                                "py-2",
                                "text-[13px]",
                                "hover:bg-[#EFF6FF]",
                                "hover:text-[#2563EB]",
                                selectedGuCode === sgg.sggCd &&
                                  "bg-[#EFF6FF] text-[#2563EB] font-bold",
                              )}
                            >
                              {sgg.sggNm}
                            </button>
                          ))
                        ) : (
                          <div
                            className={cn(
                              "px-3",
                              "py-2",
                              "text-xs",
                              "text-[#94A3B8]",
                              "text-center",
                            )}
                          >
                            일치하는 자치구가 없습니다.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 자치동 검색 및 선택 */}
                <div
                  ref={dongDropdownRef}
                  className={cn(
                    "flex",
                    "items-center",
                    "gap-2",
                    "flex-1",
                    "min-w-[170px]",
                    "relative",
                  )}
                >
                  <span
                    className={cn(
                      "text-[13px]",
                      "font-semibold",
                      "text-[#475569]",
                      "shrink-0",
                    )}
                  >
                    자치동 선택
                  </span>
                  <div className={cn("relative", "flex-1")}>
                    <input
                      type="text"
                      value={dongSearchText}
                      placeholder={
                        selectedGuCode
                          ? "자치동 입력 (예: 대치동)"
                          : "자치구를 먼저 선택하세요"
                      }
                      disabled={!selectedGuCode}
                      onClick={() => {
                        if (selectedGuCode) {
                          setTypedDongText(null);
                          setIsDongDropdownOpen(true);
                        }
                      }}
                      onFocus={() => {
                        if (selectedGuCode) {
                          setTypedDongText(null);
                          setIsDongDropdownOpen(true);
                        }
                      }}
                      onChange={(e) => {
                        setTypedDongText(e.target.value);
                        setIsDongDropdownOpen(true);
                        setCustomDongCode("");
                      }}
                      className={cn(
                        "w-full",
                        "h-9",
                        "pl-3",
                        "pr-8",
                        "bg-white",
                        "border",
                        "border-[#CBD5E1]",
                        "rounded-lg",
                        "text-[13px]",
                        "font-medium",
                        "text-[#0F172A]",
                        "outline-none",
                        "focus:border-[#2563EB]",
                        "disabled:bg-slate-100 disabled:cursor-not-allowed",
                      )}
                    />
                    <ChevronDown
                      onClick={() => {
                        if (selectedGuCode) {
                          setIsDongDropdownOpen((prev) => {
                            if (!prev) {
                              setTypedDongText(null);
                            }
                            return !prev;
                          });
                        }
                      }}
                      className={cn(
                        "size-4",
                        "text-[#64748B]",
                        "absolute",
                        "right-2.5",
                        "top-1/2",
                        "-translate-y-1/2",
                        "cursor-pointer",
                      )}
                    />

                    {isDongDropdownOpen && selectedGuCode && (
                      <div
                        className={cn(
                          "absolute",
                          "z-50",
                          "top-full",
                          "left-0",
                          "right-0",
                          "mt-1",
                          "max-h-56",
                          "overflow-y-auto",
                          "bg-white",
                          "border",
                          "border-[#CBD5E1]",
                          "rounded-lg",
                          "shadow-lg",
                          "py-1",
                        )}
                      >
                        {filteredDongList.length > 0 ? (
                          filteredDongList.map((dong) => (
                            <button
                              key={dong.dongCd}
                              type="button"
                              onClick={() => {
                                setCustomDongCode(dong.dongCd);
                                setTypedDongText(null);
                                setIsDongDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full",
                                "text-left",
                                "px-3",
                                "py-2",
                                "text-[13px]",
                                "hover:bg-[#EFF6FF]",
                                "hover:text-[#2563EB]",
                                selectedDongCode === dong.dongCd &&
                                  "bg-[#EFF6FF] text-[#2563EB] font-bold",
                              )}
                            >
                              {dong.dongNm}
                            </button>
                          ))
                        ) : (
                          <div
                            className={cn(
                              "px-3",
                              "py-2",
                              "text-xs",
                              "text-[#94A3B8]",
                              "text-center",
                            )}
                          >
                            일치하는 자치동이 없습니다.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 기간 선택 */}
                <div className={cn("relative", "min-w-[120px]")}>
                  <select
                    value={selectedPeriod}
                    onChange={(e) =>
                      setSelectedPeriod(e.target.value as PeriodType)
                    }
                    className={cn(
                      "w-full",
                      "h-9",
                      "pl-3",
                      "pr-8",
                      "bg-white",
                      "border",
                      "border-[#CBD5E1]",
                      "rounded-lg",
                      "text-[13px]",
                      "font-medium",
                      "text-[#0F172A]",
                      "outline-none",
                      "appearance-none",
                      "cursor-pointer",
                      "focus:border-[#2563EB]",
                    )}
                  >
                    {PERIOD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className={cn(
                      "size-4",
                      "text-[#64748B]",
                      "absolute",
                      "right-2.5",
                      "top-1/2",
                      "-translate-y-1/2",
                      "pointer-events-none",
                    )}
                  />
                </div>

                {/* 조회하기 버튼 */}
                <Button
                  type="button"
                  onClick={handleSearch}
                  className={cn(
                    "h-9",
                    "gap-1.5",
                    "rounded-lg",
                    "bg-[#2563EB]",
                    "px-5",
                    "text-[13px]",
                    "font-bold",
                    "text-white",
                    "shadow-xs",
                    "hover:bg-[#1D4ED8]",
                    "shrink-0",
                    "cursor-pointer",
                  )}
                >
                  <Search className="size-4" />
                  <span>조회하기</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 5개 상단 KPI 요약 카드 */}
          <div
            className={cn(
              "grid",
              "grid-cols-2",
              "sm:grid-cols-3",
              "lg:grid-cols-5",
              "gap-3.5",
            )}
          >
            {/* 1. 총 거래 건수 */}
            <Card
              className={cn(
                "border-[#E2E8F0]",
                "bg-white",
                "rounded-xl",
                "p-4",
                "shadow-xs",
              )}
            >
              <span
                className={cn("text-[12px]", "font-semibold", "text-[#64748B]")}
              >
                총 거래 건수
              </span>
              <div
                className={cn(
                  "mt-1.5",
                  "text-[20px]",
                  "font-black",
                  "text-[#2563EB]",
                )}
              >
                {currentData.summary.totalCount.toLocaleString()}건
              </div>
              <div
                className={cn(
                  "mt-1",
                  "text-[11px]",
                  "font-bold",
                  "text-rose-500",
                  "flex",
                  "items-center",
                  "gap-1",
                )}
              >
                <span className={cn("text-[#64748B]", "font-medium")}>
                  전년 대비
                </span>
                <span>▲ {currentData.summary.totalCountDiff}%</span>
              </div>
              <div
                className={cn(
                  "mt-0.5",
                  "text-[10px]",
                  "text-[#94A3B8]",
                  "font-medium",
                )}
              >
                ({selectedPeriodOption.rangeText})
              </div>
            </Card>

            {/* 2. 총 거래 금액 */}
            <Card
              className={cn(
                "border-[#E2E8F0]",
                "bg-white",
                "rounded-xl",
                "p-4",
                "shadow-xs",
              )}
            >
              <span
                className={cn("text-[12px]", "font-semibold", "text-[#64748B]")}
              >
                총 거래 금액
              </span>
              <div
                className={cn(
                  "mt-1.5",
                  "text-[20px]",
                  "font-black",
                  "text-[#2563EB]",
                )}
              >
                {currentData.summary.totalAmountText}
              </div>
              <div
                className={cn(
                  "mt-1",
                  "text-[11px]",
                  "font-bold",
                  "text-rose-500",
                  "flex",
                  "items-center",
                  "gap-1",
                )}
              >
                <span className={cn("text-[#64748B]", "font-medium")}>
                  전년 대비
                </span>
                <span>▲ {currentData.summary.totalAmountDiff}%</span>
              </div>
              <div
                className={cn(
                  "mt-0.5",
                  "text-[10px]",
                  "text-[#94A3B8]",
                  "font-medium",
                )}
              >
                ({selectedPeriodOption.rangeText})
              </div>
            </Card>

            {/* 3. 평균 거래가 */}
            <Card
              className={cn(
                "border-[#E2E8F0]",
                "bg-white",
                "rounded-xl",
                "p-4",
                "shadow-xs",
              )}
            >
              <span
                className={cn("text-[12px]", "font-semibold", "text-[#64748B]")}
              >
                평균 거래가
              </span>
              <div
                className={cn(
                  "mt-1.5",
                  "text-[20px]",
                  "font-black",
                  "text-[#2563EB]",
                )}
              >
                {currentData.summary.avgPriceText}
              </div>
              <div
                className={cn(
                  "mt-1",
                  "text-[11px]",
                  "font-bold",
                  "text-rose-500",
                  "flex",
                  "items-center",
                  "gap-1",
                )}
              >
                <span className={cn("text-[#64748B]", "font-medium")}>
                  전년 대비
                </span>
                <span>▲ {currentData.summary.avgPriceDiff}%</span>
              </div>
              <div
                className={cn(
                  "mt-0.5",
                  "text-[10px]",
                  "text-[#94A3B8]",
                  "font-medium",
                )}
              >
                ({selectedPeriodOption.rangeText})
              </div>
            </Card>

            {/* 4. 최고 거래가 */}
            <Card
              className={cn(
                "border-[#E2E8F0]",
                "bg-white",
                "rounded-xl",
                "p-4",
                "shadow-xs",
              )}
            >
              <span
                className={cn("text-[12px]", "font-semibold", "text-[#64748B]")}
              >
                최고 거래가
              </span>
              <div
                className={cn(
                  "mt-1.5",
                  "text-[20px]",
                  "font-black",
                  "text-[#2563EB]",
                )}
              >
                {currentData.summary.maxPriceText}
              </div>
              <div
                className={cn(
                  "mt-1",
                  "text-[11px]",
                  "font-bold",
                  "text-rose-500",
                  "flex",
                  "items-center",
                  "gap-1",
                )}
              >
                <span className={cn("text-[#64748B]", "font-medium")}>
                  전년 대비
                </span>
                <span>▲ {currentData.summary.maxPriceDiff}%</span>
              </div>
              <div
                className={cn(
                  "mt-0.5",
                  "text-[10px]",
                  "text-[#94A3B8]",
                  "font-medium",
                )}
              >
                ({selectedPeriodOption.rangeText})
              </div>
            </Card>

            {/* 5. 거래량 증감률 */}
            <Card
              className={cn(
                "border-[#E2E8F0]",
                "bg-white",
                "rounded-xl",
                "p-4",
                "shadow-xs",
                "col-span-2",
                "sm:col-span-1",
              )}
            >
              <span
                className={cn("text-[12px]", "font-semibold", "text-[#64748B]")}
              >
                거래량 증감률
              </span>
              <div
                className={cn(
                  "mt-1.5",
                  "text-[20px]",
                  "font-black",
                  "text-[#2563EB]",
                )}
              >
                {currentData.summary.volumeGrowthRate}%
              </div>
              <div
                className={cn(
                  "mt-1",
                  "text-[11px]",
                  "font-bold",
                  "text-rose-500",
                  "flex",
                  "items-center",
                  "gap-1",
                )}
              >
                <span className={cn("text-[#64748B]", "font-medium")}>
                  전년 대비
                </span>
                <span>▲ {currentData.summary.volumeGrowthDiff}%</span>
              </div>
              <div
                className={cn(
                  "mt-0.5",
                  "text-[10px]",
                  "text-[#94A3B8]",
                  "font-medium",
                )}
              >
                ({selectedPeriodOption.rangeText})
              </div>
            </Card>
          </div>

          {/* 중단 2단 차트 영역: 거래량/평균 거래가 추이 & 전용면적별 거래 비중 */}
          <div
            className={cn(
              "grid",
              "grid-cols-1",
              "lg:grid-cols-[1fr_360px]",
              "gap-5",
            )}
          >
            {/* 1. 거래량 및 평균 거래가 추이 (듀얼 축 콤보 차트) */}
            <Card
              className={cn(
                "border-[#E2E8F0]",
                "bg-white",
                "rounded-xl",
                "p-5",
                "shadow-xs",
              )}
            >
              <div
                className={cn(
                  "flex",
                  "items-center",
                  "justify-between",
                  "pb-3",
                  "border-b",
                  "border-[#F1F5F9]",
                )}
              >
                <h3
                  className={cn("text-[15px]", "font-bold", "text-[#0F172A]")}
                >
                  거래량 및 평균 거래가 추이
                </h3>
                <div
                  className={cn(
                    "flex",
                    "items-center",
                    "gap-4",
                    "text-xs",
                    "font-medium",
                  )}
                >
                  <div className={cn("flex", "items-center", "gap-1.5")}>
                    <span
                      className={cn("size-2.5", "rounded-xs", "bg-[#2563EB]")}
                    />
                    <span className="text-[#475569]">거래량(건)</span>
                  </div>
                  <div className={cn("flex", "items-center", "gap-1.5")}>
                    <span
                      className={cn("size-2.5", "rounded-full", "bg-[#16A34A]")}
                    />
                    <span className="text-[#475569]">평균 거래가(만원)</span>
                  </div>
                </div>
              </div>

              {/* 듀얼 축 SVG 콤보 차트 */}
              <div className={cn("relative", "h-[240px]", "pt-4")}>
                {/* Y축 레이블 (왼쪽: 거래량 / 오른쪽: 평균 거래가) */}
                <div
                  className={cn(
                    "absolute",
                    "inset-y-4",
                    "left-0",
                    "flex",
                    "flex-col",
                    "justify-between",
                    "text-[10px]",
                    "font-medium",
                    "text-[#94A3B8]",
                    "select-none",
                    "pointer-events-none",
                  )}
                >
                  {volumeTicks.map((tick, i) => (
                    <span key={`vol-tick-${i}`}>{tick.toLocaleString()}</span>
                  ))}
                </div>
                <div
                  className={cn(
                    "absolute",
                    "inset-y-4",
                    "right-0",
                    "flex",
                    "flex-col",
                    "justify-between",
                    "text-[10px]",
                    "font-medium",
                    "text-[#94A3B8]",
                    "select-none",
                    "pointer-events-none",
                    "text-right",
                  )}
                >
                  {priceTicks.map((tick, i) => (
                    <span key={`price-tick-${i}`}>{tick.toLocaleString()}</span>
                  ))}
                </div>

                {/* 그리드 라인 & 차트 컨테이너 */}
                <div
                  className={cn(
                    "mx-9",
                    "h-[190px]",
                    "border-b",
                    "border-[#E2E8F0]",
                    "relative",
                  )}
                >
                  {/* 가로 보조선 */}
                  <div
                    className={cn(
                      "absolute",
                      "inset-0",
                      "flex",
                      "flex-col",
                      "justify-between",
                      "pointer-events-none",
                      "opacity-40",
                    )}
                  >
                    <div
                      className={cn(
                        "border-b",
                        "border-dashed",
                        "border-[#CBD5E1]",
                      )}
                    />
                    <div
                      className={cn(
                        "border-b",
                        "border-dashed",
                        "border-[#CBD5E1]",
                      )}
                    />
                    <div
                      className={cn(
                        "border-b",
                        "border-dashed",
                        "border-[#CBD5E1]",
                      )}
                    />
                    <div
                      className={cn(
                        "border-b",
                        "border-dashed",
                        "border-[#CBD5E1]",
                      )}
                    />
                    <div
                      className={cn(
                        "border-b",
                        "border-dashed",
                        "border-[#CBD5E1]",
                      )}
                    />
                  </div>

                  {/* 막대 차트 & 꺾은선 오버레이 */}
                  <div
                    className={cn(
                      "absolute",
                      "inset-0",
                      "flex",
                      "items-end",
                      "justify-between",
                      "px-2",
                    )}
                  >
                    {currentData.monthlyTrends.map((point) => {
                      const barHeight = (point.volume / maxVolume) * 100;
                      return (
                        <div
                          key={point.period}
                          className={cn(
                            "flex-1",
                            "flex",
                            "flex-col",
                            "items-center",
                            "justify-end",
                            "h-full",
                            "group",
                            "relative",
                          )}
                        >
                          {/* 툴팁 */}
                          <div
                            className={cn(
                              "absolute",
                              "bottom-full",
                              "mb-1",
                              "hidden",
                              "group-hover:block",
                              "bg-[#0F172A]",
                              "text-white",
                              "text-[10px]",
                              "px-2",
                              "py-1",
                              "rounded",
                              "shadow-lg",
                              "whitespace-nowrap",
                              "z-20",
                              "pointer-events-none",
                            )}
                          >
                            {point.period} <br />
                            거래량: {point.volume}건 <br />
                            평균가: {point.avgPrice.toLocaleString()}만원
                          </div>
                          <div
                            style={{ height: `${barHeight}%` }}
                            className={cn(
                              "w-[18px]",
                              "sm:w-[22px]",
                              "bg-[#2563EB]",
                              "rounded-t-xs",
                              "hover:bg-[#1D4ED8]",
                              "transition-all",
                              "cursor-pointer",
                            )}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* 꺾은선 차트 SVG 레이어 */}
                  <svg
                    className={cn(
                      "absolute",
                      "inset-0",
                      "size-full",
                      "pointer-events-none",
                      "overflow-visible",
                    )}
                    viewBox="0 0 1000 100"
                    preserveAspectRatio="none"
                  >
                    {(() => {
                      const count = currentData.monthlyTrends.length;
                      if (count === 0) return null;
                      const points = currentData.monthlyTrends.map((pt, i) => {
                        const x = ((i + 0.5) / count) * 1000;
                        const y = 100 - (pt.avgPrice / maxPriceScale) * 100;
                        return { x, y };
                      });
                      const pathD = points
                        .map(
                          (p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`,
                        )
                        .join(" ");

                      return (
                        <>
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#16A34A"
                            strokeWidth="3"
                            vectorEffect="non-scaling-stroke"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {points.map((p, idx) => (
                            <circle
                              key={`dot-${idx}`}
                              cx={p.x}
                              cy={p.y}
                              r="5"
                              vectorEffect="non-scaling-stroke"
                              fill="#16A34A"
                              stroke="#FFFFFF"
                              strokeWidth="2"
                            />
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>

                {/* X축 날짜 레이블 */}
                <div
                  className={cn(
                    "mx-9",
                    "flex",
                    "justify-between",
                    "pt-2",
                    "text-[10px]",
                    "font-medium",
                    "text-[#64748B]",
                  )}
                >
                  {currentData.monthlyTrends.map((pt) => (
                    <span key={pt.period}>{pt.period}</span>
                  ))}
                </div>
              </div>
            </Card>

            {/* 2. 전용면적별 거래 비중 (원형 도넛 그래프) */}
            <Card
              className={cn(
                "border-[#E2E8F0]",
                "bg-white",
                "rounded-xl",
                "p-5",
                "shadow-xs",
                "flex",
                "flex-col",
                "justify-between",
              )}
            >
              <h3
                className={cn(
                  "text-[15px]",
                  "font-bold",
                  "text-[#0F172A]",
                  "pb-2",
                  "border-b",
                  "border-[#F1F5F9]",
                )}
              >
                전용면적별 거래 비중
              </h3>

              <div
                className={cn(
                  "flex",
                  "items-center",
                  "justify-between",
                  "gap-4",
                  "py-3",
                  "flex-1",
                )}
              >
                {/* 도넛 그래프 */}
                <div
                  className={cn(
                    "relative",
                    "size-[160px]",
                    "shrink-0",
                    "flex",
                    "items-center",
                    "justify-center",
                  )}
                >
                  <div
                    className={cn(
                      "size-full",
                      "rounded-full",
                      "transition-all",
                      "shadow-xs",
                    )}
                    style={{ background: donutConicGradient }}
                  />
                  <div
                    className={cn(
                      "absolute",
                      "inset-[24px]",
                      "bg-white",
                      "rounded-full",
                      "flex",
                      "flex-col",
                      "items-center",
                      "justify-center",
                      "text-center",
                      "shadow-xs",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[11px]",
                        "font-semibold",
                        "text-[#64748B]",
                      )}
                    >
                      총 거래
                    </span>
                    <span
                      className={cn(
                        "text-[15px]",
                        "font-black",
                        "text-[#0F172A]",
                      )}
                    >
                      {currentData.summary.totalCount.toLocaleString()}건
                    </span>
                  </div>
                </div>

                {/* 우측 범례 및 퍼센트 */}
                <div className={cn("flex-1", "space-y-2.5")}>
                  {currentData.areaDistribution.map((item) => (
                    <div
                      key={item.name}
                      className={cn(
                        "flex",
                        "items-center",
                        "justify-between",
                        "text-[12px]",
                      )}
                    >
                      <div className={cn("flex", "items-center", "gap-1.5")}>
                        <span
                          className={cn("size-2.5", "rounded-xs", "shrink-0")}
                          style={{ backgroundColor: item.color }}
                        />
                        <span className={cn("text-[#334155]", "font-medium")}>
                          {item.name}
                        </span>
                      </div>
                      <span className={cn("font-bold", "text-[#0F172A]")}>
                        {item.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* 하단 3개 카드: 최근 실거래 내역 | 거래량 상위 단지 TOP 5 | 거래 동향 요약 */}
          <div className={cn("grid", "grid-cols-1", "md:grid-cols-3", "gap-5")}>
            {/* 카드 1: 최근 실거래 내역 */}
            <Card
              className={cn(
                "border-[#E2E8F0]",
                "bg-white",
                "rounded-xl",
                "p-4",
                "shadow-xs",
                "flex",
                "flex-col",
                "justify-between",
              )}
            >
              <div>
                <h3
                  className={cn(
                    "text-[14px]",
                    "font-bold",
                    "text-[#0F172A]",
                    "pb-2.5",
                    "border-b",
                    "border-[#F1F5F9]",
                  )}
                >
                  최근 실거래 내역
                </h3>
                <div className={cn("pt-1", "overflow-x-auto")}>
                  <table className={cn("w-full", "text-[11px]")}>
                    <thead>
                      <tr
                        className={cn(
                          "text-[#64748B]",
                          "border-b",
                          "border-[#F1F5F9]",
                        )}
                      >
                        <th
                          className={cn("py-1.5", "font-semibold", "text-left")}
                        >
                          계약일
                        </th>
                        <th
                          className={cn("py-1.5", "font-semibold", "text-left")}
                        >
                          단지명
                        </th>
                        <th
                          className={cn(
                            "py-1.5",
                            "font-semibold",
                            "text-right",
                          )}
                        >
                          전용면적
                        </th>
                        <th
                          className={cn(
                            "py-1.5",
                            "font-semibold",
                            "text-center",
                          )}
                        >
                          층
                        </th>
                        <th
                          className={cn(
                            "py-1.5",
                            "font-semibold",
                            "text-right",
                          )}
                        >
                          거래가
                        </th>
                      </tr>
                    </thead>
                    <tbody className={cn("divide-y", "divide-[#F8FAFC]")}>
                      {currentData.recentTrades.length > 0 ? (
                        currentData.recentTrades.slice(0, 5).map((trade, i) => (
                          <tr key={`rt-${i}`} className="hover:bg-[#F8FAFC]">
                            <td className={cn("py-2", "text-[#64748B]")}>
                              {trade.contractDate}
                            </td>
                            <td
                              className={cn(
                                "py-2",
                                "font-bold",
                                "text-[#0F172A]",
                                "truncate",
                                "max-w-[90px]",
                              )}
                            >
                              {trade.complexName}
                            </td>
                            <td
                              className={cn(
                                "py-2",
                                "text-right",
                                "text-[#64748B]",
                              )}
                            >
                              {trade.area}
                            </td>
                            <td
                              className={cn(
                                "py-2",
                                "text-center",
                                "text-[#64748B]",
                              )}
                            >
                              {trade.floor}
                            </td>
                            <td
                              className={cn(
                                "py-2",
                                "text-right",
                                "font-medium",
                                "text-[#475569]",
                              )}
                            >
                              {trade.status}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className={cn(
                              "py-6",
                              "text-center",
                              "text-xs",
                              "text-[#94A3B8]",
                            )}
                          >
                            조회된 최근 실거래 내역이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAllTradesModalOpen(true)}
                className={cn(
                  "mt-3",
                  "pt-2.5",
                  "border-t",
                  "border-[#F1F5F9]",
                  "w-full",
                  "flex",
                  "items-center",
                  "justify-center",
                  "gap-1",
                  "text-[12px]",
                  "font-bold",
                  "text-[#2563EB]",
                  "hover:underline",
                  "cursor-pointer",
                )}
              >
                <span>전체 실거래 내역 보기</span>
                <ChevronRight className="size-3.5" />
              </button>
            </Card>

            {/* 카드 2: 거래량 상위 단지 TOP 5 */}
            <Card
              className={cn(
                "border-[#E2E8F0]",
                "bg-white",
                "rounded-xl",
                "p-4",
                "shadow-xs",
              )}
            >
              <h3
                className={cn(
                  "text-[14px]",
                  "font-bold",
                  "text-[#0F172A]",
                  "pb-2.5",
                  "border-b",
                  "border-[#F1F5F9]",
                )}
              >
                거래량 상위 단지 TOP 5
              </h3>
              <div className={cn("pt-1", "overflow-x-auto")}>
                <table className={cn("w-full", "text-[11px]")}>
                  <thead>
                    <tr
                      className={cn(
                        "text-[#64748B]",
                        "border-b",
                        "border-[#F1F5F9]",
                      )}
                    >
                      <th
                        className={cn(
                          "py-1.5",
                          "font-semibold",
                          "text-center",
                          "w-8",
                        )}
                      >
                        순위
                      </th>
                      <th
                        className={cn("py-1.5", "font-semibold", "text-left")}
                      >
                        단지명
                      </th>
                      <th
                        className={cn("py-1.5", "font-semibold", "text-right")}
                      >
                        거래건수
                      </th>
                    </tr>
                  </thead>
                  <tbody className={cn("divide-y", "divide-[#F8FAFC]")}>
                    {currentData.topComplexes.length > 0 ? (
                      currentData.topComplexes.map((item) => (
                        <tr
                          key={`tc-${item.rank}`}
                          className="hover:bg-[#F8FAFC]"
                        >
                          <td
                            className={cn(
                              "py-2",
                              "text-center",
                              "font-bold",
                              "text-[#0F172A]",
                            )}
                          >
                            {item.rank}
                          </td>
                          <td
                            className={cn(
                              "py-2",
                              "font-medium",
                              "text-[#0F172A]",
                              "truncate",
                              "max-w-[130px]",
                            )}
                          >
                            {item.complexName}
                          </td>
                          <td
                            className={cn(
                              "py-2",
                              "text-right",
                              "font-bold",
                              "text-[#334155]",
                            )}
                          >
                            {item.count}건
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className={cn(
                            "py-6",
                            "text-center",
                            "text-xs",
                            "text-[#94A3B8]",
                          )}
                        >
                          조회된 상위 단지가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* 카드 3: 거래 동향 요약 */}
            <Card
              className={cn(
                "border-[#E2E8F0]",
                "bg-white",
                "rounded-xl",
                "p-4",
                "shadow-xs",
              )}
            >
              <h3
                className={cn(
                  "text-[14px]",
                  "font-bold",
                  "text-[#0F172A]",
                  "pb-2.5",
                  "border-b",
                  "border-[#F1F5F9]",
                )}
              >
                거래 동향 요약
              </h3>
              <div className={cn("space-y-3", "pt-2")}>
                {currentData.insights.length > 0 ? (
                  currentData.insights.map((insight) => (
                    <div
                      key={insight.id}
                      className={cn("flex", "items-start", "gap-2.5")}
                    >
                      <span
                        className={cn(
                          "size-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                          insight.type === "up"
                            ? "bg-emerald-50 text-emerald-600"
                            : insight.type === "chart"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-teal-50 text-teal-600",
                        )}
                      >
                        {insight.type === "up" && (
                          <TrendingUp className="size-3.5" />
                        )}
                        {insight.type === "chart" && (
                          <BarChart2 className="size-3.5" />
                        )}
                        {insight.type === "swap" && (
                          <ArrowUpDown className="size-3.5" />
                        )}
                      </span>
                      <div className={cn("text-[11px]", "leading-snug")}>
                        <div className={cn("font-bold", "text-[#0F172A]")}>
                          {insight.title}
                        </div>
                        <div className={cn("text-[#64748B]", "mt-0.5")}>
                          {insight.subtitle}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    className={cn(
                      "py-6",
                      "text-center",
                      "text-xs",
                      "text-[#94A3B8]",
                    )}
                  >
                    조회된 동향 요약 정보가 없습니다.
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* 하단 푸터 메타정보 */}
          <div
            className={cn(
              "flex",
              "flex-wrap",
              "items-center",
              "justify-between",
              "text-[11px]",
              "text-[#94A3B8]",
              "pt-2",
            )}
          >
            <div className={cn("flex", "items-center", "gap-1.5")}>
              <Info className="size-3.5" />
              <span>
                본 정보는 서울시 열린데이터광장 부동산 실거래가 공개시스템
                데이터를 기반으로 제공되며, 실제 거래가와 차이가 있을 수
                있습니다.
              </span>
            </div>
            <span>데이터 기준일: {todayFormatted}</span>
          </div>
        </main>
      </div>

      {/* 전체 실거래 내역 모달 */}
      {isAllTradesModalOpen && (
        <div
          className={cn(
            "fixed",
            "inset-0",
            "z-50",
            "flex",
            "items-center",
            "justify-center",
            "bg-black/40",
            "p-4",
          )}
        >
          <div
            className={cn(
              "bg-white",
              "rounded-xl",
              "w-full",
              "max-w-[760px]",
              "max-h-[85vh]",
              "flex",
              "flex-col",
              "shadow-xl",
            )}
          >
            <div
              className={cn(
                "flex",
                "items-center",
                "justify-between",
                "p-4",
                "border-b",
                "border-[#E2E8F0]",
              )}
            >
              <h3 className={cn("text-[15px]", "font-bold", "text-[#0F172A]")}>
                {selectedGuName} {selectedDongName} 전체 실거래 내역
              </h3>
              <button
                type="button"
                onClick={() => setIsAllTradesModalOpen(false)}
                className={cn(
                  "p-1",
                  "text-[#64748B]",
                  "hover:text-[#0F172A]",
                  "cursor-pointer",
                )}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className={cn("p-4", "overflow-y-auto", "flex-1")}>
              <Table>
                <TableHeader>
                  <TableRow className={cn("border-[#E2E8F0]", "bg-[#F8FAFC]")}>
                    <TableHead
                      className={cn("text-xs", "font-bold", "text-[#0F172A]")}
                    >
                      계약일
                    </TableHead>
                    <TableHead
                      className={cn("text-xs", "font-bold", "text-[#0F172A]")}
                    >
                      단지명
                    </TableHead>
                    <TableHead
                      className={cn("text-xs", "font-bold", "text-[#0F172A]")}
                    >
                      전용면적
                    </TableHead>
                    <TableHead
                      className={cn("text-xs", "font-bold", "text-[#0F172A]")}
                    >
                      층
                    </TableHead>
                    <TableHead
                      className={cn("text-xs", "font-bold", "text-[#0F172A]")}
                    >
                      거래가
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.recentTrades.length > 0 ? (
                    currentData.recentTrades.map((trade, idx) => (
                      <TableRow
                        key={`modal-${idx}`}
                        className="border-[#E2E8F0]"
                      >
                        <TableCell className={cn("text-xs", "text-[#64748B]")}>
                          {trade.contractDate}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-xs",
                            "font-bold",
                            "text-[#0F172A]",
                          )}
                        >
                          {trade.complexName}
                        </TableCell>
                        <TableCell className={cn("text-xs", "text-[#64748B]")}>
                          {trade.area}
                        </TableCell>
                        <TableCell className={cn("text-xs", "text-[#64748B]")}>
                          {trade.floor}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-xs",
                            "font-semibold",
                            "text-[#2563EB]",
                          )}
                        >
                          {trade.price || "거래 완료"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className={cn(
                          "py-8",
                          "text-center",
                          "text-xs",
                          "text-[#94A3B8]",
                        )}
                      >
                        조회된 실거래 내역이 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div
              className={cn(
                "p-3",
                "border-t",
                "border-[#E2E8F0]",
                "flex",
                "justify-end",
              )}
            >
              <Button
                type="button"
                onClick={() => setIsAllTradesModalOpen(false)}
                className={cn(
                  "bg-[#2563EB]",
                  "text-white",
                  "px-4",
                  "h-8",
                  "rounded-md",
                  "text-xs",
                  "font-bold",
                  "hover:bg-[#1D4ED8]",
                  "cursor-pointer",
                )}
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
