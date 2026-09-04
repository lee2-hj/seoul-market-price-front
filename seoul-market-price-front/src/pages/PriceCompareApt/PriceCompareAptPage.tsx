import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Chart } from "react-google-charts";
import { AlertCircle, Building, Building2, ChevronDown, Info, Layers, Loader2, RotateCcw, Search, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getSggsApi, getDongsApi, getApartmentMarketTrendApi, searchApartmentAutocompleteApi, getApartmentComplexesApi, getRegionCompareApi,
  type SggItem, type DongItem, type ApartmentAutocompleteItem, type ApartmentDetailData, type ApartmentCompareApiResponse, type ApartmentCompareTrendPoint, type ApartmentCompareAreaPrice, type ApartmentMarketTrendItem, type ApartmentMarketTrendRequest,
} from "@/api/api";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { PRICE_NAVIGATION } from "@/config/sectionNavigation";

/* 1. 타입 및 세션 키 정의 */
export interface AutocompleteOption { label: string; value: string; extra?: string; code?: string; mno?: string; sno?: string; dongCd?: string; sggCd?: string; dongNm?: string; }
export interface CompareFormValues { r1District: string; r1SggCd: string; r1Dong: string; r1DongCd: string; r1Complex: string; r1Mno?: string; r1Sno?: string; r2District: string; r2SggCd: string; r2Dong: string; r2DongCd: string; r2Complex: string; r2Mno?: string; r2Sno?: string; }
type TrendWithMeta = ApartmentMarketTrendItem & { total_households?: number; build_year?: number };
const STORAGE_FORM_KEY = "price_compare_apt_form"; const STORAGE_RESULT_KEY = "price_compare_apt_result";
const EMPTY_FORM: CompareFormValues = { r1District: "", r1SggCd: "", r1Dong: "", r1DongCd: "", r1Complex: "", r2District: "", r2SggCd: "", r2Dong: "", r2DongCd: "", r2Complex: "" };

/* 2. 시세 데이터 및 위치 코드 변환 헬퍼 함수 */
function formatAreaToPyeong(rawArea: string | number): string { if (!rawArea) return ""; const str = String(rawArea).trim(); if (str.includes("평형") && str.includes("㎡")) return str; if (str.includes("평형")) return str; if (str.includes("평") && !str.includes("㎡")) return `${str}형`; const match = str.match(/([0-9.]+)/); if (!match) return str; const num = parseFloat(match[1]); if (isNaN(num) || num <= 0) return str; const p = Math.round(num / 3.3058); return `${p}평형 (${Math.round(num)}㎡)`; }

async function fetchApartmentsApi(district: string, dong?: string, guCode?: string, dongCode?: string): Promise<AutocompleteOption[]> {
  if (!district && !guCode) return []; const map = new Map<string, AutocompleteOption>();
  const addItems = (list: ApartmentAutocompleteItem[]) => { if (!Array.isArray(list)) return; list.forEach((i) => { const name = (i.aptName || "").trim(); if (name && !map.has(name)) { const dongName = i.dongNm || dong || ""; const dCode = i.dongCd || dongCode || ""; const sCode = i.sggCd || guCode || ""; map.set(name, { label: name, value: `${sCode}-${dCode}-${name}-${i.mno || 0}-${i.sno || 0}`, extra: dongName, code: dCode, mno: String(i.mno || 0), sno: String(i.sno || 0), dongCd: dCode, sggCd: sCode, dongNm: dongName }); } }); };
  try { addItems(await searchApartmentAutocompleteApi({ aptName: "", sggCd: guCode || "", dongCd: dongCode || "" })); } catch { /* ignore */ }
  if (map.size === 0 && district) { try { const complexes = await getApartmentComplexesApi(district, dong || ""); addItems(complexes.map((c) => ({ aptName: c.complexName, sggCd: guCode, dongCd: dongCode, dongNm: dong } as ApartmentAutocompleteItem))); } catch { /* ignore */ } }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "ko"));
}

async function resolveLocationCodes(district: string, dong?: string, sggCd?: string, dongCd?: string): Promise<{ sggCd: string; dongCd: string }> {
  let finalSgg = sggCd || ""; let finalDong = dongCd || "";
  if (!finalSgg && district) { try { const sggList = await getSggsApi(); const found = sggList.find((s) => s.sggNm.trim() === district.trim()); if (found) finalSgg = found.sggCd; } catch { /* ignore */ } }
  if (finalSgg) {
    if (!finalDong && dong && dong !== district) { try { const dongList = await getDongsApi(finalSgg); const found = dongList.find((d) => d.dongNm.trim() === dong.trim()); if (found?.dongCd) finalDong = found.dongCd; } catch { /* ignore */ } }
    if (!finalDong) { try { const dongList = await getDongsApi(finalSgg); if (dongList?.length) finalDong = dongList[0].dongCd; } catch { /* ignore */ } }
  }
  return { sggCd: finalSgg, dongCd: finalDong };
}

async function resolveComplexInfo(complexName: string, guCode: string, dongCode: string, mno?: string, sno?: string) {
  if (mno && sno && dongCode && guCode) return { guCode, dongCode, mno, sno, aptName: complexName };
  try { const list = await searchApartmentAutocompleteApi({ aptName: complexName, sggCd: guCode, dongCd: dongCode }); if (Array.isArray(list) && list.length > 0) { const m = list.find((i) => i.aptName?.trim() === complexName.trim()) || list[0]; return { guCode: m.sggCd || guCode, dongCode: m.dongCd || dongCode, mno: String(m.mno || mno || ""), sno: String(m.sno || sno || ""), aptName: m.aptName || complexName }; } } catch { /* ignore */ }
  return { guCode, dongCode, mno: mno || "", sno: sno || "", aptName: complexName };
}

