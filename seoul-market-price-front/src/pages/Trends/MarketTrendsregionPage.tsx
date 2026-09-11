import { useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { Chart } from "react-google-charts";
import { RotateCcw, TrendingUp, BarChart2, ArrowUpDown, Sparkles, AlertCircle, MapPin, Loader2 } from "lucide-react";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { TRENDS_NAVIGATION } from "@/config/sectionNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
type RegionFormType = { sggCd: string; dongCd: string; searchedGu: string; searchedDong: string; guInput: string; dongInput: string; isGuOpen: boolean; isDongOpen: boolean; guHighlight: number; dongHighlight: number; modalFilter: ModalFilterType; selectedPyeongRange: PyeongRangeType; selectedFloorRange: FloorRangeType; isModalOpen: boolean; isErrModalOpen: boolean; };
type SggItemType = { sggCd: string; sggNm: string };
type DongItemType = { dongCd: string; dongNm: string; sggCd?: string };
type RawLocationItem = string | { sggCd?: string; dongCd?: string; code?: string; sggNm?: string; dongNm?: string; name?: string };
type LocationApiResponse = RawLocationItem[] | { items?: RawLocationItem[] };
type AptDealType = { deal_date?: string; apt_name?: string; pyeong?: number; exclusive_area?: number | string; floor?: number; deal_amount?: number };
type AptMarketTrendResponseType = { data?: Array<{ recent_deals?: AptDealType[] }> };
type RttRecentTrade = { apt_name: string; mno?: string; sno?: string; deal_date: string; floor: number; trade_amount: number; pyeong: number; exclusive_area_m2: number };
type RttBiweeklyTrend = { period_label: string; start_date: string; end_date: string; deal_cnt: number; avg_trade_amount: number };
type RttPyeongDistribution = { pyeong_grp: string; deal_cnt: number; ratio: number };
type RttTop5ByVolume = { apt_name: string; mno?: string; sno?: string; deal_cnt: number; avg_trade_amount: number };
type RttResponse = { sgg_cd: string; sgg_nm: string; period_start: string; period_end: string; total_deal_cnt: number; avg_trade_amount: number; max_trade_amount: number; volume_change_rate: number; avg_pyeong_amt?: number; avg_pyeong_price?: number; biweekly_trend: RttBiweeklyTrend[]; pyeong_distribution: RttPyeongDistribution[]; recent_trades: RttRecentTrade[]; top5_by_volume: RttTop5ByVolume[] };
type AreaItemType = { name: string; percentage: number; count: number; color: string };
type TradeItemType = { contractDate: string; complexName: string; area: string; floor: string; price: string; amount?: number };
type TopComplexType = { rank: number; complexName: string; count: number };
type InsightItemType = { id: string; title: string; subtitle: string; type: "up" | "chart" | "swap" };
type SummaryMetricsType = { totalCount: number; avgPrice: string; avgPyeongPrice: string; maxPrice: string; growth: number };
type RegionTrendDataType = { summary: SummaryMetricsType; monthly: Array<[string, number, string, { v: number; f: string }, string]>; area: AreaItemType[]; recent: TradeItemType[]; topComplexes: TopComplexType[]; allTrades: TradeItemType[]; insights: InsightItemType[]; periodRange?: string; rawTopVolume?: RttTop5ByVolume[] };

/* 2. 엔드포인트 & 유틸 함수 */
const getMaskedEndpoint = (token: string): string => { try { return atob(token); } catch { return ""; } };
const URL_RTT = getMaskedEndpoint("L2Zhc3RBcGkvcnR0"), URL_APTMKT = getMaskedEndpoint("L2Zhc3RBcGkvYXB0bWt0");
const URL_LOCATION_SGGS = getMaskedEndpoint("L2FwaS9sb2NhdGlvbi9zZ2dz"), URL_LOCATION_DONGS = getMaskedEndpoint("L2FwaS9sb2NhdGlvbi9kb25ncw==");
const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];
const CHART_CSS = "relative min-w-0 w-full [&>div]:!min-w-0 [&>div]:!max-w-full [&_svg]:!max-w-full [&_.google-visualization-tooltip]:!pointer-events-none [&_.google-visualization-tooltip]:!select-none [&_.google-visualization-tooltip]:!z-50 [&_.google-visualization-tooltip]:!border-0 [&_.google-visualization-tooltip]:!bg-transparent [&_.google-visualization-tooltip]:!shadow-none [&_.google-visualization-tooltip]:!p-0";

const COMBO_OPTS = { backgroundColor: "transparent", seriesType: "bars", series: { 0: { type: "bars", targetAxisIndex: 0, color: "#2563eb" }, 1: { type: "line", targetAxisIndex: 1, color: "#16a34a", lineWidth: 3, pointSize: 6 } }, vAxes: { 0: { title: "거래량(건)", minValue: 0 }, 1: { title: "평균 거래가", minValue: 0 } }, legend: { position: "none" }, tooltip: { isHtml: true, trigger: "focus" } };
const PIE_OPTS = { backgroundColor: "transparent", is3D: false, pieHole: 0.45, pieSliceBorderColor: "transparent", pieSliceTextStyle: { color: "#ffffff", fontSize: 12, bold: true }, pieSliceText: "value", sliceVisibilityThreshold: 0, legend: "none", colors: PIE_COLORS, chartArea: { left: 10, top: 10, width: "90%", height: "85%" }, tooltip: { isHtml: true, trigger: "focus" } };

