import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardEmpty } from "@/features/main/components/DataCardState";
import type { PriceChangeItem } from "@/features/main/types/mainPage.types";
import { formatChangeRate } from "@/features/main/utils/mainPageFormat";

type DisplayMode = "rising" | "falling";

export function PriceChangeTop5Card({
  rising,
  falling,
}: {
  rising: PriceChangeItem[];
  falling: PriceChangeItem[];
}) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("rising");
  const [isHovered, setIsHovered] = useState(false);

  /**
   * [5초 단위 자동 전환]
   * 5초 간격으로 상승 TOP 5와 하락 TOP 5를 번갈아가며 자동 전환합니다.
   * 사용자가 마우스를 올리고 있는 동안에는 편하게 확인할 수 있도록 일시정지합니다.
   * prefers-reduced-motion 설정 시 자동 전환을 실행하지 않습니다.
   */
  useEffect(() => {
    if (isHovered) return;

    if (typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mediaQuery.matches) return;
    }

    const intervalId = window.setInterval(() => {
      setDisplayMode((prev) => (prev === "rising" ? "falling" : "rising"));
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isHovered]);

  const isRising = displayMode === "rising";
  const currentItems = isRising ? rising : falling;
  const Icon = isRising ? ArrowUpRight : ArrowDownRight;

  return (
    <Card
      className="h-full rounded-2xl border-[#DCE8ED] bg-white shadow-[0_3px_12px_rgba(18,48,71,0.05)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="border-b border-[#E8EFF2] p-4">
        <div className="flex items-center gap-3">
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
      </CardHeader>
      <CardContent className="p-4">
        {/* 현재 표시 상태 헤더 (상승 / 하락 5초 롤링 뱃지 및 인디케이터) */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black transition-colors ${
                isRising
                  ? "bg-[#FEF2F2] text-[#DC2626]"
                  : "bg-[#EFF6FF] text-[#2563EB]"
              }`}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden="true" />
              {isRising ? "상승 TOP 5" : "하락 TOP 5"}
            </span>
          </div>
          {/* 상태 인디케이터 */}
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span
              className={`size-1.5 rounded-full transition-all duration-300 ${
                isRising ? "w-4 bg-[#DC2626]" : "bg-[#CBD5E1]"
              }`}
            />
            <span
              className={`size-1.5 rounded-full transition-all duration-300 ${
                !isRising ? "w-4 bg-[#2563EB]" : "bg-[#CBD5E1]"
              }`}
            />
          </div>
        </div>

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
