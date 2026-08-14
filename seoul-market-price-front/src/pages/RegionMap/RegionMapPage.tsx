import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Building2, ChevronDown, HelpCircle, Map, TrendingUp } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
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

const NAV_ITEMS = [
  { label: "지역별 비교(리스트)", to: "/price/compare-list", icon: BarChart3 },
  { label: "지역별 비교(지도)", to: "/region-map", icon: Map },
  { label: "단지별 시세", to: "/price/detail", icon: Building2 },
];

export default function RegionMapPage() {
  const authUser = useAuthStore((state) => state.user);
  const preferredDistrict =
    authUser?.myGu || getLocalPreferredDistrict(authUser?.userId);
  const [searchParams, setSearchParams] = useSearchParams();
  const [districtExpanded, setDistrictExpanded] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const { data: sggs = [] } = useQuery({
    queryKey: ["location", "sggs"],
    queryFn: getSggs,
    staleTime: Infinity,
  });

  const requestedDistrict = searchParams.get("district") ?? "";
  const matchedDistrict = DISTRICT_PRICES.find((item) => item.name === requestedDistrict);
  const hasSelectedDistrict = Boolean(matchedDistrict);
  const selectedDistrict = matchedDistrict ?? DISTRICT_PRICES[0];
  const selectedSggCode =
    hasSelectedDistrict
      ? sggs.find((sgg) => sgg.sggNm === selectedDistrict.name)?.sggCd ?? ""
      : "";
  const { data: dongs = [] } = useQuery({
    queryKey: ["location", "dongs", selectedSggCode],
    queryFn: () => getDongs(selectedSggCode),
    enabled: Boolean(selectedSggCode),
    staleTime: Infinity,
  });
  const dongNames = dongs.map((dong) => dong.dongNm);
  const requestedDong = searchParams.get("dong") ?? "";
  const selectedDong = hasSelectedDistrict ? requestedDong : "";

  const sortedApartments = useMemo(
    () =>
      selectedDistrict.apartments
        .map((apartment) => ({
          ...apartment,
          name: selectedDong
            ? `${selectedDong} ${apartment.name.replace(/^\S+구\s+/, "")}`
            : apartment.name,
        }))
        .sort((a, b) => b.salePrice - a.salePrice),
    [selectedDistrict, selectedDong],
  );

  const setRegion = useCallback((district: string, dong?: string) => {
    setSearchParams(dong ? { district, dong } : { district });
    setDistrictExpanded(true);
  }, [setSearchParams]);

  const dongPrices = useMemo(
    () =>
      dongNames.map((dong, index) => ({
        name: dong,
        averagePrice: Math.round(selectedDistrict.averagePrice * (1 + (index - 1.5) * 0.045) / 100) * 100,
      })),
    [dongNames, selectedDistrict.averagePrice],
  );
  const dongAveragePrices = useMemo(
    () => Object.fromEntries(dongPrices.map((dong) => [dong.name, dong.averagePrice])),
    [dongPrices],
  );

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-[#0F172A] sm:px-6">
      <div className="mx-auto grid max-w-[1490px] gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
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

        <section className="min-w-0 space-y-5">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-[24px] font-black text-[#0F172A]">지역별 비교(지도)</h1>
              <p className="mt-1 text-[13px] font-medium text-[#64748B]">서울 구별 평균 매매가를 한눈에 확인하고, 관심 지역의 아파트를 분석해보세요.</p>
            </div>
          </header>

          <div className="relative overflow-hidden rounded-[20px] border border-[#E2E8F0] bg-white p-3 shadow-[0_4px_24px_rgba(15,23,42,0.04)] sm:p-7">
            <div className="relative mx-auto max-w-[1120px] overflow-hidden rounded-[14px] border border-[#E2E8F0] bg-[#F8FAFC]">
              <SeoulDistrictMap
                selectedDistrict={hasSelectedDistrict ? selectedDistrict.name : ""}
                selectedDistrictCode={selectedSggCode}
                selectedDong={selectedDong}
                availableDongs={dongs}
                dongAveragePrices={dongAveragePrices}
                districtAveragePrice={selectedDistrict.averagePrice}
                preferredDistrict={preferredDistrict}
                onSelect={setRegion}
                onSelectDong={(dong) => setRegion(selectedDistrict.name, dong)}
                onShowAll={() => setSearchParams({})}
              />
            </div>
            {hasSelectedDistrict && <div className="absolute bottom-5 left-5 hidden items-center gap-3 rounded-[14px] border border-white/80 bg-white/90 px-4 py-3 shadow-[0_10px_25px_rgba(18,48,71,.12)] backdrop-blur md:flex">
              <span className="flex size-10 items-center justify-center rounded-full bg-[#E1F4F7] text-[#0F8AA8]"><TrendingUp className="size-5" /></span>
              <span><small className="block text-[10px] font-bold text-[#94A3B8]">선택 지역 평균 매매가</small><strong className="block text-[18px] font-black text-[#0F172A]">{selectedDistrict.name} · {formatPrice(selectedDistrict.averagePrice)}</strong></span>
            </div>}
          </div>

          {hasSelectedDistrict && <><section className="overflow-hidden rounded-[16px] border border-[#E2E8F0] bg-white shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
            <button
              type="button"
              onClick={() => setDistrictExpanded((value) => !value)}
              className="flex w-full items-center justify-between border-0 bg-white px-5 py-4 text-left hover:bg-[#F8FAFC]"
              aria-expanded={districtExpanded}
            >
              <span>
                <strong className="block text-[17px] font-black">{selectedDistrict.name} 법정동별 평균가격</strong>
                <small className="mt-1 block text-[12px] font-medium text-[#64748B]">지도에서 법정동을 선택해 주세요.</small>
              </span>
              <ChevronDown className={`size-5 text-[#0F8AA8] transition-transform ${districtExpanded ? "rotate-180" : ""}`} />
            </button>
            {districtExpanded && (
              <div className="grid max-h-[430px] gap-3 overflow-y-auto border-t border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:grid-cols-2 xl:grid-cols-4">
                {dongPrices.map((dong) => {
                  const active = dong.name === selectedDong;
                  return (
                    <button
                      key={dong.name}
                      type="button"
                      onClick={() => setRegion(selectedDistrict.name, dong.name)}
                      className={`rounded-[10px] border p-4 text-left transition-all ${active ? "border-[#0F8AA8] bg-[#E8F6F9] shadow-[0_5px_14px_rgba(15,138,168,.12)]" : "border-[#E2E8F0] bg-white hover:border-[#94A3B8]"}`}
                    >
                      <span className={`block text-[13px] font-extrabold ${active ? "text-[#0F8AA8]" : "text-[#0F172A]"}`}>{dong.name}</span>
                      <strong className="mt-2 block text-[18px] font-black">{formatPrice(dong.averagePrice)}</strong>
                      <small className="mt-1 block text-[10px] text-[#94A3B8]">평균 매매가</small>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {selectedDong && <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
            <h2 className="text-[18px] font-black">{selectedDistrict.name} {selectedDong} 아파트 시세 분석</h2>
            <p className="mt-1 text-[12px] text-[#64748B]">선택한 지역의 최근 매매가 기준 상위·하위 5개 단지입니다.</p>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {[{ title: "상위 5개 아파트 단지", items: sortedApartments.slice(0, 5), color: "text-rose-500" }, { title: "하위 5개 아파트 단지", items: sortedApartments.slice(-5).reverse(), color: "text-[#1677D2]" }].map((group) => (
                <div key={group.title} className="overflow-hidden rounded-[10px] border border-[#E2E8F0]">
                  <h3 className={`px-4 py-3 text-[14px] font-black ${group.color}`}>{group.title}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px] text-left text-[12px]">
                      <thead className="bg-[#F8FAFC] text-[#64748B]"><tr><th className="px-3 py-2">순위</th><th className="px-3 py-2">아파트 단지</th><th className="px-3 py-2">최근 매매가</th><th className="px-3 py-2">최근 거래일</th><th className="px-3 py-2">전용면적</th></tr></thead>
                      <tbody>{group.items.map((item, index) => <tr key={item.name} className="border-t border-[#EDF2F4]"><td className="px-3 py-2 font-bold">{index + 1}</td><td className="px-3 py-2 font-semibold">{item.name}</td><td className="px-3 py-2">{formatPrice(item.salePrice)}</td><td className="px-3 py-2">{item.recentTradeDate}</td><td className="px-3 py-2">{item.exclusiveArea.toFixed(2)}㎡</td></tr>)}</tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>}</>}
        </section>
      </div>
    </main>
  );
}