const formatPyeong = (m: number | string | undefined): string => { if (!m || m === "-") return "-"; const num = parseFloat(String(m).replace(/[^0-9.]/g, "")); return isNaN(num) || num <= 0 ? "-" : `${num <= 50 && Number.isInteger(num) ? num : Math.round(num * 0.3025)}평형`; };
const formatPrice = (p: number): string => (!p || p <= 0) ? "-" : p >= 10000 ? `${Math.floor(p / 10000)}억 ${p % 10000 > 0 ? `${(p % 10000).toLocaleString()}` : ""}만원`.trim() : `${p.toLocaleString()}만원`;
const NINETY_DAYS_RANGE = (() => { const now = new Date(), past = new Date(now.getTime() - 90 * 86400000); return `${past.getFullYear()}.${String(past.getMonth() + 1).padStart(2, "0")} ~ ${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}`; })();

const toTradeItem = (i: { deal_date?: string; contractDate?: string; apt_name?: string; complexName?: string; pyeong?: number; exclusive_area_m2?: number; exclusive_area?: number | string; floor?: number | string; trade_amount?: number; deal_amount?: number; amount?: number }): TradeItemType => {
  const amt = i.trade_amount ?? i.deal_amount ?? i.amount ?? 0;
  const area = i.pyeong ? `${Math.round(i.pyeong)}평형` : i.exclusive_area_m2 ? `${Math.round(i.exclusive_area_m2 * 0.3025)}평형` : i.exclusive_area ? formatPyeong(i.exclusive_area) : "-";
  const flr = i.floor !== undefined && i.floor !== null ? String(i.floor).replace(/층$/, "") : "";
  return { contractDate: i.deal_date || i.contractDate || "-", complexName: i.apt_name || i.complexName || "-", area, floor: flr ? `${flr}층` : "-", price: formatPrice(amt), amount: amt };
};

const getTopTradesByPrice = (trades: TradeItemType[]): TradeItemType[] => {
  const sorted = [...trades].sort((a, b) => (b.amount || 0) - (a.amount || 0) || b.contractDate.localeCompare(a.contractDate)), seen = new Set<string>(), res: TradeItemType[] = [];
  for (const t of sorted) { if (!seen.has(t.complexName)) { seen.add(t.complexName); res.push(t); if (res.length === 5) break; } }
  return res.length >= 5 ? res : sorted.slice(0, 5);
};

const makeTooltip = (label: string, dRange: string, title: string, value: string, color: string) =>
  `<div style="padding:10px 12px;font-family:-apple-system,BlinkMacSystemFont,'Pretendard',sans-serif;font-size:12px;line-height:1.5;color:#123047;background:#FFFFFF;border-radius:10px;box-shadow:0 6px 18px rgba(18,48,71,0.12);border:1px solid #DCE8ED;min-width:140px;pointer-events:none;"><div style="font-weight:800;color:#0F8AA8;font-size:13px;">${label}</div>${dRange ? `<div style="font-size:11px;color:#64748B;margin-top:2px;">기간: ${dRange}</div>` : ""}<div style="margin-top:6px;padding-top:6px;border-top:1px solid #F1F5F9;"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="color:#64748B;font-size:11px;">${title}</span><strong style="color:${color};font-weight:700;">${value}</strong></div></div></div>`.trim();

const FallbackTrend: RegionTrendDataType = {
  summary: { totalCount: 0, avgPrice: "-", avgPyeongPrice: "-", maxPrice: "-", growth: 0 },
  monthly: [], area: [], recent: [], topComplexes: [], allTrades: [], insights: [], periodRange: NINETY_DAYS_RANGE, rawTopVolume: [],
};

