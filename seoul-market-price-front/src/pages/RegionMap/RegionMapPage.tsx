import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TrendingUp } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import {
  DISTRICT_PRICES,
  PRICE_LEGEND,
  formatPrice,
} from "@/features/region-map/data/regionMapData";
import SeoulDistrictMap from "@/features/region-map/components/D3SeoulDistrictMap";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { getLocalPreferredDistrict } from "@/features/member/utils/preferredDistrictStorage";
import { getDongs, getSggs } from "@/features/location/services/locationService";
import {
  getApartmentPriceRanking,
  getFastApiDistrictPrices,
  getFastApiDongPrices,
} from "@/features/region-map/services/regionMapService";
import type { PriceMetricType } from "@/features/region-map/services/regionMapService";
import {
  isSeoulDistrict,
} from "@/features/region-map/utils/regionSelection";
import SectionSidebarLayout from "@/components/SectionSidebarLayout";
import { PRICE_NAVIGATION } from "@/config/sectionNavigation";

const REGION_MAP_SESSION_KEY = "region_map_query";
const REGION_MAP_METRIC_SESSION_KEY = "region_map_price_metric";

/*
const NAV_ITEMS = [
  { label: "지역별 비교(리스트)", to: "/price/compare-list", icon: BarChart3 },
  { label: "지역별 비교(지도)", to: "/region-map", icon: Map },
  { label: "단지별 시세", to: "/price/detail", icon: Building2 },
];
*/

