import React, { useState, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  RotateCcw,
  Search,
  ChevronDown,
  Info,
  Building2,
  MapPin,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

/* 타입 및 상수 정의 */
type PeriodType = "3M" | "6M" | "1Y" | "3Y";

interface PeriodOption {
  value: PeriodType;
  label: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: "3M", label: "최근 3개월" },
  { value: "6M", label: "최근 6개월" },
  { value: "1Y", label: "최근 1년" },
  { value: "3Y", label: "최근 3년" },
];

/* 사이드바 메뉴 정의 */
const TREND_NAV_ITEMS = [
  { label: "아파트별 거래동향", to: "/trends/apartment", icon: Building2 },
  { label: "지역별 거래동향", to: "/trends/region", icon: MapPin },
];

interface TrendDataset {
  summary: {
    totalCount: number;
    totalCountDiff: number;
    totalAmount: string;
    totalAmountDiff: number;
    avgPrice: string;
    avgPriceDiff: number;
    maxPrice: string;
    maxPriceDiff: number;
    volumeGrowthRate: number;
    volumeGrowthDiff: number;
  };
  monthlyTrends: Array<{
    period: string;
    volume: number;
    priceIndex: number;
  }>;
  areaDistribution: Array<{
    areaGroup: string;
    count: number;
    percentage: number;
  }>;
  recentTrades: Array<{
    contractDate: string;
    complexName: string;
    area: string;
    type: "매매" | "전세";
    price: string;
  }>;
  areaRankings: Array<{
    rank: number;
    complexName: string;
    count: number;
  }>;
  insights: Array<{
    id: string;
    type: "up" | "building" | "switch";
    text: string;
  }>;
}