function makeTrend(rtt: RttResponse, regName: string): RegionTrendDataType {
  const allTrades = (rtt.recent_trades || []).map(toTradeItem);
  const monthly: Array<[string, number, string, { v: number; f: string }, string]> = (rtt.biweekly_trend?.length ?? 0) > 0
    ? rtt.biweekly_trend.map((b, idx) => {
        const label = `${idx + 1}구간`, dRange = b.start_date && b.end_date ? `${b.start_date.slice(0, 10).replace(/-/g, ".")} ~ ${b.end_date.slice(0, 10).replace(/-/g, ".")}` : "";
        return [label, b.deal_cnt || 0, makeTooltip(label, dRange, "거래량", `${(b.deal_cnt || 0).toLocaleString()}건`, "#2563EB"), { v: b.avg_trade_amount || 0, f: b.avg_trade_amount ? `${(b.avg_trade_amount / 10000).toFixed(1)}억` : "-" }, makeTooltip(label, dRange, "평균 거래가", formatPrice(b.avg_trade_amount || 0), "#16A34A")];
      }) : [];
  const area: AreaItemType[] = (rtt.pyeong_distribution || []).map((p, idx) => {
    const raw = String(p.pyeong_grp || "").trim();
    const name = raw.endsWith("평대") ? raw : raw.endsWith("평형") ? raw.replace(/평형$/, "평대") : !isNaN(Number(raw)) && Number(raw) < 10 ? "10평 미만" : `${raw}평대`;
    return { name, count: p.deal_cnt || 0, percentage: Math.round(p.ratio || 0), color: PIE_COLORS[idx % PIE_COLORS.length] };
  });
  const topComplexes: TopComplexType[] = (rtt.top5_by_volume || []).map((c, idx) => ({ rank: idx + 1, complexName: c.apt_name || "-", count: c.deal_cnt || 0 }));
  let avgPyeongAmt = rtt.avg_pyeong_amt || rtt.avg_pyeong_price || 0;
  if (!avgPyeongAmt && (rtt.recent_trades || []).length > 0) {
    const pTrades = rtt.recent_trades.map((t) => { const py = t.pyeong || (t.exclusive_area_m2 ? t.exclusive_area_m2 * 0.3025 : 0); return py > 0 && (t.trade_amount || 0) > 0 ? t.trade_amount / py : 0; }).filter((p) => p > 0);
    if (pTrades.length > 0) avgPyeongAmt = Math.round(pTrades.reduce((a, b) => a + b, 0) / pTrades.length);
  }
  const summary: SummaryMetricsType = { totalCount: rtt.total_deal_cnt || 0, avgPrice: formatPrice(rtt.avg_trade_amount || 0), avgPyeongPrice: formatPrice(avgPyeongAmt || 0), maxPrice: formatPrice(rtt.max_trade_amount || 0), growth: Math.round(rtt.volume_change_rate || 0) };
  const insights: InsightItemType[] = [];
  if (summary.totalCount > 0) insights.push({ id: "1", title: `${regName} 총 거래량 ${summary.totalCount.toLocaleString()}건`, subtitle: `${regName} 지역의 90일간 실제 집계된 거래 데이터입니다.`, type: "up" });
  if (rtt.avg_trade_amount > 0) insights.push({ id: "2", title: `평균 거래가 ${summary.avgPrice} 형성`, subtitle: "해당 지역에서 집계된 실제 평균 거래 가격입니다.", type: "chart" });
  if (rtt.max_trade_amount > 0) insights.push({ id: "3", title: `최고 거래가 ${summary.maxPrice} 기록`, subtitle: "해당 지역에서 집계된 실제 최고 거래 가격입니다.", type: "swap" });
  const periodRange = (rtt.period_start && rtt.period_end) ? `${rtt.period_start.slice(0, 7).replace(/-/g, ".")} ~ ${rtt.period_end.slice(0, 7).replace(/-/g, ".")}` : NINETY_DAYS_RANGE;
  return { summary, monthly, area, recent: getTopTradesByPrice(allTrades), topComplexes, allTrades, insights, periodRange, rawTopVolume: rtt.top5_by_volume || [] };
}

async function fetchLocations(url: string, params?: Record<string, string>): Promise<RawLocationItem[]> {
  try {
    const res = await apiMiddleware.get<LocationApiResponse>(url, { params, silentAuthCheck: true } as NetworkRequestConfig);
    return Array.isArray(res.data) ? res.data : (res.data && Array.isArray(res.data.items) ? res.data.items : []);
  } catch { return []; }
}

/* 3. 공통 UI 컴포넌트 */
function LocationField({ value, placeholder, disabled, isOpen, highlight, items, selectedCode, emptyText, containerRef, itemRefs, onOpen, onClose, onChange, onSelect, onHighlight }: {
  value: string; placeholder: string; disabled?: boolean; isOpen: boolean; highlight: number; items: Array<{ code: string; name: string }>; selectedCode: string; emptyText: string;
  containerRef: React.RefObject<HTMLDivElement | null>; itemRefs: React.MutableRefObject<Array<HTMLButtonElement | null>>; onOpen: () => void; onClose: () => void; onChange: (v: string) => void; onSelect: (code: string, name: string) => void; onHighlight: (idx: number | ((i: number) => number)) => void;
}) {
  return (
    <div ref={containerRef} className="flex-1 min-w-0 relative">
      <Input
        value={value} disabled={disabled} onFocus={onOpen} onClick={onOpen} onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); onOpen(); onHighlight((i) => (items.length ? (i + 1) % items.length : -1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); onOpen(); onHighlight((i) => (items.length ? (i <= 0 ? items.length - 1 : i - 1) : -1)); }
          else if (e.key === "Enter" && highlight >= 0 && items[highlight]) { e.preventDefault(); onSelect(items[highlight].code, items[highlight].name); }
          else if (e.key === "Escape") { onClose(); onHighlight(-1); }
        }}
        placeholder={placeholder} className="h-11 rounded-lg border-[#DCE8ED] bg-white px-3 text-[13px] font-medium text-[#0F172A] focus-visible:border-[#0F8AA8] focus-visible:ring-[#0F8AA8]/20 cursor-pointer disabled:bg-[#F8FAFC] disabled:cursor-not-allowed"
      />
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-[260px] overflow-y-auto rounded-lg border border-[#E2E8F0] bg-white py-1 shadow-sm">
          <button type="button" onMouseDown={(e) => { e.preventDefault(); onSelect("", ""); }} className={cn("w-full px-4 py-2.5 text-left text-[13px] border-b border-[#F1F5F9] hover:bg-[#EFF6FF]", !selectedCode ? "bg-[#EFF6FF] font-semibold text-[#0F172A]" : "text-[#334155]")}>선택 안 함</button>
          {items.length ? items.map((item, index) => (
            <button key={item.code} ref={(el) => { itemRefs.current[index] = el; }} type="button" onMouseEnter={() => onHighlight(index)} onMouseDown={(e) => { e.preventDefault(); onSelect(item.code, item.name); }} className={cn("w-full px-4 py-2.5 text-left text-[13px] border-b border-[#F1F5F9] last:border-b-0 hover:bg-[#EFF6FF]", index === highlight || item.code === selectedCode ? "bg-[#EFF6FF] font-semibold text-[#0F172A]" : "text-[#334155]")}>{item.name}</button>
          )) : <div className="p-3 text-center text-xs text-[#94A3B8]">{emptyText}</div>}
        </div>
      )}
    </div>
  );
}

