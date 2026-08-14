import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  HelpCircle,
  Home,
  Info,
  Loader2,
  Map,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { cn } from "../../lib/utils";
import apiMiddleware from "../../api/middleware";

/* 타입 정의 */
interface MetricResult {
  avgPrice: number;
  recentPrice: number;
  avgJeonsePrice: number;
  recentJeonsePrice: number;
}

interface CompareResponse {
  r1: MetricResult;
  r2: MetricResult;
  baseDate?: string; /* 데이터 기준일 (예: "2024.05.20") */
}

interface SelectedRegion {
  district: string;
  dong: string;
}

/* API 연동 함수 */
async function fetchSeoulRegionsApi(): Promise<Record<string, string[]>> {
  const response = await apiMiddleware.get<Record<string, string[]>>("/api/v1/regions");
  return response.data;
}

async function fetchPriceCompareApi(
  region1: SelectedRegion,
  region2: SelectedRegion,
): Promise<CompareResponse> {
  const response = await apiMiddleware.get<CompareResponse>("/api/v1/price/compare", {
    params: {
      r1Gu: region1.district,
      r1Dong: region1.dong === "전체" ? "" : region1.dong,
      r2Gu: region2.district,
      r2Dong: region2.dong === "전체" ? "" : region2.dong,
    },
  });
  return response.data;
}

/* 유틸리티 */
const formatPriceKRW = (priceInEok: number) => {
  const eok = Math.floor(priceInEok);
  const remainderMan = Math.round((priceInEok - eok) * 10000);
  if (remainderMan === 0) return `${eok}억 원`;
  return `${eok}억 ${remainderMan.toLocaleString()}만 원`;
};

