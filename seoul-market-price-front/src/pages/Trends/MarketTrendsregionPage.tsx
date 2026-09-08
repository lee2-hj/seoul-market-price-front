import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { Chart } from "react-google-charts";
import { RotateCcw, TrendingUp, BarChart2, ArrowUpDown, X, Sparkles, AlertCircle, MapPin, Loader2 } from "lucide-react";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { TRENDS_NAVIGATION } from "@/config/sectionNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AxiosRequestConfig } from "axios";

/* API 클라이언트 모듈 은닉 동적 연동 */
type NetworkRequestConfig = AxiosRequestConfig & { silentAuthCheck?: boolean };
type ApiClientType = { get: <T>(url: string, config?: unknown) => Promise<{ data: T }> };
const _API_MODULES = import.meta.glob<{ default: ApiClientType }>("/src/api/*.ts", { eager: true });
const _TARGET_CLIENT_KEY = Object.keys(_API_MODULES).find((p) => p.includes(atob("bWlkZGxld2FyZQ=="))) || "";
const apiMiddleware: ApiClientType = _API_MODULES[_TARGET_CLIENT_KEY]?.default ?? { get: async () => ({ data: {} as never }) };

/* 1. TypeScript 타입 선언 */
type ModalFilterType = "latest" | "pyeong" | "floor";
type PyeongRangeType = "all" | "under10" | "10s" | "20s" | "30s" | "over40";
type FloorRangeType = "all" | "low" | "mid" | "high";
type RegionFormType = {
  sggCd: string; dongCd: string; searchedGu: string; searchedDong: string;
  modalFilter: ModalFilterType; selectedPyeongRange: PyeongRangeType; selectedFloorRange: FloorRangeType;
  isModalOpen: boolean; isErrModalOpen: boolean;
};
type SggItemType = { sggCd: string; sggNm: string };
type DongItemType = { dongCd: string; dongNm: string; sggCd?: string };
type RawLocationItem = string | {
  sggCd?: string;
  dongCd?: string;
  code?: string;
  sggNm?: string;
  dongNm?: string;
  name?: string;
};
type LocationApiResponse = RawLocationItem[] | { items?: RawLocationItem[] };
type AptMarketTrendRequestType = { guCode: string; dongCode: string; aptName: string; mno: string; sno?: string };
type AptDealType = {
  deal_date?: string;
  apt_name?: string;
  pyeong?: number;
  exclusive_area?: number | string;
  floor?: number;
  deal_amount?: number;
};
type AptMarketTrendResponseType = {
  data?: Array<{
    recent_deals?: AptDealType[];
  }>;
};
type RttRecentTrade = { apt_name: string; mno?: string; sno?: string; deal_date: string; floor: number; trade_amount: number; pyeong: number; exclusive_area_m2: number; };
type RttBiweeklyTrend = { period_label: string; start_date: string; end_date: string; deal_cnt: number; avg_trade_amount: number };
type RttPyeongDistribution = { pyeong_grp: string; deal_cnt: number; ratio: number };
type RttTop5ByVolume = { apt_name: string; mno?: string; sno?: string; deal_cnt: number; avg_trade_amount: number };
type RttResponse = { sgg_cd: string; sgg_nm: string; dong_cd?: string; dong_nm?: string; period_start: string; period_end: string; total_deal_cnt: number; total_trade_amount: number; avg_trade_amount: number; max_trade_amount: number; volume_change_rate: number; avg_pyeong_amt?: number; avg_pyeong_price?: number; biweekly_trend: RttBiweeklyTrend[]; pyeong_distribution: RttPyeongDistribution[]; recent_trades: RttRecentTrade[]; top5_by_volume: RttTop5ByVolume[]; };
type AreaItemType = { name: string; percentage: number; count: number; color: string };
type TradeItemType = { contractDate: string; complexName: string; area: string; floor: string; price: string; amount?: number };
type TopComplexType = { rank: number; complexName: string; count: number };
type InsightItemType = { id: string; title: string; subtitle: string; type: "up" | "chart" | "swap" };
type SummaryMetricsType = { totalCount: number; avgPrice: string; avgPyeongPrice: string; maxPrice: string; growth: number };
type RegionTrendDataType = { summary: SummaryMetricsType; monthly: Array<[string, number, string, { v: number; f: string }, string]>; area: AreaItemType[]; recent: TradeItemType[]; topComplexes: TopComplexType[]; allTrades: TradeItemType[]; insights: InsightItemType[]; periodRange?: string; rawTopVolume?: RttTop5ByVolume[]; };

/* 2. API 엔드포인트 은닉 및 연동 함수 */
const getMaskedEndpoint = (token: string): string => { try { return atob(token); } catch { return ""; } };
const URL_RTT = getMaskedEndpoint("L2Zhc3RBcGkvcnR0");
const URL_APTMKT = getMaskedEndpoint("L2Zhc3RBcGkvYXB0bWt0");
const URL_LOCATION_SGGS = getMaskedEndpoint("L2FwaS9sb2NhdGlvbi9zZ2dz");
const URL_LOCATION_DONGS = getMaskedEndpoint("L2FwaS9sb2NhdGlvbi9kb25ncw==");

async function fetchSggs(): Promise<SggItemType[]> {
  try {
    const config: NetworkRequestConfig = { silentAuthCheck: true };
    const response = await apiMiddleware.get<LocationApiResponse>(URL_LOCATION_SGGS, config);
    const data = response.data;
    if (Array.isArray(data)) {
      return data.map((item: RawLocationItem) => {
        if (typeof item === "string") {
          return { sggCd: item, sggNm: item };
        }
        return {
          sggCd: String(item.sggCd || item.code || item.sggNm || item.name || ""),
          sggNm: String(item.sggNm || item.name || item.sggCd || ""),
        };
      });
    }
    if (data && Array.isArray(data.items)) {
      return data.items.map((item: RawLocationItem) => {
        if (typeof item === "string") {
          return { sggCd: item, sggNm: item };
        }
        return {
          sggCd: String(item.sggCd || item.code || item.sggNm || item.name || ""),
          sggNm: String(item.sggNm || item.name || item.sggCd || ""),
        };
      });
    }
    return [];
  } catch {
    return [];
  }
}

