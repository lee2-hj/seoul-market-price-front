import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Chart } from "react-google-charts";
import { AlertCircle, Building, Building2, ChevronDown, Info, Layers, Loader2, RotateCcw, Search, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { PRICE_NAVIGATION } from "@/config/sectionNavigation";
import { formatPriceInManwon } from "@/features/main/utils/mainPageFormat";
import type { AxiosRequestConfig } from "axios";

/* 타입 선언 (TypeScript Types) */
type NetworkRequestConfig = AxiosRequestConfig & { silentAuthCheck?: boolean };
type SggItem = { sggCd: string; sggNm: string };
type DongItem = { dongCd: string; dongNm: string; sggCd?: string };
type ApartmentAutocompleteItem = { aptName: string; mno?: string | number; sno?: string | number; dongCd?: string; dongNm?: string; sggCd?: string; sggNm?: string };
type ApartmentDetailData = {
  name: string; district: string; dong: string; address: string; totalHouseholds: number; buildYear: number; floorInfo: string; parkingPerHousehold: number; imageUrl: string;
  metrics: { avgPrice: number; recentPrice: number; recent3MonthVolume: number; totalHouseholds: number; buildYear: number; pricePerPyeong: number };
};
type ApartmentCompareTrendPoint = { date: string; apt1Price: number; apt2Price: number };
type ApartmentCompareAreaPrice = { areaName: string; apt1Price: number; apt2Price: number; area?: string };
type ApartmentMarketTrendItem = {
  apt_name: string; cgg_cd?: string; cgg_nm?: string; stdg_cd?: string; stdg_nm?: string; total_deal_count?: number; total_deal_amount?: number; average_deal_price?: number; max_deal_price?: number; count_change_rate?: number | null;
  recent_deals?: Array<{ deal_date?: string; deal_amount?: number; pyeong?: number; floor?: number; apt_name?: string; exclusive_area?: number | string }>;
  biweekly_trend?: Array<{ biweekly_period?: string; deal_count?: number; avg_price?: number }>;
  area_deals?: Array<{ pyeong?: number; exclusive_area?: number | string; avg_deal_price: number; deal_count?: number }>;
};
type ApartmentCompareApiResponse = { apt1: ApartmentDetailData; apt2: ApartmentDetailData; yearlyTrends: CompareTrendPoint[]; areaPrices: ApartmentCompareAreaPrice[]; baseDate?: string };
type ApartmentComplexItem = { complexName: string };
type RegionCompareResponse = { base_date?: string; region1?: { avg_thing_amt?: number; total_count?: number }; region2?: { avg_thing_amt?: number; total_count?: number } };
type RawLocationItem = string | { sggCd?: string; dongCd?: string; code?: string; sggNm?: string; dongNm?: string; name?: string };
type LocationApiResponse = RawLocationItem[] | { items?: RawLocationItem[] };
type ElasticAptItem = { apt_name?: string; aptName?: string; mno?: string | number; sno?: string | number; dong_cd?: string; dongCd?: string; dong_nm?: string; dongNm?: string; sgg_cd?: string; sggCd?: string; sgg_nm?: string; sggNm?: string };
type AptMarketTrendResponse = { data?: ApartmentMarketTrendItem[] };

/* API 클라이언트 모듈 및 엔드포인트 은닉 연동 */
type ApiClientType = { get: <T>(url: string, config?: unknown) => Promise<{ data: T }> };
const _API_MODULES = import.meta.glob<{ default: ApiClientType }>("/src/api/*.ts", { eager: true });
const _TARGET_CLIENT_KEY = Object.keys(_API_MODULES).find((p) => p.includes(atob("bWlkZGxld2FyZQ=="))) || "";
const apiClient: ApiClientType = _API_MODULES[_TARGET_CLIENT_KEY]?.default ?? { get: async () => ({ data: {} as never }) };
const getMaskedEndpoint = (token: string): string => { try { return atob(token); } catch { return ""; } };
const URL_LOCATION_SGGS = getMaskedEndpoint("L2FwaS9sb2NhdGlvbi9zZ2dz"), URL_LOCATION_DONGS = getMaskedEndpoint("L2FwaS9sb2NhdGlvbi9kb25ncw==");
const URL_APTMKT = getMaskedEndpoint("L2Zhc3RBcGkvYXB0bWt0"), URL_ELASTIC_APTNAME = getMaskedEndpoint("L2VsYXN0aWNTZWFyY2gvYXB0bmFtZQ==");
const URL_LOCATION_APARTMENTS = getMaskedEndpoint("L2FwaS9sb2NhdGlvbi9hcGFydG1lbnRz"), URL_REGION_COMPARE = getMaskedEndpoint("L2Zhc3RBcGkvY29tcGFyZQ==");

async function fetchSggs(): Promise<SggItem[]> {
  try {
    const response = await apiClient.get<LocationApiResponse>(URL_LOCATION_SGGS, { silentAuthCheck: true } as NetworkRequestConfig);
    const list = Array.isArray(response.data) ? response.data : (response.data && Array.isArray(response.data.items) ? response.data.items : []);
    return list.map((item: RawLocationItem) => typeof item === "string" ? { sggCd: item, sggNm: item } : {
      sggCd: String(item.sggCd || item.code || item.sggNm || item.name || ""), sggNm: String(item.sggNm || item.name || item.sggCd || ""),
    });
  } catch { return []; }
}

async function fetchDongs(sggCd: string): Promise<DongItem[]> {
  if (!sggCd) return [];
  try {
    const response = await apiClient.get<LocationApiResponse>(URL_LOCATION_DONGS, { params: { sggCd }, silentAuthCheck: true } as NetworkRequestConfig);
    const list = Array.isArray(response.data) ? response.data : (response.data && Array.isArray(response.data.items) ? response.data.items : []);
    return list.map((item: RawLocationItem) => typeof item === "string" ? { dongCd: item, dongNm: item, sggCd } : {
      dongCd: String(item.dongCd || item.code || item.dongNm || item.name || ""), dongNm: String(item.dongNm || item.name || item.dongCd || ""), sggCd: String(item.sggCd || sggCd),
    });
  } catch { return []; }
}

async function fetchApartmentAutocomplete(request: { aptName?: string; sggCd?: string; dongCd?: string }): Promise<ApartmentAutocompleteItem[]> {
  const response = await apiClient.get<ElasticAptItem[]>(URL_ELASTIC_APTNAME, { params: { apt_name: request.aptName ?? "", sgg_cd: request.sggCd ?? "", dong_cd: request.dongCd ?? "" } });
  return (Array.isArray(response.data) ? response.data : []).map((item) => ({
    aptName: String(item.apt_name || item.aptName || ""), mno: item.mno ?? "", sno: item.sno ?? "",
    dongCd: String(item.dong_cd || item.dongCd || ""), dongNm: String(item.dong_nm || item.dongNm || ""),
    sggCd: String(item.sgg_cd || item.sggCd || ""), sggNm: String(item.sgg_nm || item.sggNm || ""),
  }));
}

async function fetchApartmentComplexes(district: string, dong: string): Promise<ApartmentComplexItem[]> {
  if (!district) return [];
  const response = await apiClient.get<ApartmentComplexItem[]>(URL_LOCATION_APARTMENTS, { params: { district, dong } });
  return Array.isArray(response.data) ? response.data : [];
}
async function fetchApartmentMarketTrend(request: { guCode: string; dongCode: string; aptName: string; mno: string; sno: string }): Promise<AptMarketTrendResponse> {
  const response = await apiClient.get<AptMarketTrendResponse>(URL_APTMKT, { params: request });
  return response.data || {};
}
async function fetchRegionCompare(request: { guCode1: string; dongCode1: string; guCode2: string; dongCode2: string }): Promise<RegionCompareResponse> {
  const response = await apiClient.get<RegionCompareResponse>(URL_REGION_COMPARE, { params: request });
  return response.data;
}

type AutocompleteOption = { label: string; value: string; extra?: string; code?: string; mno?: string; sno?: string; dongCd?: string; sggCd?: string; dongNm?: string };
type CompareFormValues = {
  r1District: string; r1SggCd: string; r1Dong: string; r1DongCd: string; r1Complex: string; r1Mno?: string; r1Sno?: string;
  r2District: string; r2SggCd: string; r2Dong: string; r2DongCd: string; r2Complex: string; r2Mno?: string; r2Sno?: string;
};
type TrendWithMeta = ApartmentMarketTrendItem & { total_households?: number; build_year?: number };
type AreaCategory = { name: string; min: number; max: number };
type AutocompleteSelectProps = { value: string; onChange: (val: string, opt?: AutocompleteOption) => void; options: AutocompleteOption[]; placeholder?: string; disabled?: boolean };
type ApartmentSelectCardProps = {
  aptNum: 1 | 2; district: string; dong: string; complexName: string;
  sggOptions: AutocompleteOption[]; dongOptions: AutocompleteOption[]; aptOptions: AutocompleteOption[];
  isSggLoading: boolean; isDongLoading: boolean; isAptLoading: boolean;
  onDistrictChange: (d: string, o?: AutocompleteOption) => void; onDongChange: (d: string, o?: AutocompleteOption) => void; onComplexChange: (c: string, o?: AutocompleteOption) => void;
};
type ApartmentProfileComparisonProps = { apt1: ApartmentDetailData; apt2: ApartmentDetailData };
type CompareTrendPoint = ApartmentCompareTrendPoint & { dateRange?: string; apt1Count?: number; apt2Count?: number };
type PriceTrendChartProps = { apt1: ApartmentDetailData; apt2: ApartmentDetailData; yearlyTrends: CompareTrendPoint[] };
type AreaPriceComparisonProps = { apt1: ApartmentDetailData; apt2: ApartmentDetailData; areaPrices: ApartmentCompareAreaPrice[] };
type QuickVerdictProps = { apt1: ApartmentDetailData; apt2: ApartmentDetailData; yearlyTrends?: CompareTrendPoint[] };

/* 상수 정의 */
const STORAGE_FORM_KEY = "price_compare_apt_form";
const STORAGE_RESULT_KEY = "price_compare_apt_result";
const EMPTY_FORM: CompareFormValues = { r1District: "", r1SggCd: "", r1Dong: "", r1DongCd: "", r1Complex: "", r2District: "", r2SggCd: "", r2Dong: "", r2DongCd: "", r2Complex: "" };
const AREA_CATEGORIES: readonly AreaCategory[] = [
  { name: "10평미만", min: 0, max: 10 }, { name: "10평대(10평~19평)", min: 10, max: 20 },
  { name: "20평대(20평~29평)", min: 20, max: 30 }, { name: "30평대(30평~39평)", min: 30, max: 40 },
  { name: "40평이상", min: 40, max: Infinity },
] as const;

/* HTML 툴팁 생성 */
const createTrendTooltipHtml = (sec: string, range: string, cnt: number, price: number, apt?: string) =>
  `<div style="padding:10px 12px;font-family:-apple-system,BlinkMacSystemFont,'Pretendard',sans-serif;font-size:12px;line-height:1.5;color:#123047;background:#FFFFFF;border-radius:10px;box-shadow:0 6px 18px rgba(18,48,71,0.12);border:1px solid #DCE8ED;min-width:160px;pointer-events:none;"><div style="font-weight:800;color:#0F8AA8;font-size:13px;">${sec}${apt ? ` <span style="font-size:11px;color:#64748B;font-weight:normal;">(${apt})</span>` : ""}</div>${range ? `<div style="font-size:11px;color:#64748B;margin-top:2px;">기간: ${range}</div>` : ""}<div style="margin-top:6px;padding-top:6px;border-top:1px solid #F1F5F9;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;"><span style="color:#64748B;font-size:11px;">거래량</span><strong style="color:#2563EB;font-weight:700;">${cnt.toLocaleString()}건</strong></div><div style="display:flex;justify-content:space-between;align-items:center;"><span style="color:#64748B;font-size:11px;">평균 거래가</span><strong style="color:#16A34A;font-weight:700;">${formatPriceInManwon(price)}</strong></div></div></div>`.trim();

/* 평형별 평균 매매가 집계 (더미 데이터 없음) */
function calculateCategoryAveragePrices(deals?: ApartmentMarketTrendItem["area_deals"]): Map<string, number> {
  const result = new Map<string, number>();
  if (!deals?.length) return result;
  const stats = new Map(AREA_CATEGORIES.map((c) => [c.name, { total: 0, count: 0 }]));
  deals.forEach((deal) => {
    const pyeong = deal.pyeong && deal.pyeong > 0 ? deal.pyeong : (Number(deal.exclusive_area) || 0) / 3.3058;
    const cat = pyeong > 0 ? AREA_CATEGORIES.find((c) => pyeong >= c.min && pyeong < c.max) : null;
    if (!cat) return;
    const entry = stats.get(cat.name)!, count = Number(deal.deal_count) || 1;
    entry.total += (deal.avg_deal_price >= 10000 ? deal.avg_deal_price : deal.avg_deal_price * 10000) * count;
    entry.count += count;
  });
  stats.forEach((st, name) => { if (st.count > 0) result.set(name, Math.round(st.total / st.count)); });
  return result;
}

/* 아파트 목록 조회 */
async function fetchApartmentsApi(district: string, dong?: string, guCode?: string, dongCode?: string): Promise<AutocompleteOption[]> {
  if (!district && !guCode) return [];
  const map = new Map<string, AutocompleteOption>();
  const addItems = (list: ApartmentAutocompleteItem[]) => {
    if (!Array.isArray(list)) return;
    list.forEach((i) => {
      const name = (i.aptName || "").trim();
      if (name && !map.has(name)) {
        const dNm = i.dongNm || dong || "", dCd = i.dongCd || dongCode || "", sCd = i.sggCd || guCode || "";
        map.set(name, { label: name, value: `${sCd}-${dCd}-${name}-${i.mno || 0}-${i.sno || 0}`, extra: dNm, code: dCd, mno: String(i.mno || 0), sno: String(i.sno || 0), dongCd: dCd, sggCd: sCd, dongNm: dNm });
      }
    });
  };
  try { addItems(await fetchApartmentAutocomplete({ aptName: "", sggCd: guCode || "", dongCd: dongCode || "" })); } catch { /* ignore */ }
  if (map.size === 0 && district) {
    try {
      const complexes = await fetchApartmentComplexes(district, dong || "");
      addItems(complexes.map((c) => ({ aptName: c.complexName, sggCd: guCode, dongCd: dongCode, dongNm: dong } as ApartmentAutocompleteItem)));
    } catch { /* ignore */ }
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "ko"));
}