export default function RegionMapPage() {
  const authUser = useAuthStore((state) => state.user);
  const rawPreferred = authUser
    ? getLocalPreferredDistrict(authUser.userId) ?? ""
    : "";
  const preferredDistrict =
    rawPreferred &&
    rawPreferred !== "선호지역 없음" &&
    rawPreferred !== "설정안함" &&
    isSeoulDistrict(rawPreferred)
      ? rawPreferred.trim()
      : "";
  const [searchParams, setSearchParams] = useSearchParams();
  const hasRestoredSessionRef = useRef(false);
  const rankingSectionRef = useRef<HTMLDivElement | null>(null);
  const [priceMetric, setPriceMetric] = useState<PriceMetricType>(() =>
    sessionStorage.getItem(REGION_MAP_METRIC_SESSION_KEY) === "pyeong"
      ? "pyeong"
      : "thing_amt",
  );

  useEffect(() => {
    sessionStorage.setItem(REGION_MAP_METRIC_SESSION_KEY, priceMetric);
  }, [priceMetric]);

  useEffect(() => {
    if (!hasRestoredSessionRef.current) {
      hasRestoredSessionRef.current = true;
      if (!searchParams.toString()) {
        const savedQuery = sessionStorage.getItem(REGION_MAP_SESSION_KEY);
        if (savedQuery) {
          setSearchParams(new URLSearchParams(savedQuery), { replace: true });
          return;
        }
      }
    }

    if (searchParams.toString()) {
      sessionStorage.setItem(REGION_MAP_SESSION_KEY, searchParams.toString());
    }
  }, [searchParams, setSearchParams]);

  const showAllRegions = useCallback(() => {
    sessionStorage.removeItem(REGION_MAP_SESSION_KEY);
    setSearchParams({});
  }, [setSearchParams]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  // 1. 서울시 전체 구 목록 (법정동 코드 매핑용)
  const { data: sggs = [] } = useQuery({
    queryKey: ["location", "sggs"],
    queryFn: getSggs,
    staleTime: Infinity,
  });

  // 2. FastAPI 서울시 전체 25개 구별 실제 평균 매매가
  const { data: districtPrices = {} } = useQuery({
    queryKey: ["region-map", "district-prices"],
    queryFn: getFastApiDistrictPrices,
    staleTime: 1000 * 60 * 5,
  });

  const requestedDistrict = searchParams.get("district") ?? "";
  const matchedDistrict = DISTRICT_PRICES.find((item) => item.name === requestedDistrict);
  const hasSelectedDistrict = Boolean(matchedDistrict);
  const selectedDistrict = matchedDistrict ?? DISTRICT_PRICES[0];
  const selectedSggCode =
    hasSelectedDistrict
      ? sggs.find((sgg) => sgg.sggNm === selectedDistrict.name)?.sggCd ?? ""
      : "";

  // 3. 선택된 구의 법정동 목록
  const { data: dongs = [] } = useQuery({
    queryKey: ["location", "dongs", selectedSggCode],
    queryFn: () => getDongs(selectedSggCode),
    enabled: Boolean(selectedSggCode),
    staleTime: Infinity,
  });

  // 4. FastAPI 선택된 구의 동별 실제 평균 매매가
  const { data: fastApiDongPrices = {} } = useQuery({
    queryKey: ["region-map", "dong-prices", selectedSggCode],
    queryFn: () => getFastApiDongPrices(selectedSggCode),
    enabled: Boolean(selectedSggCode),
    staleTime: 1000 * 60 * 5,
  });

  const dongNames = dongs.map((dong) => dong.dongNm);
  const requestedDong = searchParams.get("dong") ?? "";
  const selectedDong = hasSelectedDistrict ? requestedDong : "";

  const selectedDongCode = dongs.find((dong) => dong.dongNm === selectedDong)?.dongCd ?? "";
  const apartmentRankingQuery = useQuery({
    queryKey: ["region-map", "apartment-ranking", selectedDongCode, priceMetric],
    queryFn: () => getApartmentPriceRanking(selectedSggCode, selectedDongCode, priceMetric),
    enabled: Boolean(selectedDongCode),
  });

  useEffect(() => {
    if (!selectedDong || !selectedDongCode) return;
    const frameId = window.requestAnimationFrame(() => {
      rankingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [selectedDong, selectedDongCode]);

  const setRegion = useCallback((district: string, dong?: string) => {
    setSearchParams(dong ? { district, dong } : { district });
  }, [setSearchParams]);

  // 선택된 구의 실제 평균 매매가 (FastAPI 실데이터 우선)
  const currentDistrictAveragePrice =
    districtPrices[selectedDistrict.name] ?? selectedDistrict.averagePrice;

  // 동별 실제 평균 매매가 맵 (FastAPI 실데이터 매핑)
  const dongAveragePrices = useMemo(() => {
    const result: Record<string, number> = { ...fastApiDongPrices };
    dongNames.forEach((dong) => {
      if (result[dong] === undefined) {
        result[dong] = currentDistrictAveragePrice;
      }
    });
    return result;
  }, [dongNames, fastApiDongPrices, currentDistrictAveragePrice]);

  return (
    <SectionSidebarLayout
      sectionTitle={PRICE_NAVIGATION.sectionTitle}
      menuItems={PRICE_NAVIGATION.menuItems}
    >
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-[#0F172A] sm:px-6">
      <div className="mx-auto max-w-[1490px]">
        {/*
        <aside className="h-fit w-full shrink-0 lg:sticky lg:top-[96px] lg:w-[240px]">
          <div className="rounded-[16px] border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
            <h2 className="mb-4 text-[16px] font-black text-[#0F172A]">가격정보</h2>
            <nav className="flex flex-col gap-1" aria-label="가격정보 메뉴">
            {NAV_ITEMS.map(({ label, to, icon: Icon }) => {
              const active = to === "/region-map";
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2.5 rounded-[10px] px-3.5 py-3 text-[13px] no-underline ${active ? "bg-[#E8F6F9] font-extrabold text-[#0F8AA8]" : "font-semibold text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"}`}
                >
                  <Icon className="size-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
            </nav>
            <div className="mt-6 rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-[#475569]">
                <HelpCircle className="size-3.5 text-[#0F8AA8]" />
                <span>이용 가이드</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#64748B]">
                자치구와 자치동을 선택해 지역별 평균 매매가와 단지 시세를 지도에서 확인해보세요.
              </p>
            </div>
            <div className="mt-4 rounded-[12px] border border-[#E2E8F0] bg-white p-4">
              <strong className="mb-3 block text-[12px] font-black text-[#123047]">
                {hasSelectedDistrict ? "동별" : "구별"} 평균 매매가
                <small className="ml-1 font-semibold text-[#94A3B8]">(단위: 억 원)</small>
              </strong>
              <div className="space-y-2">
                {PRICE_LEGEND.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-[11px] font-semibold text-[#64748B]">
                    <span className="size-3 rounded-[3px]" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
        */}

        <section className="min-w-0 space-y-5">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-[24px] font-black text-[#0F172A]">지역별 비교(지도)</h1>
              <p className="mt-1 text-[13px] font-medium text-[#64748B]">서울 구별 평균 매매가를 한눈에 확인하고, 관심 지역의 아파트를 분석해보세요.</p>
            </div>
          </header>

          <div className="relative overflow-hidden rounded-[16px] sm:rounded-[20px] border border-[#E2E8F0] bg-white p-0 sm:p-7 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
            {/* 모바일 전용 컴팩트 가로형 범례 바 (지도를 가리지 않음) */}
            <div className="flex sm:hidden flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[#F8FAFC] px-3 py-2 border-b border-[#E2E8F0] text-[10.5px] font-semibold text-[#64748B]">
              <span className="font-bold text-[#123047]">평균 매매가(억):</span>
              {PRICE_LEGEND.map((item) => (
                <div key={item.label} className="flex items-center gap-1">
                  <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: item.color }} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="relative mx-auto max-w-[1120px] overflow-hidden rounded-none sm:rounded-[14px] border-0 sm:border border-[#E2E8F0] bg-[#F8FAFC]">
              {/* PC 전용 우측 상단 플로팅 범례 */}
              <div className="hidden sm:block absolute right-3 top-3 z-10 w-[196px] rounded-[14px] border border-[#D7E1EE] bg-white/95 p-4 shadow-[0_8px_24px_rgba(18,48,71,0.10)] backdrop-blur sm:right-5 sm:top-5">
                <strong className="mb-3 block text-[13px] font-black text-[#123047]">
                  {hasSelectedDistrict ? "동별" : "구별"} 평균 매매가
                  <small className="ml-1 text-[10px] font-semibold text-[#94A3B8]">(단위: 억 원)</small>
                </strong>
                <div className="space-y-2">
                  {PRICE_LEGEND.map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-[11px] font-semibold text-[#64748B]">
                      <span className="size-3 rounded-[3px]" style={{ backgroundColor: item.color }} />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
              <SeoulDistrictMap
                selectedDistrict={hasSelectedDistrict ? selectedDistrict.name : ""}
                selectedDistrictCode={selectedSggCode}
                selectedDong={selectedDong}
                availableDongs={dongs}
                dongAveragePrices={dongAveragePrices}
                districtAveragePrice={currentDistrictAveragePrice}
                districtAveragePrices={districtPrices}
                preferredDistrict={preferredDistrict}
                onSelect={setRegion}
                onSelectDong={(dong) => setRegion(selectedDistrict.name, dong)}
                onShowAll={showAllRegions}
              />
            </div>
            {hasSelectedDistrict && <div className="absolute bottom-5 left-5 hidden items-center gap-3 rounded-[14px] border border-white/80 bg-white/90 px-4 py-3 shadow-[0_10px_25px_rgba(18,48,71,.12)] backdrop-blur md:flex">
              <span className="flex size-10 items-center justify-center rounded-full bg-[#E1F4F7] text-[#0F8AA8]"><TrendingUp className="size-5" /></span>
              <span><small className="block text-[10px] font-bold text-[#94A3B8]">선택 지역 평균 매매가</small><strong className="block text-[18px] font-black text-[#0F172A]">{selectedDistrict.name} · {formatPrice(currentDistrictAveragePrice)}</strong></span>
            </div>}
          </div>

          {selectedDong && <div ref={rankingSectionRef} className="scroll-mt-24 rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-black">{selectedDistrict.name} {selectedDong} 아파트 시세 분석</h2>
              </div>
              <div className="flex rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] p-1" aria-label="가격 기준 선택">
                {([{"value":"thing_amt","label":"매매가"},{"value":"pyeong","label":"평당가"}] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPriceMetric(option.value)}
                    className={`rounded-[7px] border-0 px-4 py-2 text-[12px] font-bold transition-colors ${priceMetric === option.value ? "bg-[#0F8AA8] text-white shadow-sm" : "bg-transparent text-[#64748B] hover:text-[#0F172A]"}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            {!apartmentRankingQuery.isPending && !apartmentRankingQuery.isError &&
              ((apartmentRankingQuery.data?.top.length ?? 0) > 0 ||
                (apartmentRankingQuery.data?.bottom.length ?? 0) > 0) &&
              ((apartmentRankingQuery.data?.top.length ?? 0) < 5 ||
                (apartmentRankingQuery.data?.bottom.length ?? 0) < 5) && (
                <p className="mt-2 text-[12px] font-medium text-amber-700">
                  거래 자료가 부족하여 확인 가능한 단지만 표시합니다.
                </p>
              )}
            {apartmentRankingQuery.isPending ? (
              <p className="mt-5 rounded-[10px] bg-[#F8FAFC] p-5 text-center text-[13px] text-[#64748B]">아파트 가격 정보를 불러오는 중입니다.</p>
            ) : apartmentRankingQuery.isError ? (
              <p className="mt-5 rounded-[10px] bg-rose-50 p-5 text-center text-[13px] text-rose-600">아파트 가격 정보를 불러오지 못했습니다.</p>
            ) : (apartmentRankingQuery.data?.top.length ?? 0) === 0 &&
              (apartmentRankingQuery.data?.bottom.length ?? 0) === 0 ? (
              <p className="mt-5 rounded-[10px] bg-[#F8FAFC] p-5 text-center text-[13px] font-medium text-[#64748B]">
                거래 자료가 부족하여 표시할 수 없습니다.
              </p>
            ) : (
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {[
                {
                  title: "상위 5개 아파트 단지",
                  items: apartmentRankingQuery.data?.top ?? [],
                  color: "text-rose-500",
                  badgeBg: "bg-rose-50 text-rose-600 border-rose-200",
                },
                {
                  title: "하위 5개 아파트 단지",
                  items: apartmentRankingQuery.data?.bottom ?? [],
                  color: "text-[#1677D2]",
                  badgeBg: "bg-blue-50 text-blue-600 border-blue-200",
                },
              ]
                .filter((group) => group.items.length > 0)
                .map((group) => (
                <div key={group.title} className="overflow-hidden rounded-[12px] border border-[#E2E8F0] bg-white">
                  <div className="border-b border-[#EDF2F4] bg-[#F8FAFC] px-4 py-3">
                    <h3 className={`text-[14.5px] font-black ${group.color}`}>{group.title}</h3>
                  </div>

                  {/* 모바일 뷰: 가로 스크롤 없는 컴팩트 리스트 */}
                  <div className="block sm:hidden divide-y divide-[#EDF2F4]">
                    {group.items.map((item, index) => (
                      <div key={item.code} className="flex items-center justify-between p-3.5 gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`flex size-6 shrink-0 items-center justify-center rounded-[6px] border text-[11.5px] font-black ${index === 0 ? group.badgeBg : "bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]"}`}>
                            {index + 1}
                          </span>
                          <span className="font-bold text-[13.5px] text-[#1E293B] truncate">
                            {item.name}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-black text-[13.5px] text-[#0F172A]">
                            {priceMetric === "pyeong" ? `${item.averagePrice.toLocaleString("ko-KR")}만/평` : formatPrice(item.averagePrice)}
                          </div>
                          <div className="text-[11px] font-medium text-[#94A3B8]">
                            거래 {item.dealCount.toLocaleString("ko-KR")}건
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* PC / 태블릿 뷰: 테이블 */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-[12.5px]">
                      <thead className="bg-[#F8FAFC] text-[#64748B]">
                        <tr>
                          <th className="px-4 py-2.5 w-16 text-center">순위</th>
                          <th className="px-4 py-2.5">아파트 단지</th>
                          <th className="px-4 py-2.5 text-right">평균 {priceMetric === "pyeong" ? "평당가" : "매매가"}</th>
                          <th className="px-4 py-2.5 w-24 text-right">거래 건수</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EDF2F4]">
                        {group.items.map((item, index) => (
                          <tr key={item.code} className="hover:bg-[#F8FAFC] transition-colors">
                            <td className="px-4 py-3 text-center font-bold text-[#64748B]">{index + 1}</td>
                            <td className="px-4 py-3 font-semibold text-[#1E293B]">{item.name}</td>
                            <td className="px-4 py-3 text-right font-bold text-[#0F172A]">
                              {priceMetric === "pyeong" ? `${item.averagePrice.toLocaleString("ko-KR")}만원/평` : formatPrice(item.averagePrice)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-[#64748B]">{item.dealCount.toLocaleString("ko-KR")}건</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>}
        </section>
      </div>
    </main>
    </SectionSidebarLayout>
  );
}