const SAMPLE_DATA: Record<PeriodType, TrendDataset> = {
  "1Y": {
    summary: {
      totalCount: 128,
      totalCountDiff: 8.7,
      totalAmount: "2,840억원",
      totalAmountDiff: 12.3,
      avgPrice: "22억 1,900만원",
      avgPriceDiff: 3.6,
      maxPrice: "32억 5,000만원",
      maxPriceDiff: 5.2,
      volumeGrowthRate: 8.7,
      volumeGrowthDiff: 8.7,
    },
    monthlyTrends: [
      { period: "23.05", volume: 38, priceIndex: 42 },
      { period: "23.07", volume: 42, priceIndex: 46 },
      { period: "23.09", volume: 65, priceIndex: 52 },
      { period: "23.11", volume: 34, priceIndex: 49 },
      { period: "24.01", volume: 56, priceIndex: 54 },
      { period: "24.03", volume: 52, priceIndex: 51 },
      { period: "24.05", volume: 72, priceIndex: 58 },
    ],
    areaDistribution: [
      { areaGroup: "115㎡ 이상", count: 104, percentage: 14.8 },
      { areaGroup: "85~114㎡", count: 215, percentage: 26.6 },
      { areaGroup: "60~84㎡", count: 578, percentage: 42.5 },
      { areaGroup: "59㎡ 이하", count: 351, percentage: 16.1 },
    ],
    recentTrades: [
      {
        contractDate: "24.05.19",
        complexName: "래미안대치팰리스",
        area: "84.98㎡",
        type: "매매",
        price: "28억 9,000",
      },
      {
        contractDate: "24.05.18",
        complexName: "디에이치자이개포",
        area: "103.93㎡",
        type: "매매",
        price: "32억 5,000",
      },
      {
        contractDate: "24.05.17",
        complexName: "은마아파트",
        area: "76.79㎡",
        type: "전세",
        price: "8억 5,000",
      },
      {
        contractDate: "24.05.16",
        complexName: "대치푸르지오써밋",
        area: "59.91㎡",
        type: "매매",
        price: "21억 2,000",
      },
      {
        contractDate: "24.05.15",
        complexName: "선경아파트",
        area: "84.50㎡",
        type: "매매",
        price: "27억 3,000",
      },
    ],
    areaRankings: [
      { rank: 1, complexName: "래미안대치팰리스", count: 128 },
      { rank: 2, complexName: "디에이치자이개포", count: 96 },
      { rank: 3, complexName: "은마아파트", count: 88 },
      { rank: 4, complexName: "대치푸르지오써밋", count: 76 },
      { rank: 5, complexName: "선경아파트", count: 64 },
    ],
    insights: [
      { id: "1", type: "up", text: "거래량이 전년 대비 8.7% 증가했어요." },
      { id: "2", type: "building", text: "평균 거래가는 3.6% 상승했어요." },
      { id: "3", type: "switch", text: "85~114㎡ 거래 비중이 26.6%로 높아요." },
    ],
  },
  "3M": {
    summary: {
      totalCount: 42,
      totalCountDiff: 4.2,
      totalAmount: "980억원",
      totalAmountDiff: 6.8,
      avgPrice: "23억 3,300만원",
      avgPriceDiff: 2.1,
      maxPrice: "32억 5,000만원",
      maxPriceDiff: 3.4,
      volumeGrowthRate: 4.2,
      volumeGrowthDiff: 4.2,
    },
    monthlyTrends: [
      { period: "24.03", volume: 52, priceIndex: 51 },
      { period: "24.04", volume: 60, priceIndex: 55 },
      { period: "24.05", volume: 72, priceIndex: 58 },
    ],
    areaDistribution: [
      { areaGroup: "115㎡ 이상", count: 35, percentage: 15.2 },
      { areaGroup: "85~114㎡", count: 68, percentage: 28.5 },
      { areaGroup: "60~84㎡", count: 172, percentage: 41.2 },
      { areaGroup: "59㎡ 이하", count: 94, percentage: 15.1 },
    ],
    recentTrades: [
      {
        contractDate: "24.05.19",
        complexName: "래미안대치팰리스",
        area: "84.98㎡",
        type: "매매",
        price: "28억 9,000",
      },
      {
        contractDate: "24.05.18",
        complexName: "디에이치자이개포",
        area: "103.93㎡",
        type: "매매",
        price: "32억 5,000",
      },
      {
        contractDate: "24.05.17",
        complexName: "은마아파트",
        area: "76.79㎡",
        type: "전세",
        price: "8억 5,000",
      },
    ],
    areaRankings: [
      { rank: 1, complexName: "래미안대치팰리스", count: 42 },
      { rank: 2, complexName: "디에이치자이개포", count: 31 },
      { rank: 3, complexName: "은마아파트", count: 28 },
    ],
    insights: [
      { id: "1", type: "up", text: "최근 3개월간 거래량이 4.2% 증가했어요." },
      {
        id: "2",
        type: "building",
        text: "평균 거래가는 2.1% 상승세를 유지 중입니다.",
      },
      {
        id: "3",
        type: "switch",
        text: "중대형 85~114㎡ 거래 선호도가 지속되고 있어요.",
      },
    ],
  },
  "6M": {
    summary: {
      totalCount: 78,
      totalCountDiff: 6.5,
      totalAmount: "1,750억원",
      totalAmountDiff: 9.1,
      avgPrice: "22억 8,000만원",
      avgPriceDiff: 2.9,
      maxPrice: "32억 5,000만원",
      maxPriceDiff: 4.8,
      volumeGrowthRate: 6.5,
      volumeGrowthDiff: 6.5,
    },
    monthlyTrends: [
      { period: "23.12", volume: 48, priceIndex: 50 },
      { period: "24.01", volume: 56, priceIndex: 54 },
      { period: "24.02", volume: 45, priceIndex: 52 },
      { period: "24.03", volume: 52, priceIndex: 51 },
      { period: "24.04", volume: 60, priceIndex: 55 },
      { period: "24.05", volume: 72, priceIndex: 58 },
    ],
    areaDistribution: [
      { areaGroup: "115㎡ 이상", count: 62, percentage: 14.5 },
      { areaGroup: "85~114㎡", count: 125, percentage: 27.2 },
      { areaGroup: "60~84㎡", count: 320, percentage: 42.0 },
      { areaGroup: "59㎡ 이하", count: 190, percentage: 16.3 },
    ],
    recentTrades: [
      {
        contractDate: "24.05.19",
        complexName: "래미안대치팰리스",
        area: "84.98㎡",
        type: "매매",
        price: "28억 9,000",
      },
      {
        contractDate: "24.05.18",
        complexName: "디에이치자이개포",
        area: "103.93㎡",
        type: "매매",
        price: "32억 5,000",
      },
      {
        contractDate: "24.05.17",
        complexName: "은마아파트",
        area: "76.79㎡",
        type: "전세",
        price: "8억 5,000",
      },
      {
        contractDate: "24.05.16",
        complexName: "대치푸르지오써밋",
        area: "59.91㎡",
        type: "매매",
        price: "21억 2,000",
      },
    ],
    areaRankings: [
      { rank: 1, complexName: "래미안대치팰리스", count: 78 },
      { rank: 2, complexName: "디에이치자이개포", count: 54 },
      { rank: 3, complexName: "은마아파트", count: 49 },
      { rank: 4, complexName: "대치푸르지오써밋", count: 41 },
    ],
    insights: [
      {
        id: "1",
        type: "up",
        text: "상반기 거래량이 전년동기 대비 6.5% 상승했습니다.",
      },
      {
        id: "2",
        type: "building",
        text: "평균 거래가는 2.9% 완만한 상승세를 기록했습니다.",
      },
      {
        id: "3",
        type: "switch",
        text: "실수요자 중심 60~84㎡가 전체의 42%를 차지했습니다.",
      },
    ],
  },
  "3Y": {
    summary: {
      totalCount: 380,
      totalCountDiff: 15.4,
      totalAmount: "7,920억원",
      totalAmountDiff: 21.0,
      avgPrice: "20억 8,400만원",
      avgPriceDiff: 7.2,
      maxPrice: "33억 8,000만원",
      maxPriceDiff: 9.5,
      volumeGrowthRate: 15.4,
      volumeGrowthDiff: 15.4,
    },
    monthlyTrends: [
      { period: "21.05", volume: 62, priceIndex: 68 },
      { period: "21.11", volume: 45, priceIndex: 72 },
      { period: "22.05", volume: 32, priceIndex: 64 },
      { period: "22.11", volume: 22, priceIndex: 48 },
      { period: "23.05", volume: 38, priceIndex: 42 },
      { period: "23.11", volume: 34, priceIndex: 49 },
      { period: "24.05", volume: 72, priceIndex: 58 },
    ],
    areaDistribution: [
      { areaGroup: "115㎡ 이상", count: 290, percentage: 15.1 },
      { areaGroup: "85~114㎡", count: 610, percentage: 26.9 },
      { areaGroup: "60~84㎡", count: 1420, percentage: 41.8 },
      { areaGroup: "59㎡ 이하", count: 860, percentage: 16.2 },
    ],
    recentTrades: [
      {
        contractDate: "24.05.19",
        complexName: "래미안대치팰리스",
        area: "84.98㎡",
        type: "매매",
        price: "28억 9,000",
      },
      {
        contractDate: "24.05.18",
        complexName: "디에이치자이개포",
        area: "103.93㎡",
        type: "매매",
        price: "32억 5,000",
      },
      {
        contractDate: "24.05.17",
        complexName: "은마아파트",
        area: "76.79㎡",
        type: "전세",
        price: "8억 5,000",
      },
      {
        contractDate: "24.05.16",
        complexName: "대치푸르지오써밋",
        area: "59.91㎡",
        type: "매매",
        price: "21억 2,000",
      },
      {
        contractDate: "24.05.15",
        complexName: "선경아파트",
        area: "84.50㎡",
        type: "매매",
        price: "27억 3,000",
      },
    ],
    areaRankings: [
      { rank: 1, complexName: "래미안대치팰리스", count: 380 },
      { rank: 2, complexName: "디에이치자이개포", count: 290 },
      { rank: 3, complexName: "은마아파트", count: 265 },
      { rank: 4, complexName: "대치푸르지오써밋", count: 210 },
      { rank: 5, complexName: "선경아파트", count: 185 },
    ],
    insights: [
      {
        id: "1",
        type: "up",
        text: "3개년 누적 거래 회복세가 뚜렷하게 나타나고 있습니다.",
      },
      {
        id: "2",
        type: "building",
        text: "2022년 저점 통과 후 전고점의 85% 수준을 회복했습니다.",
      },
      {
        id: "3",
        type: "switch",
        text: "전용 60~84㎡ 국민평형이 꾸준히 최대 거래량을 견인했습니다.",
      },
    ],
  },
};

