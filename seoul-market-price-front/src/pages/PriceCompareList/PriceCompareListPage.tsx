import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Chart } from "react-google-charts";
import { AlertCircle, BarChart3, Building2, Check, ChevronDown, Info, Loader2, RotateCcw, Search, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSggsApi, getDongsApi, getRegionCompareApi, type SggItem, type DongItem, type RegionCompareResponse } from "@/api/api";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { PRICE_NAVIGATION } from "@/config/sectionNavigation";

/* 1. 타입 및 세션 키 정의 */
interface MetricResult { avgPrice: number; avgPyeongPrice: number | null; totalCount?: number; }
interface CompareResponse { r1: MetricResult; r2: MetricResult; baseDate?: string; }
interface SelectedRegion { district: string; dong: string; sggCd?: string; dongCd?: string; }
interface AutocompleteOption { label: string; value: string; code?: string; }
const STORAGE_FORM_KEY = "price_compare_list_form"; const STORAGE_RESULT_KEY = "price_compare_list_result";

/* 2. API 데이터 요청 헬퍼 함수 */
async function fetchPriceCompareApi(payload: { r1: SelectedRegion; r2: SelectedRegion }): Promise<CompareResponse> {
  const { r1, r2 } = payload;
  if (!r1.sggCd || !r1.dongCd || !r2.sggCd || !r2.dongCd) throw new Error("비교할 두 지역의 자치구와 자치동을 모두 선택해 주세요.");
  const res: RegionCompareResponse = await getRegionCompareApi({ guCode1: r1.sggCd, dongCode1: r1.dongCd, guCode2: r2.sggCd, dongCode2: r2.dongCd });
  const toMetric = (r: RegionCompareResponse["region1"]): MetricResult => ({ avgPrice: r.avg_thing_amt / 10000, avgPyeongPrice: r.avg_pyeong_amt ?? null, totalCount: r.total_count });
  return { baseDate: res.base_date, r1: toMetric(res.region1), r2: toMetric(res.region2) };
}

/* 3. 커스텀 훅 (Data Hooks) */
function useLocationData(r1SggCd: string, r2SggCd: string, r1District: string, r2District: string) {
  const { data: sggList = [], isLoading: isSggLoading, isError: isSggError } = useQuery<SggItem[]>({ queryKey: ["locationSggs"], queryFn: getSggsApi, staleTime: Infinity });
  const sggOptions: AutocompleteOption[] = useMemo(() => [...sggList].sort((a, b) => a.sggNm.localeCompare(b.sggNm, "ko")).map((i) => ({ label: i.sggNm, value: i.sggNm, code: i.sggCd })), [sggList]);
  const { data: r1Dongs = [], isLoading: isR1DongLoading } = useQuery<DongItem[]>({ queryKey: ["locationDongs", r1SggCd], queryFn: () => getDongsApi(r1SggCd), enabled: !!r1SggCd, staleTime: 1000 * 60 * 30 });
  const { data: r2Dongs = [], isLoading: isR2DongLoading } = useQuery<DongItem[]>({ queryKey: ["locationDongs", r2SggCd], queryFn: () => getDongsApi(r2SggCd), enabled: !!r2SggCd, staleTime: 1000 * 60 * 30 });
  const r1DongOptions: AutocompleteOption[] = useMemo(() => (!r1District || !r1Dongs.length ? [] : [...r1Dongs].sort((a, b) => a.dongNm.localeCompare(b.dongNm, "ko")).map((d) => ({ label: d.dongNm, value: d.dongNm, code: d.dongCd }))), [r1District, r1Dongs]);
  const r2DongOptions: AutocompleteOption[] = useMemo(() => (!r2District || !r2Dongs.length ? [] : [...r2Dongs].sort((a, b) => a.dongNm.localeCompare(b.dongNm, "ko")).map((d) => ({ label: d.dongNm, value: d.dongNm, code: d.dongCd }))), [r2District, r2Dongs]);
  return { sggOptions, r1DongOptions, r2DongOptions, isSggLoading, isSggError, isR1DongLoading, isR2DongLoading };
}