async function fetchDongs(sggCd: string): Promise<DongItemType[]> {
  if (!sggCd) return [];
  try {
    const config: NetworkRequestConfig = {
      params: { sggCd },
      silentAuthCheck: true,
    };
    const response = await apiMiddleware.get<LocationApiResponse>(URL_LOCATION_DONGS, config);
    const data = response.data;
    if (Array.isArray(data)) {
      return data.map((item: RawLocationItem) => {
        if (typeof item === "string") {
          return { dongCd: item, dongNm: item, sggCd };
        }
        return {
          dongCd: String(item.dongCd || item.code || item.dongNm || item.name || ""),
          dongNm: String(item.dongNm || item.name || item.dongCd || ""),
          sggCd: String(item.sggCd || sggCd),
        };
      });
    }
    if (data && Array.isArray(data.items)) {
      return data.items.map((item: RawLocationItem) => {
        if (typeof item === "string") {
          return { dongCd: item, dongNm: item, sggCd };
        }
        return {
          dongCd: String(item.dongCd || item.code || item.dongNm || item.name || ""),
          dongNm: String(item.dongNm || item.name || item.dongCd || ""),
          sggCd: String(item.sggCd || sggCd),
        };
      });
    }
    return [];
  } catch {
    return [];
  }
}

async function fetchApartmentMarketTrend(request: AptMarketTrendRequestType): Promise<AptMarketTrendResponseType> {
  const response = await apiMiddleware.get<AptMarketTrendResponseType>(URL_APTMKT, { params: request });
  return response.data;
}

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
const getNinetyDaysRange = (): string => {
  const now = new Date(), past = new Date(now.getTime() - 90 * 86400000);
  return `${past.getFullYear()}.${String(past.getMonth() + 1).padStart(2, "0")} ~ ${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}`;
};
const NINETY_DAYS_RANGE = getNinetyDaysRange();

const getTopTradesByPrice = (trades: TradeItemType[]): TradeItemType[] => {
  const sorted = [...trades].sort((a, b) => (b.amount || 0) - (a.amount || 0) || b.contractDate.localeCompare(a.contractDate)), seen = new Set<string>(), res: TradeItemType[] = [];
  for (const t of sorted) { if (!seen.has(t.complexName)) { seen.add(t.complexName); res.push(t); if (res.length === 5) break; } }
  return res.length >= 5 ? res : sorted.slice(0, 5);
};

const buildTrendTooltipHtml = (periodLabel: string, dateRange: string, dealCount: number, avgPrice: number): string =>
  `<div style="padding:10px 12px;font-family:-apple-system,BlinkMacSystemFont,'Pretendard',sans-serif;font-size:12px;line-height:1.5;color:#123047;background:#FFFFFF;border-radius:10px;box-shadow:0 6px 18px rgba(18,48,71,0.12);border:1px solid #DCE8ED;min-width:150px;pointer-events:none;"><div style="font-weight:800;color:#0F8AA8;font-size:13px;">${periodLabel}</div>${dateRange ? `<div style="font-size:11px;color:#64748B;margin-top:2px;">기간: ${dateRange}</div>` : ""}<div style="margin-top:6px;padding-top:6px;border-top:1px solid #F1F5F9;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;"><span style="color:#64748B;font-size:11px;">거래량</span><strong style="color:#2563EB;font-weight:700;">${dealCount.toLocaleString()}건</strong></div><div style="display:flex;justify-content:space-between;align-items:center;"><span style="color:#64748B;font-size:11px;">평균 거래가</span><strong style="color:#16A34A;font-weight:700;">${formatPrice(avgPrice)}</strong></div></div></div>`.trim();

const buildPieTooltipHtml = (label: string, dealCount: number): string =>
  `<div style="padding:10px 12px;font-family:-apple-system,BlinkMacSystemFont,'Pretendard',sans-serif;font-size:12px;line-height:1.5;color:#123047;background:#FFFFFF;border-radius:10px;box-shadow:0 6px 18px rgba(18,48,71,0.12);border:1px solid #DCE8ED;min-width:140px;pointer-events:none;"><div style="font-weight:800;color:#0F8AA8;font-size:13px;">${label}</div><div style="margin-top:6px;padding-top:6px;border-top:1px solid #F1F5F9;"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="color:#64748B;font-size:11px;">거래량</span><strong style="color:#2563EB;font-weight:700;">${dealCount.toLocaleString()}건</strong></div></div></div>`.trim();

