import { Trophy } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardEmpty } from "@/features/main/components/DataCardState";
import type { DistrictPriceItem } from "@/features/main/types/mainPage.types";
import { formatPriceInManwon, formatPyeongPrice } from "@/features/main/utils/mainPageFormat";

export function DistrictTop5Card({ items }: { items: DistrictPriceItem[] }) {
  return (
    <Card className="h-full rounded-2xl border-[#DCE8ED] bg-white shadow-[0_3px_12px_rgba(18,48,71,0.05)]">
      <CardHeader className="border-b border-[#E8EFF2] p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F6F9] text-[#0F8AA8]">
            <Trophy className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base font-black text-[#123047]">서울시 지역별 평균가격 TOP 5</CardTitle>
            <p className="mb-0 mt-0.5 text-xs text-[#6B7280]">평균 거래가격 기준 자치구 순위</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {items.length === 0 ? (
          <CardEmpty />
        ) : (
          <ol className="m-0 divide-y divide-[#EDF2F4] p-0">
            {items.map((item) => (
              <li
                key={`${item.rank}-${item.districtName}`}
                className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 py-2.5 first:pt-0 last:pb-0 hover:bg-[#F8FBFC]"
              >
                <span className="text-center text-xs font-black text-[#526573]">{item.rank}</span>
                <span className="min-w-0 truncate text-sm font-bold text-[#13202B]" title={item.districtName}>
                  {item.districtName || "-"}
                </span>
                <span className="text-right shrink-0">
                  <strong className="block text-sm font-black tabular-nums text-[#123047]">
                    {formatPriceInManwon(item.averageDealPrice)}
                  </strong>
                  <small className="block text-[11px] font-medium tabular-nums text-[#6B7280]">
                    {formatPyeongPrice(item.averagePyeongPrice)}
                  </small>
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
