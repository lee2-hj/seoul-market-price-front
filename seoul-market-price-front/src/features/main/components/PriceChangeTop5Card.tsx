import { memo } from "react";
import { TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardEmpty } from "@/features/main/components/DataCardState";
import { usePriceChangeDisplay } from "@/features/main/hooks/usePriceChangeDisplay";
import type { PriceChangeItem } from "@/features/main/types/mainPage.types";
import { formatChangeRate } from "@/features/main/utils/mainPageFormat";

function PriceChangeTop5CardComponent({
  rising,
  falling,
}: {
  rising: PriceChangeItem[];
  falling: PriceChangeItem[];
}) {
  const { displayMode, selectDisplayMode, handleMouseEnter, handleMouseLeave } =
    usePriceChangeDisplay();

  const isRising = displayMode === "rising";
  const currentItems = isRising ? rising : falling;

  return (
    <Card
      className="h-full rounded-2xl border-[#DCE8ED] bg-white shadow-[0_3px_12px_rgba(18,48,71,0.05)]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <CardHeader className="border-b border-[#E8EFF2] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F6F9] text-[#0F8AA8]">
              <TrendingUp className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-base font-black text-[#123047]">
                서울시 가격 상승·하락 TOP 5
              </CardTitle>
              <p className="mb-0 mt-0.5 text-xs text-[#6B7280]">
                최근 기간 아파트 가격 변동률
              </p>
            </div>
          </div>

          {/* 상승/하락 토글 버튼 */}
          <div
            role="tablist"
            aria-label="가격 변동 순위 전환"
            className="flex shrink-0 items-center gap-2"
          >
            <button
              type="button"
              role="tab"
              aria-selected={isRising}
              onClick={() => selectDisplayMode("rising")}
              className={`rounded-full border bg-white px-3 py-1.5 text-xs font-black shadow-xs transition-colors ${
                isRising
                  ? "border-[#DC2626] text-[#DC2626]"
                  : "border-[#E2E8F0] text-[#94A3B8] hover:text-[#64748B]"
              }`}
            >
              상승
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isRising}
              onClick={() => selectDisplayMode("falling")}
              className={`rounded-full border bg-white px-3 py-1.5 text-xs font-black shadow-xs transition-colors ${
                !isRising
                  ? "border-[#2563EB] text-[#2563EB]"
                  : "border-[#E2E8F0] text-[#94A3B8] hover:text-[#64748B]"
              }`}
            >
              하락
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {/* 1열 목록 */}
        <div className="min-h-[195px] flex flex-col justify-start">
          {currentItems.length === 0 ? (
            <CardEmpty />
          ) : (
            <ol className="m-0 divide-y divide-[#EDF2F4] p-0">
              {currentItems.map((item) => (
                <li
                  key={`${displayMode}-${item.rank}-${item.apartmentName}`}
                  className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 py-2.5 first:pt-0 last:pb-0 hover:bg-[#F8FBFC]"
                >
                  <span className="text-center text-xs font-black text-[#526573]">
                    {item.rank}
                  </span>
                  <span
                    className="min-w-0 truncate text-sm font-bold text-[#13202B]"
                    title={item.apartmentName}
                  >
                    {item.apartmentName || "-"}
                  </span>
                  <span
                    className={`text-right text-sm font-black tabular-nums shrink-0 ${
                      isRising ? "text-[#DC2626]" : "text-[#2563EB]"
                    }`}
                  >
                    {isRising ? "▲ " : "▼ "}
                    {formatChangeRate(item.changeRate)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// rising/falling은 React Query 캐시(useMainPageData)에서 오는 안정적인 배열
// 참조이므로, MainPage의 다른 상태 변경으로 인한 불필요한 리렌더링을 막는다.
export const PriceChangeTop5Card = memo(PriceChangeTop5CardComponent);
