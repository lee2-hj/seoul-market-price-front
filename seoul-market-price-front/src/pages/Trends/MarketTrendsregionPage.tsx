import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { Chart } from "react-google-charts";
import { RotateCcw, Search, TrendingUp, BarChart2, ArrowUpDown, ChevronRight, X, Sparkles, AlertCircle, MapPin, Loader2 } from "lucide-react";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { TRENDS_NAVIGATION } from "@/config/sectionNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getSggsApi, getDongsApi, type SggItem, type DongItem } from "@/api/api";
import apiMiddleware from "@/api/middleware";

// 1. TypeScript 타입 선언
type ModalFilterType = "latest" | "pyeong" | "floor";
type PyeongRangeType = "all" | "under10" | "10s" | "20s" | "30s" | "over40";
type FloorRangeType = "all" | "low" | "mid" | "high";

type RegionFormType = {
  sggCd: string; dongCd: string; searchedGu: string; searchedDong: string;
  modalFilter: ModalFilterType; selectedPyeongRange: PyeongRangeType; selectedFloorRange: FloorRangeType;
  isModalOpen: boolean; isErrModalOpen: boolean;
};

type SggItemType = SggItem;
type DongItemType = DongItem;

type RttRecentTrade = {
  apt_name: string; mno?: string; sno?: string; deal_date: string; floor: number;
  trade_amount: number; pyeong: number; exclusive_area_m2: number;
};
type RttBiweeklyTrend = { period_label: string; start_date: string; end_date: string; deal_cnt: number; avg_trade_amount: number };
type RttPyeongDistribution = { pyeong_grp: string; deal_cnt: number; ratio: number };
type RttTop5ByVolume = { apt_name: string; mno?: string; sno?: string; deal_cnt: number; avg_trade_amount: number };
type RttResponse = {
  sgg_cd: string; sgg_nm: string; dong_cd?: string; dong_nm?: string; period_start: string; period_end: string;
  total_deal_cnt: number; total_trade_amount: number; avg_trade_amount: number; max_trade_amount: number; volume_change_rate: number;
  avg_pyeong_amt?: number; avg_pyeong_price?: number;
  biweekly_trend: RttBiweeklyTrend[]; pyeong_distribution: RttPyeongDistribution[]; recent_trades: RttRecentTrade[]; top5_by_volume: RttTop5ByVolume[];
};

type RegionGroupRaw = { code: string; name: string; total_count: number; avg_thing_amt: number; avg_pyeong_amt: number };
type RegionPriceListResponse = { base_date: string; groups: Record<string, RegionGroupRaw> };
type TopAndBottomItemRaw = { bldg_nm: string; stdg_nm: string; deal_cnt: number; avg_thing_amt: number; avg_pyeong_amt: number };
type TopAndBottomResponse = { base_date: string; total_count: number; avg_thing_amt: number; avg_pyeong_amt: number; top: TopAndBottomItemRaw[]; bottom: TopAndBottomItemRaw[] };

type AreaItemType = { name: string; percentage: number; count: number; color: string };
type TradeItemType = { contractDate: string; complexName: string; area: string; floor: string; price: string };
type TopComplexType = { rank: number; complexName: string; count: number };
type InsightItemType = { id: string; title: string; subtitle: string; type: "up" | "chart" | "swap" };
type SummaryMetricsType = { totalCount: number; avgPrice: string; avgPyeongPrice: string; maxPrice: string; growth: number };
type AptMktResponse = { status?: string; count?: number; data?: Array<{ apt_name: string; recent_deals?: Array<{ deal_date?: string; exclusive_area?: string; pyeong?: number; floor?: number; deal_amount?: number }> }> };

type RegionTrendDataType = {
  summary: SummaryMetricsType; monthly: Array<[string, number, { v: number; f: string }]>;
  area: AreaItemType[]; recent: TradeItemType[]; topComplexes: TopComplexType[];
  allTrades: TradeItemType[]; insights: InsightItemType[]; periodRange?: string; rawTopVolume?: RttTop5ByVolume[];
};

// 2. 상수 및 유틸리티 함수
const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

const formatPyeong = (m: number | string | undefined): string => {
  if (!m || m === "-") return "-";
  const num = parseFloat(String(m).replace(/[^0-9.]/g, ""));
  return isNaN(num) || num <= 0 ? "-" : `${num <= 50 && Number.isInteger(num) ? num : Math.round(num * 0.3025)}평형`;
};

const formatPrice = (p: number): string => {
  if (!p || p <= 0) return "-";
  return p >= 10000 ? `${Math.floor(p / 10000)}억 ${p % 10000 > 0 ? `${(p % 10000).toLocaleString()}` : ""}만원`.trim() : `${p.toLocaleString()}만원`;
};

const getBiweeklyPeriods = (): string[] => Array.from({ length: 7 }, (_, i) => `${i + 1}구간`);

const getNinetyDaysRange = (): string => {
  const now = new Date();
  const past = new Date(now.getTime() - 90 * 86400000);
  return `${past.getFullYear()}.${String(past.getMonth() + 1).padStart(2, "0")} ~ ${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}`;
};
const NINETY_DAYS_RANGE = getNinetyDaysRange();

const FallbackTrend: RegionTrendDataType = {
  summary: { totalCount: 0, avgPrice: "-", avgPyeongPrice: "-", maxPrice: "-", growth: 0 },
  monthly: getBiweeklyPeriods().map((p) => [p, 0, { v: 0, f: "-" }]),
  area: [], recent: [], topComplexes: [], allTrades: [], insights: [],
  periodRange: NINETY_DAYS_RANGE, rawTopVolume: [],
};