/* 메인 컴포넌트 */
export default function PriceCompareListPage() {
  /* 서울시 구/동 목록 조회 */
  const {
    data: seoulGuDongs = {},
    isLoading: isRegionsLoading,
    isError: isRegionsError,
  } = useQuery({
    queryKey: ["seoulRegions"],
    queryFn: fetchSeoulRegionsApi,
    staleTime: Infinity,
  });

  const districtNames = useMemo(
    () => Object.keys(seoulGuDongs).sort((a, b) => a.localeCompare(b, "ko")),
    [seoulGuDongs],
  );

  const [r1District, setR1District] = useState("");
  const [r1Dong, setR1Dong] = useState("전체");
  const [r2District, setR2District] = useState("");
  const [r2Dong, setR2Dong] = useState("전체");

  const [appliedRegions, setAppliedRegions] = useState<{
    r1: SelectedRegion;
    r2: SelectedRegion;
  } | null>(null);

  /* 시세 비교 데이터 조회 */
  const {
    data: compareData,
    isLoading: isComparing,
    isError: isCompareError,
    refetch,
  } = useQuery({
    queryKey: [
      "priceCompare",
      appliedRegions?.r1.district,
      appliedRegions?.r1.dong,
      appliedRegions?.r2.district,
      appliedRegions?.r2.dong,
    ],
    queryFn: () => {
      if (!appliedRegions) throw new Error("비교 대상 지역이 지정되지 않았습니다.");
      return fetchPriceCompareApi(appliedRegions.r1, appliedRegions.r2);
    },
    enabled: !!appliedRegions,
    staleTime: 1000 * 60 * 5,
  });

  const r1DongOptions = useMemo(() => {
    if (!r1District || !seoulGuDongs[r1District]) return ["전체"];
    const dongs = [...seoulGuDongs[r1District]].sort((a, b) => a.localeCompare(b, "ko"));
    return ["전체", ...dongs];
  }, [seoulGuDongs, r1District]);

  const r2DongOptions = useMemo(() => {
    if (!r2District || !seoulGuDongs[r2District]) return ["전체"];
    const dongs = [...seoulGuDongs[r2District]].sort((a, b) => a.localeCompare(b, "ko"));
    return ["전체", ...dongs];
  }, [seoulGuDongs, r2District]);

  /* 이벤트 핸들러 */
  const handleR1DistrictChange = (gu: string) => {
    setR1District(gu);
    setR1Dong("전체");
  };

  const handleR2DistrictChange = (gu: string) => {
    setR2District(gu);
    setR2Dong("전체");
  };

  const handleCompare = () => {
    if (!r1District || !r2District) {
      alert("비교할 지역의 자치구를 모두 선택해 주세요.");
      return;
    }
    setAppliedRegions({
      r1: { district: r1District, dong: r1Dong },
      r2: { district: r2District, dong: r2Dong },
    });
    refetch();
  };

  const handleReset = () => {
    setR1District("");
    setR1Dong("전체");
    setR2District("");
    setR2Dong("전체");
    setAppliedRegions(null);
  };

  /* 통계 및 차트 계산 */
  const r1Metrics = compareData?.r1;
  const r2Metrics = compareData?.r2;
  const baseDate = compareData?.baseDate || new Date().toISOString().slice(0, 10).replace(/-/g, ".");

  const r1Label = appliedRegions
    ? `${appliedRegions.r1.district}${appliedRegions.r1.dong !== "전체" ? ` ${appliedRegions.r1.dong}` : ""}`
    : "";
  const r2Label = appliedRegions
    ? `${appliedRegions.r2.district}${appliedRegions.r2.dong !== "전체" ? ` ${appliedRegions.r2.dong}` : ""}`
    : "";

  const formatDiffText = (val1: number, val2: number) => {
    const diff = Math.abs(val1 - val2).toFixed(1);
    if (val1 > val2) return `지역1이 ${diff}억 높음`;
    if (val1 < val2) return `지역2가 ${diff}억 높음`;
    return "동일함";
  };

  const avgDiffText =
    r1Metrics && r2Metrics ? formatDiffText(r1Metrics.avgPrice, r2Metrics.avgPrice) : "";
  const recentDiffText =
    r1Metrics && r2Metrics ? formatDiffText(r1Metrics.recentPrice, r2Metrics.recentPrice) : "";
  const avgJeonseDiffText =
    r1Metrics && r2Metrics ? formatDiffText(r1Metrics.avgJeonsePrice, r2Metrics.avgJeonsePrice) : "";

  const maxAvgPrice = Math.max(r1Metrics?.avgPrice || 10, r2Metrics?.avgPrice || 10);
  const r1AvgWidth = r1Metrics
    ? `${Math.min(100, Math.max(15, (r1Metrics.avgPrice / maxAvgPrice) * 100))}%`
    : "50%";
  const r2AvgWidth = r2Metrics
    ? `${Math.min(100, Math.max(15, (r2Metrics.avgPrice / maxAvgPrice) * 100))}%`
    : "50%";

  const maxAvgJeonse = Math.max(r1Metrics?.avgJeonsePrice || 5, r2Metrics?.avgJeonsePrice || 5);
  const r1JeonseWidth = r1Metrics
    ? `${Math.min(100, Math.max(15, (r1Metrics.avgJeonsePrice / maxAvgJeonse) * 100))}%`
    : "50%";
  const r2JeonseWidth = r2Metrics
    ? `${Math.min(100, Math.max(15, (r2Metrics.avgJeonsePrice / maxAvgJeonse) * 100))}%`
    : "50%";

  return (
    <div className={cn("tw-scope", "min-h-screen", "bg-[#F8FAFC]")}>
      <main className="py-8">
        <div
          className={cn(
            "mx-auto flex w-[min(1490px,calc(100%-48px))] gap-8",
            "max-[1240px]:w-[min(980px,calc(100%-36px))]",
            "max-[760px]:w-[calc(100%-24px)]",
            "max-[900px]:flex-col",
          )}
        >
          {/* 사이드바 */}
          <aside className="w-[240px] shrink-0 max-[900px]:w-full">
            <div className="sticky top-[96px] rounded-[16px] border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
              <h2 className="mb-4 text-[16px] font-black text-[#0F172A]">가격정보</h2>

              <nav className="flex flex-col gap-1">
                <Link
                  to="/price/compare-list"
                  className="flex items-center gap-2.5 rounded-[10px] bg-[#E8F6F9] px-3.5 py-3 text-[13px] font-extrabold text-[#0F8AA8] no-underline"
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
              </nav>

              <div className="mt-6 rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-[#475569]">
                  <HelpCircle className="size-3.5 text-[#0F8AA8]" />
                  <span>이용 가이드</span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#64748B]">
                  비교할 두 지역의 자치구와 자치동을 선택하고 &apos;비교하기&apos; 버튼을 눌러보세요.
                  매매 및 전세 시세 차이를 한눈에 확인할 수 있습니다.
                </p>
              </div>
            </div>
          </aside>

          {/* 메인 영역 */}
          <section className="min-w-0 flex-1">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h1 className="text-[24px] font-black text-[#0F172A]">지역별 비교(리스트)</h1>
                <p className="mt-1 text-[13px] font-medium text-[#64748B]">
                  자치구와 자치동을 선택하여 두 지역의 매매/전세 시세를 비교해보세요.
                </p>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 py-2 text-[12px] font-bold text-[#475569] shadow-sm transition-all hover:border-[#0F8AA8] hover:bg-[#F8FAFC] hover:text-[#0F8AA8]"
              >
                <RotateCcw className="size-3.5" />
                <span>초기화</span>
              </button>
            </div>

            {/* 지역 선택 카드 */}
            <div className="mb-8 rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
              <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-6 max-[1100px]:grid-cols-1">
                {/* 지역 1 */}
                <div className="rounded-[16px] border border-[#2563EB]/20 bg-[#F0F6FF] p-5">
                  <div className="mb-4 inline-flex items-center rounded-full bg-[#2563EB] px-3 py-1 text-[11px] font-black text-white">
                    지역 1
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                      <span className="text-[13px] font-bold text-[#475569]">자치구</span>
                      <select
                        value={r1District}
                        onChange={(e) => handleR1DistrictChange(e.target.value)}
                        disabled={isRegionsLoading}
                        className="h-10 rounded-[8px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-semibold text-[#0F172A] outline-none focus:border-[#2563EB] disabled:bg-[#F1F5F9]"
                      >
                        <option value="">선택</option>
                        {districtNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                      <span className="text-[13px] font-bold text-[#475569]">자치동</span>
                      <select
                        value={r1Dong}
                        onChange={(e) => setR1Dong(e.target.value)}
                        disabled={!r1District || isRegionsLoading}
                        className="h-10 rounded-[8px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-semibold text-[#0F172A] outline-none focus:border-[#2563EB] disabled:bg-[#F1F5F9]"
                      >
                        {r1DongOptions.map((dong) => (
                          <option key={dong} value={dong}>
                            {dong}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <div className="flex size-11 items-center justify-center rounded-full border border-[#E2E8F0] bg-white font-black text-[#94A3B8] shadow-sm">
                    VS
                  </div>
                </div>

                {/* 지역 2 */}
                <div className="rounded-[16px] border border-[#16A34A]/20 bg-[#F0FDF4] p-5">
                  <div className="mb-4 inline-flex items-center rounded-full bg-[#16A34A] px-3 py-1 text-[11px] font-black text-white">
                    지역 2
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                      <span className="text-[13px] font-bold text-[#475569]">자치구</span>
                      <select
                        value={r2District}
                        onChange={(e) => handleR2DistrictChange(e.target.value)}
                        disabled={isRegionsLoading}
                        className="h-10 rounded-[8px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-semibold text-[#0F172A] outline-none focus:border-[#16A34A] disabled:bg-[#F1F5F9]"
                      >
                        <option value="">선택</option>
                        {districtNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                      <span className="text-[13px] font-bold text-[#475569]">자치동</span>
                      <select
                        value={r2Dong}
                        onChange={(e) => setR2Dong(e.target.value)}
                        disabled={!r2District || isRegionsLoading}
                        className="h-10 rounded-[8px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-semibold text-[#0F172A] outline-none focus:border-[#16A34A] disabled:bg-[#F1F5F9]"
                      >
                        {r2DongOptions.map((dong) => (
                          <option key={dong} value={dong}>
                            {dong}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-col items-center justify-center text-center">
                  <button
                    type="button"
                    onClick={handleCompare}
                    disabled={isComparing || isRegionsLoading}
                    className="flex h-[110px] w-full max-w-[140px] flex-col items-center justify-center gap-2.5 rounded-[16px] border border-[#0B5E73] bg-gradient-to-b from-[#0F8AA8] to-[#0B5E73] p-4 text-white shadow-[0_8px_20px_rgba(15,138,168,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_25px_rgba(15,138,168,0.35)] active:translate-y-0 disabled:opacity-80"
                  >
                    {isComparing ? (
                      <Loader2 className="size-6 animate-spin" />
                    ) : (
                      <BarChart3 className="size-6 stroke-[2.2]" />
                    )}
                    <span className="text-[14px] font-black tracking-tight">
                      {isComparing ? "조회 중..." : "비교하기"}
                    </span>
                  </button>
                  <p className="mt-3 text-[11px] leading-tight text-[#94A3B8]">
                    선택한 지역의 시세 정보를 기반으로 리포트가 제공됩니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 비교 리포트 출력 */}
            {isRegionsError ? (
              <div className="rounded-[20px] border border-red-200 bg-red-50 p-8 text-center text-red-600">
                <AlertCircle className="mx-auto mb-2 size-8" />
                <p className="font-bold">서울시 행정구역 목록을 불러오지 못했습니다.</p>
                <p className="mt-1 text-xs text-red-400">백엔드 서버(/api/v1/regions) 상태를 확인해 주세요.</p>
              </div>
            ) : isComparing ? (
              <div className="flex flex-col gap-6 animate-pulse">
                <div className="grid grid-cols-[1fr_340px] gap-6 max-[1100px]:grid-cols-1">
                  <div className="h-[260px] rounded-[20px] border border-[#E2E8F0] bg-white p-6" />
                  <div className="h-[260px] rounded-[20px] border border-[#E2E8F0] bg-white p-6" />
                </div>
                <div className="grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
                  <div className="h-[180px] rounded-[20px] border border-[#E2E8F0] bg-white p-6" />
                  <div className="h-[180px] rounded-[20px] border border-[#E2E8F0] bg-white p-6" />
                </div>
              </div>
            ) : isCompareError ? (
              <div className="rounded-[20px] border border-red-200 bg-red-50 p-8 text-center text-red-600">
                <AlertCircle className="mx-auto mb-2 size-8" />
                <p className="font-bold">시세 비교 데이터를 불러오는 데 실패했습니다.</p>
                <p className="mt-1 text-xs text-red-400">백엔드 서버(/api/v1/price/compare) 상태를 확인해 주세요.</p>
              </div>
            ) : !appliedRegions || !r1Metrics || !r2Metrics ? (
              <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-12 text-center shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-[#E8F6F9] text-[#0F8AA8]">
                  <BarChart3 className="size-8" />
                </div>
                <h3 className="text-[18px] font-black text-[#0F172A]">
                  비교할 지역을 선택하고 &apos;비교하기&apos; 버튼을 눌러주세요
                </h3>
                <p className="mx-auto mt-2 max-w-[420px] text-[13px] font-medium leading-relaxed text-[#64748B]">
                  두 지역(자치구, 자치동)을 지정한 뒤{" "}
                  <span className="font-extrabold text-[#0F8AA8]">&apos;비교하기&apos;</span>{" "}
                  버튼을 클릭하면 매매 및 전세 시세 비교 표와 그래프가 나타납니다.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-[1fr_340px] gap-6 max-[1100px]:grid-cols-1">
                  {/* 비교 표 */}
                  <div className="flex flex-col justify-between rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
                    <div>
                      <div className="mb-5 flex items-center justify-between border-b border-[#F1F5F9] pb-4">
                        <h2 className="text-[18px] font-black text-[#0F172A]">비교 리포트</h2>
                        <span className="flex items-center gap-1 rounded-full bg-[#F1F5F9] px-3 py-1 text-[11px] font-bold text-[#64748B]">
                          <Info className="size-3 text-[#0F8AA8]" />
                          {baseDate} 기준 (최근 1개월)
                        </span>
                      </div>

                      <div className="overflow-hidden rounded-[14px] border border-[#E2E8F0]">
                        <table className="w-full text-left text-[13px]">
                          <thead>
                            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                              <th className="w-[140px] px-5 py-3.5 font-bold text-[#475569]">항목</th>
                              <th className="px-5 py-3.5 font-extrabold text-[#2563EB]">
                                <span className="mr-2 inline-block size-2 rounded-full bg-[#2563EB]" />
                                지역 1 <span className="font-bold text-[#475569]">{r1Label}</span>
                              </th>
                              <th className="px-5 py-3.5 font-extrabold text-[#16A34A]">
                                <span className="mr-2 inline-block size-2 rounded-full bg-[#16A34A]" />
                                지역 2 <span className="font-bold text-[#475569]">{r2Label}</span>
                              </th>
                              <th className="w-[160px] px-5 py-3.5 font-bold text-[#475569]">비교</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0] bg-white">
                            <tr className="hover:bg-[#F8FAFC]">
                              <td className="flex items-center gap-2 px-5 py-4 font-extrabold text-[#0F172A]">
                                <Building2 className="size-4 text-[#0F8AA8]" />
                                평균 매매가
                              </td>
                              <td className="px-5 py-4 font-black text-[#2563EB]">
                                {r1Metrics.avgPrice}억 원
                                <span className="ml-1.5 text-[11px] font-normal text-[#64748B]">
                                  ({formatPriceKRW(r1Metrics.avgPrice)})
                                </span>
                              </td>
                              <td className="px-5 py-4 font-black text-[#16A34A]">
                                {r2Metrics.avgPrice}억 원
                                <span className="ml-1.5 text-[11px] font-normal text-[#64748B]">
                                  ({formatPriceKRW(r2Metrics.avgPrice)})
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="inline-block rounded-full bg-[#FEE2E2] px-3 py-1 text-[12px] font-extrabold text-[#DC2626]">
                                  {avgDiffText}
                                </span>
                              </td>
                            </tr>

                            <tr className="hover:bg-[#F8FAFC]">
                              <td className="flex items-center gap-2 px-5 py-4 font-extrabold text-[#0F172A]">
                                <TrendingUp className="size-4 text-[#0F8AA8]" />
                                최근 실거래가
                              </td>
                              <td className="px-5 py-4 font-black text-[#2563EB]">
                                {r1Metrics.recentPrice}억 원
                                <span className="ml-1.5 text-[11px] font-normal text-[#64748B]">
                                  ({formatPriceKRW(r1Metrics.recentPrice)})
                                </span>
                              </td>
                              <td className="px-5 py-4 font-black text-[#16A34A]">
                                {r2Metrics.recentPrice}억 원
                                <span className="ml-1.5 text-[11px] font-normal text-[#64748B]">
                                  ({formatPriceKRW(r2Metrics.recentPrice)})
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="inline-block rounded-full bg-[#FEE2E2] px-3 py-1 text-[12px] font-extrabold text-[#DC2626]">
                                  {recentDiffText}
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* 요약 카드 */}
                  <div className="flex flex-col justify-between rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
                    <div>
                      <h3 className="mb-4 text-[16px] font-black text-[#0F172A]">한눈에 보는 요약</h3>
                      <div className="flex flex-col gap-3">
                        <div className="rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                          <div className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-[#0F172A]">
                            <Building2 className="size-4 text-[#0F8AA8]" />
                            <span>평균 매매가</span>
                          </div>
                          <p className="text-[12px] font-extrabold text-[#DC2626]">{avgDiffText}.</p>
                        </div>

                        <div className="rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                          <div className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-[#0F172A]">
                            <Home className="size-4 text-[#0F8AA8]" />
                            <span>평균 전세가</span>
                          </div>
                          <p className="text-[12px] font-extrabold text-[#0284C7]">{avgJeonseDiffText}.</p>
                        </div>

                        <div className="rounded-[12px] border border-[#0F8AA8]/30 bg-[#E8F6F9] p-3.5">
                          <div className="mb-1 flex items-center gap-1.5 text-[12px] font-black text-[#0F8AA8]">
                            <Sparkles className="size-4" />
                            <span>종합 의견</span>
                          </div>
                          <p className="text-[11px] font-semibold leading-relaxed text-[#0F5C70]">
                            {r1Metrics.avgPrice >= r2Metrics.avgPrice
                              ? appliedRegions.r1.district
                              : appliedRegions.r2.district}
                            이(가) 매매가 및 전세가가 상대적으로 더 높게 형성되어 있으며, 두 지역 모두 서울 주요 선호 주거 지역입니다.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-[#16A34A]">
                      <CheckCircle2 className="size-3.5" />
                      <span>비교 분석이 반영되었습니다.</span>
                    </div>
                  </div>
                </div>

                {/* 차트 영역 */}
                <div className="grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
                  <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
                    <div className="mb-5 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-[15px] font-black text-[#0F172A]">
                        <Building2 className="size-4 text-[#0F8AA8]" />
                        평균 매매가 비교
                      </h3>
                      <span className="text-[11px] font-bold text-[#94A3B8]">(단위: 억 원)</span>
                    </div>

                    <div className="flex flex-col gap-5">
                      <div>
                        <div className="mb-1.5 flex justify-between text-[12px] font-bold">
                          <span className="text-[#2563EB]">지역 1 ({appliedRegions.r1.district})</span>
                          <span className="font-black text-[#0F172A]">{r1Metrics.avgPrice}억 원</span>
                        </div>
                        <div className="h-6 w-full rounded-full bg-[#F1F5F9] p-1">
                          <div
                            className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
                            style={{ width: r1AvgWidth }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-1.5 flex justify-between text-[12px] font-bold">
                          <span className="text-[#16A34A]">지역 2 ({appliedRegions.r2.district})</span>
                          <span className="font-black text-[#0F172A]">{r2Metrics.avgPrice}억 원</span>
                        </div>
                        <div className="h-6 w-full rounded-full bg-[#F1F5F9] p-1">
                          <div
                            className="h-full rounded-full bg-[#16A34A] transition-all duration-500"
                            style={{ width: r2AvgWidth }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
                    <div className="mb-5 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-[15px] font-black text-[#0F172A]">
                        <Home className="size-4 text-[#0F8AA8]" />
                        평균 전세가 비교
                      </h3>
                      <span className="text-[11px] font-bold text-[#94A3B8]">(단위: 억 원)</span>
                    </div>

                    <div className="flex flex-col gap-5">
                      <div>
                        <div className="mb-1.5 flex justify-between text-[12px] font-bold">
                          <span className="text-[#2563EB]">지역 1 ({appliedRegions.r1.district})</span>
                          <span className="font-black text-[#0F172A]">{r1Metrics.avgJeonsePrice}억 원</span>
                        </div>
                        <div className="h-6 w-full rounded-full bg-[#F1F5F9] p-1">
                          <div
                            className="h-full rounded-full bg-[#3B82F6] transition-all duration-500"
                            style={{ width: r1JeonseWidth }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-1.5 flex justify-between text-[12px] font-bold">
                          <span className="text-[#16A34A]">지역 2 ({appliedRegions.r2.district})</span>
                          <span className="font-black text-[#0F172A]">{r2Metrics.avgJeonsePrice}억 원</span>
                        </div>
                        <div className="h-6 w-full rounded-full bg-[#F1F5F9] p-1">
                          <div
                            className="h-full rounded-full bg-[#22C55E] transition-all duration-500"
                            style={{ width: r2JeonseWidth }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 출처 안내 */}
                <div className="flex items-center justify-between rounded-[16px] border border-[#E2E8F0] bg-white px-6 py-4 text-[11px] text-[#94A3B8]">
                  <div className="flex items-center gap-1.5">
                    <Info className="size-3.5 text-[#0F8AA8]" />
                    <span>
                      본 정보는 국토교통부 실거래가 공개시스템 데이터를 기반으로 제공되며, 실제 거래가와 차이가 있을 수 있습니다.
                    </span>
                  </div>
                  <span>데이터 기준일: {baseDate}</span>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