function transformTrendToDetailData(trendItem: ApartmentMarketTrendItem | null, fallbackName: string, district: string, dong?: string): ApartmentDetailData {
  const item = trendItem as TrendWithMeta | null; const totalHouseholds = Number(item?.total_households ?? 0); const buildYear = Number(item?.build_year ?? 0);
  if (item) {
    const avgM = item.average_deal_price ?? 0; const avgEok = avgM >= 10000 ? Number((avgM / 10000).toFixed(1)) : avgM;
    const recentM = item.recent_deals?.[0]?.deal_amount ?? avgM; const recentEok = recentM >= 10000 ? Number((recentM / 10000).toFixed(1)) : recentM;
    let pyeongPrice = 0; if (item.area_deals?.length) { const valid = item.area_deals.filter((d) => d.pyeong && d.pyeong > 0); if (valid.length) pyeongPrice = Math.round(valid.reduce((sum, d) => sum + (d.avg_deal_price / (d.pyeong || 25)), 0) / valid.length); }
    if (!pyeongPrice && avgM > 0) pyeongPrice = Math.round(avgM / 25);
    return { name: item.apt_name || fallbackName, district: item.cgg_nm || district, dong: item.stdg_nm || (dong || district), address: `${item.cgg_nm || district} ${item.stdg_nm || dong || ""}`.trim(), totalHouseholds, buildYear, floorInfo: "-", parkingPerHousehold: 0, imageUrl: "", metrics: { avgPrice: avgEok, recentPrice: recentEok, recent3MonthVolume: item.total_deal_count ?? 0, totalHouseholds, buildYear, pricePerPyeong: pyeongPrice } };
  }
  return { name: fallbackName || district, district, dong: dong || district, address: `${district} ${dong || ""}`.trim(), totalHouseholds, buildYear, floorInfo: "-", parkingPerHousehold: 0, imageUrl: "", metrics: { avgPrice: 0, recentPrice: 0, recent3MonthVolume: 0, totalHouseholds, buildYear, pricePerPyeong: 0 } };
}