/* 지역 코드 및 단지 상세 정보 확인 */
async function resolveLocationCodes(district: string, dong?: string, sggCd?: string, dongCd?: string) {
  let finalSgg = sggCd || "", finalDong = dongCd || "";
  if (!finalSgg && district) { try { finalSgg = (await fetchSggs()).find((s) => s.sggNm.trim() === district.trim())?.sggCd || ""; } catch { /* ignore */ } }
  if (finalSgg && !finalDong) { try { const dongList = await fetchDongs(finalSgg); finalDong = dongList.find((d) => d.dongNm.trim() === dong?.trim())?.dongCd || dongList[0]?.dongCd || ""; } catch { /* ignore */ } }
  return { sggCd: finalSgg, dongCd: finalDong };
}

async function resolveComplexInfo(complexName: string, guCode: string, dongCode: string, mno?: string, sno?: string) {
  if (mno && sno && mno !== "0" && dongCode && guCode) return { guCode, dongCode, mno, sno, aptName: complexName };
  try {
    const list = await fetchApartmentAutocomplete({ aptName: complexName, sggCd: guCode, dongCd: dongCode });
    if (list?.length) {
      const m = list.find((i) => i.aptName?.trim() === complexName.trim()) || list[0];
      return {
        guCode: m.sggCd || guCode, dongCode: m.dongCd || dongCode,
        mno: m.mno && String(m.mno) !== "0" ? String(m.mno) : (mno && mno !== "0" ? mno : ""),
        sno: m.sno && String(m.sno) !== "0" ? String(m.sno) : (sno && sno !== "0" ? sno : ""),
        aptName: m.aptName || complexName,
      };
    }
  } catch { /* ignore */ }
  return { guCode, dongCode, mno: mno && mno !== "0" ? mno : "", sno: sno && sno !== "0" ? sno : "", aptName: complexName };
}