function useCountUp(target: number, duration = 800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target <= 0) return;
    const start = performance.now();
    let id: number;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setCount(Math.round((p === 1 ? 1 : 1 - Math.pow(2, -10 * p)) * target));
      if (p < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return target <= 0 ? 0 : count;
}

// 3. 메인 페이지 컴포넌트
export default function MarketTrendsregionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [modalTrades, setModalTrades] = useState<TradeItemType[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const prevModalGuRef = useRef<string>("");
  const prevApiErrRef = useRef(false);

  /* React Hook Form & useWatch: 폼/필터 전반 상태 관리 */
  const { control, getValues, setValue } = useForm<RegionFormType>({
    defaultValues: {
      sggCd: searchParams.get("sggCd") ?? "",
      dongCd: searchParams.get("dongCd") ?? "",
      searchedGu: searchParams.get("sggCd") ?? "",
      searchedDong: searchParams.get("dongCd") ?? "",
      modalFilter: "latest",
      selectedPyeongRange: "all",
      selectedFloorRange: "all",
      isModalOpen: false,
      isErrModalOpen: false,
    },
  });

  const formValues = useWatch({ control });
  const sggCd = formValues?.sggCd ?? "";
  const dongCd = formValues?.dongCd ?? "";
  const searchedGu = formValues?.searchedGu ?? "";
  const searchedDong = formValues?.searchedDong ?? "";
  const modalFilter = formValues?.modalFilter ?? "latest";
  const selectedPyeongRange = formValues?.selectedPyeongRange ?? "all";
  const selectedFloorRange = formValues?.selectedFloorRange ?? "all";
  const isModalOpen = formValues?.isModalOpen ?? false;
  const isErrModalOpen = formValues?.isErrModalOpen ?? false;

  /* TanStack Query 1: 자치구 목록 */
  const { data: sggs = [] } = useQuery<SggItemType[], Error, SggItemType[]>({
    queryKey: ["regionSggs"],
    queryFn: async (): Promise<SggItemType[]> => ((await getSggsApi()) || []) as SggItemType[],
    select: (data: SggItemType[]): SggItemType[] => data || [],
    staleTime: 1800000,
  });

  /* TanStack Query 2: 법정동 목록 */
  const { data: dongs = [] } = useQuery<DongItemType[], Error, DongItemType[]>({
    queryKey: ["regionDongs", sggCd],
    queryFn: async (): Promise<DongItemType[]> => sggCd ? (((await getDongsApi(sggCd)) || []) as DongItemType[]) : [],
    select: (data: DongItemType[]): DongItemType[] => data || [],
    enabled: Boolean(sggCd),
    staleTime: 1800000,
  });

  const guName = useMemo(() => sggs.find((g) => g.sggCd === searchedGu)?.sggNm ?? "", [sggs, searchedGu]);
  const dongName = useMemo(() => dongs.find((d) => d.dongCd.slice(-5) === searchedDong)?.dongNm ?? "", [dongs, searchedDong]);
  const regionLabel = useMemo(() => [guName, dongName].filter(Boolean).join(" "), [guName, dongName]);

  /* TanStack Query 3: 지역 분석 데이터 (/fastApi/rtt 호출) */
  const { data: trendData, isLoading, isError } = useQuery<RegionTrendDataType | null, Error, RegionTrendDataType>({
    queryKey: ["regionTradeTrends", searchedGu, searchedDong],
    queryFn: async (): Promise<RegionTrendDataType | null> => {
      if (!searchedGu) return null;
      try {
        const rttParams: Record<string, string> = { guCode: searchedGu };
        if (searchedDong) rttParams.dongCode = searchedDong;
        const res = await apiMiddleware.get<RttResponse>("/fastApi/rtt", { params: rttParams });
        const rtt = res.data;

        if (rtt && (rtt.total_deal_cnt > 0 || (rtt.recent_trades && rtt.recent_trades.length > 0))) {
          const allTrades: TradeItemType[] = (rtt.recent_trades || []).map((t: RttRecentTrade) => ({
            contractDate: t.deal_date || "-",
            complexName: t.apt_name || "-",
            area: t.pyeong ? `${Math.round(t.pyeong)}평형` : (t.exclusive_area_m2 ? `${Math.round(t.exclusive_area_m2 * 0.3025)}평형` : "-"),
            floor: t.floor !== undefined && t.floor !== null ? `${t.floor}층` : "-",
            price: formatPrice(t.trade_amount || 0),
          }));

          const monthly: Array<[string, number, { v: number; f: string }]> = (rtt.biweekly_trend?.length ?? 0) > 0
            ? rtt.biweekly_trend.map((b: RttBiweeklyTrend, idx: number) => [`${idx + 1}구간`, b.deal_cnt || 0, { v: b.avg_trade_amount || 0, f: b.avg_trade_amount ? `${(b.avg_trade_amount / 10000).toFixed(1)}억` : "-" }])
            : getBiweeklyPeriods().map((p) => [p, Math.round((rtt.total_deal_cnt || 0) / 7), { v: rtt.avg_trade_amount || 0, f: formatPrice(rtt.avg_trade_amount || 0) }]);

          const area: AreaItemType[] = (rtt.pyeong_distribution || []).map((p: RttPyeongDistribution, idx: number) => ({
            name: `${p.pyeong_grp}평형`, count: p.deal_cnt || 0, percentage: Math.round(p.ratio || 0), color: PIE_COLORS[idx % PIE_COLORS.length],
          }));

          const topComplexes: TopComplexType[] = (rtt.top5_by_volume || []).map((c: RttTop5ByVolume, idx: number) => ({
            rank: idx + 1, complexName: c.apt_name || "-", count: c.deal_cnt || 0,
          }));

          let avgPyeongAmt = rtt.avg_pyeong_amt || rtt.avg_pyeong_price || 0;
          if (!avgPyeongAmt && (rtt.recent_trades || []).length > 0) {
            const pTrades = rtt.recent_trades.map((t: RttRecentTrade) => {
              const py = t.pyeong || (t.exclusive_area_m2 ? t.exclusive_area_m2 * 0.3025 : 0);
              return py > 0 && (t.trade_amount || 0) > 0 ? t.trade_amount / py : 0;
            }).filter((p: number) => p > 0);
            if (pTrades.length > 0) {
              avgPyeongAmt = Math.round(pTrades.reduce((a: number, b: number) => a + b, 0) / pTrades.length);
            }
          }

          const summary: SummaryMetricsType = {
            totalCount: rtt.total_deal_cnt || 0, avgPrice: formatPrice(rtt.avg_trade_amount || 0),
            avgPyeongPrice: formatPrice(avgPyeongAmt || 0), maxPrice: formatPrice(rtt.max_trade_amount || 0),
            growth: Math.round(rtt.volume_change_rate || 0),
          };

          const insights: InsightItemType[] = [];
          if (summary.totalCount > 0) insights.push({ id: "1", title: `${regionLabel || guName} 총 거래량 ${summary.totalCount.toLocaleString()}건`, subtitle: `${regionLabel || guName} 지역의 90일간 실제 집계된 거래 데이터입니다.`, type: "up" });
          if (rtt.avg_trade_amount > 0) insights.push({ id: "2", title: `평균 거래가 ${summary.avgPrice} 형성`, subtitle: `해당 지역에서 집계된 실제 평균 거래 가격입니다.`, type: "chart" });
          if (rtt.max_trade_amount > 0) insights.push({ id: "3", title: `최고 거래가 ${summary.maxPrice} 기록`, subtitle: `해당 지역에서 집계된 실제 최고 거래 가격입니다.`, type: "swap" });

          const periodRange = (rtt.period_start && rtt.period_end) ? `${rtt.period_start.replace(/-/g, ".")} ~ ${rtt.period_end.replace(/-/g, ".")}` : NINETY_DAYS_RANGE;
          return { summary, monthly, area, recent: allTrades.slice(0, 5), topComplexes, allTrades, insights, periodRange, rawTopVolume: rtt.top5_by_volume || [] };
        }
      } catch { /* ignore fallback */ }

      // 폴백 로직 (/fastApi/topandbottom, /fastApi/list)
      let totalCount = 0, avgPrice = 0, maxPrice = 0;
      const topItems: Array<{ name: string; dealCount: number; averageTradePrice: number; averagePyeongPrice: number }> = [];

      if (searchedDong) {
        try {
          const tbRes = await apiMiddleware.get<TopAndBottomResponse>("/fastApi/topandbottom", { params: { guCode: searchedGu, dongCode: searchedDong, metricType: "thing_amt" } });
          if (tbRes.data) {
            totalCount = tbRes.data.total_count || 0;
            avgPrice = tbRes.data.avg_thing_amt || 0;
            (tbRes.data.top || []).forEach((t) => {
              topItems.push({ name: t.bldg_nm, dealCount: t.deal_cnt, averageTradePrice: t.avg_thing_amt, averagePyeongPrice: t.avg_pyeong_amt });
              maxPrice = Math.max(maxPrice, t.avg_thing_amt || 0);
            });
          }
        } catch { /* ignore */ }
      }

      if (!totalCount || !avgPrice) {
        try {
          const listRes = await apiMiddleware.get<RegionPriceListResponse>("/fastApi/list", { params: { guCode: searchedGu } });
          if (listRes.data?.groups) {
            const groups = Object.values(listRes.data.groups);
            const m = groups.find((g) => (searchedDong && g.code?.includes(searchedDong)) || (dongName && g.name === dongName));
            if (m) {
              totalCount = m.total_count || 0; avgPrice = m.avg_thing_amt || 0; maxPrice = avgPrice;
            } else {
              totalCount = groups.reduce((acc, g) => acc + (g.total_count || 0), 0);
              const valid = groups.filter((g) => (g.avg_thing_amt || 0) > 0);
              avgPrice = valid.length ? Math.round(valid.reduce((acc, g) => acc + (g.avg_thing_amt || 0), 0) / valid.length) : 0;
              maxPrice = valid.length ? Math.max(...valid.map((g) => g.avg_thing_amt || 0)) : 0;
              groups.forEach((g) => topItems.push({ name: g.name, dealCount: g.total_count, averageTradePrice: g.avg_thing_amt, averagePyeongPrice: g.avg_pyeong_amt }));
            }
          }
        } catch { /* ignore */ }
      }

      const allTrades: TradeItemType[] = topItems.map((it) => ({
        contractDate: new Date().toISOString().slice(0, 10), complexName: it.name,
        area: it.averagePyeongPrice && it.averageTradePrice ? `${Math.round(it.averageTradePrice / it.averagePyeongPrice)}평형` : "-",
        floor: "-", price: formatPrice(it.averageTradePrice),
      }));

      const validPyeongItems = topItems.filter((it) => (it.averagePyeongPrice || 0) > 0);
      const avgPyeongVal = validPyeongItems.length ? Math.round(validPyeongItems.reduce((acc, it) => acc + it.averagePyeongPrice, 0) / validPyeongItems.length) : 0;

      return {
        summary: { totalCount, avgPrice: formatPrice(avgPrice), avgPyeongPrice: formatPrice(avgPyeongVal), maxPrice: formatPrice(maxPrice), growth: 0 },
        monthly: getBiweeklyPeriods().map((p) => [p, totalCount > 0 ? Math.round(totalCount / 7) : 0, { v: avgPrice, f: formatPrice(avgPrice) }]),
        area: [], recent: allTrades.slice(0, 5), topComplexes: topItems.slice(0, 5).map((it, idx) => ({ rank: idx + 1, complexName: it.name, count: it.dealCount || 0 })),
        allTrades, insights: [], periodRange: NINETY_DAYS_RANGE, rawTopVolume: [],
      };
    },
    select: (data: RegionTrendDataType | null): RegionTrendDataType => data || FallbackTrend,
    enabled: Boolean(searchedGu),
    staleTime: 300000,
  });

  const trend = trendData || FallbackTrend;
  const isApiError = Boolean(searchedGu && (isError || (trendData === null && !isLoading)));

  useEffect(() => {
    if (isApiError && !prevApiErrRef.current) setValue("isErrModalOpen", true);
    prevApiErrRef.current = isApiError;
  }, [isApiError, setValue]);

  /* 검색 및 초기화 핸들러 */
  const SearchRegion = useCallback(() => {
    const sgg = getValues("sggCd");
    const dong = getValues("dongCd");
    if (!sgg) return alert("조회할 자치구를 선택해주세요.");
    setModalTrades([]);
    setValue("modalFilter", "latest");
    setValue("selectedPyeongRange", "all");
    setValue("selectedFloorRange", "all");
    prevModalGuRef.current = "";
    setValue("searchedGu", sgg);
    setValue("searchedDong", dong);
    setSearchParams(dong ? { sggCd: sgg, dongCd: dong } : { sggCd: sgg }, { replace: true });
  }, [getValues, setValue, setSearchParams]);

  const ResetFilter = useCallback(() => {
    setValue("sggCd", ""); setValue("dongCd", ""); setValue("searchedGu", ""); setValue("searchedDong", "");
    setValue("modalFilter", "latest"); setValue("selectedPyeongRange", "all"); setValue("selectedFloorRange", "all");
    setModalTrades([]);
    prevModalGuRef.current = "";
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setValue, setSearchParams]);

  const animatedTotalCount = useCountUp(trend.summary.totalCount || 0, 800);
  const allTrades = trend.allTrades;

  /* 전체 보기 모달 오픈 및 90일간 전체 실거래 병렬 호출 */
  const OpenAllTradeModal = useCallback(async () => {
    setValue("isModalOpen", true);
    setValue("modalFilter", "latest");
    setValue("selectedPyeongRange", "all");
    setValue("selectedFloorRange", "all");

    const gu = getValues("searchedGu");
    const dong = getValues("searchedDong");
    if (!gu) return;

    const cacheKey = `${gu}_${dong || "all"}`;
    if (prevModalGuRef.current === cacheKey && modalTrades.length > 0) return;

    setIsModalLoading(true);
    try {
      const seen = new Set<string>();
      const uniqueTrades: TradeItemType[] = [];
      const addTrade = (t: TradeItemType) => {
        const key = `${t.contractDate}_${t.complexName}_${t.floor}_${t.price}`;
        if (!seen.has(key)) { seen.add(key); uniqueTrades.push(t); }
      };

      if (dong) {
        allTrades.forEach(addTrade);
        const complexes = trend.rawTopVolume || [];
        if (complexes.length > 0) {
          const aptResults = await Promise.all(complexes.map(async (c) => {
            if (!c.apt_name || !c.mno) return [];
            try {
              const res = await apiMiddleware.get<AptMktResponse>("/fastApi/aptmkt", {
                params: { guCode: gu, dongCode: dong, aptName: c.apt_name, mno: c.mno, sno: c.sno || "0000" },
              });
              return res.data?.data?.[0]?.recent_deals?.map((d) => ({ ...d, apt_name: c.apt_name })) || [];
            } catch { return []; }
          }));

          aptResults.flat().forEach((deal) => {
            addTrade({
              contractDate: deal.deal_date || "-",
              complexName: deal.apt_name || "-",
              area: deal.pyeong ? `${Math.round(deal.pyeong)}평형` : (deal.exclusive_area ? formatPyeong(deal.exclusive_area) : "-"),
              floor: deal.floor !== undefined && deal.floor !== null ? `${deal.floor}층` : "-",
              price: formatPrice(deal.deal_amount || 0),
            });
          });
        }
      } else {
        if (dongs.length === 0) { setModalTrades(allTrades); return; }
        const results = await Promise.all(dongs.map(async (d) => {
          try {
            const res = await apiMiddleware.get<RttResponse>("/fastApi/rtt", { params: { guCode: gu, dongCode: d.dongCd.slice(-5) } });
            return res.data?.recent_trades || [];
          } catch { return []; }
        }));

        results.flat().forEach((t) => {
          addTrade({
            contractDate: t.deal_date || "-",
            complexName: t.apt_name || "-",
            area: t.pyeong ? `${Math.round(t.pyeong)}평형` : (t.exclusive_area_m2 ? `${Math.round(t.exclusive_area_m2 * 0.3025)}평형` : "-"),
            floor: t.floor !== undefined && t.floor !== null ? `${t.floor}층` : "-",
            price: formatPrice(t.trade_amount || 0),
          });
        });
      }

      uniqueTrades.sort((a, b) => b.contractDate.localeCompare(a.contractDate));
      setModalTrades(uniqueTrades.length > 0 ? uniqueTrades : allTrades);
      prevModalGuRef.current = cacheKey;
    } catch {
      setModalTrades(allTrades);
    } finally {
      setIsModalLoading(false);
    }
  }, [allTrades, dongs, getValues, modalTrades.length, setValue, trend.rawTopVolume]);

  const displayTrades = modalTrades.length > 0 ? modalTrades : allTrades;

  /* 모달 필터링 (최신순 / 평형 / 층별) */
  const filteredTrades = useMemo(() => {
    let list = [...displayTrades];

    if (modalFilter === "pyeong") {
      if (selectedPyeongRange !== "all") {
        list = list.filter((t) => {
          const p = parseFloat(t.area.replace(/[^0-9.]/g, "")) || 0;
          if (selectedPyeongRange === "under10") return p > 0 && p < 10;
          if (selectedPyeongRange === "10s") return p >= 10 && p < 20;
          if (selectedPyeongRange === "20s") return p >= 20 && p < 30;
          if (selectedPyeongRange === "30s") return p >= 30 && p < 40;
          if (selectedPyeongRange === "over40") return p >= 40;
          return true;
        });
      }
      return list.sort((a, b) => (parseFloat(b.area.replace(/[^0-9.]/g, "")) || 0) - (parseFloat(a.area.replace(/[^0-9.]/g, "")) || 0) || b.contractDate.localeCompare(a.contractDate));
    }

    if (modalFilter === "floor") {
      if (selectedFloorRange !== "all") {
        list = list.filter((t) => {
          const f = parseInt(t.floor.replace(/[^0-9-]/g, ""), 10);
          if (isNaN(f)) return false;
          if (selectedFloorRange === "low") return f <= 5;
          if (selectedFloorRange === "mid") return f >= 6 && f <= 15;
          if (selectedFloorRange === "high") return f >= 16;
          return true;
        });
      }
      return list.sort((a, b) => b.contractDate.localeCompare(a.contractDate));
    }

    return list.sort((a, b) => b.contractDate.localeCompare(a.contractDate));
  }, [displayTrades, modalFilter, selectedPyeongRange, selectedFloorRange]);

  return (
    <div className={cn("tw-scope", "font-sans")}>
      <SectionSidebarLayout sectionTitle={TRENDS_NAVIGATION.sectionTitle} menuItems={TRENDS_NAVIGATION.menuItems}>
        <div className="space-y-6">
          <div>
            <h1 className="text-[22px] sm:text-[24px] font-black tracking-tight text-[#0F172A]">지역별 거래동향</h1>
            <p className="mt-1 text-[13px] font-normal text-[#64748B]">선택한 지역의 실거래 흐름과 가격 변화를 확인하세요.</p>
          </div>

          {/* 검색 필터 */}
          <Card className="rounded-xl border-[#E2E8F0] shadow-none">
            <CardContent className="p-4 sm:p-5">
              <form onSubmit={(e) => { e.preventDefault(); SearchRegion(); }} className="flex flex-col gap-3 lg:flex-row">
                <Select value={sggCd || "none"} onValueChange={(val) => { setValue("sggCd", val === "none" ? "" : val); setValue("dongCd", ""); }}>
                  <SelectTrigger className="h-11 w-full lg:w-[180px] rounded-lg border border-[#DCE8ED] bg-white px-3 text-[13px] font-medium text-[#0F172A] focus:border-[#0F8AA8] focus:outline-none">
                    <SelectValue placeholder="구 선택" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-[#DCE8ED] shadow-md z-50">
                    <SelectItem value="none">구 선택</SelectItem>
                    {sggs.map((s) => (<SelectItem key={s.sggCd} value={s.sggCd}>{s.sggNm}</SelectItem>))}
                  </SelectContent>
                </Select>

                <Select value={dongCd || "all"} disabled={!sggCd} onValueChange={(val) => setValue("dongCd", val === "all" ? "" : val)}>
                  <SelectTrigger className="h-11 w-full lg:w-[180px] rounded-lg border border-[#DCE8ED] bg-white px-3 text-[13px] font-medium text-[#0F172A] focus:border-[#0F8AA8] focus:outline-none disabled:bg-slate-50 disabled:text-slate-400">
                    <SelectValue placeholder="동 선택 (전체)" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-[#DCE8ED] shadow-md z-50">
                    <SelectItem value="all">동 선택 (전체)</SelectItem>
                    {dongs.map((d) => (<SelectItem key={d.dongCd} value={d.dongCd.slice(-5)}>{d.dongNm}</SelectItem>))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Button type="submit" className="h-11 bg-[#0F8AA8] hover:bg-[#0B5E73] px-6 font-bold text-[13px] rounded-lg cursor-pointer">
                    <Search className="size-4 mr-1" />조회하기
                  </Button>
                  <Button type="button" variant="outline" onClick={ResetFilter} className="h-11 rounded-lg border-[#CBD5E1] bg-white px-4 text-[13px] font-bold text-[#475569] hover:bg-slate-50 cursor-pointer">
                    <RotateCcw className="size-4 mr-1" />초기화
                  </Button>
                </div>
              </form>
              {searchedGu && (
                <div className="mt-3.5 pt-3 border-t border-[#F1F5F9] flex items-center gap-2 text-[13px] font-bold text-[#0F172A]">
                  <MapPin className="size-4 text-[#0F8AA8]" />
                  <span>
                    조회한 지역: <span className="text-[#0F8AA8] font-extrabold">{guName}</span>{" "}
                    {dongName ? <span className="text-[#0F8AA8] font-extrabold">{dongName}</span> : <span className="text-[#64748B] font-medium">(구 전체)</span>}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 대시보드 */}
          {isApiError ? (
            <Card className="rounded-xl border border-rose-200 bg-rose-50/60 p-12 text-center shadow-xs">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-3"><AlertCircle className="size-6" /></div>
              <h3 className="text-[17px] font-bold text-rose-900 mb-1">데이터 조회에 실패했습니다.</h3>
              <p className="text-[13px] text-rose-600 mb-4">네트워크 통신 오류가 발생했습니다. 다시 시도해주세요.</p>
              <Button type="button" onClick={SearchRegion} className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-2 rounded-lg cursor-pointer">다시 시도하기</Button>
            </Card>
          ) : (
            <>
              {/* 핵심 지표 */}
              <div className="space-y-1.5">
                <div className="text-[12px] font-medium text-[#64748B]">
                  기준 기간: <span className="font-semibold text-[#0F172A]">{trend.periodRange || NINETY_DAYS_RANGE}</span>
                </div>
                <Card className="rounded-xl border-[#E2E8F0] bg-white shadow-xs">
                  <CardContent className="p-0">
                    <div className="grid grid-cols-2 divide-x divide-y divide-[#F1F5F9] sm:grid-cols-5 sm:divide-y-0">
                      {[
                        { label: "총 거래 건수", val: !searchedGu || !trend.summary.totalCount ? "-" : `${animatedTotalCount.toLocaleString()}건` },
                        { label: "평균 거래가", val: !searchedGu || trend.summary.avgPrice === "-" ? "-" : trend.summary.avgPrice },
                        { label: "평당 거래가", val: !searchedGu || trend.summary.avgPyeongPrice === "-" ? "-" : trend.summary.avgPyeongPrice },
                        { label: "최고 거래가", val: !searchedGu || trend.summary.maxPrice === "-" ? "-" : trend.summary.maxPrice },
                        {
                          label: "거래량 증감률",
                          val: !searchedGu || trend.summary.growth === undefined
                            ? "-"
                            : trend.summary.growth > 0
                            ? `▲ ${trend.summary.growth}%`
                            : trend.summary.growth < 0
                            ? `▼ ${Math.abs(trend.summary.growth)}%`
                            : "0%",
                          colorStyle: !searchedGu || !trend.summary.growth ? "#0F172A" : trend.summary.growth > 0 ? "#DC2626" : "#2563EB",
                          colorClass: !searchedGu || !trend.summary.growth ? "text-[#0F172A]" : trend.summary.growth > 0 ? "text-red-600" : "text-blue-600",
                        },
                      ].map((item, idx) => (
                        <div key={idx} className="p-4">
                          <span className="text-[12px] font-semibold text-[#64748B]">{item.label}</span>
                          <div
                            className={cn("mt-1.5 text-[20px] font-black", item.colorClass || "text-[#0F172A]")}
                            style={item.colorStyle ? { color: item.colorStyle } : undefined}
                          >
                            {item.val}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 차트 영역 */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card className="rounded-xl border-[#E2E8F0] bg-white shadow-xs lg:col-span-2">
                  <CardContent className="p-5">
                    <div className="mb-4 flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                      <div>
                        <h3 className="text-[15px] font-bold text-[#0F172A]">거래량 및 평균 거래가 추이</h3>
                        <span className="text-[11px] font-medium text-[#64748B]">최근 90일 기준</span>
                      </div>
                      <div className="flex gap-4 text-xs font-medium text-[#475569]">
                        <span className="flex items-center gap-1.5"><span className="size-2.5 bg-[#2563EB]" />거래량(건)</span>
                        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#16A34A]" />평균 거래가</span>
                      </div>
                    </div>
                    <Chart
                      chartType="ComboChart" width="100%" height="280px"
                      data={[["구간", "거래량", "평균 거래가"], ...trend.monthly]}
                      options={{
                        backgroundColor: "transparent", seriesType: "bars",
                        series: { 0: { type: "bars", targetAxisIndex: 0, color: "#2563eb" }, 1: { type: "line", targetAxisIndex: 1, color: "#16a34a", lineWidth: 3, pointSize: 6 } },
                        vAxes: { 0: { title: "거래량(건)", minValue: 0 }, 1: { title: "평균 거래가", minValue: 0 } },
                        legend: { position: "none" },
                      }}
                    />
                  </CardContent>
                </Card>

                <Card className="rounded-xl border-[#E2E8F0] bg-white shadow-xs">
                  <CardContent className="p-5">
                    <h3 className="mb-4 border-b border-[#E2E8F0] pb-3 text-[15px] font-bold text-[#0F172A]">평형별 거래 비중</h3>
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-stretch">
                      <div className="h-[240px] w-full sm:w-[58%]">
                        {trend.area.length > 0 ? (
                          <Chart
                            chartType="PieChart" width="100%" height="100%"
                            data={[["평형", "거래 건수"], ...trend.area.map((a) => [a.name, a.count || 0])]}
                            options={{ backgroundColor: "transparent", pieHole: 0.45, pieSliceText: "value", legend: "none", colors: PIE_COLORS, chartArea: { left: 10, top: 20, width: "82%", height: "82%" } }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[12px] text-[#94A3B8]">평형별 거래 비중 데이터가 없습니다.</div>
                        )}
                      </div>
                      <div className="w-full space-y-2 self-center text-[13px] sm:w-[42%]">
                        <p className="border-b border-[#E2E8F0] pb-2 font-semibold text-[#0F172A]">총 거래 건수 {animatedTotalCount.toLocaleString()}건</p>
                        {trend.area.length > 0 ? (
                          trend.area.map((item, idx) => (
                            <div key={item.name} className="flex items-center justify-between text-[#334155]">
                              <span className="flex items-center gap-2">
                                <i className="size-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                {item.name}
                              </span>
                              <strong className="text-[#0F172A]">{(item.count || 0).toLocaleString()}건</strong>
                            </div>
                          ))
                        ) : (
                          <div className="text-[12px] text-[#94A3B8] py-2">등록된 데이터가 없습니다.</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 하단 3개 카드 */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 items-start">
                <Card className="rounded-xl border-[#E2E8F0] bg-white p-4 shadow-xs min-h-[260px] flex flex-col justify-between">
                  <div>
                    <h3 className="text-[14px] font-bold text-[#0F172A] mb-2">최근 실거래 내역 TOP 5</h3>
                    <Table className="w-full text-[11px]">
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="text-center px-1">계약일</TableHead>
                          <TableHead className="text-center px-1">단지명</TableHead>
                          <TableHead className="text-center px-1">평형</TableHead>
                          <TableHead className="text-center px-1">층</TableHead>
                          <TableHead className="text-center px-1">거래가</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trend.recent.length > 0 ? (
                          trend.recent.map((t, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-center px-1 text-[#64748B]">{t.contractDate}</TableCell>
                              <TableCell className="text-center px-1 font-bold text-[#0F172A] truncate max-w-[80px]">{t.complexName}</TableCell>
                              <TableCell className="text-center px-1 text-[#64748B]">{formatPyeong(t.area)}</TableCell>
                              <TableCell className="text-center px-1 text-[#64748B]">{t.floor}</TableCell>
                              <TableCell className="text-center px-1 font-black text-[#0B2545]">{t.price}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow><TableCell colSpan={5} className="h-28 text-center text-[#94A3B8]">실거래 내역 데이터가 없습니다.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex justify-center">
                    <Button type="button" variant="ghost" onClick={OpenAllTradeModal} className="h-7 px-3 text-[11.5px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md flex items-center justify-center cursor-pointer">
                      전체 보기 <ChevronRight className="size-3.5 ml-0.5" />
                    </Button>
                  </div>
                </Card>

                <Card className="rounded-xl border-[#E2E8F0] bg-white p-4 shadow-xs min-h-[235px]">
                  <h3 className="text-[14px] font-bold text-[#0F172A] mb-2">거래량 상위 단지 TOP 5</h3>
                  <Table className="w-full text-[11px]">
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-[20%] text-center">순위</TableHead>
                        <TableHead className="w-[50%] text-center">단지명</TableHead>
                        <TableHead className="w-[30%] text-center">거래건수</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trend.topComplexes.length > 0 ? (
                        trend.topComplexes.map((c) => (
                          <TableRow key={c.rank}>
                            <TableCell className="text-center font-bold text-[#64748B]">{c.rank}</TableCell>
                            <TableCell className="text-center font-bold text-[#0F172A] truncate max-w-[130px]">{c.complexName}</TableCell>
                            <TableCell className="text-center font-black text-[#0B2545]">{c.count}건</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow><TableCell colSpan={3} className="h-28 text-center text-[#94A3B8]">거래량 데이터가 없습니다.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>

                <Card className="rounded-xl border-[#E2E8F0] bg-white p-4 shadow-xs min-h-[235px] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100 mb-2">
                      <div className="flex items-center gap-1.5">
                        <div className="flex size-5 items-center justify-center rounded bg-gradient-to-br from-blue-600 to-indigo-600 text-white"><Sparkles className="size-3" /></div>
                        <h3 className="text-[13.5px] font-black text-[#0F172A]">거래 동향 브리핑</h3>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {trend.insights.length > 0 ? (
                        trend.insights.map((ins) => (
                          <div key={ins.id} className="flex items-start gap-1.5 p-1.5 rounded-md border border-slate-100 bg-slate-50/50">
                            <span className="mt-0.5 flex size-4 items-center justify-center rounded bg-emerald-50 text-emerald-600">
                              {ins.type === "up" ? <TrendingUp className="size-2.5" /> : ins.type === "chart" ? <BarChart2 className="size-2.5" /> : <ArrowUpDown className="size-2.5" />}
                            </span>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[11px] font-bold text-slate-900 truncate">{ins.title}</h4>
                              <p className="text-[10px] text-slate-600">{ins.subtitle}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-[12px] text-[#94A3B8] py-4 text-center">브리핑 데이터가 없습니다.</div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-[#64748B] flex justify-end">
                    <span className="font-semibold text-blue-600">{new Date().toISOString().slice(0, 10).replace(/-/g, ".")} 기준</span>
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      </SectionSidebarLayout>

      {/* 전체 보기 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-[#E2E8F0] bg-white shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-bold text-[#0F172A]">
                  {searchedGu ? `${regionLabel || guName} 실거래 내역 전체보기` : "최근 실거래 내역 전체보기"}
                  <span className="ml-2 text-xs font-normal text-blue-600">({filteredTrades.length}건)</span>
                </h3>
                <div className="mt-2.5 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setValue("modalFilter", "latest");
                      setValue("selectedPyeongRange", "all");
                      setValue("selectedFloorRange", "all");
                    }}
                    className={cn(
                      "h-8 px-3 text-[12px] font-bold rounded-lg border transition-all cursor-pointer shadow-none",
                      modalFilter === "latest" && selectedPyeongRange === "all" && selectedFloorRange === "all"
                        ? "bg-[#0F8AA8] text-white border-[#0F8AA8] hover:bg-[#0B728C] hover:text-white shadow-xs"
                        : "bg-white text-[#475569] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#0F172A]"
                    )}
                  >
                    최신순 전체목록
                  </Button>

                  <Select
                    value={selectedPyeongRange}
                    onValueChange={(val) => {
                      setValue("selectedPyeongRange", val as PyeongRangeType);
                      setValue("selectedFloorRange", "all");
                      setValue("modalFilter", "pyeong");
                    }}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-8 px-3 text-[12px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 shadow-none",
                        modalFilter === "pyeong"
                          ? "bg-[#0F8AA8] text-white border-[#0F8AA8] hover:bg-[#0B728C] shadow-xs [&_svg]:text-white [&_svg]:opacity-100"
                          : "bg-white text-[#475569] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#0F172A]"
                      )}
                    >
                      <SelectValue placeholder="평형">{selectedPyeongRange === "all" ? "평형" : undefined}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-[#DCE8ED] shadow-md z-50 text-xs">
                      <SelectItem value="all">평형 (전체)</SelectItem>
                      <SelectItem value="under10">10평미만</SelectItem>
                      <SelectItem value="10s">10평대 (10평~19평)</SelectItem>
                      <SelectItem value="20s">20평대 (20평~29평)</SelectItem>
                      <SelectItem value="30s">30평대 (30평~39평)</SelectItem>
                      <SelectItem value="over40">40평이상</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedFloorRange}
                    onValueChange={(val) => {
                      setValue("selectedFloorRange", val as FloorRangeType);
                      setValue("selectedPyeongRange", "all");
                      setValue("modalFilter", "floor");
                    }}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-8 px-3 text-[12px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 shadow-none",
                        modalFilter === "floor"
                          ? "bg-[#0F8AA8] text-white border-[#0F8AA8] hover:bg-[#0B728C] shadow-xs [&_svg]:text-white [&_svg]:opacity-100"
                          : "bg-white text-[#475569] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#0F172A]"
                      )}
                    >
                      <SelectValue placeholder="층별">{selectedFloorRange === "all" ? "층별" : undefined}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-[#DCE8ED] shadow-md z-50 text-xs">
                      <SelectItem value="all">층별 (전체)</SelectItem>
                      <SelectItem value="low">저층 (1~5층)</SelectItem>
                      <SelectItem value="mid">중층 (6~15층)</SelectItem>
                      <SelectItem value="high">고층 (16층 이상)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setValue("isModalOpen", false)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 max-h-[65vh]">
              {isModalLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <Loader2 className="size-8 animate-spin text-[#0F8AA8] mb-3" />
                  <p className="text-[13px] font-bold text-[#0F172A]">최근 90일간의 전체 실거래 내역을 불러오는 중입니다...</p>
                  <p className="text-[11px] text-[#64748B] mt-1">{searchedDong ? `${regionLabel} 관내 주요 단지별 실거래 데이터 수집 중` : `${regionLabel} 관내 전체 법정동 실거래 데이터 수집 중`}</p>
                </div>
              ) : (
                <Table className="w-full text-xs">
                  <TableHeader className="sticky top-0 bg-slate-50 z-10 shadow-xs">
                    <TableRow>
                      <TableHead className="w-12 text-center">번호</TableHead>
                      <TableHead className="w-24 text-center">계약일</TableHead>
                      <TableHead className="text-left">단지명</TableHead>
                      <TableHead className="w-20 text-right">평형</TableHead>
                      <TableHead className="w-16 text-center">층</TableHead>
                      <TableHead className="w-28 text-right">실거래가</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrades.length > 0 ? (
                      filteredTrades.map((t, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <TableCell className="text-center text-slate-500">{idx + 1}</TableCell>
                          <TableCell className="text-center text-slate-500">{t.contractDate}</TableCell>
                          <TableCell className="font-bold text-[#0F172A]">{t.complexName}</TableCell>
                          <TableCell className="text-right text-slate-500">{formatPyeong(t.area)}</TableCell>
                          <TableCell className="text-center text-slate-500">{t.floor}</TableCell>
                          <TableCell className="text-right font-black text-blue-600">{t.price}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-400">조회된 실거래 내역 데이터가 없습니다.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
            <div className="p-3 border-t border-[#E2E8F0] bg-slate-50 flex items-center justify-between text-[11px] text-[#64748B] rounded-b-xl">
              <span>{isModalLoading ? "데이터를 수집하는 중입니다..." : `총 ${filteredTrades.length}건의 실거래 내역이 표시됩니다.`}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setValue("isModalOpen", false)} className="h-7 text-xs font-semibold cursor-pointer">닫기</Button>
            </div>
          </div>
        </div>
      )}

      {/* 에러 모달 */}
      {isErrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-rose-200 bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-3"><AlertCircle className="size-6" /></div>
            <h3 className="text-[17px] font-bold text-[#0F172A] mb-1.5">데이터 조회 실패</h3>
            <p className="text-[13px] text-[#64748B] mb-5">네트워크 통신 중 오류가 발생했습니다.<br />잠시 후 다시 시도해주세요.</p>
            <Button type="button" onClick={() => setValue("isErrModalOpen", false)} className="w-full h-10 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg cursor-pointer">확인</Button>
          </div>
        </div>
      )}
    </div>
  );
}