/* 아파트 거래동향 데이터 조회 API 래퍼 */
const fetchApartmentMarketTrends = async (
  _keyword: string,
  period: PeriodType,
): Promise<TrendDataset> => {
  /* 실제 백엔드 연동 시 여기서 axios/fetch 호출 (현재는 모의 데이터 반환) */
  return Promise.resolve(SAMPLE_DATA[period] ?? SAMPLE_DATA["1Y"]);
};

/* 메인 컴포넌트 */
export default function MarketTrendsAptPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  /* URL 파라미터 기반 상태 초기화 */
  const initialApt =
    searchParams.get("apt") ?? "래미안대치팰리스 강남구 대치동";
  const initialPeriod = (searchParams.get("period") as PeriodType) || "1Y";

  const [apartmentKeyword, setApartmentKeyword] = useState<string>(initialApt);
  const [selectedPeriod, setSelectedPeriod] =
    useState<PeriodType>(initialPeriod);
  const [isPeriodOpen, setIsPeriodOpen] = useState<boolean>(false);

  /* useQuery를 활용한 데이터 패칭 */
  const { data: trendData } = useQuery<TrendDataset>({
    queryKey: ["apartmentMarketTrends", initialApt, selectedPeriod],
    queryFn: () => fetchApartmentMarketTrends(initialApt, selectedPeriod),
    initialData: SAMPLE_DATA[selectedPeriod] || SAMPLE_DATA["1Y"],
    staleTime: 1000 * 60 * 5,
  });

  const currentData = useMemo(
    () => trendData ?? SAMPLE_DATA[selectedPeriod] ?? SAMPLE_DATA["1Y"],
    [trendData, selectedPeriod],
  );

  /* URL 동기화 핸들러 */
  const syncToUrl = useCallback(
    (apt: string, period: PeriodType) => {
      const params = new URLSearchParams();
      if (apt) params.set("apt", apt);
      if (period) params.set("period", period);
      setSearchParams(params, { replace: true });
    },
    [setSearchParams],
  );

  /* 검색 및 필터 이벤트 핸들러 */
  const handleSearch = useCallback(() => {
    syncToUrl(apartmentKeyword, selectedPeriod);
  }, [apartmentKeyword, selectedPeriod, syncToUrl]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch],
  );

  const handlePeriodSelect = useCallback(
    (period: PeriodType) => {
      setSelectedPeriod(period);
      setIsPeriodOpen(false);
      syncToUrl(apartmentKeyword, period);
    },
    [apartmentKeyword, syncToUrl],
  );

  const handleReset = useCallback(() => {
    setApartmentKeyword("");
    setSelectedPeriod("1Y");
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  /* 차트 스케일 계산 */
  const maxVolumeVal = useMemo(() => {
    const maxVal = Math.max(
      ...currentData.monthlyTrends.map((t) => t.volume),
      1,
    );
    return Math.ceil(maxVal / 10) * 10;
  }, [currentData]);

  const maxPriceIndexVal = useMemo(() => {
    const maxVal = Math.max(
      ...currentData.monthlyTrends.map((t) => t.priceIndex),
      1,
    );
    return Math.ceil(maxVal / 10) * 10;
  }, [currentData]);

  const maxAreaCount = useMemo(() => {
    const maxVal = Math.max(
      ...currentData.areaDistribution.map((a) => a.count),
      1,
    );
    return Math.max(maxVal, 800);
  }, [currentData]);

  return (
    <div
      className={cn(
        "w-full",
        "min-h-screen",
        "bg-[#F5FAFC]",
        "text-[#13202B]",
        "py-8",
        "px-4",
        "sm:px-6",
        "lg:px-8",
      )}
    >
      <div
        className={cn(
          "max-w-[1360px]",
          "mx-auto",
          "grid",
          "grid-cols-1",
          "lg:grid-cols-[240px_1fr]",
          "gap-8",
          "items-start",
        )}
      >
        {/* 좌측 사이드바 메뉴 */}
        <aside className={cn("w-full", "lg:sticky", "lg:top-24")}>
          <div
            className={cn(
              "rounded-[16px]",
              "border",
              "border-[#DCE8ED]",
              "bg-white",
              "p-5",
              "shadow-xs",
            )}
          >
            <h2
              className={cn(
                "text-[17px]",
                "font-black",
                "tracking-tight",
                "text-[#123047]",
                "pb-3.5",
                "mb-3",
                "border-b",
                "border-[#DCE8ED]",
              )}
            >
              거래동향
            </h2>
            <nav
              className={cn("flex", "flex-col", "gap-1.5")}
              aria-label="거래동향 메뉴"
            >
              {TREND_NAV_ITEMS.map(({ label, to, icon: Icon }) => {
                const isActive = to === "/trends/apartment";
                return (
                  <Link
                    key={to}
                    to={to}
                    className={cn(
                      "flex items-center gap-2.5 rounded-[9px] px-3.5 py-2.5 text-[13px] font-semibold transition-all no-underline",
                      isActive
                        ? "bg-[#0F8AA8] text-white font-bold shadow-xs"
                        : "text-[#6B7280] hover:bg-[#E8F6F9] hover:text-[#0F8AA8]",
                    )}
                  >
                    <Icon className={cn("size-4", "shrink-0")} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>

            <div
              className={cn(
                "mt-6",
                "rounded-[10px]",
                "border",
                "border-[#E0EFF3]",
                "bg-[#F3FAFC]",
                "p-3.5",
                "text-[11px]",
                "text-[#557B88]",
                "leading-relaxed",
              )}
            >
              <div
                className={cn(
                  "flex",
                  "items-center",
                  "gap-1.5",
                  "font-bold",
                  "text-[#0F8AA8]",
                  "mb-1.5",
                  "text-[12px]",
                )}
              >
                <HelpCircle className={cn("size-3.5", "shrink-0")} />
                <span>이용 안내</span>
              </div>
              <p className="m-0">
                아파트명을 검색하고 조회 기간을 선택하여 실거래 흐름과
                전용면적별 거래 비중을 확인하세요.
              </p>
            </div>
          </div>
        </aside>

        {/* 우측 메인 콘텐츠 영역 */}
        <main className={cn("min-w-0", "space-y-6")}>
          {/* 헤더 및 초기화 */}
          <div className={cn("flex", "items-start", "justify-between")}>
            <div>
              <h1
                className={cn(
                  "text-2xl",
                  "sm:text-[28px]",
                  "font-black",
                  "tracking-tight",
                  "text-[#123047]",
                )}
              >
                아파트별 거래동향
              </h1>
              <p
                className={cn(
                  "mt-1",
                  "text-xs",
                  "sm:text-sm",
                  "font-medium",
                  "text-[#64748B]",
                )}
              >
                관심 아파트의 실거래 흐름과 가격 변화를 확인하세요.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className={cn(
                "h-9",
                "gap-1.5",
                "rounded-lg",
                "border-[#DCE8ED]",
                "bg-white",
                "text-xs",
                "font-medium",
                "text-[#64748B]",
                "shadow-xs",
                "hover:bg-slate-50",
                "hover:text-[#123047]",
                "cursor-pointer",
              )}
            >
              <RotateCcw className="size-3.5" />
              <span>초기화</span>
            </Button>
          </div>

          {/* 아파트 검색 및 기간 필터 */}
          <Card
            className={cn(
              "border-[#DCE8ED]",
              "bg-white",
              "shadow-xs",
              "rounded-[16px]",
            )}
          >
            <CardContent className={cn("p-4", "sm:p-5")}>
              <div
                className={cn(
                  "flex",
                  "flex-wrap",
                  "items-center",
                  "gap-4",
                  "max-[860px]:flex-col",
                  "max-[860px]:items-stretch",
                )}
              >
                <div className={cn("flex", "flex-1", "items-center", "gap-3")}>
                  <span
                    className={cn(
                      "text-xs",
                      "sm:text-sm",
                      "font-bold",
                      "text-[#334155]",
                      "shrink-0",
                      "text-center",
                      "w-12",
                      "leading-tight",
                    )}
                  >
                    아파트
                    <br />
                    검색
                  </span>
                  <div className={cn("relative", "flex-1")}>
                    <Input
                      type="text"
                      value={apartmentKeyword}
                      onChange={(e) => setApartmentKeyword(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="아파트명과 지역을 입력하세요 (예: 래미안대치팰리스 강남구 대치동)"
                      className={cn(
                        "h-11",
                        "rounded-[10px]",
                        "border-[#CBD5E1]",
                        "bg-white",
                        "text-sm",
                        "placeholder:text-[#94A3B8]",
                        "focus-visible:border-[#2563EB]",
                        "focus-visible:ring-[#2563EB]/15",
                      )}
                    />
                  </div>
                </div>

                <div
                  className={cn("flex", "items-center", "gap-3", "shrink-0")}
                >
                  <span
                    className={cn(
                      "text-xs",
                      "sm:text-sm",
                      "font-bold",
                      "text-[#334155]",
                    )}
                  >
                    기간
                  </span>
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsPeriodOpen(!isPeriodOpen)}
                      className={cn(
                        "h-11",
                        "min-w-[130px]",
                        "justify-between",
                        "gap-2",
                        "rounded-[10px]",
                        "border-[#CBD5E1]",
                        "bg-white",
                        "px-4",
                        "text-sm",
                        "font-semibold",
                        "text-[#334155]",
                        "hover:bg-slate-50",
                        "cursor-pointer",
                      )}
                    >
                      <span>
                        {
                          PERIOD_OPTIONS.find(
                            (opt) => opt.value === selectedPeriod,
                          )?.label
                        }
                      </span>
                      <ChevronDown className={cn("size-4", "text-[#64748B]")} />
                    </Button>

                    {isPeriodOpen && (
                      <div
                        className={cn(
                          "absolute",
                          "right-0",
                          "top-12",
                          "z-20",
                          "w-36",
                          "rounded-[10px]",
                          "border",
                          "border-[#E2E8F0]",
                          "bg-white",
                          "py-1",
                          "shadow-lg",
                        )}
                      >
                        {PERIOD_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handlePeriodSelect(opt.value)}
                            className={cn(
                              "flex w-full items-center px-4 py-2 text-left text-xs font-medium transition-colors cursor-pointer",
                              selectedPeriod === opt.value
                                ? "bg-blue-50 font-bold text-[#2563EB]"
                                : "text-[#334155] hover:bg-slate-50",
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleSearch}
                  className={cn(
                    "h-11",
                    "gap-1.5",
                    "rounded-[10px]",
                    "bg-[#2563EB]",
                    "px-6",
                    "text-sm",
                    "font-bold",
                    "text-white",
                    "shadow-xs",
                    "hover:bg-[#1D4ED8]",
                    "active:translate-y-0.5",
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

          {/* 동향 요약 지표 */}
          <Card
            className={cn(
              "overflow-hidden",
              "border-[#DCE8ED]",
              "bg-white",
              "shadow-xs",
              "rounded-[16px]",
            )}
          >
            <CardContent className="p-6">
              <div
                className={cn(
                  "grid",
                  "grid-cols-5",
                  "divide-x",
                  "divide-[#E2E8F0]",
                  "max-[980px]:grid-cols-2",
                  "max-[980px]:divide-x-0",
                  "max-[980px]:gap-6",
                  "max-[640px]:grid-cols-1",
                )}
              >
                <div className={cn("px-4", "first:pl-0", "max-[980px]:px-0")}>
                  <span
                    className={cn(
                      "text-xs",
                      "font-semibold",
                      "text-[#64748B]",
                      "block",
                      "mb-2",
                    )}
                  >
                    총 거래 건수
                  </span>
                  <div
                    className={cn(
                      "text-xl",
                      "sm:text-2xl",
                      "font-black",
                      "text-[#2563EB]",
                      "tracking-tight",
                      "mb-1.5",
                    )}
                  >
                    {currentData.summary.totalCount.toLocaleString()}건
                  </div>
                  <div
                    className={cn(
                      "flex",
                      "items-center",
                      "gap-1",
                      "text-[11px]",
                      "font-bold",
                      "text-[#DC2626]",
                    )}
                  >
                    <span>전년 대비 ▲</span>
                    <span>{currentData.summary.totalCountDiff}%</span>
                  </div>
                </div>

                <div className={cn("px-4", "max-[980px]:px-0")}>
                  <span
                    className={cn(
                      "text-xs",
                      "font-semibold",
                      "text-[#64748B]",
                      "block",
                      "mb-2",
                    )}
                  >
                    총 거래 금액
                  </span>
                  <div
                    className={cn(
                      "text-xl",
                      "sm:text-2xl",
                      "font-black",
                      "text-[#2563EB]",
                      "tracking-tight",
                      "mb-1.5",
                    )}
                  >
                    {currentData.summary.totalAmount}
                  </div>
                  <div
                    className={cn(
                      "flex",
                      "items-center",
                      "gap-1",
                      "text-[11px]",
                      "font-bold",
                      "text-[#DC2626]",
                    )}
                  >
                    <span>전년 대비 ▲</span>
                    <span>{currentData.summary.totalAmountDiff}%</span>
                  </div>
                </div>

                <div className={cn("px-4", "max-[980px]:px-0")}>
                  <span
                    className={cn(
                      "text-xs",
                      "font-semibold",
                      "text-[#64748B]",
                      "block",
                      "mb-2",
                    )}
                  >
                    평균 거래가
                  </span>
                  <div
                    className={cn(
                      "text-xl",
                      "sm:text-2xl",
                      "font-black",
                      "text-[#2563EB]",
                      "tracking-tight",
                      "mb-1.5",
                    )}
                  >
                    {currentData.summary.avgPrice}
                  </div>
                  <div
                    className={cn(
                      "flex",
                      "items-center",
                      "gap-1",
                      "text-[11px]",
                      "font-bold",
                      "text-[#DC2626]",
                    )}
                  >
                    <span>전년 대비 ▲</span>
                    <span>{currentData.summary.avgPriceDiff}%</span>
                  </div>
                </div>

                <div className={cn("px-4", "max-[980px]:px-0")}>
                  <span
                    className={cn(
                      "text-xs",
                      "font-semibold",
                      "text-[#64748B]",
                      "block",
                      "mb-2",
                    )}
                  >
                    최고 거래가
                  </span>
                  <div
                    className={cn(
                      "text-xl",
                      "sm:text-2xl",
                      "font-black",
                      "text-[#2563EB]",
                      "tracking-tight",
                      "mb-1.5",
                    )}
                  >
                    {currentData.summary.maxPrice}
                  </div>
                  <div
                    className={cn(
                      "flex",
                      "items-center",
                      "gap-1",
                      "text-[11px]",
                      "font-bold",
                      "text-[#DC2626]",
                    )}
                  >
                    <span>전년 대비 ▲</span>
                    <span>{currentData.summary.maxPriceDiff}%</span>
                  </div>
                </div>

                <div className={cn("px-4", "last:pr-0", "max-[980px]:px-0")}>
                  <span
                    className={cn(
                      "text-xs",
                      "font-semibold",
                      "text-[#64748B]",
                      "block",
                      "mb-2",
                    )}
                  >
                    거래량 증감률
                  </span>
                  <div
                    className={cn(
                      "text-xl",
                      "sm:text-2xl",
                      "font-black",
                      "text-[#2563EB]",
                      "tracking-tight",
                      "mb-1.5",
                    )}
                  >
                    {currentData.summary.volumeGrowthRate}%
                  </div>
                  <div
                    className={cn(
                      "flex",
                      "items-center",
                      "gap-1",
                      "text-[11px]",
                      "font-bold",
                      "text-[#DC2626]",
                    )}
                  >
                    <span>전년 대비 ▲</span>
                    <span>{currentData.summary.volumeGrowthDiff}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 차트 영역 */}
          <div className={cn("grid", "grid-cols-12", "gap-6")}>
            {/* 좌측: 거래량 및 평균 거래가 추이 */}
            <Card
              className={cn(
                "col-span-7",
                "border-[#DCE8ED]",
                "bg-white",
                "shadow-xs",
                "rounded-[16px]",
                "max-[1024px]:col-span-12",
              )}
            >
              <CardContent className="p-6">
                <div
                  className={cn(
                    "mb-6",
                    "flex",
                    "items-center",
                    "justify-between",
                  )}
                >
                  <h2
                    className={cn("text-base", "font-bold", "text-[#123047]")}
                  >
                    거래량 및 평균 거래가 추이
                  </h2>
                  <div
                    className={cn(
                      "flex",
                      "items-center",
                      "gap-3.5",
                      "text-xs",
                      "font-semibold",
                      "text-[#475569]",
                    )}
                  >
                    <div className={cn("flex", "items-center", "gap-1.5")}>
                      <span
                        className={cn("size-2.5", "rounded-xs", "bg-[#2563EB]")}
                      />
                      <span>거래량(건)</span>
                    </div>
                    <div className={cn("flex", "items-center", "gap-1.5")}>
                      <span
                        className={cn("size-2.5", "rounded-xs", "bg-[#16A34A]")}
                      />
                      <span>평균 거래가 지수</span>
                    </div>
                  </div>
                </div>

                <div className={cn("h-[230px]", "w-full", "pt-4")}>
                  <div
                    className={cn(
                      "relative",
                      "flex",
                      "h-full",
                      "items-end",
                      "justify-between",
                      "gap-3",
                      "border-b",
                      "border-[#E2E8F0]",
                      "pb-2",
                      "px-2",
                    )}
                  >
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
                          "border-slate-200",
                          "w-full",
                        )}
                      />
                      <div
                        className={cn(
                          "border-b",
                          "border-dashed",
                          "border-slate-200",
                          "w-full",
                        )}
                      />
                      <div
                        className={cn(
                          "border-b",
                          "border-dashed",
                          "border-slate-200",
                          "w-full",
                        )}
                      />
                    </div>

                    {currentData.monthlyTrends.map((item) => {
                      const volHeight = Math.round(
                        (item.volume / maxVolumeVal) * 160,
                      );
                      const priceHeight = Math.round(
                        (item.priceIndex / maxPriceIndexVal) * 140,
                      );

                      return (
                        <div
                          key={item.period}
                          className={cn(
                            "group",
                            "relative",
                            "flex",
                            "flex-1",
                            "flex-col",
                            "items-center",
                            "justify-end",
                            "h-full",
                            "z-10",
                          )}
                        >
                          <div
                            className={cn(
                              "absolute",
                              "-top-10",
                              "opacity-0",
                              "group-hover:opacity-100",
                              "transition-opacity",
                              "bg-slate-900",
                              "text-white",
                              "text-[10px]",
                              "rounded",
                              "px-2",
                              "py-1",
                              "pointer-events-none",
                              "whitespace-nowrap",
                              "shadow-md",
                            )}
                          >
                            {item.period} | 거래: {item.volume}건, 지수:{" "}
                            {item.priceIndex}
                          </div>

                          <div className={cn("flex", "items-end", "gap-1")}>
                            <div
                              className={cn(
                                "w-5",
                                "sm:w-6",
                                "rounded-t-xs",
                                "bg-[#2563EB]",
                                "transition-all",
                                "duration-500",
                                "hover:bg-[#1D4ED8]",
                              )}
                              style={{ height: `${Math.max(volHeight, 8)}px` }}
                            />
                            <div
                              className={cn(
                                "w-5",
                                "sm:w-6",
                                "rounded-t-xs",
                                "bg-[#16A34A]",
                                "transition-all",
                                "duration-500",
                                "hover:bg-[#15803D]",
                              )}
                              style={{
                                height: `${Math.max(priceHeight, 8)}px`,
                              }}
                            />
                          </div>

                          <span
                            className={cn(
                              "mt-2",
                              "text-[11px]",
                              "font-medium",
                              "text-[#64748B]",
                            )}
                          >
                            {item.period}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 우측: 전용면적별 거래 비중 */}
            <Card
              className={cn(
                "col-span-5",
                "border-[#DCE8ED]",
                "bg-white",
                "shadow-xs",
                "rounded-[16px]",
                "max-[1024px]:col-span-12",
              )}
            >
              <CardContent className="p-6">
                <h2
                  className={cn(
                    "text-base",
                    "font-bold",
                    "text-[#123047]",
                    "mb-6",
                  )}
                >
                  전용면적별 거래 비중
                </h2>

                <div className={cn("space-y-4", "pt-1")}>
                  {currentData.areaDistribution.map((area) => {
                    const widthPercent = Math.round(
                      (area.count / maxAreaCount) * 100,
                    );

                    return (
                      <div
                        key={area.areaGroup}
                        className={cn("flex", "items-center", "gap-3")}
                      >
                        <span
                          className={cn(
                            "w-20",
                            "sm:w-24",
                            "text-xs",
                            "sm:text-sm",
                            "font-semibold",
                            "text-[#334155]",
                            "shrink-0",
                            "text-right",
                          )}
                        >
                          {area.areaGroup}
                        </span>
                        <div
                          className={cn(
                            "flex-1",
                            "flex",
                            "items-center",
                            "gap-2",
                          )}
                        >
                          <div
                            className={cn(
                              "h-6",
                              "flex-1",
                              "bg-slate-50",
                              "rounded-xs",
                              "overflow-hidden",
                            )}
                          >
                            <div
                              className={cn(
                                "h-full",
                                "bg-[#2563EB]",
                                "rounded-r-xs",
                                "transition-all",
                                "duration-500",
                              )}
                              style={{
                                width: `${Math.min(widthPercent * 1.2, 100)}%`,
                              }}
                            />
                          </div>
                          <span
                            className={cn(
                              "text-xs",
                              "font-bold",
                              "text-[#334155]",
                              "w-9",
                              "text-left",
                              "shrink-0",
                            )}
                          >
                            {area.count}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  <div
                    className={cn(
                      "pt-2",
                      "pl-24",
                      "pr-9",
                      "flex",
                      "justify-between",
                      "text-[10px]",
                      "text-[#94A3B8]",
                      "border-t",
                      "border-slate-100",
                    )}
                  >
                    <span>0</span>
                    <span>200</span>
                    <span>400</span>
                    <span>600</span>
                    <span>800</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 하단 테이블 및 요약 데이터 */}
          <div className={cn("grid", "grid-cols-12", "gap-6")}>
            {/* 1. 최근 실거래 내역 */}
            <Card
              className={cn(
                "col-span-5",
                "border-[#DCE8ED]",
                "bg-white",
                "shadow-xs",
                "rounded-[16px]",
                "max-[1024px]:col-span-12",
              )}
            >
              <CardContent className="p-5">
                <h3
                  className={cn(
                    "text-sm",
                    "sm:text-base",
                    "font-bold",
                    "text-[#123047]",
                    "mb-4",
                  )}
                >
                  최근 실거래 내역
                </h3>
                <div className="overflow-x-auto">
                  <Table className={cn("text-center", "text-xs")}>
                    <TableHeader>
                      <TableRow
                        className={cn(
                          "border-y",
                          "border-[#CBD5E1]",
                          "bg-slate-50",
                          "font-bold",
                          "text-[#334155]",
                          "hover:bg-slate-50",
                        )}
                      >
                        <TableHead
                          className={cn(
                            "py-2.5",
                            "px-2",
                            "text-center",
                            "text-[#334155]",
                          )}
                        >
                          계약일
                        </TableHead>
                        <TableHead
                          className={cn(
                            "py-2.5",
                            "px-2",
                            "text-center",
                            "text-[#334155]",
                          )}
                        >
                          단지명
                        </TableHead>
                        <TableHead
                          className={cn(
                            "py-2.5",
                            "px-2",
                            "text-center",
                            "text-[#334155]",
                          )}
                        >
                          면적
                        </TableHead>
                        <TableHead
                          className={cn(
                            "py-2.5",
                            "px-2",
                            "text-center",
                            "text-[#334155]",
                          )}
                        >
                          유형
                        </TableHead>
                        <TableHead
                          className={cn(
                            "py-2.5",
                            "px-2",
                            "text-center",
                            "text-[#334155]",
                          )}
                        >
                          거래가
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className={cn("divide-y", "divide-[#E2E8F0]")}>
                      {currentData.recentTrades.map((trade, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50/70">
                          <TableCell
                            className={cn(
                              "py-2.5",
                              "px-2",
                              "font-medium",
                              "text-[#64748B]",
                            )}
                          >
                            {trade.contractDate}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "py-2.5",
                              "px-2",
                              "font-semibold",
                              "text-[#123047]",
                            )}
                          >
                            {trade.complexName}
                          </TableCell>
                          <TableCell
                            className={cn("py-2.5", "px-2", "font-medium")}
                          >
                            {trade.area}
                          </TableCell>
                          <TableCell className={cn("py-2.5", "px-2")}>
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[11px] font-bold",
                                trade.type === "매매"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-emerald-50 text-emerald-700",
                              )}
                            >
                              {trade.type}
                            </span>
                          </TableCell>
                          <TableCell
                            className={cn(
                              "py-2.5",
                              "px-2",
                              "font-bold",
                              "text-[#123047]",
                            )}
                          >
                            {trade.price}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* 2. 면적별 거래 현황 */}
            <Card
              className={cn(
                "col-span-4",
                "border-[#DCE8ED]",
                "bg-white",
                "shadow-xs",
                "rounded-[16px]",
                "max-[1024px]:col-span-12",
              )}
            >
              <CardContent className="p-5">
                <h3
                  className={cn(
                    "text-sm",
                    "sm:text-base",
                    "font-bold",
                    "text-[#123047]",
                    "mb-4",
                  )}
                >
                  면적별 거래 현황
                </h3>
                <div className="overflow-x-auto">
                  <Table className={cn("text-center", "text-xs")}>
                    <TableHeader>
                      <TableRow
                        className={cn(
                          "border-y",
                          "border-[#CBD5E1]",
                          "bg-slate-50",
                          "font-bold",
                          "text-[#334155]",
                          "hover:bg-slate-50",
                        )}
                      >
                        <TableHead
                          className={cn(
                            "py-2.5",
                            "px-2",
                            "w-12",
                            "text-center",
                            "text-[#334155]",
                          )}
                        >
                          순위
                        </TableHead>
                        <TableHead
                          className={cn(
                            "py-2.5",
                            "px-2",
                            "text-center",
                            "text-[#334155]",
                          )}
                        >
                          단지명
                        </TableHead>
                        <TableHead
                          className={cn(
                            "py-2.5",
                            "px-2",
                            "w-16",
                            "text-center",
                            "text-[#334155]",
                          )}
                        >
                          건수
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className={cn("divide-y", "divide-[#E2E8F0]")}>
                      {currentData.areaRankings.map((rank) => (
                        <TableRow
                          key={rank.rank}
                          className="hover:bg-slate-50/70"
                        >
                          <TableCell
                            className={cn(
                              "py-2.5",
                              "px-2",
                              "font-bold",
                              "text-[#2563EB]",
                            )}
                          >
                            {rank.rank}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "py-2.5",
                              "px-2",
                              "font-semibold",
                              "text-[#123047]",
                            )}
                          >
                            {rank.complexName}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "py-2.5",
                              "px-2",
                              "font-bold",
                              "text-[#334155]",
                            )}
                          >
                            {rank.count}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* 3. 거래 동향 요약 */}
            <Card
              className={cn(
                "col-span-3",
                "border-[#DCE8ED]",
                "bg-white",
                "shadow-xs",
                "rounded-[16px]",
                "max-[1024px]:col-span-12",
                "flex",
                "flex-col",
                "justify-between",
              )}
            >
              <CardContent
                className={cn(
                  "p-5",
                  "flex",
                  "flex-col",
                  "justify-between",
                  "h-full",
                )}
              >
                <div>
                  <h3
                    className={cn(
                      "text-sm",
                      "sm:text-base",
                      "font-bold",
                      "text-[#123047]",
                      "mb-4",
                    )}
                  >
                    거래 동향 요약
                  </h3>

                  <div className="space-y-4">
                    {currentData.insights.map((insight) => (
                      <div
                        key={insight.id}
                        className={cn("flex", "items-start", "gap-3")}
                      >
                        <div
                          className={cn(
                            "size-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold mt-0.5",
                            insight.type === "up" &&
                              "bg-emerald-50 text-emerald-600",
                            insight.type === "building" &&
                              "bg-blue-50 text-blue-600",
                            insight.type === "switch" &&
                              "bg-teal-50 text-teal-600",
                          )}
                        >
                          {insight.type === "up" && "↑"}
                          {insight.type === "building" && "🏢"}
                          {insight.type === "switch" && "⇄"}
                        </div>
                        <p
                          className={cn(
                            "text-xs",
                            "font-medium",
                            "leading-relaxed",
                            "text-[#334155]",
                          )}
                        >
                          {insight.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className={cn(
                    "mt-5",
                    "rounded-lg",
                    "bg-slate-50",
                    "p-2.5",
                    "text-[11px]",
                    "font-medium",
                    "text-[#64748B]",
                    "flex",
                    "items-center",
                    "gap-1.5",
                  )}
                >
                  <Info
                    className={cn("size-3.5", "text-[#2563EB]", "shrink-0")}
                  />
                  <span>실거래가 공개시스템 기준 데이터입니다.</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