function usePriceCompareMutation() {
  const [appliedRegions, setAppliedRegions] = useState<{ r1: SelectedRegion; r2: SelectedRegion } | null>(() => { try { const s = sessionStorage.getItem(STORAGE_RESULT_KEY); return s ? JSON.parse(s).appliedRegions : null; } catch { return null; } });
  const [cachedData, setCachedData] = useState<CompareResponse | null>(() => { try { const s = sessionStorage.getItem(STORAGE_RESULT_KEY); return s ? JSON.parse(s).data : null; } catch { return null; } });
  const compareMutation = useMutation({ mutationFn: fetchPriceCompareApi, onSuccess: (data, vars) => { setAppliedRegions(vars); setCachedData(data); try { sessionStorage.setItem(STORAGE_RESULT_KEY, JSON.stringify({ data, appliedRegions: vars })); } catch { /* ignore */ } } });
  const compareData = compareMutation.data || cachedData; const r1Metrics = compareData?.r1; const r2Metrics = compareData?.r2; const baseDate = compareData?.baseDate || "기준일 정보 없음";
  const r1Label = useMemo(() => (!appliedRegions ? "" : `${appliedRegions.r1.district} ${appliedRegions.r1.dong}`), [appliedRegions]);
  const r2Label = useMemo(() => (!appliedRegions ? "" : `${appliedRegions.r2.district} ${appliedRegions.r2.dong}`), [appliedRegions]);
  const r1PyeongPrice = r1Metrics?.avgPyeongPrice ?? null; const r2PyeongPrice = r2Metrics?.avgPyeongPrice ?? null;

  const formatDiffText = useCallback((val1: number, val2: number, n1: string, n2: string, unit: "억" | "만원" = "억") => {
    if (val1 === val2) return "두 지역의 시세가 동일함";
    const diff = Math.abs(val1 - val2);
    const dStr = unit === "억" ? `${diff.toFixed(1)}억 원` : `${Math.round(diff).toLocaleString()}만 원`;
    return val1 > val2 ? `${n1}이(가) ${n2}보다 ${dStr} ▲` : `${n2}이(가) ${n1}보다 ${dStr} ▲`;
  }, []);

  const avgDiffText = useMemo(() => {
    if (!r1Metrics || !r2Metrics || !appliedRegions) return "";
    const n1 = appliedRegions.r1.dong ? `${appliedRegions.r1.district} ${appliedRegions.r1.dong}` : appliedRegions.r1.district || "지역 1";
    const n2 = appliedRegions.r2.dong ? `${appliedRegions.r2.district} ${appliedRegions.r2.dong}` : appliedRegions.r2.district || "지역 2";
    return formatDiffText(r1Metrics.avgPrice, r2Metrics.avgPrice, n1, n2, "억");
  }, [r1Metrics, r2Metrics, appliedRegions, formatDiffText]);

  const pyeongDiffText = useMemo(() => {
    if (!r1Metrics || !r2Metrics || !appliedRegions) return "";
    if (r1PyeongPrice === null || r2PyeongPrice === null) return "평당가 데이터 없음";
    const n1 = appliedRegions.r1.dong ? `${appliedRegions.r1.district} ${appliedRegions.r1.dong}` : appliedRegions.r1.district || "지역 1";
    const n2 = appliedRegions.r2.dong ? `${appliedRegions.r2.district} ${appliedRegions.r2.dong}` : appliedRegions.r2.district || "지역 2";
    return formatDiffText(r1PyeongPrice, r2PyeongPrice, n1, n2, "만원");
  }, [r1Metrics, r2Metrics, r1PyeongPrice, r2PyeongPrice, appliedRegions, formatDiffText]);

  const resetCompare = useCallback(() => { try { sessionStorage.removeItem(STORAGE_RESULT_KEY); } catch { /* ignore */ } setAppliedRegions(null); setCachedData(null); compareMutation.reset(); }, [compareMutation]);
  return { compareMutation, appliedRegions, r1Metrics, r2Metrics, r1PyeongPrice, r2PyeongPrice, baseDate, r1Label, r2Label, avgDiffText, pyeongDiffText, resetCompare };
}