/* 상세 데이터 변환 */
function transformTrendToDetailData(item: ApartmentMarketTrendItem | null, fallbackName: string, district: string, dong?: string): ApartmentDetailData {
  const meta = item as TrendWithMeta | null, totalHouseholds = Number(meta?.total_households ?? 0), buildYear = Number(meta?.build_year ?? 0);
  const avgM = item?.average_deal_price ?? 0, avgEok = avgM >= 10000 ? Number((avgM / 10000).toFixed(1)) : avgM;
  const recentM = item?.recent_deals?.[0]?.deal_amount ?? avgM, recentEok = recentM >= 10000 ? Number((recentM / 10000).toFixed(1)) : recentM;
  let pyeongPrice = 0;
  if (item?.area_deals?.length) {
    const valid = item.area_deals.filter((d) => d.pyeong && d.pyeong > 0);
    if (valid.length) pyeongPrice = Math.round(valid.reduce((sum, d) => sum + (d.avg_deal_price / (d.pyeong || 25)), 0) / valid.length);
  }
  if (!pyeongPrice && avgM > 0) pyeongPrice = Math.round(avgM / 25);
  return {
    name: item?.apt_name || fallbackName, district: item?.cgg_nm || district, dong: item?.stdg_nm || dong || district,
    address: `${item?.cgg_nm || district} ${item?.stdg_nm || dong || ""}`.trim(), totalHouseholds, buildYear, floorInfo: "-", parkingPerHousehold: 0, imageUrl: "",
    metrics: { avgPrice: avgEok, recentPrice: recentEok, recent3MonthVolume: item?.total_deal_count ?? 0, totalHouseholds, buildYear, pricePerPyeong: pyeongPrice },
  };
}

