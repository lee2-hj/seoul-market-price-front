import { useMemo, useState } from "react";
import { Building2, MapPinned } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardEmpty } from "@/features/main/components/DataCardState";
import type {
  PreferenceTradingApartmentItem,
  PreferenceTradingDongItem,
} from "@/features/main/types/mainPage.types";
import { formatPriceInManwon, formatTradeCount } from "@/features/main/utils/mainPageFormat";

function Rank({ value }: { value: number }) {
  return <span className="text-center text-xs font-black text-[#526573]">{value}</span>;
}

interface RankListRow {
  key: string;
  rank: number;
  primary: string;
  primaryTitle: string;
  secondary: string;
  value: string;
}

function RankList({ rows }: { rows: RankListRow[] }) {
  if (rows.length === 0) return <CardEmpty />;
  return (
    <ol className="m-0 divide-y divide-[#EDF2F4] p-0">
      {rows.map((row) => (
        <li
          key={row.key}
          className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 py-2.5 first:pt-0 last:pb-0 hover:bg-[#F8FBFC]"
        >
          <Rank value={row.rank} />
          <span className="min-w-0">
            <strong className="block truncate text-sm text-[#13202B]" title={row.primaryTitle}>
              {row.primary}
            </strong>
            <span className="block truncate text-[11px] text-[#6B7280]">{row.secondary}</span>
          </span>
          <strong className="text-right text-sm tabular-nums text-[#123047] shrink-0">
            {row.value}
          </strong>
        </li>
      ))}
    </ol>
  );
}

type TradingRankingTab = "dong" | "apartment";

export function PreferenceTradingDongsCard({
  titlePrefix = "내 선호지역",
  items,
  topTradingApartments,
}: {
  titlePrefix?: string;
  items: PreferenceTradingDongItem[];
  topTradingApartments: PreferenceTradingApartmentItem[];
}) {
  const [tab, setTab] = useState<TradingRankingTab>("dong");
  const isDong = tab === "dong";

  const dongRows: RankListRow[] = useMemo(
    () =>
      items.map((item) => ({
        key: `dong-${item.rank}-${item.districtName}-${item.dongName}`,
        rank: item.rank,
        primary: item.dongName,
        primaryTitle: `${item.districtName} ${item.dongName}`,
        secondary: item.districtName,
        value: formatTradeCount(item.dealCount),
      })),
    [items],
  );

  const apartmentRows: RankListRow[] = useMemo(
    () =>
      topTradingApartments.slice(0, 5).map((apt) => ({
        key: `apt-${apt.rank}-${apt.apartmentName}`,
        rank: apt.rank,
        primary: apt.apartmentName,
        primaryTitle: apt.apartmentName,
        secondary: `${apt.pyeong ? `${apt.pyeong}평 · ` : ""}최근 ${formatPriceInManwon(apt.recentDealPrice)}`,
        value: formatTradeCount(apt.dealCount),
      })),
    [topTradingApartments],
  );

  const rows = isDong ? dongRows : apartmentRows;
  const Icon = isDong ? MapPinned : Building2;

  return (
    <Card className="h-full rounded-2xl border-[#DCE8ED] bg-white shadow-[0_3px_12px_rgba(18,48,71,0.05)]">
      <CardHeader className="border-b border-[#E8EFF2] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F6F9] text-[#0F8AA8]">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-base font-black text-[#123047]">
                {titlePrefix ? `${titlePrefix} 거래량 TOP 5` : "거래량 TOP 5"}
              </CardTitle>
              <p className="mb-0 mt-0.5 text-xs text-[#6B7280]">
                {isDong ? "법정동별 거래 건수 순위" : "아파트별 최근 거래가와 거래 건수"}
              </p>
            </div>
          </div>

          {/* 법정동/아파트 토글 버튼 */}
          <div
            role="tablist"
            aria-label="거래량 TOP 5 기준 전환"
            className="flex shrink-0 items-center gap-2"
          >
            <button
              type="button"
              role="tab"
              aria-selected={isDong}
              onClick={() => setTab("dong")}
              className={`rounded-full border bg-white px-3 py-1.5 text-xs font-black shadow-xs transition-colors ${
                isDong
                  ? "border-[#0F8AA8] text-[#0F8AA8]"
                  : "border-[#E2E8F0] text-[#94A3B8] hover:text-[#64748B]"
              }`}
            >
              법정동
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isDong}
              onClick={() => setTab("apartment")}
              className={`rounded-full border bg-white px-3 py-1.5 text-xs font-black shadow-xs transition-colors ${
                !isDong
                  ? "border-[#0F8AA8] text-[#0F8AA8]"
                  : "border-[#E2E8F0] text-[#94A3B8] hover:text-[#64748B]"
              }`}
            >
              아파트
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <RankList rows={rows} />
      </CardContent>
    </Card>
  );
}