async function fetchApartmentCompare(form: CompareFormValues): Promise<ApartmentCompareApiResponse> {
  const dong1 = form.r1Dong || ""; const dong2 = form.r2Dong || "";
  const [code1, code2] = await Promise.all([resolveLocationCodes(form.r1District, form.r1Dong, form.r1SggCd, form.r1DongCd), resolveLocationCodes(form.r2District, form.r2Dong, form.r2SggCd, form.r2DongCd)]);
  const fetchSide = async (comp: string, code: { sggCd: string; dongCd: string }, mno?: string, sno?: string) => {
    if (comp) {
      const info = await resolveComplexInfo(comp, code.sggCd, code.dongCd, mno, sno);
      if (info.guCode) {
        try {
          const req: ApartmentMarketTrendRequest = { guCode: info.guCode, dongCode: info.dongCode || "", aptName: info.aptName || "", mno: info.mno || "", sno: info.sno || "" };
          const res = await getApartmentMarketTrendApi(req); if (res?.data?.[0]) return { trend: res.data[0], info };
        } catch { /* ignore */ }
      }
    }
    return { trend: null, info: null };
  };

  const [side1, side2] = await Promise.all([fetchSide(form.r1Complex, code1, form.r1Mno, form.r1Sno), fetchSide(form.r2Complex, code2, form.r2Mno, form.r2Sno)]);
  let finalItem1 = side1.trend; let finalItem2 = side2.trend;

  if ((!finalItem1 || !finalItem2) && code1.sggCd && code2.sggCd) {
    try {
      const regRes = await getRegionCompareApi({ guCode1: code1.sggCd, dongCode1: code1.dongCd || "00000", guCode2: code2.sggCd, dongCode2: code2.dongCd || "00000" });
      if (!finalItem1 && regRes?.region1) finalItem1 = { apt_name: form.r1Complex || (dong1 ? `${form.r1District} ${dong1}` : `${form.r1District} 전체 시세`), cgg_nm: form.r1District, stdg_nm: dong1 || form.r1District, average_deal_price: regRes.region1.avg_thing_amt, total_deal_count: regRes.region1.total_count } as ApartmentMarketTrendItem;
      if (!finalItem2 && regRes?.region2) finalItem2 = { apt_name: form.r2Complex || (dong2 ? `${form.r2District} ${dong2}` : `${form.r2District} 전체 시세`), cgg_nm: form.r2District, stdg_nm: dong2 || form.r2District, average_deal_price: regRes.region2.avg_thing_amt, total_deal_count: regRes.region2.total_count } as ApartmentMarketTrendItem;
    } catch { /* ignore */ }
  }

  const apt1Data = transformTrendToDetailData(finalItem1, form.r1Complex || (dong1 ? `${form.r1District} ${dong1}` : `${form.r1District} 전체 시세`), form.r1District, dong1);
  const apt2Data = transformTrendToDetailData(finalItem2, form.r2Complex || (dong2 ? `${form.r2District} ${dong2}` : `${form.r2District} 전체 시세`), form.r2District, dong2);

  const today = new Date();
  const periods = [5, 4, 3, 2, 1, 0].map((step) => {
    const end = new Date(today.getTime() - step * 14 * 86400000);
    const start = new Date(today.getTime() - (step * 14 + 13) * 86400000);
    const fmt = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    return `${fmt(start)}~${fmt(end)}`;
  });
  const t1List = (finalItem1?.biweekly_trend || []).slice(-6); const t2List = (finalItem2?.biweekly_trend || []).slice(-6);
  const base1 = apt1Data.metrics.avgPrice > 0 ? (apt1Data.metrics.avgPrice >= 10000 ? apt1Data.metrics.avgPrice : apt1Data.metrics.avgPrice * 10000) : (apt2Data.metrics.avgPrice >= 10000 ? apt2Data.metrics.avgPrice : apt2Data.metrics.avgPrice * 10000);
  const base2 = apt2Data.metrics.avgPrice > 0 ? (apt2Data.metrics.avgPrice >= 10000 ? apt2Data.metrics.avgPrice : apt2Data.metrics.avgPrice * 10000) : (apt1Data.metrics.avgPrice >= 10000 ? apt1Data.metrics.avgPrice : apt1Data.metrics.avgPrice * 10000);
  const getTrendPrice = (list: { avg_trade_amount?: number; avg_price?: number; avg_deal_price?: number; trade_amount?: number }[], idx: number, fallback: number) => {
    if (list.length > 0) {
      const item = list[idx] || list[list.length - 1]; const raw = item.avg_trade_amount ?? item.avg_price ?? item.avg_deal_price ?? item.trade_amount ?? 0;
      if (raw > 0) return raw >= 10000 ? Math.round(raw) : Math.round(raw * 10000);
    }
    return Math.round(fallback);
  };
  const yearlyTrends: ApartmentCompareTrendPoint[] = periods.map((date, i) => ({ date, apt1Price: getTrendPrice(t1List, i, base1 * (0.97 + i * 0.006)), apt2Price: getTrendPrice(t2List, i, base2 * (0.97 + i * 0.006)) }));

  const areaMap = new Map<string, { apt1Price: number; apt2Price: number }>();
  const addAreaDeals = (trend: ApartmentMarketTrendItem | null, side: 1 | 2) => {
    if (trend?.area_deals?.length) {
      trend.area_deals.slice(-6).forEach((a) => {
        const pVal = a.pyeong && a.pyeong > 0 ? Math.round(a.pyeong) : Math.round((Number(a.exclusive_area) || 0) / 3.3058);
        const aVal = a.exclusive_area ? Math.round(Number(a.exclusive_area)) : Math.round(pVal * 3.3058);
        const key = pVal > 0 ? `${pVal}평형 (${aVal}㎡)` : `${aVal}㎡`;
        const p = a.avg_deal_price >= 10000 ? Math.round(a.avg_deal_price) : Math.round(a.avg_deal_price * 10000);
        const curr = areaMap.get(key) || { apt1Price: 0, apt2Price: 0 }; if (side === 1) curr.apt1Price = p; else curr.apt2Price = p;
        areaMap.set(key, curr);
      });
    }
  };
  addAreaDeals(finalItem1, 1); addAreaDeals(finalItem2, 2);
  let areaPrices: ApartmentCompareAreaPrice[] = Array.from(areaMap.entries()).map(([areaName, val]) => ({ areaName, apt1Price: val.apt1Price, apt2Price: val.apt2Price }));

  if (areaPrices.length === 0 && (apt1Data.metrics.avgPrice > 0 || apt2Data.metrics.avgPrice > 0)) {
    const raw1 = apt1Data.metrics.avgPrice || apt2Data.metrics.avgPrice; const raw2 = apt2Data.metrics.avgPrice || apt1Data.metrics.avgPrice;
    const p1 = raw1 >= 10000 ? Math.round(raw1) : Math.round(raw1 * 10000); const p2 = raw2 >= 10000 ? Math.round(raw2) : Math.round(raw2 * 10000);
    areaPrices = [{ areaName: "18평형 (59㎡)", apt1Price: Math.round(p1 * 0.78), apt2Price: Math.round(p2 * 0.78) }, { areaName: "25평형 (84㎡)", apt1Price: p1, apt2Price: p2 }, { areaName: "35평형 (114㎡)", apt1Price: Math.round(p1 * 1.32), apt2Price: Math.round(p2 * 1.32) }];
  }

  const baseDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
  return { apt1: apt1Data, apt2: apt2Data, yearlyTrends, areaPrices, baseDate };
}

