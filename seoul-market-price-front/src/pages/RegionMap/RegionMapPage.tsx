import { useCallback, useMemo, useState } from "react";
import { Building2, ChevronDown, Info, List, MapPinned, RotateCcw, TrendingUp } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import {
  DISTRICT_PRICES,
  formatPrice,
} from "@/features/region-map/data/regionMapData";
import SeoulDistrictMap from "@/features/region-map/components/SeoulDistrictMap";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { getLocalPreferredDistrict } from "@/features/member/utils/preferredDistrictStorage";

const NAV_ITEMS = [
  { label: "지역별 비교(리스트)", to: "/price/compare-list", icon: List },
  { label: "지역별 비교(지도)", to: "/region-map", icon: MapPinned },
  { label: "단지별 시세", to: "/price/detail", icon: Building2 },
];

export default function RegionMapPage() {
  const authUser = useAuthStore((state) => state.user);
  const preferredDistrict =
    authUser?.myGu || getLocalPreferredDistrict(authUser?.userId);
  const [searchParams, setSearchParams] = useSearchParams();
  const [districtExpanded, setDistrictExpanded] = useState(true);
  const selectedDistrict =
    DISTRICT_PRICES.find((item) => item.name === searchParams.get("district")) ??
    DISTRICT_PRICES[0];
  const selectedDong = selectedDistrict.dongs.includes(searchParams.get("dong") ?? "")
    ? searchParams.get("dong")!
    : selectedDistrict.dongs[0];

  const sortedApartments = useMemo(
    () => [...selectedDistrict.apartments].sort((a, b) => b.salePrice - a.salePrice),
    [selectedDistrict],
  );

  const setRegion = useCallback((district: string, dong?: string) => {
    const nextDistrict = DISTRICT_PRICES.find((item) => item.name === district)!;
    setSearchParams({ district, dong: dong ?? nextDistrict.dongs[0] });
    setDistrictExpanded(true);
  }, [setSearchParams]);

  const reset = () => setSearchParams({ district: "강남구", dong: "대치동" });

  const dongPrices = useMemo(
    () =>
      selectedDistrict.dongs.map((dong, index) => ({
        name: dong,
        averagePrice: Math.round(selectedDistrict.averagePrice * (1 + (index - 1.5) * 0.045) / 100) * 100,
      })),
    [selectedDistrict],
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#E1F3F7_0,transparent_32%),#F4F8FA] px-4 py-7 text-[#13202B] sm:px-6">
      <div className="mx-auto grid max-w-[1540px] gap-5 lg:grid-cols-[236px_minmax(0,1fr)]">
        <aside className="h-fit overflow-hidden rounded-[18px] border border-white/80 bg-white shadow-[0_12px_40px_rgba(18,48,71,0.08)] lg:sticky lg:top-[96px]">
          <div className="bg-gradient-to-br from-[#0B5E73] to-[#1196B4] px-5 py-6 text-white">
            <p className="text-[11px] font-extrabold tracking-[0.16em] text-white/70">SSABU PRICE MAP</p>
            <h2 className="mt-1 text-[22px] font-black">가격정보</h2>
            <p className="mt-2 text-[11px] leading-5 text-white/75">서울 아파트 가격을 지역별로 한눈에 비교하세요.</p>
          </div>
          <nav className="p-2" aria-label="가격정보 메뉴">
            {NAV_ITEMS.map(({ label, to, icon: Icon }) => {
              const active = to === "/region-map";
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex min-h-12 items-center gap-3 rounded-[9px] px-3 text-[13px] font-bold no-underline transition-colors ${active ? "bg-[#E8F6F9] text-[#0F8AA8]" : "text-[#52616B] hover:bg-[#F5FAFC] hover:text-[#0F8AA8]"}`}
                >
                  <Icon className="size-[18px]" />{label}
                </Link>
              );
            })}
          </nav>
          <div className="m-3 rounded-[12px] border border-[#DCE8ED] bg-[#F4FAFC] p-4">
            <div className="mb-2 flex items-center gap-2 text-[13px] font-extrabold"><Info className="size-4 text-[#0F8AA8]" />지도 이용 안내</div>
            <p className="text-[12px] leading-5 text-[#6B7280]">서울 각 구의 평균 매매가를 지도에서 비교하고 자치구와 동을 선택해 단지별 시세를 확인할 수 있습니다.</p>
          </div>
        </aside>

        <section className="min-w-0 space-y-5">
          <header className="flex flex-wrap items-start justify-between gap-4 rounded-[18px] border border-white/80 bg-white/75 px-6 py-5 shadow-[0_8px_28px_rgba(18,48,71,0.06)] backdrop-blur">
            <div>
              <p className="mb-1 text-[11px] font-extrabold tracking-[0.12em] text-[#0F8AA8]">SEOUL APARTMENT MARKET</p>
              <h1 className="text-[28px] font-black tracking-[-0.04em]">지역별 비교 <span className="text-[#0F8AA8]">지도</span></h1>
              <p className="mt-1 text-[13px] text-[#6B7280]">서울 구별 평균 매매가를 한눈에 확인하고, 관심 지역의 아파트를 분석해보세요.</p>
            </div>
            <button type="button" onClick={reset} className="flex h-10 items-center gap-2 rounded-[8px] border border-[#DCE8ED] bg-white px-4 text-[12px] font-bold text-[#52616B] hover:border-[#7CC9D8]">
              <RotateCcw className="size-4" />초기화
            </button>
          </header>

          <div className="flex flex-wrap gap-3 rounded-[16px] border border-[#DCE8ED] bg-white p-4 shadow-[0_7px_22px_rgba(18,48,71,0.05)]">
            <label className="flex min-w-[240px] flex-1 items-center gap-3 text-[12px] font-bold">
              자치구 선택
              <select value={selectedDistrict.name} onChange={(event) => setRegion(event.target.value)} className="h-11 flex-1 rounded-[8px] border border-[#DCE8ED] bg-white px-3 outline-none focus:border-[#0F8AA8]">
                {DISTRICT_PRICES.map((district) => <option key={district.name}>{district.name}</option>)}
              </select>
            </label>
            <label className="flex min-w-[240px] flex-1 items-center gap-3 text-[12px] font-bold">
              자치동 선택
              <select value={selectedDong} onChange={(event) => setRegion(selectedDistrict.name, event.target.value)} className="h-11 flex-1 rounded-[8px] border border-[#DCE8ED] bg-white px-3 outline-none focus:border-[#0F8AA8]">
                {selectedDistrict.dongs.map((dong) => <option key={dong}>{dong}</option>)}
              </select>
            </label>
          </div>

          <div className="relative overflow-hidden rounded-[20px] border border-[#D7E7EC] bg-[linear-gradient(145deg,#F8FCFD,#EAF4F6)] p-3 shadow-[0_18px_45px_rgba(18,48,71,0.10)] sm:p-7">
            <div className="pointer-events-none absolute -left-20 top-1/3 size-72 rounded-full bg-[#9DD7DF]/20 blur-3xl" />
            <div className="pointer-events-none absolute -right-20 bottom-0 size-80 rounded-full bg-[#F5D778]/15 blur-3xl" />
            <div className="relative mx-auto max-w-[1120px] overflow-hidden rounded-[14px] border border-white/90 bg-[#F4F7F5] shadow-inner">
              <SeoulDistrictMap
                selectedDistrict={selectedDistrict.name}
                preferredDistrict={preferredDistrict}
                onSelect={setRegion}
              />
            </div>
            <div className="absolute bottom-5 left-5 hidden items-center gap-3 rounded-[14px] border border-white/80 bg-white/90 px-4 py-3 shadow-[0_10px_25px_rgba(18,48,71,.12)] backdrop-blur md:flex">
              <span className="flex size-10 items-center justify-center rounded-full bg-[#E1F4F7] text-[#0F8AA8]"><TrendingUp className="size-5" /></span>
              <span><small className="block text-[10px] font-bold text-[#7B8790]">선택 지역 평균 매매가</small><strong className="block text-[18px] font-black text-[#073B4C]">{selectedDistrict.name} · {formatPrice(selectedDistrict.averagePrice)}</strong></span>
            </div>
          </div>

          <section className="overflow-hidden rounded-[14px] border border-[#DCE8ED] bg-white">
            <button
              type="button"
              onClick={() => setDistrictExpanded((value) => !value)}
              className="flex w-full items-center justify-between border-0 bg-white px-5 py-4 text-left hover:bg-[#F8FBFC]"
              aria-expanded={districtExpanded}
            >
              <span>
                <strong className="block text-[17px] font-black">{selectedDistrict.name} 동별 평균가격</strong>
                <small className="mt-1 block text-[12px] font-medium text-[#6B7280]">지도에서 구를 선택하면 해당 구의 동 목록이 펼쳐집니다.</small>
              </span>
              <ChevronDown className={`size-5 text-[#0F8AA8] transition-transform ${districtExpanded ? "rotate-180" : ""}`} />
            </button>
            {districtExpanded && (
              <div className="grid max-h-[430px] gap-3 overflow-y-auto border-t border-[#DCE8ED] bg-[#F8FBFC] p-4 sm:grid-cols-2 xl:grid-cols-4">
                {dongPrices.map((dong) => {
                  const active = dong.name === selectedDong;
                  return (
                    <button
                      key={dong.name}
                      type="button"
                      onClick={() => setRegion(selectedDistrict.name, dong.name)}
                      className={`rounded-[10px] border p-4 text-left transition-all ${active ? "border-[#0F8AA8] bg-[#E8F6F9] shadow-[0_5px_14px_rgba(15,138,168,.12)]" : "border-[#DCE8ED] bg-white hover:border-[#7CC9D8]"}`}
                    >
                      <span className={`block text-[13px] font-extrabold ${active ? "text-[#0F8AA8]" : "text-[#13202B]"}`}>{dong.name}</span>
                      <strong className="mt-2 block text-[18px] font-black">{formatPrice(dong.averagePrice)}</strong>
                      <small className="mt-1 block text-[10px] text-[#7B8790]">평균 매매가</small>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <div className="rounded-[14px] border border-[#DCE8ED] bg-white p-5">
            <h2 className="text-[18px] font-black">{selectedDistrict.name} {selectedDong} 아파트 시세 분석</h2>
            <p className="mt-1 text-[12px] text-[#6B7280]">선택한 지역의 평균 매매가 기준 상위·하위 5개 단지입니다.</p>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {[{ title: "상위 5개 아파트 단지", items: sortedApartments.slice(0, 5), color: "text-rose-500" }, { title: "하위 5개 아파트 단지", items: sortedApartments.slice(-5).reverse(), color: "text-[#1677D2]" }].map((group) => (
                <div key={group.title} className="overflow-hidden rounded-[10px] border border-[#DCE8ED]">
                  <h3 className={`px-4 py-3 text-[14px] font-black ${group.color}`}>{group.title}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px] text-left text-[12px]">
                      <thead className="bg-[#F5FAFC] text-[#6B7280]"><tr><th className="px-3 py-2">순위</th><th className="px-3 py-2">아파트 단지</th><th className="px-3 py-2">평균 매매가</th><th className="px-3 py-2">평균 전세가</th><th className="px-3 py-2">전세가율</th></tr></thead>
                      <tbody>{group.items.map((item, index) => <tr key={item.name} className="border-t border-[#EDF2F4]"><td className="px-3 py-2 font-bold">{index + 1}</td><td className="px-3 py-2 font-semibold">{item.name}</td><td className="px-3 py-2">{formatPrice(item.salePrice)}</td><td className="px-3 py-2">{formatPrice(item.rentPrice)}</td><td className="px-3 py-2">{((item.rentPrice / item.salePrice) * 100).toFixed(1)}%</td></tr>)}</tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