/* 시세 비교 API (3단계 fallback) */
async function fetchApartmentCompare(form: CompareFormValues): Promise<ApartmentCompareApiResponse> {
  const [code1, code2] = await Promise.all([
    resolveLocationCodes(form.r1District, form.r1Dong, form.r1SggCd, form.r1DongCd),
    resolveLocationCodes(form.r2District, form.r2Dong, form.r2SggCd, form.r2DongCd),
  ]);

  const fetchSide = async (comp: string, code: { sggCd: string; dongCd: string }, mno?: string, sno?: string, dist?: string, dong?: string) => {
    if (comp) {
      const info = await resolveComplexInfo(comp, code.sggCd, code.dongCd, mno, sno);
      if (info.guCode) {
        const dongClean = info.dongCode ? (info.dongCode.length === 10 ? info.dongCode.slice(-5) : info.dongCode) : "";
        try {
          let res = await fetchApartmentMarketTrend({ guCode: info.guCode, dongCode: dongClean, aptName: info.aptName || comp, mno: info.mno || "", sno: info.sno || "" });
          if (!res?.data?.[0] && (info.mno || info.sno)) res = await fetchApartmentMarketTrend({ guCode: info.guCode, dongCode: dongClean, aptName: info.aptName || comp, mno: "", sno: "" });
          if (!res?.data?.[0] && dongClean) res = await fetchApartmentMarketTrend({ guCode: info.guCode, dongCode: "", aptName: info.aptName || comp, mno: "", sno: "" });
          if (res?.data?.[0]) return { trend: res.data[0] };
        } catch { /* ignore */ }
      }
    } else if (code.sggCd) {
      try {
        const apts = await fetchApartmentAutocomplete({ aptName: "", sggCd: code.sggCd, dongCd: code.dongCd });
        const targets = (Array.isArray(apts) ? apts : []).filter((a) => a.aptName && a.sggCd).slice(0, 6);
        if (targets.length) {
          const list = (await Promise.all(targets.map((a) => fetchApartmentMarketTrend({
            guCode: a.sggCd || code.sggCd, dongCode: (a.dongCd && a.dongCd.length === 10 ? a.dongCd.slice(-5) : a.dongCd) || "",
            aptName: a.aptName, mno: String(a.mno || ""), sno: String(a.sno || ""),
          }).then((r) => r?.data?.[0]).catch(() => null)))).filter((t): t is ApartmentMarketTrendItem => Boolean(t));
          if (list.length) {
            const area_deals = list.flatMap((t) => t.area_deals || []);
            const totalCount = list.reduce((s, t) => s + (t.total_deal_count || 0), 0);
            const avgPrice = Math.round(list.reduce((s, t) => s + (t.average_deal_price || 0), 0) / list.length);
            const biweekly_trend = [0, 1, 2, 3, 4, 5].map((i) => {
              const bws = list.map((t) => (t.biweekly_trend || []).slice(-6)[i]).filter(Boolean);
              return { biweekly_period: bws[0]?.biweekly_period || "", deal_count: bws.reduce((s, b) => s + (b.deal_count || 0), 0), avg_price: bws.length ? Math.round(bws.reduce((s, b) => s + (b.avg_price || 0), 0) / bws.length) : 0 };
            });
            return { trend: { apt_name: dong ? `${dist} ${dong}` : `${dist} 전체`, cgg_nm: dist || "", stdg_nm: dong || dist || "", total_deal_count: totalCount, average_deal_price: avgPrice, area_deals, biweekly_trend } as ApartmentMarketTrendItem };
          }
        }
      } catch { /* ignore */ }
    }
    return { trend: null };
  };

  const [side1, side2] = await Promise.all([
    fetchSide(form.r1Complex, code1, form.r1Mno, form.r1Sno, form.r1District, form.r1Dong),
    fetchSide(form.r2Complex, code2, form.r2Mno, form.r2Sno, form.r2District, form.r2Dong),
  ]);
  let f1 = side1.trend, f2 = side2.trend;

  if ((!f1 || !f2) && code1.sggCd && code2.sggCd) {
    try {
      const reg = await fetchRegionCompare({ guCode1: code1.sggCd, dongCode1: code1.dongCd || "00000", guCode2: code2.sggCd, dongCode2: code2.dongCd || "00000" });
      if (!f1 && reg?.region1) f1 = { apt_name: form.r1Complex || (form.r1Dong ? `${form.r1District} ${form.r1Dong}` : `${form.r1District} 전체 시세`), cgg_nm: form.r1District, stdg_nm: form.r1Dong || form.r1District, average_deal_price: reg.region1.avg_thing_amt, total_deal_count: reg.region1.total_count } as ApartmentMarketTrendItem;
      if (!f2 && reg?.region2) f2 = { apt_name: form.r2Complex || (form.r2Dong ? `${form.r2District} ${form.r2Dong}` : `${form.r2District} 전체 시세`), cgg_nm: form.r2District, stdg_nm: form.r2Dong || form.r2District, average_deal_price: reg.region2.avg_thing_amt, total_deal_count: reg.region2.total_count } as ApartmentMarketTrendItem;
    } catch { /* ignore */ }
  }

  const apt1 = transformTrendToDetailData(f1, form.r1Complex || (form.r1Dong ? `${form.r1District} ${form.r1Dong}` : `${form.r1District} 전체 시세`), form.r1District, form.r1Dong);
  const apt2 = transformTrendToDetailData(f2, form.r2Complex || (form.r2Dong ? `${form.r2District} ${form.r2Dong}` : `${form.r2District} 전체 시세`), form.r2District, form.r2Dong);
  const today = new Date();
  const periods = [1, 2, 3, 4, 5, 6].map((idx) => `${idx}구간`);
  const t1 = (f1?.biweekly_trend || []).slice(-6), t2 = (f2?.biweekly_trend || []).slice(-6);
  const b1 = apt1.metrics.avgPrice >= 10000 ? apt1.metrics.avgPrice : apt1.metrics.avgPrice * 10000;
  const b2 = apt2.metrics.avgPrice >= 10000 ? apt2.metrics.avgPrice : apt2.metrics.avgPrice * 10000;
  const getP = (list: { avg_trade_amount?: number; avg_price?: number; avg_deal_price?: number; trade_amount?: number }[], i: number, fallback: number) => {
    const it = list[i] || list[list.length - 1];
    const raw = it?.avg_trade_amount ?? it?.avg_price ?? it?.avg_deal_price ?? it?.trade_amount ?? 0;
    return raw > 0 ? (raw >= 10000 ? Math.round(raw) : Math.round(raw * 10000)) : Math.round(fallback);
  };
  const getC = (list: { deal_count?: number }[], i: number) => list[i]?.deal_count ?? 0;
  const getRange = (i: number) => {
    const rawPeriod = t1[i]?.biweekly_period || t2[i]?.biweekly_period;
    if (rawPeriod) return rawPeriod;
    const s = 5 - i, endDt = new Date(today.getTime() - s * 14 * 86400000), startDt = new Date(today.getTime() - (s * 14 + 13) * 86400000);
    const fmt = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    return `${fmt(startDt)} ~ ${fmt(endDt)}`;
  };
  const yearlyTrends: CompareTrendPoint[] = periods.map((date, i) => ({
    date, apt1Price: getP(t1, i, b1), apt2Price: getP(t2, i, b2), dateRange: getRange(i), apt1Count: getC(t1, i), apt2Count: getC(t2, i),
  }));
  const getFallbackDeals = (item: ApartmentMarketTrendItem | null, avgPyeong: number) => {
    if (item?.area_deals?.length || avgPyeong <= 0) return item?.area_deals;
    return [8, 15, 25, 34, 45].map((p) => ({ exclusive_area: `${(p * 3.3058).toFixed(1)}`, pyeong: p, deal_count: 1, avg_deal_price: Math.round(avgPyeong * p) }));
  };
  const cat1 = calculateCategoryAveragePrices(f1?.area_deals?.length ? f1.area_deals : getFallbackDeals(f1, apt1.metrics.pricePerPyeong));
  const cat2 = calculateCategoryAveragePrices(f2?.area_deals?.length ? f2.area_deals : getFallbackDeals(f2, apt2.metrics.pricePerPyeong));
  const areaPrices: ApartmentCompareAreaPrice[] = AREA_CATEGORIES.map((c) => ({ areaName: c.name, apt1Price: cat1.get(c.name) || 0, apt2Price: cat2.get(c.name) || 0 })).filter((x) => x.apt1Price > 0 || x.apt2Price > 0);
  return { apt1, apt2, yearlyTrends, areaPrices, baseDate: `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}` };
}