function TradeTable({ trades, emptyMsg }: { trades: TradeItemType[]; emptyMsg: string }) {
  return (
    <div className="overflow-x-auto"><Table className="w-full whitespace-nowrap text-[12px]">
      <TableHeader className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] sticky top-0 z-10">
        <TableRow>{["계약일", "단지명"].map((h) => <TableHead key={h} className="px-3 py-2.5 text-left text-[#475569] font-medium h-auto">{h}</TableHead>)}{["전용면적(평수)", "층", "거래가"].map((h) => <TableHead key={h} className="px-3 py-2.5 text-right text-[#475569] font-medium h-auto">{h}</TableHead>)}</TableRow>
      </TableHeader>
      <TableBody>
        {trades.length > 0 ? trades.map((t, idx) => (
          <TableRow key={idx} className="border-b border-[#F1F5F9] last:border-b-0 hover:bg-[#F8FAFC]/50">
            <TableCell className="px-3 py-3 text-left text-[#334155]">{t.contractDate}</TableCell>
            <TableCell className="px-3 py-3 text-left font-medium text-[#0F172A] truncate max-w-[130px]">{t.complexName}</TableCell>
            <TableCell className="px-3 py-3 text-right text-[#334155]">{t.area}</TableCell>
            <TableCell className="px-3 py-3 text-right text-[#334155]">{t.floor}</TableCell>
            <TableCell className="px-3 py-3 text-right font-medium text-[#334155]">{t.price}</TableCell>
          </TableRow>
        )) : <TableRow><TableCell colSpan={5} className="p-8 text-center text-[#64748B]">{emptyMsg}</TableCell></TableRow>}
      </TableBody>
    </Table></div>
  );
}

function TopComplexTable({ list }: { list: TopComplexType[] }) {
  return (
    <div className="overflow-x-auto"><Table className="w-full whitespace-nowrap text-[12px]">
      <TableHeader className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px]">
        <TableRow><TableHead className="px-3 py-2.5 text-left text-[#475569] font-medium h-auto">순위</TableHead><TableHead className="px-3 py-2.5 text-left text-[#475569] font-medium h-auto">단지명</TableHead><TableHead className="px-3 py-2.5 text-right text-[#475569] font-medium h-auto">거래건수</TableHead></TableRow>
      </TableHeader>
      <TableBody>
        {list.length > 0 ? list.map((c) => (
          <TableRow key={c.rank} className="border-b border-[#F1F5F9] last:border-b-0 hover:bg-[#F8FAFC]/50">
            <TableCell className="px-3 py-3 text-left font-medium text-[#64748B]">{c.rank}</TableCell>
            <TableCell className="px-3 py-3 text-left font-medium text-[#0F172A] truncate max-w-[130px]">{c.complexName}</TableCell>
            <TableCell className="px-3 py-3 text-right font-medium text-[#334155]">{c.count}건</TableCell>
          </TableRow>
        )) : <TableRow><TableCell colSpan={3} className="p-8 text-center text-[#64748B]">등록된 데이터가 없습니다.</TableCell></TableRow>}
      </TableBody>
    </Table></div>
  );
}