const FallbackTrend: RegionTrendDataType = {
  summary: { totalCount: 0, avgPrice: "-", avgPyeongPrice: "-", maxPrice: "-", growth: 0 },
  monthly: [],
  area: [], recent: [], topComplexes: [], allTrades: [], insights: [], periodRange: NINETY_DAYS_RANGE, rawTopVolume: [],
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

/* 3. 메인 페이지 컴포넌트 */
export default function MarketTrendsregionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [modalTrades, setModalTrades] = useState<TradeItemType[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const prevModalGuRef = useRef<string>(""), prevApiErrRef = useRef(false);

  const { control, getValues, setValue } = useForm<RegionFormType>({
    defaultValues: {
      sggCd: searchParams.get("sggCd") ?? "", dongCd: searchParams.get("dongCd") ?? "",
      searchedGu: searchParams.get("sggCd") ?? "", searchedDong: searchParams.get("dongCd") ?? "",
      modalFilter: "latest", selectedPyeongRange: "all", selectedFloorRange: "all",
      isModalOpen: false, isErrModalOpen: false,
    },
  });

  const formValues = useWatch({ control });
  const sggCd = formValues?.sggCd ?? "", dongCd = formValues?.dongCd ?? "";
  const searchedGu = formValues?.searchedGu ?? "", searchedDong = formValues?.searchedDong ?? "";
  const selectedPyeongRange = formValues?.selectedPyeongRange ?? "all", selectedFloorRange = formValues?.selectedFloorRange ?? "all";
  const isModalOpen = formValues?.isModalOpen ?? false, isErrModalOpen = formValues?.isErrModalOpen ?? false;

  const { data: sggs = [] } = useQuery<SggItemType[], Error, SggItemType[]>({
    queryKey: ["regionSggs"], queryFn: async (): Promise<SggItemType[]> => (await fetchSggs()) || [],
    select: (data: SggItemType[]): SggItemType[] => data || [], staleTime: 1800000,
  });

  const { data: dongs = [] } = useQuery<DongItemType[], Error, DongItemType[]>({
    queryKey: ["regionDongs", sggCd], queryFn: async (): Promise<DongItemType[]> => sggCd ? ((await fetchDongs(sggCd)) || []) : [],
    select: (data: DongItemType[]): DongItemType[] => data || [], enabled: Boolean(sggCd), staleTime: 1800000,
  });

  const guName = useMemo(() => sggs.find((g) => g.sggCd === searchedGu)?.sggNm ?? "", [sggs, searchedGu]);
  const dongName = useMemo(() => dongs.find((d) => d.dongCd.slice(-5) === searchedDong)?.dongNm ?? "", [dongs, searchedDong]);
  const regionLabel = useMemo(() => [guName, dongName].filter(Boolean).join(" "), [guName, dongName]);

  const [guInput, setGuInput] = useState(""), [isGuDropdownOpen, setIsGuDropdownOpen] = useState(false), [guHighlight, setGuHighlight] = useState(-1);
  const [dongInput, setDongInput] = useState(""), [isDongDropdownOpen, setIsDongDropdownOpen] = useState(false), [dongHighlight, setDongHighlight] = useState(-1);
  const guContainerRef = useRef<HTMLDivElement>(null), dongContainerRef = useRef<HTMLDivElement>(null);
  const guItemRefs = useRef<Array<HTMLButtonElement | null>>([]), dongItemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedGuName = useMemo(() => sggs.find((item) => item.sggCd === sggCd)?.sggNm ?? "", [sggs, sggCd]);
  const selectedDongName = useMemo(() => dongs.find((item) => item.dongCd.slice(-5) === dongCd)?.dongNm ?? "", [dongs, dongCd]);

  const filteredSggs = useMemo(() => {
    const q = guInput.trim().toLowerCase();
    return !q || q === selectedGuName.toLowerCase() ? sggs : sggs.filter((item) => item.sggNm.toLowerCase().includes(q));
  }, [guInput, selectedGuName, sggs]);

  const filteredDongs = useMemo(() => {
    const q = dongInput.trim().toLowerCase();
    return !q || q === selectedDongName.toLowerCase() ? dongs : dongs.filter((item) => item.dongNm.toLowerCase().includes(q));
  }, [dongInput, selectedDongName, dongs]);

  useEffect(() => { if (guHighlight >= 0 && guItemRefs.current[guHighlight]) guItemRefs.current[guHighlight]?.scrollIntoView({ block: "nearest" }); }, [guHighlight]);
  useEffect(() => { if (dongHighlight >= 0 && dongItemRefs.current[dongHighlight]) dongItemRefs.current[dongHighlight]?.scrollIntoView({ block: "nearest" }); }, [dongHighlight]);

  useEffect(() => {
    const closeDropdown = (e: MouseEvent) => {
      if (guContainerRef.current && !guContainerRef.current.contains(e.target as Node)) setIsGuDropdownOpen(false);
      if (dongContainerRef.current && !dongContainerRef.current.contains(e.target as Node)) setIsDongDropdownOpen(false);
    };
    document.addEventListener("mousedown", closeDropdown);
    return () => document.removeEventListener("mousedown", closeDropdown);
  }, []);

  const selectGu = (code: string, name: string) => {
    setGuInput(name); setIsGuDropdownOpen(false); setGuHighlight(-1); setValue("sggCd", code); setValue("dongCd", ""); setDongInput("");
  };
  const handleGuKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setIsGuDropdownOpen(true); setGuHighlight((i) => (filteredSggs.length ? (i + 1) % filteredSggs.length : -1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setIsGuDropdownOpen(true); setGuHighlight((i) => (filteredSggs.length ? (i <= 0 ? filteredSggs.length - 1 : i - 1) : -1)); }
    else if (event.key === "Enter" && guHighlight >= 0 && filteredSggs[guHighlight]) { event.preventDefault(); selectGu(filteredSggs[guHighlight].sggCd, filteredSggs[guHighlight].sggNm); }
    else if (event.key === "Escape") { setIsGuDropdownOpen(false); setGuHighlight(-1); }
  };
  const selectDong = (code: string, name: string) => {
    setDongInput(name); setIsDongDropdownOpen(false); setDongHighlight(-1); setValue("dongCd", code);
  };
  const handleDongKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setIsDongDropdownOpen(true); setDongHighlight((i) => (filteredDongs.length ? (i + 1) % filteredDongs.length : -1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setIsDongDropdownOpen(true); setDongHighlight((i) => (filteredDongs.length ? (i <= 0 ? filteredDongs.length - 1 : i - 1) : -1)); }
    else if (event.key === "Enter" && dongHighlight >= 0 && filteredDongs[dongHighlight]) { event.preventDefault(); selectDong(filteredDongs[dongHighlight].dongCd.slice(-5), filteredDongs[dongHighlight].dongNm); }
    else if (event.key === "Escape") { setIsDongDropdownOpen(false); setDongHighlight(-1); }
  };

  /* TanStack Query: 지역 분석 데이터 호출 */
  const { data: trendData, isLoading, isError } = useQuery<RegionTrendDataType | null, Error, RegionTrendDataType>({
    queryKey: ["regionTradeTrends", searchedGu, searchedDong],
    queryFn: async (): Promise<RegionTrendDataType | null> => {
      if (!searchedGu) return null;
      try {
        const rttParams: Record<string, string> = { guCode: searchedGu };
        if (searchedDong) rttParams.dongCode = searchedDong;
        const res = await apiMiddleware.get<RttResponse>(URL_RTT, { params: rttParams });
        const rtt = res.data;

        if (rtt && (rtt.total_deal_cnt > 0 || (rtt.recent_trades && rtt.recent_trades.length > 0))) {
          const allTrades: TradeItemType[] = (rtt.recent_trades || []).map((t: RttRecentTrade) => ({
            contractDate: t.deal_date || "-", complexName: t.apt_name || "-",
            area: t.pyeong ? `${Math.round(t.pyeong)}평형` : (t.exclusive_area_m2 ? `${Math.round(t.exclusive_area_m2 * 0.3025)}평형` : "-"),
            floor: t.floor !== undefined && t.floor !== null ? `${t.floor}층` : "-", price: formatPrice(t.trade_amount || 0), amount: t.trade_amount || 0,
          }));

          const monthly: Array<[string, number, string, { v: number; f: string }, string]> = (rtt.biweekly_trend?.length ?? 0) > 0
            ? rtt.biweekly_trend.map((b: RttBiweeklyTrend, idx: number) => {
                const label = `${idx + 1}구간`, dRange = b.start_date && b.end_date ? `${b.start_date.slice(0, 10).replace(/-/g, ".")} ~ ${b.end_date.slice(0, 10).replace(/-/g, ".")}` : "";
                const tip = buildTrendTooltipHtml(label, dRange, b.deal_cnt || 0, b.avg_trade_amount || 0);
                return [label, b.deal_cnt || 0, tip, { v: b.avg_trade_amount || 0, f: b.avg_trade_amount ? `${(b.avg_trade_amount / 10000).toFixed(1)}억` : "-" }, tip];
              })
            : [];

          const area: AreaItemType[] = (rtt.pyeong_distribution || []).map((p: RttPyeongDistribution, idx: number) => {
            const rawGrp = String(p.pyeong_grp || "").trim();
            const name = rawGrp.endsWith("평대")
              ? rawGrp
              : rawGrp.endsWith("평형")
              ? rawGrp.replace(/평형$/, "평대")
              : !isNaN(Number(rawGrp)) && Number(rawGrp) < 10
              ? "10평 미만"
              : `${rawGrp}평대`;
            return {
              name,
              count: p.deal_cnt || 0,
              percentage: Math.round(p.ratio || 0),
              color: PIE_COLORS[idx % PIE_COLORS.length],
            };
          });
          const topComplexes: TopComplexType[] = (rtt.top5_by_volume || []).map((c: RttTop5ByVolume, idx: number) => ({
            rank: idx + 1, complexName: c.apt_name || "-", count: c.deal_cnt || 0,
          }));

          let avgPyeongAmt = rtt.avg_pyeong_amt || rtt.avg_pyeong_price || 0;
          if (!avgPyeongAmt && (rtt.recent_trades || []).length > 0) {
            const pTrades = rtt.recent_trades.map((t: RttRecentTrade) => {
              const py = t.pyeong || (t.exclusive_area_m2 ? t.exclusive_area_m2 * 0.3025 : 0);
              return py > 0 && (t.trade_amount || 0) > 0 ? t.trade_amount / py : 0;
            }).filter((p: number) => p > 0);
            if (pTrades.length > 0) avgPyeongAmt = Math.round(pTrades.reduce((a: number, b: number) => a + b, 0) / pTrades.length);
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

          const periodRange = (rtt.period_start && rtt.period_end) ? `${rtt.period_start.slice(0, 7).replace(/-/g, ".")} ~ ${rtt.period_end.slice(0, 7).replace(/-/g, ".")}` : NINETY_DAYS_RANGE;
          return { summary, monthly, area, recent: getTopTradesByPrice(allTrades), topComplexes, allTrades, insights, periodRange, rawTopVolume: rtt.top5_by_volume || [] };
        }
      } catch { /* ignore */ }
      return null;
    },
    select: (data: RegionTrendDataType | null): RegionTrendDataType => data || FallbackTrend,
    enabled: Boolean(searchedGu), staleTime: 300000,
  });

  const trend = trendData || FallbackTrend;
  const isApiError = Boolean(searchedGu && (isError || (trendData === null && !isLoading)));

  useEffect(() => {
    if (isApiError && !prevApiErrRef.current) setValue("isErrModalOpen", true);
    prevApiErrRef.current = isApiError;
  }, [isApiError, setValue]);

  const SearchRegion = useCallback(() => {
    const sgg = getValues("sggCd"), dong = getValues("dongCd");
    if (!sgg) return alert("조회할 자치구를 선택해주세요.");
    setModalTrades([]); setValue("modalFilter", "latest"); setValue("selectedPyeongRange", "all"); setValue("selectedFloorRange", "all");
    prevModalGuRef.current = ""; setValue("searchedGu", sgg); setValue("searchedDong", dong);
    setSearchParams(dong ? { sggCd: sgg, dongCd: dong } : { sggCd: sgg }, { replace: true });
  }, [getValues, setValue, setSearchParams]);

  const ResetFilter = useCallback(() => {
    setGuInput(""); setDongInput(""); setValue("sggCd", ""); setValue("dongCd", ""); setValue("searchedGu", ""); setValue("searchedDong", "");
    setValue("modalFilter", "latest"); setValue("selectedPyeongRange", "all"); setValue("selectedFloorRange", "all");
    setModalTrades([]); prevModalGuRef.current = ""; setSearchParams(new URLSearchParams(), { replace: true });
  }, [setValue, setSearchParams]);

  const animatedTotalCount = useCountUp(trend.summary.totalCount || 0, 800);
  const allTrades = trend.allTrades;

  /* 전체 실거래 내역 모달 오픈 및 데이터 수집 */
  const OpenAllTradeModal = useCallback(async () => {
    setValue("isModalOpen", true); setValue("modalFilter", "latest"); setValue("selectedPyeongRange", "all"); setValue("selectedFloorRange", "all");
    const gu = getValues("searchedGu"), dong = getValues("searchedDong");
    if (!gu) return;
    const cacheKey = `${gu}_${dong || "all"}`;
    if (prevModalGuRef.current === cacheKey && modalTrades.length > 0) return;

    setIsModalLoading(true);
    try {
      const seen = new Set<string>(), uniqueTrades: TradeItemType[] = [];
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
              const res = await fetchApartmentMarketTrend({ guCode: gu, dongCode: dong, aptName: c.apt_name, mno: c.mno, sno: c.sno || "0000" });
              return res.data?.[0]?.recent_deals?.map((d) => ({ ...d, apt_name: c.apt_name })) || [];
            } catch { return []; }
          }));
          aptResults.flat().forEach((deal) => {
            addTrade({
              contractDate: deal.deal_date || "-", complexName: deal.apt_name || "-",
              area: deal.pyeong ? `${Math.round(deal.pyeong)}평형` : (deal.exclusive_area ? formatPyeong(deal.exclusive_area) : "-"),
              floor: deal.floor !== undefined && deal.floor !== null ? `${deal.floor}층` : "-", price: formatPrice(deal.deal_amount || 0), amount: deal.deal_amount || 0,
            });
          });
        }
      } else {
        if (dongs.length === 0) { setModalTrades(allTrades); return; }
        const results = await Promise.all(dongs.map(async (d) => {
          try {
            const res = await apiMiddleware.get<RttResponse>(URL_RTT, { params: { guCode: gu, dongCode: d.dongCd.slice(-5) } });
            return res.data?.recent_trades || [];
          } catch { return []; }
        }));
        results.flat().forEach((t) => {
          addTrade({
            contractDate: t.deal_date || "-", complexName: t.apt_name || "-",
            area: t.pyeong ? `${Math.round(t.pyeong)}평형` : (t.exclusive_area_m2 ? `${Math.round(t.exclusive_area_m2 * 0.3025)}평형` : "-"),
            floor: t.floor !== undefined && t.floor !== null ? `${t.floor}층` : "-", price: formatPrice(t.trade_amount || 0), amount: t.trade_amount || 0,
          });
        });
      }

      uniqueTrades.sort((a, b) => b.contractDate.localeCompare(a.contractDate));
      setModalTrades(uniqueTrades.length > 0 ? uniqueTrades : allTrades);
      prevModalGuRef.current = cacheKey;
    } catch { setModalTrades(allTrades); } finally { setIsModalLoading(false); }
  }, [allTrades, dongs, getValues, modalTrades.length, setValue, trend.rawTopVolume]);

  const displayTrades = modalTrades.length > 0 ? modalTrades : allTrades;

  const filteredTrades = useMemo(() => {
    let list = [...displayTrades];
    if (selectedPyeongRange !== "all") {
      list = list.filter((t) => {
        const p = parseFloat(t.area.replace(/[^0-9.]/g, "")) || 0;
        return selectedPyeongRange === "under10" ? (p > 0 && p < 10) : selectedPyeongRange === "10s" ? (p >= 10 && p < 20) : selectedPyeongRange === "20s" ? (p >= 20 && p < 30) : selectedPyeongRange === "30s" ? (p >= 30 && p < 40) : (p >= 40);
      });
    }
    if (selectedFloorRange !== "all") {
      list = list.filter((t) => {
        const f = parseInt(t.floor.replace(/[^0-9-]/g, ""), 10);
        return isNaN(f) ? false : selectedFloorRange === "low" ? f <= 5 : selectedFloorRange === "mid" ? (f >= 6 && f <= 15) : f >= 16;
      });
    }
    return list.sort((a, b) => b.contractDate.localeCompare(a.contractDate));
  }, [displayTrades, selectedPyeongRange, selectedFloorRange]);

  return (
    <div className={cn("tw-scope", "font-sans")}>
      <SectionSidebarLayout sectionTitle={TRENDS_NAVIGATION.sectionTitle} menuItems={TRENDS_NAVIGATION.menuItems}>
        <div className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-[24px] font-extrabold text-[#0F172A]">지역별 거래동향</h1>
            <p className="text-[13px] text-[#64748B]">선택한 지역의 실거래 추이와 가격 변화를 확인하세요.</p>
          </div>

          {/* 검색 필터 */}
          <Card className="rounded-xl border-[#E2E8F0] shadow-none overflow-visible">
            <CardContent className="p-4 sm:p-5 overflow-visible">
              <form onSubmit={(e) => { e.preventDefault(); SearchRegion(); }} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div ref={guContainerRef} className="flex-1 min-w-0 relative">
                  <Input
                    value={guInput || selectedGuName} onFocus={() => { setIsGuDropdownOpen(true); setGuHighlight(-1); }}
                    onClick={(e) => { setIsGuDropdownOpen(true); e.currentTarget.select(); }}
                    onChange={(e) => {
                      const v = e.target.value; setGuInput(v); setIsGuDropdownOpen(true); setGuHighlight(-1);
                      if (sggCd && v !== selectedGuName) { setValue("sggCd", ""); setValue("dongCd", ""); setDongInput(""); }
                    }}
                    onKeyDown={handleGuKeyDown} placeholder="구 선택"
                    className="h-11 rounded-lg border-[#DCE8ED] bg-white px-3 text-[13px] font-medium text-[#0F172A] focus-visible:border-[#0F8AA8] focus-visible:ring-[#0F8AA8]/20 cursor-pointer"
                  />
                  {isGuDropdownOpen && (
                    <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-[260px] overflow-y-auto rounded-lg border border-[#E2E8F0] bg-white py-1 shadow-sm">
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); setGuInput(""); selectGu("", ""); }} className={cn("w-full px-4 py-2.5 text-left text-[13px] border-b border-[#F1F5F9] transition-colors hover:bg-[#EFF6FF]", !sggCd ? "bg-[#EFF6FF] font-semibold text-[#0F172A]" : "text-[#334155]")}>선택 안 함</button>
                      {filteredSggs.length ? filteredSggs.map((item, index) => (
                        <button key={item.sggCd} ref={(el) => { guItemRefs.current[index] = el; }} type="button" onMouseEnter={() => setGuHighlight(index)} onMouseDown={(e) => { e.preventDefault(); selectGu(item.sggCd, item.sggNm); }} className={cn("w-full px-4 py-2.5 text-left text-[13px] border-b border-[#F1F5F9] last:border-b-0 transition-colors hover:bg-[#EFF6FF]", index === guHighlight || item.sggCd === sggCd ? "bg-[#EFF6FF] font-semibold text-[#0F172A]" : "text-[#334155]")}>{item.sggNm}</button>
                      )) : <div className="p-3 text-center text-xs text-[#94A3B8]">검색 조건에 맞는 구가 없습니다.</div>}
                    </div>
                  )}
                </div>

                <div ref={dongContainerRef} className="flex-1 min-w-0 relative">
                  <Input
                    value={dongInput || selectedDongName} disabled={!sggCd}
                    onFocus={() => { if (sggCd) { setIsDongDropdownOpen(true); setDongHighlight(-1); } }}
                    onClick={(e) => { if (sggCd) { setIsDongDropdownOpen(true); e.currentTarget.select(); } }}
                    onChange={(e) => { const v = e.target.value; setDongInput(v); setIsDongDropdownOpen(true); setDongHighlight(-1); if (dongCd && v !== selectedDongName) setValue("dongCd", ""); }}
                    onKeyDown={handleDongKeyDown} placeholder={sggCd ? "동 선택" : "구를 먼저 선택해 주세요"}
                    className="h-11 rounded-lg border-[#DCE8ED] bg-white px-3 text-[13px] font-medium text-[#0F172A] focus-visible:border-[#0F8AA8] focus-visible:ring-[#0F8AA8]/20 cursor-pointer disabled:bg-[#F8FAFC] disabled:cursor-not-allowed"
                  />
                  {isDongDropdownOpen && sggCd && (
                    <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-[260px] overflow-y-auto rounded-lg border border-[#E2E8F0] bg-white py-1 shadow-sm">
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); setDongInput(""); selectDong("", ""); }} className={cn("w-full px-4 py-2.5 text-left text-[13px] border-b border-[#F1F5F9] transition-colors hover:bg-[#EFF6FF]", !dongCd ? "bg-[#EFF6FF] font-semibold text-[#0F172A]" : "text-[#334155]")}>선택 안 함</button>
                      {filteredDongs.length ? filteredDongs.map((item, index) => (
                        <button key={item.dongCd} ref={(el) => { dongItemRefs.current[index] = el; }} type="button" onMouseEnter={() => setDongHighlight(index)} onMouseDown={(e) => { e.preventDefault(); selectDong(item.dongCd.slice(-5), item.dongNm); }} className={cn("w-full px-4 py-2.5 text-left text-[13px] border-b border-[#F1F5F9] last:border-b-0 transition-colors hover:bg-[#EFF6FF]", index === dongHighlight || item.dongCd.slice(-5) === dongCd ? "bg-[#EFF6FF] font-semibold text-[#0F172A]" : "text-[#334155]")}>{item.dongNm}</button>
                      )) : <div className="p-3 text-center text-xs text-[#94A3B8]">검색 조건에 맞는 동이 없습니다.</div>}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button type="submit" disabled={isLoading || !sggCd} className="h-11 px-6 rounded-lg bg-[#0F8AA8] text-[13px] font-bold text-white shadow-none hover:bg-[#0B728C] cursor-pointer disabled:opacity-50">{isLoading ? <Loader2 className="size-4 animate-spin" /> : "조회"}</Button>
                  <Button type="button" variant="outline" onClick={ResetFilter} className="h-11 rounded-lg border-[#DCE8ED] bg-white px-4 text-[13px] font-medium text-[#0F172A] shadow-none hover:bg-slate-50 cursor-pointer flex items-center gap-1.5"><RotateCcw className="size-4" /><span>초기화</span></Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* 상단 4개 지표 통합 카드 (조회 전/후 상시 표기) */}
          <Card className="grid grid-cols-1 overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "총 거래 건수", val: searchedGu && animatedTotalCount > 0 ? `${animatedTotalCount.toLocaleString()}건` : "-" },
              { label: "평균 거래가", val: searchedGu ? trend.summary.avgPrice : "-" },
              { label: "최고 거래가", val: searchedGu ? trend.summary.maxPrice : "-" },
              {
                label: "거래량 증감률",
                val: !searchedGu ? "-" : trend.summary.growth > 0
                  ? <span className="text-[#DC2626]">▲ {trend.summary.growth}%</span>
                  : trend.summary.growth < 0
                    ? <span className="text-[#2563EB]">▼ {Math.abs(trend.summary.growth)}%</span>
                    : <span className="text-[#64748B]">0%</span>,
              },
            ].map((c, i) => (
              <div key={i} className="border-b p-4 lg:border-b-0">
                <span className="text-[12px] text-[#6B7280]">{c.label}</span>
                <div className="mt-2 text-[21px] font-extrabold text-[#0F172A]">{c.val}</div>
                {searchedGu && <p className="mt-2 text-[11px] text-[#94A3B8]">({trend.periodRange || NINETY_DAYS_RANGE})</p>}
              </div>
            ))}
          </Card>

          {/* 메인 콘텐츠 영역 */}
          {!searchedGu ? (
            <Card className="rounded-xl border-[#E2E8F0] bg-white p-12 text-center shadow-xs">
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="flex size-14 items-center justify-center rounded-full bg-[#F0FDF4] text-[#16A34A]"><MapPin className="size-7" /></div>
                <h2 className="text-[17px] font-bold text-[#0F172A]">지역을 선택하여 거래동향을 확인하세요</h2>
                <p className="text-[13px] text-[#64748B] max-w-sm">상단 필터에서 서울시 자치구와 동을 선택하신 후 &apos;조회&apos; 버튼을 누르면 실시간 거래 추이 데이터를 불러옵니다.</p>
              </div>
            </Card>
          ) : (
            <>

              {/* 차트 영역 */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card className="rounded-xl border-[#E2E8F0] bg-white shadow-xs lg:col-span-2">
                  <CardContent className="p-5">
                    <div className="mb-4 flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                      <div><h3 className="text-[15px] font-bold text-[#0F172A]">거래량 및 평균 거래가 추이</h3><span className="text-[11px] font-medium text-[#64748B]">최근 90일 기준</span></div>
                      <div className="flex gap-4 text-xs font-medium text-[#475569]"><span className="flex items-center gap-1.5"><span className="size-2.5 bg-[#2563EB]" />거래량(건)</span><span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#16A34A]" />평균 거래가</span></div>
                    </div>
                    {trend.monthly.length > 0 ? (
                      <div className="relative min-w-0 w-full [&>div]:!min-w-0 [&>div]:!max-w-full [&_svg]:!max-w-full [&_.google-visualization-tooltip]:!pointer-events-none [&_.google-visualization-tooltip]:!select-none [&_.google-visualization-tooltip]:!z-50 [&_.google-visualization-tooltip]:!border-0 [&_.google-visualization-tooltip]:!bg-transparent [&_.google-visualization-tooltip]:!shadow-none [&_.google-visualization-tooltip]:!p-0">
                        <Chart
                          chartType="ComboChart" width="100%" height="280px"
                          data={[["구간", "거래량", { role: "tooltip", type: "string", p: { html: true } }, "평균 거래가", { role: "tooltip", type: "string", p: { html: true } }], ...trend.monthly]}
                          options={{
                            backgroundColor: "transparent", seriesType: "bars",
                            series: { 0: { type: "bars", targetAxisIndex: 0, color: "#2563eb" }, 1: { type: "line", targetAxisIndex: 1, color: "#16a34a", lineWidth: 3, pointSize: 6 } },
                            vAxes: { 0: { title: "거래량(건)", minValue: 0 }, 1: { title: "평균 거래가", minValue: 0 } },
                            legend: { position: "none" }, tooltip: { isHtml: true, trigger: "focus" },
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex h-[280px] w-full items-center justify-center text-[12px] text-[#94A3B8]">
                        거래량 및 평균 거래가 추이 데이터가 없습니다.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-xl border-[#E2E8F0] bg-white shadow-xs">
                  <CardContent className="p-5">
                    <h3 className="mb-4 border-b border-[#E2E8F0] pb-3 text-[15px] font-bold text-[#0F172A]">평형별 거래 비중</h3>
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-stretch">
                      <div className="h-[240px] w-full sm:w-[58%] relative min-w-0 [&>div]:!min-w-0 [&>div]:!max-w-full [&_svg]:!max-w-full [&_.google-visualization-tooltip]:!pointer-events-none [&_.google-visualization-tooltip]:!select-none [&_.google-visualization-tooltip]:!z-50 [&_.google-visualization-tooltip]:!border-0 [&_.google-visualization-tooltip]:!bg-transparent [&_.google-visualization-tooltip]:!shadow-none [&_.google-visualization-tooltip]:!p-0">
                        {trend.area.length > 0 ? (
                          <Chart
                            chartType="PieChart" width="100%" height="100%"
                            data={[
                              ["평형", "거래 건수", { role: "tooltip", type: "string", p: { html: true } }],
                              ...trend.area.map((a) => [
                                a.name,
                                { v: a.count || 0, f: `${(a.count || 0).toLocaleString()}건` },
                                buildPieTooltipHtml(a.name, a.count || 0),
                              ]),
                            ]}
                            options={{
                              backgroundColor: "transparent",
                              is3D: false,
                              pieHole: 0.45,
                              pieSliceBorderColor: "transparent",
                              pieSliceText: "value",
                              pieSliceTextStyle: { color: "#ffffff", fontSize: 12, bold: true },
                              sliceVisibilityThreshold: 0,
                              legend: "none",
                              colors: PIE_COLORS,
                              chartArea: { left: 10, top: 10, width: "90%", height: "85%" },
                              tooltip: { isHtml: true, trigger: "focus" },
                            }}
                          />
                        ) : <div className="flex h-full w-full items-center justify-center text-[12px] text-[#94A3B8]">평형별 거래 비중 데이터가 없습니다.</div>}
                      </div>
                      <div className="w-full space-y-2 self-center text-[13px] sm:w-[42%]">
                        <p className="border-b border-[#E2E8F0] pb-2 font-semibold text-[#0F172A]">총 거래 건수 {animatedTotalCount.toLocaleString()}건</p>
                        {trend.area.length > 0 ? trend.area.map((item, idx) => (
                          <div key={item.name} className="flex items-center justify-between text-[#334155]">
                            <span className="flex items-center gap-2"><i className="size-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />{item.name}</span>
                            <strong className="text-[#0F172A]">{(item.count || 0).toLocaleString()}건</strong>
                          </div>
                        )) : <div className="text-[12px] text-[#94A3B8] py-2">등록된 데이터가 없습니다.</div>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 하단 3개 카드 */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 items-stretch">
                <Card className="h-full rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-none flex flex-col justify-between">
                  <div>
                    <h2 className="mb-3 border-b border-[#E2E8F0] pb-3 text-[14px] font-semibold text-[#0F172A]">최근 실거래 내역 TOP 5</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full whitespace-nowrap text-[12px]">
                        <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px]">
                          <tr>{["계약일", "단지명"].map((h) => <th key={h} className="px-3 py-2.5 text-left text-[#475569] font-medium">{h}</th>)}{["전용면적(평수)", "층", "거래가"].map((h) => <th key={h} className="px-3 py-2.5 text-right text-[#475569] font-medium">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {trend.recent.length > 0 ? trend.recent.map((t, idx) => (
                            <tr key={idx} className="border-b border-[#F1F5F9] last:border-b-0 hover:bg-[#F8FAFC]/50">
                              <td className="px-3 py-3 text-left text-[#334155]">{t.contractDate}</td>
                              <td className="px-3 py-3 text-left font-medium text-[#0F172A] truncate max-w-[100px]">{t.complexName}</td>
                              <td className="px-3 py-3 text-right text-[#334155]">{formatPyeong(t.area)}</td>
                              <td className="px-3 py-3 text-right text-[#334155]">{t.floor}</td>
                              <td className="px-3 py-3 text-right font-medium text-[#334155]">{t.price}</td>
                            </tr>
                          )) : <tr><td colSpan={5} className="p-8 text-center text-[#64748B]">등록된 데이터가 없습니다.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <Button type="button" variant="outline" onClick={OpenAllTradeModal} className="mt-4 h-10 w-full rounded-none border-x-0 border-b border-t-0 border-[#94A3B8] text-[12px] text-[#2563EB] hover:bg-[#F8FAFC] hover:text-[#1D4ED8] cursor-pointer">
                    전체 실거래 내역 보기 ›
                  </Button>
                </Card>

                <Card className="h-full rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-none flex flex-col justify-between">
                  <div>
                    <h2 className="mb-3 border-b border-[#E2E8F0] pb-3 text-[14px] font-semibold text-[#0F172A]">거래량 상위 단지 TOP 5</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full whitespace-nowrap text-[12px]">
                        <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px]">
                          <tr><th className="px-3 py-2.5 text-left text-[#475569] font-medium">순위</th><th className="px-3 py-2.5 text-left text-[#475569] font-medium">단지명</th><th className="px-3 py-2.5 text-right text-[#475569] font-medium">거래건수</th></tr>
                        </thead>
                        <tbody>
                          {trend.topComplexes.length > 0 ? trend.topComplexes.map((c) => (
                            <tr key={c.rank} className="border-b border-[#F1F5F9] last:border-b-0 hover:bg-[#F8FAFC]/50">
                              <td className="px-3 py-3 text-left font-medium text-[#64748B]">{c.rank}</td>
                              <td className="px-3 py-3 text-left font-medium text-[#0F172A] truncate max-w-[130px]">{c.complexName}</td>
                              <td className="px-3 py-3 text-right font-medium text-[#334155]">{c.count}건</td>
                            </tr>
                          )) : <tr><td colSpan={3} className="p-8 text-center text-[#64748B]">등록된 데이터가 없습니다.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Card>

                <Card className="h-full rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-none flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-3">
                      <div className="flex items-center gap-1.5"><div className="flex size-5 items-center justify-center rounded bg-gradient-to-br from-blue-600 to-indigo-600 text-white"><Sparkles className="size-3" /></div><h3 className="text-[13.5px] font-black text-[#0F172A]">거래 동향 브리핑</h3></div>
                    </div>
                    <div className="space-y-1">
                      {trend.insights.length > 0 ? trend.insights.map((ins) => (
                        <div key={ins.id} className="flex items-start gap-1.5 p-1.5 rounded-md border border-slate-100 bg-slate-50/50">
                          <span className="mt-0.5 flex size-4 items-center justify-center rounded bg-emerald-50 text-emerald-600">{ins.type === "up" ? <TrendingUp className="size-2.5" /> : ins.type === "chart" ? <BarChart2 className="size-2.5" /> : <ArrowUpDown className="size-2.5" />}</span>
                          <div className="flex-1 min-w-0"><h4 className="text-[11px] font-bold text-slate-900 truncate">{ins.title}</h4><p className="text-[10px] text-slate-600">{ins.subtitle}</p></div>
                        </div>
                      )) : <div className="text-[12px] text-[#94A3B8] py-4 text-center">브리핑 데이터가 없습니다.</div>}
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

      {/* 전체 실거래 내역 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl h-[650px] max-h-[85vh] rounded-xl border border-[#E2E8F0] bg-white shadow-2xl flex flex-col">
            <div className="p-4 border-b border-[#E2E8F0] flex items-start justify-between shrink-0">
              <div>
                <h3 className="text-[16px] font-bold text-[#0F172A]">
                  {searchedGu ? `${regionLabel || guName} 실거래 내역 전체보기` : "최근 실거래 내역 전체보기"}
                  <span className="ml-2 text-xs font-normal text-blue-600">({filteredTrades.length}건)</span>
                </h3>
                <div className="mt-2.5 flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => { setValue("modalFilter", "latest"); setValue("selectedPyeongRange", "all"); setValue("selectedFloorRange", "all"); }} className={cn("h-8 px-3 text-[12px] font-bold rounded-lg border transition-all cursor-pointer shadow-none", selectedPyeongRange === "all" && selectedFloorRange === "all" ? "bg-[#0F8AA8] text-white border-[#0F8AA8] hover:bg-[#0B728C] hover:text-white shadow-xs" : "bg-white text-[#475569] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#0F172A]")}>최신순 전체목록</Button>
                  <Select value={selectedPyeongRange} onValueChange={(val) => { setValue("selectedPyeongRange", val as PyeongRangeType); setValue("modalFilter", "pyeong"); }}>
                    <SelectTrigger className={cn("h-8 w-[90px] shrink-0 justify-between px-2.5 text-[12px] font-bold rounded-lg border transition-all cursor-pointer flex items-center shadow-none", selectedPyeongRange !== "all" ? "bg-[#0F8AA8] text-white border-[#0F8AA8] hover:bg-[#0B728C] shadow-xs [&_svg]:text-white [&_svg]:opacity-100" : "bg-white text-[#475569] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#0F172A]")}>
                      <SelectValue placeholder="평형">{selectedPyeongRange === "all" ? "평형" : selectedPyeongRange === "under10" ? "10평미만" : selectedPyeongRange === "10s" ? "10평대" : selectedPyeongRange === "20s" ? "20평대" : selectedPyeongRange === "30s" ? "30평대" : "40평이상"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-[#DCE8ED] shadow-md z-50 text-xs">
                      <SelectItem value="all">평형 (전체)</SelectItem><SelectItem value="under10">10평미만</SelectItem><SelectItem value="10s">10평대 (10평~19평)</SelectItem><SelectItem value="20s">20평대 (20평~29평)</SelectItem><SelectItem value="30s">30평대 (30평~39평)</SelectItem><SelectItem value="over40">40평이상</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedFloorRange} onValueChange={(val) => { setValue("selectedFloorRange", val as FloorRangeType); setValue("modalFilter", "floor"); }}>
                    <SelectTrigger className={cn("h-8 w-[90px] shrink-0 justify-between px-2.5 text-[12px] font-bold rounded-lg border transition-all cursor-pointer flex items-center shadow-none", selectedFloorRange !== "all" ? "bg-[#0F8AA8] text-white border-[#0F8AA8] hover:bg-[#0B728C] shadow-xs [&_svg]:text-white [&_svg]:opacity-100" : "bg-white text-[#475569] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#0F172A]")}>
                      <SelectValue placeholder="층별">{selectedFloorRange === "all" ? "층별" : selectedFloorRange === "low" ? "저층" : selectedFloorRange === "mid" ? "중층" : "고층"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-[#DCE8ED] shadow-md z-50 text-xs">
                      <SelectItem value="all">층별 (전체)</SelectItem><SelectItem value="low">저층 (1~5층)</SelectItem><SelectItem value="mid">중층 (6~15층)</SelectItem><SelectItem value="high">고층 (16층 이상)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <X onClick={() => setValue("isModalOpen", false)} className="size-5 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors mt-0.5 shrink-0" />
            </div>
            <div className="p-4 overflow-y-auto flex-1 min-h-0">
              {isModalLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <Loader2 className="size-8 animate-spin text-[#0F8AA8] mb-3" />
                  <p className="text-[13px] font-bold text-[#0F172A]">최근 90일간의 전체 실거래 내역을 불러오는 중입니다...</p>
                  <p className="text-[11px] text-[#64748B] mt-1">{searchedDong ? `${regionLabel} 관내 주요 단지별 실거래 데이터 수집 중` : `${regionLabel} 관내 전체 법정동 실거래 데이터 수집 중`}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full whitespace-nowrap text-[12px]">
                    <thead className="sticky top-0 z-10 border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px]">
                      <tr>{["계약일", "단지명"].map((h) => <th key={h} className="px-3 py-2.5 text-left text-[#475569] font-medium">{h}</th>)}{["전용면적(평수)", "층", "거래가"].map((h) => <th key={h} className="px-3 py-2.5 text-right text-[#475569] font-medium">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {filteredTrades.length > 0 ? filteredTrades.map((t, idx) => (
                        <tr key={idx} className="border-b border-[#F1F5F9] last:border-b-0 hover:bg-[#F8FAFC]/50">
                          <td className="px-3 py-3 text-left text-[#334155]">{t.contractDate}</td>
                          <td className="px-3 py-3 text-left font-medium text-[#0F172A]">{t.complexName}</td>
                          <td className="px-3 py-3 text-right text-[#334155]">{formatPyeong(t.area)}</td>
                          <td className="px-3 py-3 text-right text-[#334155]">{t.floor}</td>
                          <td className="px-3 py-3 text-right font-medium text-[#334155]">{t.price}</td>
                        </tr>
                      )) : <tr><td colSpan={5} className="p-8 text-center text-[#64748B]">조회된 실거래 내역 데이터가 없습니다.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-[#E2E8F0] bg-white flex items-center justify-between text-[12px] text-[#64748B] rounded-b-xl shrink-0">
              <span>{isModalLoading ? "데이터를 수집하는 중입니다..." : `총 ${filteredTrades.length.toLocaleString()}건의 실거래 내역이 표시됩니다.`}</span>
              <Button type="button" variant="outline" onClick={() => setValue("isModalOpen", false)} className="h-9 px-4 text-[13px] font-medium cursor-pointer">닫기</Button>
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