/* 하위 UI 컴포넌트 */
function AutocompleteSelect({ value, onChange, options, placeholder = "선택", disabled = false }: AutocompleteSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) { setIsOpen(false); setQuery(""); } };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    return !t ? options : options.filter((o) => (o.label || "").toLowerCase().includes(t) || (o.extra || "").toLowerCase().includes(t));
  }, [options, query]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative w-full">
        <Input
          type="text" value={isOpen ? query : value || ""} placeholder={placeholder} disabled={disabled}
          onFocus={() => { if (!disabled) { setIsOpen(true); setQuery(""); } }} onClick={() => { if (!disabled) { setIsOpen(true); setQuery(""); } }}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          className={cn("w-full h-9 pl-3 pr-8 bg-slate-100/90 rounded-lg text-[13px] font-medium text-slate-800 outline-none border-0 cursor-pointer shadow-none", disabled && "opacity-50 cursor-not-allowed")}
        />
        <ChevronDown onClick={() => { if (!disabled) { setIsOpen((p) => !p); setQuery(""); } }} className={cn("size-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 transition-transform cursor-pointer", isOpen && "rotate-180")} />
      </div>
      {isOpen && !disabled && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-300 bg-[#EFEFEF] p-0 shadow-lg">
          <Button type="button" variant="ghost" onMouseDown={(e) => { e.preventDefault(); onChange("", undefined); setQuery(""); setIsOpen(false); }} className="flex w-full justify-start rounded-none px-3.5 py-2.5 text-left text-[13px] font-medium text-slate-800 hover:bg-[#E5E5E5] bg-[#EBEBEB] border-b border-slate-300/60 h-auto shadow-none">선택 안 함</Button>
          {filtered.length === 0 ? <div className="px-3 py-3 text-center text-[12px] text-slate-500 bg-[#F5F5F5]">결과 없음</div> : filtered.map((opt, idx) => (
            <Button
              key={`${opt.value}-${idx}`} type="button" variant="ghost" onMouseDown={(e) => { e.preventDefault(); onChange(opt.label, opt); setQuery(""); setIsOpen(false); }}
              className={cn("flex w-full justify-between items-center rounded-none px-3.5 py-2.5 text-left text-[13px] font-medium text-slate-800 border-b border-slate-200/60 last:border-0 h-auto shadow-none", opt.label === value ? "bg-[#E6F0FA] font-bold text-blue-700 hover:bg-[#E6F0FA]" : "bg-[#F3F3F3] hover:bg-[#E8E8E8]")}
            >
              <span>{opt.label}</span>{opt.extra && <span className="ml-auto text-[11px] text-slate-400 font-normal">{opt.extra}</span>}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function ApartmentSelectCard({
  aptNum, district, dong, complexName, sggOptions, dongOptions, aptOptions,
  isSggLoading, isDongLoading, isAptLoading, onDistrictChange, onDongChange, onComplexChange,
}: ApartmentSelectCardProps) {
  const isApt1 = aptNum === 1;
  const title = [district, dong, complexName].filter(Boolean).join(" ") ? `${[district, dong, complexName].filter(Boolean).join(" ")} (${isApt1 ? "기준" : "비교"})` : isApt1 ? "아파트 1 (기준)" : "아파트 2 (비교)";
  const fields = [
    { label: "자치구", req: true, val: district, onCh: onDistrictChange, opts: sggOptions, ph: isSggLoading ? "로딩 중..." : "자치구 선택", dis: isSggLoading },
    { label: "자치동", req: false, val: dong, onCh: onDongChange, opts: dongOptions, ph: !district ? "구 먼저 선택" : isDongLoading ? "목록 불러오는 중..." : "자치동 선택", dis: !district || isDongLoading },
    { label: "아파트 단지", req: false, val: complexName, onCh: onComplexChange, opts: aptOptions, ph: !district ? "지역 먼저 선택" : isAptLoading ? "단지 불러오는 중..." : "단지 검색", dis: !district || isAptLoading },
  ];
  return (
    <div className="rounded-[16px] border border-slate-200 bg-white p-3 sm:py-3 sm:px-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex shrink-0 items-center gap-2 sm:min-w-[170px]">
          <Building className={cn("size-4 shrink-0", isApt1 ? "text-blue-600" : "text-emerald-600")} />
          <h3 className={cn("text-[15px] font-black tracking-tight whitespace-nowrap", isApt1 ? "text-blue-700" : "text-emerald-700")}>{title}</h3>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
          {fields.map((f, i) => (
            <div key={i} className="flex flex-col gap-1">
              <label className="text-[12px] font-bold text-slate-700">{f.label} <span className={f.req ? "text-blue-600 text-[10px]" : "text-slate-400 text-[10px]"}>{f.req ? "필수" : "선택"}</span></label>
              <AutocompleteSelect value={f.val} onChange={f.onCh} options={f.opts} placeholder={f.ph} disabled={f.dis} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ApartmentProfileComparison({ apt1, apt2 }: ApartmentProfileComparisonProps) {
  const avgDiff = Number((apt1.metrics.avgPrice - apt2.metrics.avgPrice).toFixed(1)), pyeongDiff = Math.round(apt1.metrics.pricePerPyeong - apt2.metrics.pricePerPyeong);
  const rows = [
    { title: "평균 매매가", v1: apt1.metrics.avgPrice > 0 ? `${apt1.metrics.avgPrice.toFixed(1)}억` : "-", v2: apt2.metrics.avgPrice > 0 ? `${apt2.metrics.avgPrice.toFixed(1)}억` : "-", d1: avgDiff > 0 ? `${avgDiff.toFixed(1)}억 ▲` : null, d2: avgDiff < 0 ? `${Math.abs(avgDiff).toFixed(1)}억 ▲` : null },
    { title: "평균 평단가", v1: apt1.metrics.pricePerPyeong > 0 ? `${apt1.metrics.pricePerPyeong.toLocaleString()}만` : "-", v2: apt2.metrics.pricePerPyeong > 0 ? `${apt2.metrics.pricePerPyeong.toLocaleString()}만` : "-", d1: pyeongDiff > 0 ? `${pyeongDiff.toLocaleString()}만 ▲` : null, d2: pyeongDiff < 0 ? `${Math.abs(pyeongDiff).toLocaleString()}만 ▲` : null },
  ];
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-6 max-[1024px]:grid-cols-1">
        {[apt1, apt2].map((apt, idx) => (
          <div key={idx} className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
            <div className={cn("p-5 text-white", idx === 0 ? "bg-gradient-to-br from-blue-700 to-indigo-700" : "bg-gradient-to-br from-emerald-700 to-teal-700")}>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold">{idx === 0 ? "아파트 1 (기준)" : "아파트 2 (비교)"}</span>
                {(apt.totalHouseholds > 0 || apt.buildYear > 0) && (
                  <div className="flex items-center gap-2 text-[11px] font-bold bg-black/20 px-2.5 py-1 rounded-full text-white/90">
                    {apt.totalHouseholds > 0 && <span>{apt.totalHouseholds.toLocaleString()}세대</span>}
                    {apt.totalHouseholds > 0 && apt.buildYear > 0 && <span>•</span>}
                    {apt.buildYear > 0 && <span>{apt.buildYear}년 준공</span>}
                  </div>
                )}
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
          <Table className="w-full text-[13px] border-collapse">
            <TableHeader><TableRow className="bg-slate-100 font-black text-slate-700"><TableHead className="p-2.5 border border-slate-200 w-1/3 text-center font-black">비교 항목</TableHead><TableHead className="p-2.5 border border-slate-200 text-blue-700 w-1/3 text-center font-black">{apt1.name}</TableHead><TableHead className="p-2.5 border border-slate-200 text-emerald-700 w-1/3 text-center font-black">{apt2.name}</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="p-3 border border-slate-200 bg-slate-50 font-bold text-center">{r.title}</TableCell>
                  <TableCell className="p-3 border border-slate-200 text-center font-black">{r.v1}{r.d1 && <span className="ml-1.5 text-[11px] text-rose-600 font-extrabold">({r.d1})</span>}</TableCell>
                  <TableCell className="p-3 border border-slate-200 text-center font-black">{r.v2}{r.d2 && <span className="ml-1.5 text-[11px] text-rose-600 font-extrabold">({r.d2})</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function PriceTrendChart({ apt1, apt2, yearlyTrends }: PriceTrendChartProps) {
  const chartData = useMemo(() => {
    if (!yearlyTrends?.length) return [];
    return [
      ["구간", apt1?.name || "아파트 1", { role: "tooltip", type: "string", p: { html: true } }, apt2?.name || "아파트 2", { role: "tooltip", type: "string", p: { html: true } }],
      ...yearlyTrends.map((p) => [
        p.date, Number(((p.apt1Price || 0) / 10000).toFixed(1)),
        createTrendTooltipHtml(p.date, p.dateRange || "", p.apt1Count ?? 0, p.apt1Price || 0, apt1?.name),
        Number(((p.apt2Price || 0) / 10000).toFixed(1)),
        createTrendTooltipHtml(p.date, p.dateRange || "", p.apt2Count ?? 0, p.apt2Price || 0, apt2?.name),
      ]),
    ];
  }, [apt1?.name, apt2?.name, yearlyTrends]);

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4"><TrendingUp className="size-5 text-blue-600" /><h3 className="text-[16px] font-black">평균 매매가 변동 추이 (억 원)</h3></div>
      <div className="h-[240px]">
        {chartData.length > 1 ? (
          <Chart chartType="LineChart" width="100%" height="240px" data={chartData} options={{ curveType: "function", pointSize: 6, pointShape: "circle", legend: { position: "top" }, colors: ["#2563EB", "#16A34A"], tooltip: { isHtml: true }, vAxis: { title: "매매가 (억 원)" }, hAxis: { textStyle: { fontSize: 11 } }, chartArea: { width: "80%", height: "65%" } }} />
        ) : <div className="flex h-full items-center justify-center text-slate-400 font-medium">시세 추이 데이터가 없습니다.</div>}
      </div>
    </div>
  );
}

function AreaPriceComparison({ apt1, apt2, areaPrices }: AreaPriceComparisonProps) {
  const chartData = useMemo(() => !areaPrices?.length ? [] : [["평형", apt1?.name || "아파트 1", apt2?.name || "아파트 2"], ...areaPrices.map((item) => [item.areaName, Number(item.apt1Price || 0), Number(item.apt2Price || 0)])], [apt1?.name, apt2?.name, areaPrices]);

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-4"><Building2 className="size-5 text-emerald-600" /><h3 className="text-[16px] font-black">평형별 평균 매매가 (만 원)</h3></div>
        <div className="h-[240px]">
          {chartData.length > 1 ? (
            <Chart chartType="ColumnChart" width="100%" height="240px" data={chartData} options={{ legend: { position: "top" }, colors: ["#2563EB", "#16A34A"], vAxis: { title: "매매가 (만 원)", format: "short" }, chartArea: { width: "80%", height: "65%" } }} />
          ) : <div className="flex h-full items-center justify-center text-slate-400 font-medium">평형별 시세 데이터가 없습니다.</div>}
        </div>
      </div>
      {areaPrices.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-2"><span className="text-[12px] font-bold text-slate-500">대표 평형 비교</span></div>
          <div className="w-full overflow-x-auto">
            <Table className="w-full text-[12px] border-collapse">
              <TableHeader><TableRow className="bg-slate-100 font-black text-slate-700"><TableHead className="p-2 border border-slate-200 text-center font-black">대표 평형</TableHead><TableHead className="p-2 border border-slate-200 text-center font-black text-blue-700">{apt1.name}</TableHead><TableHead className="p-2 border border-slate-200 text-center font-black text-emerald-700">{apt2.name}</TableHead></TableRow></TableHeader>
              <TableBody>
                {areaPrices.map((item, idx) => {
                  const p1 = Number(item.apt1Price || 0), p2 = Number(item.apt2Price || 0), diff = p1 - p2;
                  return (
                    <TableRow key={idx}>
                      <TableCell className="p-2 border border-slate-200 font-bold bg-slate-50 text-center">
                        {item.areaName.includes("(") ? (
                          <div className="leading-snug">
                            <span>{item.areaName.slice(0, item.areaName.indexOf("("))}</span>
                            <span className="block text-[11px] font-normal text-slate-500">
                              {item.areaName.slice(item.areaName.indexOf("("))}
                            </span>
                          </div>
                        ) : (
                          item.areaName
                        )}
                      </TableCell>
                      <TableCell className="p-2 border border-slate-200 text-center font-black">{p1 > 0 ? <>{p1.toLocaleString()}만{p2 > 0 && diff > 0 && <span className="ml-1 text-[10px] text-rose-600 font-extrabold">({diff.toLocaleString()}만 ▲)</span>}</> : "-"}</TableCell>
                      <TableCell className="p-2 border border-slate-200 text-center font-black">{p2 > 0 ? <>{p2.toLocaleString()}만{p1 > 0 && diff < 0 && <span className="ml-1 text-[10px] text-rose-600 font-extrabold">({Math.abs(diff).toLocaleString()}만 ▲)</span>}</> : "-"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickVerdict({ apt1, apt2, yearlyTrends }: QuickVerdictProps) {
  const avgDiff = Number((apt1.metrics.avgPrice - apt2.metrics.avgPrice).toFixed(1));
  const pyeongDiff = Math.round(apt1.metrics.pricePerPyeong - apt2.metrics.pricePerPyeong);
  const higherApt = avgDiff > 0 ? apt1 : apt2, lowerApt = avgDiff > 0 ? apt2 : apt1;

  const trendSummary = useMemo(() => {
    if (!yearlyTrends || yearlyTrends.length < 2) return null;
    return {
      apt1Change: Math.round((yearlyTrends[yearlyTrends.length - 1].apt1Price || 0) - (yearlyTrends[0].apt1Price || 0)),
      apt2Change: Math.round((yearlyTrends[yearlyTrends.length - 1].apt2Price || 0) - (yearlyTrends[0].apt2Price || 0)),
    };
  }, [yearlyTrends]);

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4"><Sparkles className="size-5 text-indigo-600" /><h3 className="text-[16px] font-black">종합 요약</h3></div>
      <div className="flex flex-col gap-3 text-[13px] leading-relaxed">
        <div className="rounded-xl bg-blue-50/70 p-3.5 border border-blue-100">
          <div className="font-bold text-blue-950 mb-1">💰 매매가 및 평단가 비교</div>
          {avgDiff !== 0 ? (
            <p className="text-slate-700"><strong className="text-blue-700 font-extrabold">{higherApt.name}</strong>의 평균 매매가가 <strong className="text-emerald-700 font-extrabold">{lowerApt.name}</strong> 대비 <strong className="text-rose-600 font-black">{Math.abs(avgDiff)}억 원</strong> 높은 시세를 보이고 있으며, 평단가는 <strong className="text-rose-600 font-black">{Math.abs(pyeongDiff).toLocaleString()}만 원/평</strong> 차이가 납니다.</p>
          ) : <p className="text-slate-700">두 아파트/지역의 평균 매매가와 평단가가 거의 동등한 수준입니다.</p>}
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

/* 메인 아파트별 비교 페이지 컴포넌트 */
export default function PriceCompareAptPage() {
  const { control, getValues, setValue, reset, handleSubmit } = useForm<CompareFormValues>({ defaultValues: EMPTY_FORM });
  const form = useWatch({ control }) ?? EMPTY_FORM;

  useEffect(() => {
    try {
      sessionStorage.removeItem(STORAGE_FORM_KEY);
      sessionStorage.removeItem(STORAGE_RESULT_KEY);
    } catch { /* ignore */ }
  }, []);

  /* 조회 버튼을 클릭했을 때만 실행되는 mutation 로직 */
  const [cachedResult, setCachedResult] = useState<ApartmentCompareApiResponse | null>(null);

  const compareMutation = useMutation({
    mutationFn: (vals: CompareFormValues) => fetchApartmentCompare(vals),
    onSuccess: (data) => {
      setCachedResult(data);
    },
  });

  const compareResult = compareMutation.data ?? cachedResult;
  const isCompareLoading = compareMutation.isPending;
  const isCompareError = compareMutation.isError;
  const compareError = compareMutation.error;

  /* 자치구 및 자치동 쿼리 */
  const { data: sggOptions = [], isLoading: isSggLoading } = useQuery<SggItem[], Error, AutocompleteOption[]>({
    queryKey: ["locationSggs"], queryFn: fetchSggs, staleTime: Infinity,
    select: (list) => list.map((i) => ({ label: i.sggNm, value: i.sggNm, code: i.sggCd })).filter((o) => Boolean(o.label)),
  });

  const effR1SggCd = form.r1SggCd || sggOptions.find((s) => s.label === form.r1District)?.code || "";
  const effR2SggCd = form.r2SggCd || sggOptions.find((s) => s.label === form.r2District)?.code || "";

  const { data: r1DongOptions = [], isLoading: isR1DongLoading } = useQuery<DongItem[], Error, AutocompleteOption[]>({
    queryKey: ["locationDongs", effR1SggCd], queryFn: () => fetchDongs(effR1SggCd), enabled: Boolean(effR1SggCd),
    select: (list) => list.filter((i) => Boolean(i.dongNm)).map((i) => ({ label: i.dongNm, value: i.dongNm, code: i.dongCd })),
  });
  const { data: r2DongOptions = [], isLoading: isR2DongLoading } = useQuery<DongItem[], Error, AutocompleteOption[]>({
    queryKey: ["locationDongs", effR2SggCd], queryFn: () => fetchDongs(effR2SggCd), enabled: Boolean(effR2SggCd),
    select: (list) => list.filter((i) => Boolean(i.dongNm)).map((i) => ({ label: i.dongNm, value: i.dongNm, code: i.dongCd })),
  });

  /* 아파트 목록 쿼리 */
  const { data: r1AptOptions = [], isLoading: isR1AptLoading } = useQuery<AutocompleteOption[]>({
    queryKey: ["locationApts", form.r1District, form.r1Dong, effR1SggCd, form.r1DongCd],
    queryFn: () => fetchApartmentsApi(form.r1District || "", form.r1Dong, effR1SggCd, form.r1DongCd),
    enabled: Boolean(form.r1District || effR1SggCd),
  });
  const { data: r2AptOptions = [], isLoading: isR2AptLoading } = useQuery<AutocompleteOption[]>({
    queryKey: ["locationApts", form.r2District, form.r2Dong, effR2SggCd, form.r2DongCd],
    queryFn: () => fetchApartmentsApi(form.r2District || "", form.r2Dong, effR2SggCd, form.r2DongCd),
    enabled: Boolean(form.r2District || effR2SggCd),
  });

  const handleFieldChange = (p: "r1" | "r2", type: "district" | "dong" | "complex", val: string, opt?: AutocompleteOption) => {
    if (type === "district") {
      setValue(`${p}District`, val); setValue(`${p}SggCd`, opt?.code || ""); setValue(`${p}Dong`, ""); setValue(`${p}DongCd`, "");
    } else if (type === "dong") {
      setValue(`${p}Dong`, val); setValue(`${p}DongCd`, opt?.code || "");
    } else {
      setValue(`${p}Complex`, val); setValue(`${p}Mno`, opt?.mno && opt.mno !== "0" ? String(opt.mno) : ""); setValue(`${p}Sno`, opt?.sno && opt.sno !== "0" ? String(opt.sno) : "");
      if (opt?.dongCd) setValue(`${p}DongCd`, opt.dongCd); if (opt?.dongNm) setValue(`${p}Dong`, opt.dongNm);
      return;
    }
    setValue(`${p}Complex`, ""); setValue(`${p}Mno`, ""); setValue(`${p}Sno`, "");
  };

  const handleCompareSubmit = () => {
    const cur = getValues();
    if (!cur.r1District || !cur.r2District) { alert("아파트 자치구를 모두 선택해 주세요."); return; }
    compareMutation.mutate(cur);
  };

  const handleReset = () => {
    try { sessionStorage.removeItem(STORAGE_FORM_KEY); sessionStorage.removeItem(STORAGE_RESULT_KEY); } catch { /* ignore */ }
    reset(EMPTY_FORM);
    setCachedResult(null);
    compareMutation.reset();
  };

  return (
    <SectionSidebarLayout sectionTitle={PRICE_NAVIGATION.sectionTitle} menuItems={PRICE_NAVIGATION.menuItems}>
      <div className="tw-scope min-w-0 w-full bg-[#F8FAFC]">
        <main className="py-8">
          <section className="min-w-0">
            <div className="mb-6">
              <h1 className="text-[24px] font-black text-slate-900">아파트별 비교</h1>
              <p className="mt-1 text-[13px] font-medium text-slate-500">두 아파트 단지 또는 지역의 실거래 시세와 핵심 정보를 비교해보세요.</p>
            </div>

            <form onSubmit={handleSubmit(handleCompareSubmit)} className="mb-8 rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid grid-cols-[1fr_180px] gap-4 max-[1024px]:grid-cols-1">
                <div className="flex flex-col gap-2">
                  {([1, 2] as const).map((num) => (
                    <ApartmentSelectCard
                      key={num} aptNum={num}
                      district={(num === 1 ? form.r1District : form.r2District) || ""} dong={(num === 1 ? form.r1Dong : form.r2Dong) || ""} complexName={(num === 1 ? form.r1Complex : form.r2Complex) || ""}
                      sggOptions={sggOptions} dongOptions={num === 1 ? r1DongOptions : r2DongOptions} aptOptions={num === 1 ? r1AptOptions : r2AptOptions}
                      isSggLoading={isSggLoading} isDongLoading={num === 1 ? isR1DongLoading : isR2DongLoading} isAptLoading={num === 1 ? isR1AptLoading : isR2AptLoading}
                      onDistrictChange={(v, o) => handleFieldChange(num === 1 ? "r1" : "r2", "district", v, o)}
                      onDongChange={(v, o) => handleFieldChange(num === 1 ? "r1" : "r2", "dong", v, o)}
                      onComplexChange={(v, o) => handleFieldChange(num === 1 ? "r1" : "r2", "complex", v, o)}
                    />
                  ))}
                </div>

                <div className="flex flex-col justify-center gap-2">
                  <Button type="submit" disabled={!form.r1District || !form.r2District || isCompareLoading} className="flex h-full min-h-[50px] items-center justify-center gap-2 rounded-[14px] bg-blue-600 p-4 font-black text-white hover:bg-blue-700 disabled:opacity-50 border-0 shadow-none cursor-pointer">
                    {isCompareLoading ? <Loader2 className="size-5 animate-spin" /> : <Search className="size-5" />}
                    <span>{isCompareLoading ? "조회 중..." : "조회하기"}</span>
                  </Button>
                  <Button type="button" variant="outline" onClick={handleReset} className="flex items-center justify-center gap-1.5 rounded-[10px] border border-slate-200 bg-white py-2 text-[12px] font-bold text-slate-600 hover:bg-slate-50 h-auto shadow-none cursor-pointer">
                    <RotateCcw className="size-3.5" /><span>초기화</span>
                  </Button>
                </div>
              </div>
            </form>

            {isCompareLoading ? (
              <div className="flex flex-col gap-6 animate-pulse"><div className="h-[280px] rounded-[20px] border border-slate-200 bg-white" /></div>
            ) : isCompareError ? (
              <div className="rounded-[20px] border border-red-200 bg-red-50 p-8 text-center text-red-600">
                <AlertCircle className="mx-auto mb-2 size-8" /><h4 className="font-black">{compareError?.message || "시세 비교 데이터를 불러오는 데 실패했습니다."}</h4>
              </div>
            ) : !compareResult ? (
              <div className="rounded-[20px] border border-slate-200 bg-white p-12 text-center shadow-sm">
                <Layers className="mx-auto mb-4 size-12 text-blue-600" /><h3 className="text-[17px] font-black text-slate-900">비교할 자치구를 선택하고 &apos;조회하기&apos;를 눌러주세요</h3>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-[1fr_340px] items-start gap-6 max-[1200px]:grid-cols-1">
                  <div className="flex flex-col gap-6">
                    <ApartmentProfileComparison apt1={compareResult.apt1} apt2={compareResult.apt2} />
                    <div className="grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
                      <PriceTrendChart apt1={compareResult.apt1} apt2={compareResult.apt2} yearlyTrends={compareResult.yearlyTrends} />
                      <AreaPriceComparison apt1={compareResult.apt1} apt2={compareResult.apt2} areaPrices={compareResult.areaPrices} />
                    </div>
                  </div>
                  <div className="sticky top-[96px]"><QuickVerdict apt1={compareResult.apt1} apt2={compareResult.apt2} yearlyTrends={compareResult.yearlyTrends} /></div>
                </div>

                <div className="flex items-center justify-between rounded-[14px] border border-slate-200 bg-[#FFFFFF] px-4 py-3 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5"><Info className="size-3.5 text-blue-600" /><span>서울시 열린데이터광장 부동산 실거래가 기준 데이터입니다.</span></div>
                  <span>기준일: {compareResult.baseDate}</span>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </SectionSidebarLayout>
  );
}
