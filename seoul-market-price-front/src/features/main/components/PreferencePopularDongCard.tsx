import { useMemo, useState } from "react";
import { Building2, MapPin } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardEmpty } from "@/features/main/components/DataCardState";
import { MainPopularDongMap } from "@/features/main/components/MainPopularDongMap";
import type {
  PreferencePopularDongItem,
  PreferenceTradingApartmentItem,
} from "@/features/main/types/mainPage.types";
import { formatPriceInManwon, formatTradeCount } from "@/features/main/utils/mainPageFormat";

type RankGroup = "top" | "bottom";

function Rank({ value }: { value: number }) {
  return <span className="text-center text-xs font-black text-[#526573]">{value}</span>;
}

export function PreferencePopularDongCard({
  titlePrefix = "내 선호지역",
  item,
  topTradingApartments,
}: {
  titlePrefix?: string;
  item: PreferencePopularDongItem | null;
  topTradingApartments: PreferenceTradingApartmentItem[];
}) {
  const [rankGroup, setRankGroup] = useState<RankGroup>("top");
  const isTop = rankGroup === "top";

  // 인덱스로 자르지 않고 거래 건수(dealCount) 값 기준으로 상위/하위 5개를 직접 추출한 뒤,
  // 화면에 표시할 순번을 1~5로 다시 매긴다.
  const visibleApartments = useMemo(() => {
    const sorted = [...topTradingApartments].sort((a, b) =>
      isTop ? b.dealCount - a.dealCount : a.dealCount - b.dealCount,
    );
    return sorted.slice(0, 5).map((apt, index) => ({ ...apt, rank: index + 1 }));
  }, [topTradingApartments, isTop]);

  return (
    <Card className="flex h-full flex-col rounded-2xl border-[#DCE8ED] bg-white shadow-[0_3px_12px_rgba(18,48,71,0.05)]">
      {/* 상단: 인기지역 지도 */}
      <CardHeader className="border-b border-[#E8EFF2] p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F6F9] text-[#0F8AA8]">
            <MapPin className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base font-black text-[#123047]">
              {titlePrefix ? `${titlePrefix} 인기지역` : "인기지역"}
            </CardTitle>
            <p className="mb-0 mt-0.5 text-xs text-[#6B7280]">최근 거래가 가장 활발한 법정동</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {!item || !item.districtName || !item.dongName ? (
          <CardEmpty />
        ) : (
          <MainPopularDongMap
            districtName={item.districtName}
            dongName={item.dongName}
          />
        )}
      </CardContent>

      {/* 하단: 아파트 거래량 TOP 5 (상위/하위 토글) */}
      <CardHeader className="border-y border-[#E8EFF2] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F6F9] text-[#0F8AA8]">
              <Building2 className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-base font-black text-[#123047]">
                {titlePrefix ? `${titlePrefix} 아파트 거래량 TOP 5` : "아파트 거래량 TOP 5"}
              </CardTitle>
              <p className="mb-0 mt-0.5 text-xs text-[#6B7280]">아파트별 최근 거래가와 거래 건수</p>
            </div>
          </div>

          {/* 상위/하위 TOP 5 토글 버튼 */}
          <div
            role="tablist"
            aria-label="아파트 거래량 순위 전환"
            className="flex shrink-0 items-center gap-2"
          >
            <button
              type="button"
              role="tab"
              aria-selected={isTop}
              onClick={() => setRankGroup("top")}
              className={`rounded-full border bg-white px-3 py-1.5 text-xs font-black shadow-xs transition-colors ${
                isTop
                  ? "border-[#0F8AA8] text-[#0F8AA8]"
                  : "border-[#E2E8F0] text-[#94A3B8] hover:text-[#64748B]"
              }`}
            >
              상위
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isTop}
              onClick={() => setRankGroup("bottom")}
              className={`rounded-full border bg-white px-3 py-1.5 text-xs font-black shadow-xs transition-colors ${
                !isTop
                  ? "border-[#0F8AA8] text-[#0F8AA8]"
                  : "border-[#E2E8F0] text-[#94A3B8] hover:text-[#64748B]"
              }`}
            >
              하위
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4">
        {visibleApartments.length === 0 ? (
          <CardEmpty />
        ) : (
          <ol className="m-0 divide-y divide-[#EDF2F4] p-0">
            {visibleApartments.map((apt) => (
              <li
                key={`${apt.rank}-${apt.apartmentName}`}
                className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 py-2.5 first:pt-0 last:pb-0 hover:bg-[#F8FBFC]"
              >
                <Rank value={apt.rank} />
                <span className="min-w-0">
                  <strong className="block truncate text-sm text-[#13202B]" title={apt.apartmentName}>
                    {apt.apartmentName}
                  </strong>
                  <span className="block truncate text-[11px] text-[#6B7280]">
                    {apt.pyeong ? `${apt.pyeong}평 · ` : ""}최근 {formatPriceInManwon(apt.recentDealPrice)}
                  </span>
                </span>
                <strong className="text-right text-sm tabular-nums text-[#123047] shrink-0">
                  {formatTradeCount(apt.dealCount)}
                </strong>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
