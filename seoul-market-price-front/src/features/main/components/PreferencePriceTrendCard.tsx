import { TrendingUp } from "lucide-react";

import { ApartmentTradeTrendChart } from "@/components/charts/ApartmentTradeTrendChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardEmpty } from "@/features/main/components/DataCardState";
import type { PreferencePriceTrendItem } from "@/features/main/types/mainPage.types";
import {
  formatPriceInManwon,
  formatPyeongPrice,
  formatTradeCount,
} from "@/features/main/utils/mainPageFormat";
import {
  calculateNinetyDayTrendSummary,
  createTrendChartRows,
  formatTrendPeriodRange,
} from "@/features/main/utils/mainPageTrendUtils";

export function PreferencePriceTrendCard({
  titlePrefix = "내 선호지역",
  districtName,
  items,
}: {
  titlePrefix?: string;
  districtName?: string | null;
  items: PreferencePriceTrendItem[];
}) {
  const summary = calculateNinetyDayTrendSummary(items);
  const chartData = createTrendChartRows(items);
  const periodRangeText = formatTrendPeriodRange(items);

  const maxPrice = Math.max(0, ...items.map((item) => item?.averageDealPrice ?? 0));
  const averagePriceAxisTicks = maxPrice === 0
    ? [{ v: 0, f: "0원" }]
    : Array.from({ length: 5 }, (_, index) => {
        const value = Math.round((maxPrice * index) / 4);
        return { v: value, f: formatPriceInManwon(value) };
      });

  return (
    <Card className="h-full rounded-2xl border-[#DCE8ED] bg-white shadow-[0_3px_12px_rgba(18,48,71,0.05)]">
      <CardHeader className="border-b border-[#E8EFF2] p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F6F9] text-[#0F8AA8]">
            <TrendingUp className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base font-black text-[#123047]">
              {titlePrefix ? `${titlePrefix} 실거래 추이` : "실거래 추이"}
            </CardTitle>
            <p className="mb-0 mt-0.5 truncate text-xs text-[#6B7280]">
              {districtName ? `${districtName} 평균 거래가와 거래량` : "평균 거래가와 거래량"}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {items.length === 0 ? (
          <CardEmpty />
        ) : (
          <>
            <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-[#526573]" aria-label="차트 범례">
              <span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-[#2563EB]" />거래량</span>
              <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-[#16A34A]" />평균 거래가</span>
            </div>
            <div className="h-[190px] min-w-0 w-full max-w-full">
              <ApartmentTradeTrendChart data={chartData} averagePriceAxisTicks={averagePriceAxisTicks} height="190px" />
            </div>
            <p className="mb-2 text-[11px] text-[#6B7280]">
              최근 기간: {periodRangeText}
            </p>
            <dl className="grid grid-cols-3 divide-x divide-[#E8EFF2] border-t border-[#E8EFF2] pt-2 text-[10px] sm:text-[11px]">
              <div className="min-w-0 px-1 sm:px-2 first:pl-0" title={`현재 평균 거래가: ${formatPriceInManwon(summary.totalDealCount > 0 ? summary.averageDealPrice : Number.NaN)}`}>
                <dt className="truncate text-[#6B7280]">현재 평균 거래가</dt>
                <dd className="m-0 truncate font-black text-[#123047]">
                  {formatPriceInManwon(summary.totalDealCount > 0 ? summary.averageDealPrice : Number.NaN)}
                </dd>
              </div>
              <div className="min-w-0 px-1 sm:px-2" title={`현재 평균 평당 가격: ${formatPyeongPrice(summary.totalDealCount > 0 ? summary.averagePyeongPrice : Number.NaN)}`}>
                <dt className="truncate text-[#6B7280]">현재 평균 평당 가격</dt>
                <dd className="m-0 truncate font-black text-[#123047]">
                  {formatPyeongPrice(summary.totalDealCount > 0 ? summary.averagePyeongPrice : Number.NaN)}
                </dd>
              </div>
              <div className="min-w-0 px-1 sm:px-2 pr-0" title={`최근 90일 거래량: ${formatTradeCount(summary.totalDealCount)}`}>
                <dt className="truncate text-[#6B7280]">최근 90일 거래량</dt>
                <dd className="m-0 truncate font-black text-[#123047]">
                  {formatTradeCount(summary.totalDealCount)}
                </dd>
              </div>
            </dl>
          </>
        )}
      </CardContent>
    </Card>
  );
}