/* 4. 메인 페이지 컴포넌트 */
export default function MarketTrendsregionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const prevApiErrRef = useRef(false), guRef = useRef<HTMLDivElement>(null), dongRef = useRef<HTMLDivElement>(null);
  const guItemRefs = useRef<Array<HTMLButtonElement | null>>([]), dongItemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const { control, getValues, setValue } = useForm<RegionFormType>({
    defaultValues: {
      sggCd: searchParams.get("sggCd") ?? "", dongCd: searchParams.get("dongCd") ?? "",
      searchedGu: searchParams.get("sggCd") ?? "", searchedDong: searchParams.get("dongCd") ?? "",
      guInput: "", dongInput: "", isGuOpen: false, isDongOpen: false, guHighlight: -1, dongHighlight: -1,
      modalFilter: "latest", selectedPyeongRange: "all", selectedFloorRange: "all", isModalOpen: false, isErrModalOpen: false,
    },
  });

  const { sggCd = "", dongCd = "", searchedGu = "", searchedDong = "", guInput = "", dongInput = "", isGuOpen = false, isDongOpen = false, guHighlight = -1, dongHighlight = -1, selectedPyeongRange = "all", selectedFloorRange = "all", isModalOpen = false, isErrModalOpen = false } = useWatch({ control }) || {};

  const { data: sggs = [] } = useQuery<SggItemType[]>({
    queryKey: ["regionSggs"], queryFn: async () => (await fetchLocations(URL_LOCATION_SGGS)).map((i) => typeof i === "string" ? { sggCd: i, sggNm: i } : { sggCd: String(i.sggCd || i.code || i.sggNm || i.name || ""), sggNm: String(i.sggNm || i.name || i.sggCd || "") }),
    staleTime: 1800000,
  });

  const { data: dongs = [] } = useQuery<DongItemType[]>({
    queryKey: ["regionDongs", sggCd], queryFn: async () => !sggCd ? [] : (await fetchLocations(URL_LOCATION_DONGS, { sggCd })).map((i) => typeof i === "string" ? { dongCd: i, dongNm: i, sggCd } : { dongCd: String(i.dongCd || i.code || i.dongNm || i.name || ""), dongNm: String(i.dongNm || i.name || i.dongCd || ""), sggCd: String(i.sggCd || sggCd) }),
    enabled: Boolean(sggCd), staleTime: 1800000,
  });

  const guName = useMemo(() => sggs.find((g) => g.sggCd === searchedGu)?.sggNm ?? "", [sggs, searchedGu]);
  const dongName = useMemo(() => dongs.find((d) => d.dongCd.slice(-5) === searchedDong)?.dongNm ?? "", [dongs, searchedDong]);
  const regionLabel = useMemo(() => [guName, dongName].filter(Boolean).join(" "), [guName, dongName]);
  const selectedGuName = useMemo(() => sggs.find((i) => i.sggCd === sggCd)?.sggNm ?? "", [sggs, sggCd]);
  const selectedDongName = useMemo(() => dongs.find((i) => i.dongCd.slice(-5) === dongCd)?.dongNm ?? "", [dongs, dongCd]);

  const filteredSggs = useMemo(() => {
    const q = guInput.trim().toLowerCase(); return (!q || q === selectedGuName.toLowerCase() ? sggs : sggs.filter((i) => i.sggNm.toLowerCase().includes(q))).map((i) => ({ code: i.sggCd, name: i.sggNm }));
  }, [guInput, selectedGuName, sggs]);
  const filteredDongs = useMemo(() => {
    const q = dongInput.trim().toLowerCase(); return (!q || q === selectedDongName.toLowerCase() ? dongs : dongs.filter((i) => i.dongNm.toLowerCase().includes(q))).map((i) => ({ code: i.dongCd.slice(-5), name: i.dongNm }));
  }, [dongInput, selectedDongName, dongs]);

  useEffect(() => { if (guHighlight >= 0) guItemRefs.current[guHighlight]?.scrollIntoView({ block: "nearest" }); }, [guHighlight]);
  useEffect(() => { if (dongHighlight >= 0) dongItemRefs.current[dongHighlight]?.scrollIntoView({ block: "nearest" }); }, [dongHighlight]);
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (guRef.current && !guRef.current.contains(e.target as Node)) setValue("isGuOpen", false);
      if (dongRef.current && !dongRef.current.contains(e.target as Node)) setValue("isDongOpen", false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [setValue]);

  /* 지역 거래동향 Query */
  const { data: trendData, isLoading, isError } = useQuery<RegionTrendDataType | null>({
    queryKey: ["regionTradeTrends", searchedGu, searchedDong],
    queryFn: async () => {
      if (!searchedGu) return null;
      try {
        const res = await apiMiddleware.get<RttResponse>(URL_RTT, { params: { guCode: searchedGu, ...(searchedDong ? { dongCode: searchedDong } : {}) } });
        if (res.data && (res.data.total_deal_cnt > 0 || (res.data.recent_trades && res.data.recent_trades.length > 0))) return makeTrend(res.data, regionLabel || guName);
      } catch { /* ignore */ }
      return null;
    },
    enabled: Boolean(searchedGu), staleTime: 300000,
  });

  const trend = trendData || FallbackTrend;
  const isApiError = Boolean(searchedGu && (isError || (trendData === null && !isLoading)));
  useEffect(() => { if (isApiError && !prevApiErrRef.current) setValue("isErrModalOpen", true); prevApiErrRef.current = isApiError; }, [isApiError, setValue]);

  /* 전체 실거래 조회 Query */
  const { data: modalTrades = [], isLoading: isModalLoading } = useQuery<TradeItemType[]>({
    queryKey: ["allTradesModal", searchedGu, searchedDong],
    queryFn: async () => {
      if (!searchedGu) return [];
      const seen = new Set<string>(), uniqueTrades: TradeItemType[] = [];
      const addTrade = (t: TradeItemType) => { const k = `${t.contractDate}_${t.complexName}_${t.floor}_${t.price}`; if (!seen.has(k)) { seen.add(k); uniqueTrades.push(t); } };
      if (searchedDong) {
        trend.allTrades.forEach(addTrade);
        if ((trend.rawTopVolume || []).length > 0) {
          const aptResults = await Promise.all((trend.rawTopVolume || []).map(async (c) => {
            if (!c.apt_name || !c.mno) return [];
            try {
              const res = await apiMiddleware.get<AptMarketTrendResponseType>(URL_APTMKT, { params: { guCode: searchedGu, dongCode: searchedDong, aptName: c.apt_name, mno: c.mno, sno: c.sno || "0000" } });
              return res.data?.data?.[0]?.recent_deals?.map((d) => ({ ...d, apt_name: c.apt_name })) || [];
            } catch { return []; }
          }));
          aptResults.flat().forEach((deal) => addTrade(toTradeItem(deal)));
        }
      } else {
        if (dongs.length === 0) return trend.allTrades;
        const results = await Promise.all(dongs.map(async (d) => {
          try {
            const res = await apiMiddleware.get<RttResponse>(URL_RTT, { params: { guCode: searchedGu, dongCode: d.dongCd.slice(-5) } });
            return res.data?.recent_trades || [];
          } catch { return []; }
        }));
        results.flat().forEach((t) => addTrade(toTradeItem(t)));
      }
      return uniqueTrades.sort((a, b) => b.contractDate.localeCompare(a.contractDate));
    },
    enabled: Boolean(isModalOpen && searchedGu), staleTime: 300000,
  });

  const selectGu = (code: string, name: string) => { setValue("guInput", name); setValue("isGuOpen", false); setValue("guHighlight", -1); setValue("sggCd", code); setValue("dongCd", ""); setValue("dongInput", ""); };
  const selectDong = (code: string, name: string) => { setValue("dongInput", name); setValue("isDongOpen", false); setValue("dongHighlight", -1); setValue("dongCd", code); };
  const handleSearch = () => {
    const sgg = getValues("sggCd"), dong = getValues("dongCd");
    if (!sgg) return alert("조회할 자치구를 선택해주세요.");
    setValue("modalFilter", "latest"); setValue("selectedPyeongRange", "all"); setValue("selectedFloorRange", "all");
    setValue("searchedGu", sgg); setValue("searchedDong", dong);
    setSearchParams(dong ? { sggCd: sgg, dongCd: dong } : { sggCd: sgg }, { replace: true });
  };
  const handleReset = () => {
    setValue("guInput", ""); setValue("dongInput", ""); setValue("sggCd", ""); setValue("dongCd", "");
    setValue("searchedGu", ""); setValue("searchedDong", ""); setValue("modalFilter", "latest");
    setValue("selectedPyeongRange", "all"); setValue("selectedFloorRange", "all");
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const displayTrades = modalTrades.length > 0 ? modalTrades : trend.allTrades;
  const filteredTrades = useMemo(() => {
    let list = [...displayTrades];
    if (selectedPyeongRange !== "all") list = list.filter((t) => { const p = parseFloat(t.area.replace(/[^0-9.]/g, "")) || 0; return selectedPyeongRange === "under10" ? (p > 0 && p < 10) : selectedPyeongRange === "10s" ? (p >= 10 && p < 20) : selectedPyeongRange === "20s" ? (p >= 20 && p < 30) : selectedPyeongRange === "30s" ? (p >= 30 && p < 40) : (p >= 40); });
    if (selectedFloorRange !== "all") list = list.filter((t) => { const f = parseInt(t.floor.replace(/[^0-9-]/g, ""), 10); return isNaN(f) ? false : selectedFloorRange === "low" ? f <= 5 : selectedFloorRange === "mid" ? (f >= 6 && f <= 15) : f >= 16; });
    return list.sort((a, b) => b.contractDate.localeCompare(a.contractDate));
  }, [displayTrades, selectedPyeongRange, selectedFloorRange]);

  return (
    <div className="tw-scope font-sans">
      <SectionSidebarLayout sectionTitle={TRENDS_NAVIGATION.sectionTitle} menuItems={TRENDS_NAVIGATION.menuItems}>
        <div className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-[24px] font-extrabold text-[#0F172A]">지역별 거래동향</h1>
            <p className="text-[13px] text-[#64748B]">선택한 지역의 실거래 추이와 가격 변화를 확인하세요.</p>
          </div>

          {/* 검색 필터 */}
          <Card className="rounded-xl border-[#E2E8F0] shadow-none overflow-visible">
            <CardContent className="p-4 sm:p-5 overflow-visible">
              <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <LocationField
                  value={guInput || selectedGuName} placeholder="구 선택" isOpen={isGuOpen} highlight={guHighlight}
                  items={filteredSggs} selectedCode={sggCd} emptyText="검색 조건에 맞는 구가 없습니다." containerRef={guRef} itemRefs={guItemRefs}
                  onOpen={() => { setValue("isGuOpen", true); setValue("guHighlight", -1); }} onClose={() => setValue("isGuOpen", false)} onSelect={selectGu}
                  onChange={(v) => { setValue("guInput", v); setValue("isGuOpen", true); setValue("guHighlight", -1); if (sggCd && v !== selectedGuName) { setValue("sggCd", ""); setValue("dongCd", ""); setValue("dongInput", ""); } }}
                  onHighlight={(arg) => setValue("guHighlight", typeof arg === "function" ? arg(guHighlight) : arg)}
                />
                <LocationField
                  value={dongInput || selectedDongName} placeholder={sggCd ? "동 선택" : "구를 먼저 선택해 주세요"} disabled={!sggCd}
                  isOpen={isDongOpen} highlight={dongHighlight} items={filteredDongs} selectedCode={dongCd} emptyText="검색 조건에 맞는 동이 없습니다." containerRef={dongRef} itemRefs={dongItemRefs}
                  onOpen={() => { if (sggCd) { setValue("isDongOpen", true); setValue("dongHighlight", -1); } }} onClose={() => setValue("isDongOpen", false)} onSelect={selectDong}
                  onChange={(v) => { setValue("dongInput", v); setValue("isDongOpen", true); setValue("dongHighlight", -1); if (dongCd && v !== selectedDongName) setValue("dongCd", ""); }}
                  onHighlight={(arg) => setValue("dongHighlight", typeof arg === "function" ? arg(dongHighlight) : arg)}
                />
                <div className="flex gap-2 shrink-0">
                  <Button type="submit" disabled={isLoading || !sggCd} className="h-11 px-6 rounded-lg bg-[#0F8AA8] text-[13px] font-bold text-white shadow-none hover:bg-[#0B728C] cursor-pointer disabled:opacity-50">{isLoading ? <Loader2 className="size-4 animate-spin" /> : "조회"}</Button>
                  <Button type="button" variant="outline" onClick={handleReset} className="h-11 rounded-lg border-[#DCE8ED] bg-white px-4 text-[13px] font-medium text-[#0F172A] shadow-none hover:bg-slate-50 cursor-pointer flex items-center gap-1.5"><RotateCcw className="size-4" /><span>초기화</span></Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* 상단 4개 지표 카드 */}
          <Card className="grid grid-cols-1 overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
            {[{ label: "총 거래 건수", val: searchedGu && trend.summary.totalCount > 0 ? `${trend.summary.totalCount.toLocaleString()}건` : "-" }, { label: "평균 거래가", val: searchedGu ? trend.summary.avgPrice : "-" }, { label: "최고 거래가", val: searchedGu ? trend.summary.maxPrice : "-" }, { label: "거래량 증감률", val: !searchedGu ? "-" : trend.summary.growth > 0 ? <span className="text-[#DC2626]">▲ {trend.summary.growth}%</span> : trend.summary.growth < 0 ? <span className="text-[#2563EB]">▼ {Math.abs(trend.summary.growth)}%</span> : <span className="text-[#64748B]">0%</span> }].map((c, i) => (
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
                      <div className={CHART_CSS}><Chart chartType="ComboChart" width="100%" height="280px" data={[["구간", "거래량", { role: "tooltip", type: "string", p: { html: true } }, "평균 거래가", { role: "tooltip", type: "string", p: { html: true } }], ...trend.monthly]} options={COMBO_OPTS} /></div>
                    ) : <div className="flex h-[280px] w-full items-center justify-center text-[12px] text-[#94A3B8]">거래량 및 평균 거래가 추이 데이터가 없습니다.</div>}
                  </CardContent>
                </Card>

                <Card className="rounded-xl border-[#E2E8F0] bg-white shadow-xs">
                  <CardContent className="p-5">
                    <h3 className="mb-4 border-b border-[#E2E8F0] pb-3 text-[15px] font-bold text-[#0F172A]">평형별 거래 비중</h3>
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-stretch">
                      <div className={cn("h-[240px] w-full sm:w-[58%]", CHART_CSS)}>
                        {trend.area.length > 0 ? (
                          <Chart chartType="PieChart" width="100%" height="100%" data={[["평형", "거래 건수", { role: "tooltip", type: "string", p: { html: true } }], ...trend.area.map((a) => [a.name, { v: a.count || 0, f: `${(a.count || 0).toLocaleString()}건` }, makeTooltip(a.name, "", "거래량", `${(a.count || 0).toLocaleString()}건`, "#2563EB")])]} options={PIE_OPTS} />
                        ) : <div className="flex h-full w-full items-center justify-center text-[12px] text-[#94A3B8]">평형별 거래 비중 데이터가 없습니다.</div>}
                      </div>
                      <div className="w-full space-y-2 self-center text-[13px] sm:w-[42%]">
                        <p className="border-b border-[#E2E8F0] pb-2 font-semibold text-[#0F172A]">총 거래 건수 {(trend.summary.totalCount || 0).toLocaleString()}건</p>
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
                    <TradeTable trades={trend.recent} emptyMsg="등록된 데이터가 없습니다." />
                  </div>
                  <Button type="button" variant="outline" onClick={() => { setValue("isModalOpen", true); setValue("modalFilter", "latest"); setValue("selectedPyeongRange", "all"); setValue("selectedFloorRange", "all"); }} className="mt-4 h-10 w-full rounded-none border-x-0 border-b border-t-0 border-[#94A3B8] text-[12px] text-[#2563EB] hover:bg-[#F8FAFC] hover:text-[#1D4ED8] cursor-pointer">전체 실거래 내역 보기 ›</Button>
                </Card>
                <Card className="h-full rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-none flex flex-col justify-between">
                  <div>
                    <h2 className="mb-3 border-b border-[#E2E8F0] pb-3 text-[14px] font-semibold text-[#0F172A]">거래량 상위 단지 TOP 5</h2>
                    <TopComplexTable list={trend.topComplexes} />
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
      <Dialog open={isModalOpen} onOpenChange={(open) => setValue("isModalOpen", open)}>
        <DialogContent className="max-w-2xl h-[650px] max-h-[85vh] p-0 flex flex-col gap-0 rounded-xl border border-[#E2E8F0] bg-white shadow-2xl overflow-hidden [&>button]:top-4 [&>button]:right-4">
          <DialogHeader className="p-4 border-b border-[#E2E8F0] flex flex-col gap-2 shrink-0">
            <DialogTitle className="text-[16px] font-bold text-[#0F172A] flex items-center">
              {searchedGu ? `${regionLabel || guName} 실거래 내역 전체보기` : "최근 실거래 내역 전체보기"}
              <span className="ml-2 text-xs font-normal text-blue-600">({filteredTrades.length}건)</span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => { setValue("modalFilter", "latest"); setValue("selectedPyeongRange", "all"); setValue("selectedFloorRange", "all"); }} className={cn("h-8 px-3 text-[12px] font-bold rounded-lg border transition-all cursor-pointer shadow-none", selectedPyeongRange === "all" && selectedFloorRange === "all" ? "bg-[#0F8AA8] text-white border-[#0F8AA8] hover:bg-[#0B728C] hover:text-white shadow-xs" : "bg-white text-[#475569] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#0F172A]")}>최신순 전체목록</Button>
              {[
                { val: selectedPyeongRange, setVal: (v: string) => { setValue("selectedPyeongRange", v as PyeongRangeType); setValue("modalFilter", "pyeong"); }, placeholder: "평형", items: [{ v: "all", l: "평형 (전체)" }, { v: "under10", l: "10평미만" }, { v: "10s", l: "10평대 (10평~19평)" }, { v: "20s", l: "20평대 (20평~29평)" }, { v: "30s", l: "30평대 (30평~39평)" }, { v: "over40", l: "40평이상" }] },
                { val: selectedFloorRange, setVal: (v: string) => { setValue("selectedFloorRange", v as FloorRangeType); setValue("modalFilter", "floor"); }, placeholder: "층별", items: [{ v: "all", l: "층별 (전체)" }, { v: "low", l: "저층 (1~5층)" }, { v: "mid", l: "중층 (6~15층)" }, { v: "high", l: "고층 (16층 이상)" }] },
              ].map((s, idx) => (
                <Select key={idx} value={s.val} onValueChange={s.setVal}>
                  <SelectTrigger className={cn("h-8 w-[90px] shrink-0 justify-between px-2.5 text-[12px] font-bold rounded-lg border transition-all cursor-pointer flex items-center shadow-none", s.val !== "all" ? "bg-[#0F8AA8] text-white border-[#0F8AA8] hover:bg-[#0B728C] shadow-xs [&_svg]:text-white [&_svg]:opacity-100" : "bg-white text-[#475569] border-[#CBD5E1] hover:bg-slate-50 hover:text-[#0F172A]")}><SelectValue placeholder={s.placeholder} /></SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="bg-white border border-[#DCE8ED] shadow-md z-50 text-xs">{s.items.map((it) => <SelectItem key={it.v} value={it.v}>{it.l}</SelectItem>)}</SelectContent>
                </Select>
              ))}
            </div>
          </DialogHeader>
          <div className="p-4 overflow-y-auto flex-1 min-h-0">
            {isModalLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Loader2 className="size-8 animate-spin text-[#0F8AA8] mb-3" />
                <p className="text-[13px] font-bold text-[#0F172A]">최근 90일간의 전체 실거래 내역을 불러오는 중입니다...</p>
                <p className="text-[11px] text-[#64748B] mt-1">{searchedDong ? `${regionLabel} 관내 주요 단지별 실거래 데이터 수집 중` : `${regionLabel} 관내 전체 법정동 실거래 데이터 수집 중`}</p>
              </div>
            ) : <TradeTable trades={filteredTrades} emptyMsg="조회된 실거래 내역 데이터가 없습니다." />}
          </div>
          <div className="p-3 border-t border-[#E2E8F0] bg-white flex items-center justify-between text-[12px] text-[#64748B] rounded-b-xl shrink-0">
            <span>{isModalLoading ? "데이터를 수집하는 중입니다..." : `총 ${filteredTrades.length.toLocaleString()}건의 실거래 내역이 표시됩니다.`}</span>
            <Button type="button" variant="outline" onClick={() => setValue("isModalOpen", false)} className="h-9 px-4 text-[13px] font-medium cursor-pointer">닫기</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 에러 모달 */}
      <Dialog open={isErrModalOpen} onOpenChange={(open) => setValue("isErrModalOpen", open)}>
        <DialogContent className="max-w-sm rounded-xl border border-rose-200 bg-white p-6 shadow-2xl text-center [&>button]:hidden">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-3"><AlertCircle className="size-6" /></div>
          <DialogTitle className="text-[17px] font-bold text-[#0F172A] mb-1.5 text-center">데이터 조회 실패</DialogTitle>
          <p className="text-[13px] text-[#64748B] mb-5">네트워크 통신 중 오류가 발생했습니다.<br />잠시 후 다시 시도해주세요.</p>
          <Button type="button" onClick={() => setValue("isErrModalOpen", false)} className="w-full h-10 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg cursor-pointer">확인</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