/* 4. UI 서브 컴포넌트 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return <>{parts.map((p, i) => p.toLowerCase() === query.toLowerCase() ? <span key={i} className="font-extrabold text-[#0F8AA8] underline underline-offset-2">{p}</span> : p)}</>;
}

function AutocompleteSelect({ value, onChange, options, placeholder = "선택", disabled = false }: { value: string; onChange: (val: string, opt?: AutocompleteOption) => void; options: AutocompleteOption[]; placeholder?: string; disabled?: boolean; }) {
  const [isOpen, setIsOpen] = useState(false); const [query, setQuery] = useState(""); const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const handleOutsideClick = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) { setIsOpen(false); setQuery(""); } }; document.addEventListener("mousedown", handleOutsideClick); return () => document.removeEventListener("mousedown", handleOutsideClick); }, []);
  const filtered = useMemo(() => (!query.trim() ? options : options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))), [options, query]);
  const handleInputClick = () => { if (!disabled) { setIsOpen(true); setQuery(""); } };
  const handleSelect = (optLabel: string, optObj?: AutocompleteOption) => { onChange(optLabel, optObj); setIsOpen(false); setQuery(""); };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative w-full">
        <input type="text" value={isOpen ? query : value || ""} onFocus={handleInputClick} onClick={handleInputClick} onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }} placeholder={placeholder} disabled={disabled} className={cn("w-full h-9 pl-3 pr-8 bg-slate-100/90 rounded-lg text-[13px] font-medium text-slate-800 outline-none border-0 cursor-pointer", disabled && "opacity-50 cursor-not-allowed")} />
        <ChevronDown onClick={() => !disabled && (setIsOpen((prev) => !prev), setQuery(""))} className={cn("size-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 transition-transform cursor-pointer", isOpen && "rotate-180")} />
      </div>
      {isOpen && !disabled && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-300 bg-[#EFEFEF] p-0 shadow-lg">
          <button type="button" onMouseDown={(e) => { e.preventDefault(); handleSelect("", undefined); }} className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[13px] font-medium text-slate-800 hover:bg-[#E5E5E5] bg-[#EBEBEB] border-b border-slate-300/60"><span>선택 안 함</span>{!value && <Check className="size-4 text-[#0F8AA8]" />}</button>
          {filtered.length === 0 ? <div className="px-3.5 py-3 text-center text-[12px] text-slate-500 bg-[#F5F5F5]">검색 결과 없음</div> : filtered.map((opt) => {
            const isSelected = opt.label === value;
            return (
              <button key={opt.code || opt.value} type="button" onMouseDown={(e) => { e.preventDefault(); handleSelect(opt.label, opt); }} className={cn("flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[13px] font-medium text-slate-800 border-b border-slate-200/60 last:border-0", isSelected ? "bg-[#E6F0FA] font-bold text-blue-700" : "bg-[#F3F3F3] hover:bg-[#E8E8E8]")}>
                <span><HighlightMatch text={opt.label} query={query} /></span>{isSelected && <Check className="size-4 shrink-0 text-[#0F8AA8]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RegionSelectCard({ regionNum, district, dong, sggOptions, dongOptions, isSggLoading, isDongLoading, onDistrictChange, onDongChange }: { regionNum: 1 | 2; district: string; dong: string; sggOptions: AutocompleteOption[]; dongOptions: AutocompleteOption[]; isSggLoading: boolean; isDongLoading: boolean; onDistrictChange: (val: string, opt?: AutocompleteOption) => void; onDongChange: (val: string, opt?: AutocompleteOption) => void; }) {
  const isRegion1 = regionNum === 1;
  const cardTitle = useMemo(() => { const parts = [district, dong].filter(Boolean); return parts.length ? `${parts.join(" ")} (${isRegion1 ? "기준" : "비교"})` : isRegion1 ? "지역 1 (기준)" : "지역 2 (비교)"; }, [district, dong, isRegion1]);

  return (
    <div className="rounded-[16px] border border-slate-200 bg-white p-3 sm:py-3 sm:px-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex shrink-0 items-center gap-2 sm:min-w-[170px]">
          <Building2 className={cn("size-4 shrink-0", isRegion1 ? "text-blue-600" : "text-emerald-600")} />
          <h3 className={cn("text-[15px] font-black tracking-tight whitespace-nowrap", isRegion1 ? "text-blue-700" : "text-emerald-700")}>{cardTitle}</h3>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-bold text-slate-700">자치구 <span className="text-blue-600 text-[10px]">필수</span></label>
            <AutocompleteSelect value={district} onChange={onDistrictChange} options={sggOptions} placeholder={isSggLoading ? "로딩 중..." : "자치구 선택"} disabled={isSggLoading} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-bold text-slate-700">자치동 <span className="text-blue-600 text-[10px]">필수</span></label>
            <AutocompleteSelect value={dong} onChange={onDongChange} options={dongOptions} placeholder={!district ? "구 먼저 선택" : isDongLoading ? "목록 불러오는 중..." : "자치동 선택"} disabled={!district || isDongLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareTable({ baseDate, r1Label, r2Label, r1Dong, r2Dong, r1Metrics, r2Metrics, r1PyeongPrice, r2PyeongPrice }: { baseDate: string; r1Label: string; r2Label: string; r1Dong: string; r2Dong: string; r1Metrics: MetricResult; r2Metrics: MetricResult; r1PyeongPrice: number | null; r2PyeongPrice: number | null; }) {
  const avgDiff = Number((r1Metrics.avgPrice - r2Metrics.avgPrice).toFixed(1));
  const pyeongDiff = r1PyeongPrice !== null && r2PyeongPrice !== null ? Math.round(r1PyeongPrice - r2PyeongPrice) : null;
  const countDiff = (r1Metrics.totalCount ?? 0) - (r2Metrics.totalCount ?? 0);

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
        <div className="flex items-center gap-2"><Sparkles className="size-5 text-[#0F8AA8]" /><h3 className="text-[17px] font-black text-slate-900 tracking-tight">핵심 지표 비교 리포트</h3></div>
        <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100"><Info className="size-3.5 text-[#0F8AA8]" /><span>기준일: {baseDate}</span></div>
      </div>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[500px]">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[12.5px] font-extrabold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-4 rounded-l-xl w-1/3">비교 지표</th>
              <th className="py-3.5 px-4 text-[#0F8AA8] w-1/3"><div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#0F8AA8]" /><span>{r1Label || r1Dong}</span></div></th>
              <th className="py-3.5 px-4 text-emerald-600 rounded-r-xl w-1/3"><div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500" /><span>{r2Label || r2Dong}</span></div></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[13.5px]">
            <tr className="hover:bg-slate-50/40 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-700">평균 매매가</td>
              <td className="py-4 px-4 font-black text-slate-900 text-[15px]">{r1Metrics.avgPrice.toFixed(1)}억 원{avgDiff > 0 && <span className="ml-2 text-[11.5px] font-extrabold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">({avgDiff.toFixed(1)}억 ▲)</span>}</td>
              <td className="py-4 px-4 font-black text-slate-900 text-[15px]">{r2Metrics.avgPrice.toFixed(1)}억 원{avgDiff < 0 && <span className="ml-2 text-[11.5px] font-extrabold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">({Math.abs(avgDiff).toFixed(1)}억 ▲)</span>}</td>
            </tr>
            <tr className="hover:bg-slate-50/40 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-700">평균 평단가</td>
              <td className="py-4 px-4 font-black text-slate-900 text-[15px]">{r1PyeongPrice !== null ? <>{Math.round(r1PyeongPrice).toLocaleString()}만 원{pyeongDiff !== null && pyeongDiff > 0 && <span className="ml-2 text-[11.5px] font-extrabold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">({pyeongDiff.toLocaleString()}만 ▲)</span>}</> : "-"}</td>
              <td className="py-4 px-4 font-black text-slate-900 text-[15px]">{r2PyeongPrice !== null ? <>{Math.round(r2PyeongPrice).toLocaleString()}만 원{pyeongDiff !== null && pyeongDiff < 0 && <span className="ml-2 text-[11.5px] font-extrabold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">({Math.abs(pyeongDiff).toLocaleString()}만 ▲)</span>}</> : "-"}</td>
            </tr>
            {typeof r1Metrics.totalCount === "number" && typeof r2Metrics.totalCount === "number" && (
              <tr className="hover:bg-slate-50/40 transition-colors">
                <td className="py-4 px-4 font-bold text-slate-700">총 거래 건수</td>
                <td className="py-4 px-4 font-black text-slate-900 text-[15px]">{r1Metrics.totalCount.toLocaleString()}건{countDiff > 0 && <span className="ml-2 text-[11.5px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">({countDiff.toLocaleString()}건 ▲)</span>}</td>
                <td className="py-4 px-4 font-black text-slate-900 text-[15px]">{r2Metrics.totalCount.toLocaleString()}건{countDiff < 0 && <span className="ml-2 text-[11.5px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">({Math.abs(countDiff).toLocaleString()}건 ▲)</span>}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GoogleCompareCharts({ r1Label, r2Label, r1Metrics, r2Metrics, r1PyeongPrice, r2PyeongPrice }: { r1Label: string; r2Label: string; r1Metrics: MetricResult; r2Metrics: MetricResult; r1PyeongPrice: number | null; r2PyeongPrice: number | null; }) {
  const avgChartData = useMemo(() => [["지역", "평균 매매가 (억 원)", { role: "style" }], [r1Label || "지역 1", r1Metrics.avgPrice, "#0F8AA8"], [r2Label || "지역 2", r2Metrics.avgPrice, "#10B981"]], [r1Label, r2Label, r1Metrics.avgPrice, r2Metrics.avgPrice]);
  const pyeongChartData = useMemo(() => (!r1PyeongPrice || !r2PyeongPrice ? [] : [["지역", "평균 평단가 (만 원)", { role: "style" }], [r1Label || "지역 1", r1PyeongPrice, "#0F8AA8"], [r2Label || "지역 2", r2PyeongPrice, "#10B981"]]), [r1Label, r2Label, r1PyeongPrice, r2PyeongPrice]);

  return (
    <div className="grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
      <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2 mb-4"><TrendingUp className="size-5 text-[#0F8AA8]" /><h4 className="text-[15px] font-black text-slate-900">평균 매매가 비교 (억 원)</h4></div>
        <div className="h-[220px]"><Chart chartType="ColumnChart" width="100%" height="220px" data={avgChartData} options={{ legend: { position: "none" }, vAxis: { title: "매매가 (억 원)", minValue: 0 }, chartArea: { width: "80%", height: "70%" } }} /></div>
      </div>
      <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2 mb-4"><BarChart3 className="size-5 text-emerald-600" /><h4 className="text-[15px] font-black text-slate-900">평균 평단가 비교 (만 원)</h4></div>
        <div className="h-[220px]">{pyeongChartData.length > 1 ? (<Chart chartType="ColumnChart" width="100%" height="220px" data={pyeongChartData} options={{ legend: { position: "none" }, vAxis: { title: "평단가 (만 원)", minValue: 0 }, chartArea: { width: "80%", height: "70%" } }} />) : (<div className="flex h-full items-center justify-center text-slate-400 text-[13px] font-medium">평단가 비교 정보가 없습니다.</div>)}</div>
      </div>
    </div>
  );
}

function SummaryCard({ avgDiffText, pyeongDiffText, r1Label, r2Label }: { avgDiffText: string; pyeongDiffText: string; r1Label: string; r2Label: string; }) {
  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4"><Sparkles className="size-5 text-indigo-600" /><h4 className="text-[16px] font-black text-slate-900">종합 요약</h4></div>
      <div className="flex flex-col gap-3.5 text-[13px] leading-relaxed">
        <div className="rounded-xl bg-[#0F8AA8]/5 p-4 border border-[#0F8AA8]/15"><div className="font-bold text-[#0F8AA8] mb-1">💰 매매가 분석</div><p className="font-semibold text-slate-700">{avgDiffText}</p></div>
        <div className="rounded-xl bg-emerald-50/70 p-4 border border-emerald-100"><div className="font-bold text-emerald-800 mb-1">📏 평단가 분석</div><p className="font-semibold text-slate-700">{pyeongDiffText}</p></div>
        <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 text-[12px] font-medium text-slate-500"><span>* {r1Label} 및 {r2Label} 지역의 실거래 시세를 바탕으로 산출된 가공 통계입니다.</span></div>
      </div>
    </div>
  );
}

/* 5. 메인 지역별 비교 페이지 컴포넌트 */
export default function PriceCompareListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialForm = useMemo(() => { try { const s = sessionStorage.getItem(STORAGE_FORM_KEY); if (s) return JSON.parse(s); } catch { /* ignore */ } return { r1District: searchParams.get("r1District") || searchParams.get("gu1") || "", r1SggCd: searchParams.get("r1SggCd") || searchParams.get("guCode1") || "", r1Dong: searchParams.get("r1Dong") || searchParams.get("dong1") || "", r1DongCd: searchParams.get("r1DongCd") || searchParams.get("dongCode1") || "", r2District: searchParams.get("r2District") || searchParams.get("gu2") || "", r2SggCd: searchParams.get("r2SggCd") || searchParams.get("guCode2") || "", r2Dong: searchParams.get("r2Dong") || searchParams.get("dong2") || "", r2DongCd: searchParams.get("r2DongCd") || searchParams.get("dongCode2") || "" }; }, []);
  const [r1District, setR1District] = useState(initialForm.r1District || "");
  const [r1SggCd, setR1SggCd] = useState(initialForm.r1SggCd || "");
  const [r1Dong, setR1Dong] = useState(initialForm.r1Dong || "");
  const [r1DongCd, setR1DongCd] = useState(initialForm.r1DongCd || "");
  const [r2District, setR2District] = useState(initialForm.r2District || "");
  const [r2SggCd, setR2SggCd] = useState(initialForm.r2SggCd || "");
  const [r2Dong, setR2Dong] = useState(initialForm.r2Dong || "");
  const [r2DongCd, setR2DongCd] = useState(initialForm.r2DongCd || "");

  useEffect(() => { try { sessionStorage.setItem(STORAGE_FORM_KEY, JSON.stringify({ r1District, r1SggCd, r1Dong, r1DongCd, r2District, r2SggCd, r2Dong, r2DongCd })); } catch { /* ignore */ } }, [r1District, r1SggCd, r1Dong, r1DongCd, r2District, r2SggCd, r2Dong, r2DongCd]);

  const { sggOptions, r1DongOptions, r2DongOptions, isSggLoading, isR1DongLoading, isR2DongLoading, isSggError } = useLocationData(r1SggCd, r2SggCd, r1District, r2District);
  const { compareMutation, appliedRegions, r1Metrics, r2Metrics, r1PyeongPrice, r2PyeongPrice, baseDate, r1Label, r2Label, avgDiffText, pyeongDiffText, resetCompare } = usePriceCompareMutation();

  const canCompare = useMemo(() => Boolean(r1District && r1Dong && r2District && r2Dong && r1SggCd && r1DongCd && r2SggCd && r2DongCd), [r1District, r1Dong, r2District, r2Dong, r1SggCd, r1DongCd, r2SggCd, r2DongCd]);

  const handleCompareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!r1District || !r1Dong) return alert("지역 1(기준 지역)의 자치구와 자치동을 모두 선택해 주세요.");
    if (!r2District || !r2Dong) return alert("지역 2(비교 지역)의 자치구와 자치동을 모두 선택해 주세요.");
    compareMutation.mutate({ r1: { district: r1District, dong: r1Dong, sggCd: r1SggCd, dongCd: r1DongCd }, r2: { district: r2District, dong: r2Dong, sggCd: r2SggCd, dongCd: r2DongCd } });
  };

  const handleResetForm = () => { try { sessionStorage.removeItem(STORAGE_FORM_KEY); sessionStorage.removeItem(STORAGE_RESULT_KEY); } catch { /* ignore */ } setSearchParams({}); setR1District(""); setR1SggCd(""); setR1Dong(""); setR1DongCd(""); setR2District(""); setR2SggCd(""); setR2Dong(""); setR2DongCd(""); resetCompare(); };

  return (
    <SectionSidebarLayout sectionTitle={PRICE_NAVIGATION.sectionTitle} menuItems={PRICE_NAVIGATION.menuItems}>
      <div className="tw-scope min-w-0 w-full bg-[#F8FAFC]">
        <main className="py-8">
          <section className="min-w-0">
            <div className="mb-6"><h1 className="text-[24px] font-black text-[#13202B]">지역별 비교</h1><p className="mt-1 text-[13px] font-medium text-slate-500">두 자치동 간의 평균 매매가 및 평단가 실거래 시세를 한눈에 비교 분석하세요.</p></div>
            {isSggError && (<div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] font-bold text-red-600"><AlertCircle className="size-5 shrink-0 text-red-500" /><span>자치구 목록을 불러오는데 실패했습니다. 백엔드 서버 상태를 확인해 주세요.</span></div>)}
            
            <form onSubmit={handleCompareSubmit} className="mb-8 rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid grid-cols-[1fr_180px] gap-4 max-[1024px]:grid-cols-1">
                <div className="flex flex-col gap-2">
                  <RegionSelectCard regionNum={1} district={r1District} dong={r1Dong} sggOptions={sggOptions} dongOptions={r1DongOptions} isSggLoading={isSggLoading} isDongLoading={isR1DongLoading} onDistrictChange={(val, opt) => { setR1District(val); setR1SggCd(opt?.code || ""); setR1Dong(""); setR1DongCd(""); }} onDongChange={(val, opt) => { setR1Dong(val); setR1DongCd(opt?.code || ""); }} />
                  <RegionSelectCard regionNum={2} district={r2District} dong={r2Dong} sggOptions={sggOptions} dongOptions={r2DongOptions} isSggLoading={isSggLoading} isDongLoading={isR2DongLoading} onDistrictChange={(val, opt) => { setR2District(val); setR2SggCd(opt?.code || ""); setR2Dong(""); setR2DongCd(""); }} onDongChange={(val, opt) => { setR2Dong(val); setR2DongCd(opt?.code || ""); }} />
                </div>
                <div className="flex flex-col justify-center gap-2">
                  <button type="submit" disabled={!canCompare || compareMutation.isPending} className="flex h-full min-h-[50px] items-center justify-center gap-2 rounded-[14px] bg-[#0F8AA8] p-4 font-black text-white hover:bg-[#0D7893] disabled:opacity-50 transition-all shadow-md shadow-[#0F8AA8]/20">
                    {compareMutation.isPending ? <Loader2 className="size-5 animate-spin" /> : <Search className="size-5 stroke-[2.5]" />}<span>{compareMutation.isPending ? "시세 비교 분석 중..." : "시세 비교하기"}</span>
                  </button>
                  <button type="button" onClick={handleResetForm} className="flex items-center justify-center gap-1.5 rounded-[10px] border border-slate-200 bg-[#FFFFFF] py-2 text-[12px] font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                    <RotateCcw className="size-3.5" /><span>초기화</span>
                  </button>
                </div>
              </div>
            </form>

            {compareMutation.isPending ? (
              <div className="flex flex-col gap-6 animate-pulse"><div className="h-[280px] rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm" /></div>
            ) : compareMutation.isError ? (
              <div className="rounded-[24px] border border-red-200 bg-red-50/80 p-10 text-center shadow-sm"><AlertCircle className="mx-auto mb-3 size-10 text-red-500" /><h4 className="text-[16px] font-black text-red-700">{compareMutation.error instanceof Error ? compareMutation.error.message : "시세 비교 데이터 조회 실패"}</h4></div>
            ) : !appliedRegions || !r1Metrics || !r2Metrics ? (
              <div className="rounded-[24px] border border-slate-200/80 bg-white p-14 text-center shadow-[0_8px_30px_rgba(15,23,42,0.04)]"><div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#0F8AA8]/15 via-[#0F8AA8]/5 to-transparent text-[#0F8AA8] shadow-inner"><BarChart3 className="size-10 stroke-[1.8]" /></div><h3 className="text-[20px] font-black tracking-tight text-slate-900">자치구와 자치동을 모두 선택하고 &apos;시세 비교하기&apos;를 눌러주세요</h3></div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-[1fr_360px] items-start gap-6 max-[1200px]:grid-cols-1">
                  <div className="flex flex-col gap-6">
                    <CompareTable baseDate={baseDate} r1Label={r1Label} r2Label={r2Label} r1Dong={appliedRegions.r1.dong || appliedRegions.r1.district} r2Dong={appliedRegions.r2.dong || appliedRegions.r2.district} r1Metrics={r1Metrics} r2Metrics={r2Metrics} r1PyeongPrice={r1PyeongPrice} r2PyeongPrice={r2PyeongPrice} />
                    <GoogleCompareCharts r1Label={r1Label} r2Label={r2Label} r1Metrics={r1Metrics} r2Metrics={r2Metrics} r1PyeongPrice={r1PyeongPrice} r2PyeongPrice={r2PyeongPrice} />
                  </div>
                  <div className="sticky top-[96px]"><SummaryCard avgDiffText={avgDiffText} pyeongDiffText={pyeongDiffText} r1Label={r1Label} r2Label={r2Label} /></div>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </SectionSidebarLayout>
  );
}
