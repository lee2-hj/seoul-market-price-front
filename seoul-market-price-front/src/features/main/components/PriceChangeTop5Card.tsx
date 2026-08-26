import { ArrowDownRight, ArrowUpRight, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardEmpty } from "@/features/main/components/DataCardState";
import type { PriceChangeItem } from "@/features/main/types/mainPage.types";
import { formatChangeRate } from "@/features/main/utils/mainPageFormat";

function ChangeList({ items, direction }: { items: PriceChangeItem[]; direction: "rising" | "falling" }) {
  const isRising = direction === "rising";
  const Icon = isRising ? ArrowUpRight : ArrowDownRight;
  return (
    <section className="min-w-0">
      <h3 className="m-0 flex items-center gap-1.5 text-sm font-black text-[#123047]">
        <Icon className={`size-4 shrink-0 ${isRising ? "text-[#DC2626]" : "text-[#2563EB]"}`} aria-hidden="true" />
        {isRising ? "상승 TOP 5" : "하락 TOP 5"}
      </h3>
      {items.length === 0 ? (
        <CardEmpty />
      ) : (
        <ol className="mb-0 mt-2 divide-y divide-[#EDF2F4] p-0">
          {items.map((item) => (
            <li
              key={`${direction}-${item.rank}-${item.apartmentName}`}
              className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 py-2 first:pt-0 last:pb-0 hover:bg-[#F8FBFC]"
            >
              <span className="text-center text-xs font-black text-[#526573]">{item.rank}</span>
              <span className="min-w-0 truncate text-sm font-semibold text-[#13202B]" title={item.apartmentName}>
                {item.apartmentName || "-"}
              </span>
              <span
                className={`text-right text-sm font-black tabular-nums shrink-0 ${
                  isRising ? "text-[#DC2626]" : "text-[#2563EB]"
                }`}
              >
                {isRising ? "+" : "-"}{formatChangeRate(item.changeRate)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function PriceChangeTop5Card({ rising, falling }: { rising: PriceChangeItem[]; falling: PriceChangeItem[] }) {
  return (
    <Card className="h-full rounded-2xl border-[#DCE8ED] bg-white shadow-[0_3px_12px_rgba(18,48,71,0.05)]">
      <CardHeader className="border-b border-[#E8EFF2] p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F6F9] text-[#0F8AA8]">
            <TrendingUp className="size-4" aria-hidden="true" />
          </span>
          <div>
            <CardTitle className="text-base font-black text-[#123047]">서울시 가격 상승·하락 TOP 5</CardTitle>
            <p className="mb-0 mt-0.5 text-xs text-[#6B7280]">최근 기간 아파트 가격 변동률</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 p-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-1 2xl:grid-cols-1">
        <ChangeList items={rising} direction="rising" />
        <ChangeList items={falling} direction="falling" />
      </CardContent>
    </Card>
  );
}