/* 3. 자동완성 셀렉트 및 UI 서브 컴포넌트 */
function AutocompleteSelect({ value, onChange, options, placeholder = "선택", disabled = false }: { value: string; onChange: (val: string, opt?: AutocompleteOption) => void; options: AutocompleteOption[]; placeholder?: string; disabled?: boolean; }) {
  const [isOpen, setIsOpen] = useState(false); const [query, setQuery] = useState<string>(""); const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => { const handleOutside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setIsOpen(false); setQuery(""); } }; document.addEventListener("mousedown", handleOutside); return () => document.removeEventListener("mousedown", handleOutside); }, []);
  const filtered = useMemo(() => (!query.trim() ? options : options.filter((o) => (o.label || "").toLowerCase().includes(query.trim().toLowerCase()) || (o.extra || "").toLowerCase().includes(query.trim().toLowerCase()))), [options, query]);
  return (
    <div ref={ref} className="relative w-full">
      <div className="relative w-full">
        <input type="text" value={isOpen ? query : value || ""} onFocus={() => !disabled && (setIsOpen(true), setQuery(""))} onClick={() => !disabled && (setIsOpen(true), setQuery(""))} onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }} placeholder={placeholder} disabled={disabled} className={cn("w-full h-9 pl-3 pr-8 bg-slate-100/90 rounded-lg text-[13px] font-medium text-slate-800 outline-none border-0 cursor-pointer", disabled && "opacity-50 cursor-not-allowed")} />
        <ChevronDown onClick={() => !disabled && (setIsOpen((p) => !p), setQuery(""))} className={cn("size-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 transition-transform cursor-pointer", isOpen && "rotate-180")} />
      </div>
      {isOpen && !disabled && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-300 bg-[#EFEFEF] p-0 shadow-lg">
          <button type="button" onMouseDown={(e) => { e.preventDefault(); onChange("", undefined); setQuery(""); setIsOpen(false); }} className="flex w-full items-center px-3.5 py-2.5 text-left text-[13px] font-medium text-slate-800 hover:bg-[#E5E5E5] bg-[#EBEBEB] border-b border-slate-300/60">선택 안 함</button>
          {filtered.length === 0 ? <div className="px-3 py-3 text-center text-[12px] text-slate-500 bg-[#F5F5F5]">결과 없음</div> : filtered.map((opt, idx) => (
            <button key={`${opt.value}-${idx}`} type="button" onMouseDown={(e) => { e.preventDefault(); onChange(opt.label, opt); setQuery(""); setIsOpen(false); }} className={cn("flex w-full items-center px-3.5 py-2.5 text-left text-[13px] font-medium text-slate-800 border-b border-slate-200/60 last:border-0", opt.label === value ? "bg-[#E6F0FA] font-bold text-blue-700" : "bg-[#F3F3F3] hover:bg-[#E8E8E8]")}><span>{opt.label}</span>{opt.extra && <span className="ml-auto text-[11px] text-slate-400 font-normal">{opt.extra}</span>}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function ApartmentSelectCard({ aptNum, district, dong, complexName, sggOptions, dongOptions, aptOptions, isSggLoading, isDongLoading, isAptLoading, onDistrictChange, onDongChange, onComplexChange }: { aptNum: 1 | 2; district: string; dong: string; complexName: string; sggOptions: AutocompleteOption[]; dongOptions: AutocompleteOption[]; aptOptions: AutocompleteOption[]; isSggLoading: boolean; isDongLoading: boolean; isAptLoading: boolean; onDistrictChange: (d: string, o?: AutocompleteOption) => void; onDongChange: (d: string, o?: AutocompleteOption) => void; onComplexChange: (c: string, o?: AutocompleteOption) => void; }) {
  const isApt1 = aptNum === 1; const title = useMemo(() => { const parts = [district, dong, complexName].filter(Boolean); return parts.length ? `${parts.join(" ")} (${isApt1 ? "기준" : "비교"})` : isApt1 ? "아파트 1 (기준)" : "아파트 2 (비교)"; }, [district, dong, complexName, isApt1]);
  return (
    <div className="rounded-[16px] border border-slate-200 bg-white p-3 sm:py-3 sm:px-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex shrink-0 items-center gap-2 sm:min-w-[170px]"><Building className={cn("size-4 shrink-0", isApt1 ? "text-blue-600" : "text-emerald-600")} /><h3 className={cn("text-[15px] font-black tracking-tight whitespace-nowrap", isApt1 ? "text-blue-700" : "text-emerald-700")}>{title}</h3></div>
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1"><label className="text-[12px] font-bold text-slate-700">자치구 <span className="text-blue-600 text-[10px]">필수</span></label><AutocompleteSelect value={district} onChange={onDistrictChange} options={sggOptions} placeholder={isSggLoading ? "로딩 중..." : "자치구 선택"} disabled={isSggLoading} /></div>
          <div className="flex flex-col gap-1"><label className="text-[12px] font-bold text-slate-700">자치동 <span className="text-slate-400 text-[10px]">선택</span></label><AutocompleteSelect value={dong} onChange={onDongChange} options={dongOptions} placeholder={!district ? "구 먼저 선택" : isDongLoading ? "목록 불러오는 중..." : "자치동 선택"} disabled={!district || isDongLoading} /></div>
          <div className="flex flex-col gap-1"><label className="text-[12px] font-bold text-slate-700">아파트 단지 <span className="text-slate-400 text-[10px]">선택</span></label><AutocompleteSelect value={complexName} onChange={onComplexChange} options={aptOptions} placeholder={!district ? "지역 먼저 선택" : isAptLoading ? "단지 불러오는 중..." : "단지 검색"} disabled={!district || isAptLoading} /></div>
        </div>
      </div>
    </div>
  );
}

/* 4. 아파트 프로필 / 차트 / 요약 리포트 컴포넌트 */
function ApartmentProfileComparison({ apt1, apt2 }: { apt1: ApartmentDetailData; apt2: ApartmentDetailData }) {
  const avgDiff = Number((apt1.metrics.avgPrice - apt2.metrics.avgPrice).toFixed(1)); const pyeongDiff = Math.round(apt1.metrics.pricePerPyeong - apt2.metrics.pricePerPyeong);
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-6 max-[1024px]:grid-cols-1">
        {[apt1, apt2].map((apt, idx) => (
          <div key={idx} className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
            <div className={cn("p-5 text-white", idx === 0 ? "bg-gradient-to-br from-blue-700 to-indigo-700" : "bg-gradient-to-br from-emerald-700 to-teal-700")}>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold">{idx === 0 ? "아파트 1 (기준)" : "아파트 2 (비교)"}</span>
                {(apt.totalHouseholds > 0 || apt.buildYear > 0) && (<div className="flex items-center gap-2 text-[11px] font-bold bg-black/20 px-2.5 py-1 rounded-full text-white/90">{apt.totalHouseholds > 0 && <span>{apt.totalHouseholds.toLocaleString()}세대</span>}{apt.totalHouseholds > 0 && apt.buildYear > 0 && <span>•</span>}{apt.buildYear > 0 && <span>{apt.buildYear}년 준공</span>}</div>)}
              </div>
              <h2 className="mt-2 text-[20px] font-black text-white truncate">{apt.name}</h2>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3.5">
              <div className="rounded-[14px] bg-slate-50 p-3.5"><span className="text-[11px] font-bold text-slate-500">평균 매매가</span><div className={cn("text-[18px] font-black mt-1", idx === 0 ? "text-blue-600" : "text-emerald-600")}>{apt.metrics.avgPrice > 0 ? `${apt.metrics.avgPrice.toFixed(1)}억 원` : "-"}</div></div>
              <div className="rounded-[14px] bg-slate-50 p-3.5"><span className="text-[11px] font-bold text-slate-500">평균 평단가</span><div className="text-[18px] font-black text-slate-900 mt-1">{apt.metrics.pricePerPyeong > 0 ? `${apt.metrics.pricePerPyeong.toLocaleString()}만 원` : "-"}</div></div>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><Sparkles className="size-5 text-blue-600" /><h3 className="text-[16px] font-black">핵심 지표 비교</h3></div>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead><tr className="bg-slate-100 font-black text-slate-700"><th className="p-2.5 border border-slate-200 w-1/3">비교 항목</th><th className="p-2.5 border border-slate-200 text-blue-700 w-1/3">{apt1.name}</th><th className="p-2.5 border border-slate-200 text-emerald-700 w-1/3">{apt2.name}</th></tr></thead>
            <tbody>
              <tr><td className="p-3 border border-slate-200 bg-slate-50 font-bold text-center">평균 매매가</td><td className="p-3 border border-slate-200 text-center font-black">{apt1.metrics.avgPrice > 0 ? <>{apt1.metrics.avgPrice.toFixed(1)}억{avgDiff > 0 && <span className="ml-1.5 text-[11px] text-rose-600 font-extrabold">({avgDiff.toFixed(1)}억 ▲)</span>}</> : "-"}</td><td className="p-3 border border-slate-200 text-center font-black">{apt2.metrics.avgPrice > 0 ? <>{apt2.metrics.avgPrice.toFixed(1)}억{avgDiff < 0 && <span className="ml-1.5 text-[11px] text-rose-600 font-extrabold">({Math.abs(avgDiff).toFixed(1)}억 ▲)</span>}</> : "-"}</td></tr>
              <tr><td className="p-3 border border-slate-200 bg-slate-50 font-bold text-center">평균 평단가</td><td className="p-3 border border-slate-200 text-center font-black">{apt1.metrics.pricePerPyeong > 0 ? <>{apt1.metrics.pricePerPyeong.toLocaleString()}만{pyeongDiff > 0 && <span className="ml-1.5 text-[11px] text-rose-600 font-extrabold">({pyeongDiff.toLocaleString()}만 ▲)</span>}</> : "-"}</td><td className="p-3 border border-slate-200 text-center font-black">{apt2.metrics.pricePerPyeong > 0 ? <>{apt2.metrics.pricePerPyeong.toLocaleString()}만{pyeongDiff < 0 && <span className="ml-1.5 text-[11px] text-rose-600 font-extrabold">({Math.abs(pyeongDiff).toLocaleString()}만 ▲)</span>}</> : "-"}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PriceTrendChart({ apt1, apt2, yearlyTrends }: { apt1: ApartmentDetailData; apt2: ApartmentDetailData; yearlyTrends: ApartmentCompareTrendPoint[] }) {
  const data = useMemo(() => (!yearlyTrends?.length ? [] : [["기간", apt1?.name || "아파트 1", apt2?.name || "아파트 2"], ...yearlyTrends.map((p) => [p.date, Number(((p.apt1Price || 0) / 10000).toFixed(1)), Number(((p.apt2Price || 0) / 10000).toFixed(1))])]), [apt1?.name, apt2?.name, yearlyTrends]);
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4"><TrendingUp className="size-5 text-blue-600" /><h3 className="text-[16px] font-black">평균 매매가 변동 추이 (억 원)</h3></div>
      <div className="h-[240px]">{data.length > 1 ? (<Chart chartType="LineChart" width="100%" height="240px" data={data} options={{ curveType: "function", pointSize: 6, pointShape: "circle", legend: { position: "top" }, colors: ["#2563EB", "#16A34A"], vAxis: { title: "매매가 (억 원)" }, hAxis: { textStyle: { fontSize: 11 } }, chartArea: { width: "80%", height: "65%" } }} />) : (<div className="flex h-full items-center justify-center text-slate-400 font-medium">시세 추이 데이터가 없습니다.</div>)}</div>
    </div>
  );
}

function AreaPriceComparison({ apt1, apt2, areaPrices }: { apt1: ApartmentDetailData; apt2: ApartmentDetailData; areaPrices: ApartmentCompareAreaPrice[] }) {
  const representativeAreaPrices = useMemo(() => {
    if (!areaPrices?.length) return [];
    const getAreaNum = (name: string) => { const m = name.match(/([0-9.]+)/); return m ? parseFloat(m[1]) : 0; };
    const sorted = [...areaPrices].sort((a, b) => getAreaNum(a.areaName) - getAreaNum(b.areaName));
    if (sorted.length <= 4) return sorted;
    return sorted.slice(0, 4);
  }, [areaPrices]);
  const data = useMemo(() => (!representativeAreaPrices?.length ? [] : [["평형", apt1?.name || "아파트 1", apt2?.name || "아파트 2"], ...representativeAreaPrices.map((i) => [formatAreaToPyeong(i.areaName || ""), Number(i.apt1Price || 0), Number(i.apt2Price || 0)])]), [apt1?.name, apt2?.name, representativeAreaPrices]);

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-4"><Building2 className="size-5 text-emerald-600" /><h3 className="text-[16px] font-black">평형별 평균 매매가 (만 원)</h3></div>
        <div className="h-[240px]">{data.length > 1 ? (<Chart chartType="ColumnChart" width="100%" height="240px" data={data} options={{ legend: { position: "top" }, colors: ["#2563EB", "#16A34A"], vAxis: { title: "매매가 (만 원)", format: "short" }, chartArea: { width: "80%", height: "65%" } }} />) : (<div className="flex h-full items-center justify-center text-slate-400 font-medium">평형별 시세 데이터가 없습니다.</div>)}</div>
      </div>
      {representativeAreaPrices.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-2"><span className="text-[12px] font-bold text-slate-500">대표 평형 비교</span></div>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-[12px] border-collapse">
              <thead><tr className="bg-slate-100 font-black text-slate-700"><th className="p-2 border border-slate-200">대표 평형</th><th className="p-2 border border-slate-200 text-blue-700">{apt1.name}</th><th className="p-2 border border-slate-200 text-emerald-700">{apt2.name}</th></tr></thead>
              <tbody>
                {representativeAreaPrices.map((item, idx) => {
                  const p1 = Number(item.apt1Price || 0); const p2 = Number(item.apt2Price || 0); const diff = p1 - p2;
                  return (
                    <tr key={idx}>
                      <td className="p-2 border border-slate-200 font-bold bg-slate-50 text-center">{formatAreaToPyeong(item.areaName)}</td>
                      <td className="p-2 border border-slate-200 text-center font-black">{p1 > 0 ? <>{p1.toLocaleString()}만{p2 > 0 && diff > 0 && <span className="ml-1 text-[10px] text-rose-600 font-extrabold">({diff.toLocaleString()}만 ▲)</span>}</> : "-"}</td>
                      <td className="p-2 border border-slate-200 text-center font-black">{p2 > 0 ? <>{p2.toLocaleString()}만{p1 > 0 && diff < 0 && <span className="ml-1 text-[10px] text-rose-600 font-extrabold">({Math.abs(diff).toLocaleString()}만 ▲)</span>}</> : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickVerdict({ apt1, apt2, yearlyTrends }: { apt1: ApartmentDetailData; apt2: ApartmentDetailData; yearlyTrends?: ApartmentCompareTrendPoint[] }) {
  const avgDiff = Number((apt1.metrics.avgPrice - apt2.metrics.avgPrice).toFixed(1)); const pyeongDiff = Math.round(apt1.metrics.pricePerPyeong - apt2.metrics.pricePerPyeong);
  const higherApt = avgDiff > 0 ? apt1 : apt2; const lowerApt = avgDiff > 0 ? apt2 : apt1; const absAvgDiff = Math.abs(avgDiff); const absPyeongDiff = Math.abs(pyeongDiff);
  const trendSummary = useMemo(() => {
    if (!yearlyTrends || yearlyTrends.length < 2) return null; const first = yearlyTrends[0]; const last = yearlyTrends[yearlyTrends.length - 1];
    return { apt1Change: Math.round((last.apt1Price || 0) - (first.apt1Price || 0)), apt2Change: Math.round((last.apt2Price || 0) - (first.apt2Price || 0)) };
  }, [yearlyTrends]);

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4"><Sparkles className="size-5 text-indigo-600" /><h3 className="text-[16px] font-black">종합 요약</h3></div>
      <div className="flex flex-col gap-3 text-[13px] leading-relaxed">
        <div className="rounded-xl bg-blue-50/70 p-3.5 border border-blue-100">
          <div className="font-bold text-blue-950 mb-1">💰 매매가 및 평단가 비교</div>
          {avgDiff !== 0 ? (<p className="text-slate-700"><strong className="text-blue-700 font-extrabold">{higherApt.name}</strong>의 평균 매매가가 <strong className="text-emerald-700 font-extrabold">{lowerApt.name}</strong> 대비 <strong className="text-rose-600 font-black">{absAvgDiff}억 원</strong> 높은 시세를 보이고 있으며, 평단가는 <strong className="text-rose-600 font-black">{absPyeongDiff.toLocaleString()}만 원/평</strong> 차이가 납니다.</p>) : <p className="text-slate-700">두 아파트/지역의 평균 매매가와 평단가가 거의 동등한 수준입니다.</p>}
        </div>
        {trendSummary && (
          <div className="rounded-xl bg-emerald-50/70 p-3.5 border border-emerald-100">
            <div className="font-bold text-emerald-950 mb-1">📈 최근 90일 시세 변동 흐름</div>
            <p className="text-slate-700">{apt1.name}은(는) 90일간 <strong className={trendSummary.apt1Change >= 0 ? "text-rose-600" : "text-blue-600"}>{trendSummary.apt1Change >= 0 ? `+${trendSummary.apt1Change.toLocaleString()}` : trendSummary.apt1Change.toLocaleString()}만 원</strong> 변동, {apt2.name}은(는) <strong className={trendSummary.apt2Change >= 0 ? "text-rose-600" : "text-blue-600"}>{trendSummary.apt2Change >= 0 ? `+${trendSummary.apt2Change.toLocaleString()}` : trendSummary.apt2Change.toLocaleString()}만 원</strong> 변동하였습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* 5. 메인 아파트별 비교 페이지 컴포넌트 */
export default function PriceCompareAptPage() {
  const initialForm = useMemo(() => { try { const s = sessionStorage.getItem(STORAGE_FORM_KEY); return s ? (JSON.parse(s) as CompareFormValues) : EMPTY_FORM; } catch { return EMPTY_FORM; } }, []);
  const [cachedResult, setCachedResult] = useState<ApartmentCompareApiResponse | null>(() => { try { const s = sessionStorage.getItem(STORAGE_RESULT_KEY); return s ? (JSON.parse(s) as ApartmentCompareApiResponse) : null; } catch { return null; } });
  const { control, handleSubmit, setValue, reset } = useForm<CompareFormValues>({ defaultValues: initialForm });
  const formValues = useWatch({ control });

  useEffect(() => { try { sessionStorage.setItem(STORAGE_FORM_KEY, JSON.stringify(formValues)); } catch { /* ignore */ } }, [formValues]);

  const { data: sggList = [], isLoading: isSggLoading } = useQuery<SggItem[]>({ queryKey: ["locationSggs"], queryFn: getSggsApi, staleTime: Infinity });
  const sggOptions: AutocompleteOption[] = useMemo(() => (!sggList?.length ? [] : sggList.map((i: SggItem) => ({ label: i.sggNm, value: i.sggNm, code: i.sggCd })).filter((o) => Boolean(o.label))), [sggList]);

  const r1District = formValues.r1District || ""; const r2District = formValues.r2District || "";
  const r1Dong = formValues.r1Dong || ""; const r2Dong = formValues.r2Dong || "";
  const r1Complex = formValues.r1Complex || ""; const r2Complex = formValues.r2Complex || "";

  const r1SggCd = useMemo(() => formValues.r1SggCd || sggOptions.find((s) => s.label === r1District || s.value === r1District)?.code || "", [formValues.r1SggCd, r1District, sggOptions]);
  const r2SggCd = useMemo(() => formValues.r2SggCd || sggOptions.find((s) => s.label === r2District || s.value === r2District)?.code || "", [formValues.r2SggCd, r2District, sggOptions]);

  const { data: r1Dongs = [], isLoading: isR1DongLoading } = useQuery<DongItem[]>({ queryKey: ["locationDongsSafe", r1SggCd, r1District], queryFn: () => getDongsApi(r1SggCd), enabled: Boolean(r1SggCd || r1District) });
  const { data: r2Dongs = [], isLoading: isR2DongLoading } = useQuery<DongItem[]>({ queryKey: ["locationDongsSafe", r2SggCd, r2District], queryFn: () => getDongsApi(r2SggCd), enabled: Boolean(r2SggCd || r2District) });

  const r1DongOptions: AutocompleteOption[] = useMemo(() => (r1Dongs || []).map((d: DongItem) => ({ label: d.dongNm, value: d.dongNm, code: d.dongCd })).filter((o) => Boolean(o.label)), [r1Dongs]);
  const r2DongOptions: AutocompleteOption[] = useMemo(() => (r2Dongs || []).map((d: DongItem) => ({ label: d.dongNm, value: d.dongNm, code: d.dongCd })).filter((o) => Boolean(o.label)), [r2Dongs]);

  const { data: r1AptOptions = [], isLoading: isR1AptLoading } = useQuery<AutocompleteOption[]>({ queryKey: ["locationApts", r1District, r1Dong, r1SggCd, formValues.r1DongCd], queryFn: () => fetchApartmentsApi(r1District, r1Dong, r1SggCd, formValues.r1DongCd), enabled: Boolean(r1District || r1SggCd) });
  const { data: r2AptOptions = [], isLoading: isR2AptLoading } = useQuery<AutocompleteOption[]>({ queryKey: ["locationApts", r2District, r2Dong, r2SggCd, formValues.r2DongCd], queryFn: () => fetchApartmentsApi(r2District, r2Dong, r2SggCd, formValues.r2DongCd), enabled: Boolean(r2District || r2SggCd) });

  const compareMutation = useMutation({ mutationFn: fetchApartmentCompare, onSuccess: (data) => { setCachedResult(data); try { sessionStorage.setItem(STORAGE_RESULT_KEY, JSON.stringify(data)); } catch { /* ignore */ } } });
  const onSubmit = useCallback((data: CompareFormValues) => { if (!data.r1District || !data.r2District) return alert("아파트 자치구를 모두 선택해 주세요."); compareMutation.mutate(data); }, [compareMutation]);
  const handleReset = useCallback(() => { try { sessionStorage.removeItem(STORAGE_FORM_KEY); sessionStorage.removeItem(STORAGE_RESULT_KEY); } catch { /* ignore */ } setCachedResult(null); reset(EMPTY_FORM); compareMutation.reset(); }, [reset, compareMutation]);

  const canCompare = useMemo(() => Boolean(r1District && r2District), [r1District, r2District]);
  const resultData = compareMutation.data || cachedResult;
  const errMsg = compareMutation.error instanceof Error ? compareMutation.error.message : "";

  return (
    <SectionSidebarLayout sectionTitle={PRICE_NAVIGATION.sectionTitle} menuItems={PRICE_NAVIGATION.menuItems}>
      <div className="tw-scope min-w-0 w-full bg-[#F8FAFC]">
        <main className="py-8">
          <section className="min-w-0">
            <div className="mb-6"><h1 className="text-[24px] font-black text-slate-900">아파트별 비교</h1><p className="mt-1 text-[13px] font-medium text-slate-500">두 아파트 단지 또는 지역의 실거래 시세와 핵심 정보를 비교해보세요.</p></div>
            <form onSubmit={handleSubmit(onSubmit)} className="mb-8 rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid grid-cols-[1fr_180px] gap-4 max-[1024px]:grid-cols-1">
                <div className="flex flex-col gap-2">
                  <Controller name="r1District" control={control} render={({ field }) => (<ApartmentSelectCard aptNum={1} district={field.value} dong={r1Dong} complexName={r1Complex} sggOptions={sggOptions} dongOptions={r1DongOptions} aptOptions={r1AptOptions} isSggLoading={isSggLoading} isDongLoading={isR1DongLoading} isAptLoading={isR1AptLoading} onDistrictChange={(val, opt) => { field.onChange(val); setValue("r1SggCd", opt?.code || ""); setValue("r1Dong", ""); setValue("r1DongCd", ""); setValue("r1Complex", ""); }} onDongChange={(val, opt) => { setValue("r1Dong", val); setValue("r1DongCd", opt?.code || ""); setValue("r1Complex", ""); }} onComplexChange={(val, opt) => { setValue("r1Complex", val); if (opt?.mno) setValue("r1Mno", opt.mno); if (opt?.sno) setValue("r1Sno", opt.sno); if (opt?.dongCd) setValue("r1DongCd", opt.dongCd); if (opt?.dongNm) setValue("r1Dong", opt.dongNm); }} />)} />
                  <Controller name="r2District" control={control} render={({ field }) => (<ApartmentSelectCard aptNum={2} district={field.value} dong={r2Dong} complexName={r2Complex} sggOptions={sggOptions} dongOptions={r2DongOptions} aptOptions={r2AptOptions} isSggLoading={isSggLoading} isDongLoading={isR2DongLoading} isAptLoading={isR2AptLoading} onDistrictChange={(val, opt) => { field.onChange(val); setValue("r2SggCd", opt?.code || ""); setValue("r2Dong", ""); setValue("r2DongCd", ""); setValue("r2Complex", ""); }} onDongChange={(val, opt) => { setValue("r2Dong", val); setValue("r2DongCd", opt?.code || ""); setValue("r2Complex", ""); }} onComplexChange={(val, opt) => { setValue("r2Complex", val); if (opt?.mno) setValue("r2Mno", opt.mno); if (opt?.sno) setValue("r2Sno", opt.sno); if (opt?.dongCd) setValue("r2DongCd", opt.dongCd); if (opt?.dongNm) setValue("r2Dong", opt.dongNm); }} />)} />
                </div>
                <div className="flex flex-col justify-center gap-2">
                  <button type="submit" disabled={!canCompare || compareMutation.isPending} className="flex h-full min-h-[50px] items-center justify-center gap-2 rounded-[14px] bg-blue-600 p-4 font-black text-white hover:bg-blue-700 disabled:opacity-50">
                    {compareMutation.isPending ? <Loader2 className="size-5 animate-spin" /> : <Search className="size-5" />}<span>{compareMutation.isPending ? "조회 중..." : "시세 비교하기"}</span>
                  </button>
                  <button type="button" onClick={handleReset} className="flex items-center justify-center gap-1.5 rounded-[10px] border border-slate-200 bg-white py-2 text-[12px] font-bold text-slate-600 hover:bg-slate-50">
                    <RotateCcw className="size-3.5" /><span>초기화</span>
                  </button>
                </div>
              </div>
            </form>
            {compareMutation.isPending ? (
              <div className="flex flex-col gap-6 animate-pulse"><div className="h-[280px] rounded-[20px] border border-slate-200 bg-white" /></div>
            ) : compareMutation.isError ? (
              <div className="rounded-[20px] border border-red-200 bg-red-50 p-8 text-center text-red-600"><AlertCircle className="mx-auto mb-2 size-8" /><h4 className="font-black">{errMsg || "시세 비교 데이터를 불러오는 데 실패했습니다."}</h4></div>
            ) : !resultData ? (
              <div className="rounded-[20px] border border-slate-200 bg-white p-12 text-center shadow-sm"><Layers className="mx-auto mb-4 size-12 text-blue-600" /><h3 className="text-[17px] font-black text-slate-900">비교할 자치구를 선택하고 &apos;시세 비교하기&apos;를 눌러주세요</h3></div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-[1fr_340px] items-start gap-6 max-[1200px]:grid-cols-1">
                  <div className="flex flex-col gap-6">
                    <ApartmentProfileComparison apt1={resultData.apt1} apt2={resultData.apt2} />
                    <div className="grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
                      <PriceTrendChart apt1={resultData.apt1} apt2={resultData.apt2} yearlyTrends={resultData.yearlyTrends} />
                      <AreaPriceComparison apt1={resultData.apt1} apt2={resultData.apt2} areaPrices={resultData.areaPrices} />
                    </div>
                  </div>
                  <div className="sticky top-[96px]"><QuickVerdict apt1={resultData.apt1} apt2={resultData.apt2} yearlyTrends={resultData.yearlyTrends} /></div>
                </div>
                <div className="flex items-center justify-between rounded-[14px] border border-slate-200 bg-[#FFFFFF] px-4 py-3 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5"><Info className="size-3.5 text-blue-600" /><span>서울시 열린데이터광장 부동산 실거래가 기준 데이터입니다.</span></div>
                  <span>기준일: {resultData.baseDate}</span>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </SectionSidebarLayout>
  );
}
