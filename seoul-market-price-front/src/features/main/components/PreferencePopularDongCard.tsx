import { MapPin } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardEmpty } from "@/features/main/components/DataCardState";
import { MainPopularDongMap } from "@/features/main/components/MainPopularDongMap";
import type { PreferencePopularDongItem } from "@/features/main/types/mainPage.types";

export function PreferencePopularDongCard({
  titlePrefix = "내 선호지역",
  item,
}: {
  titlePrefix?: string;
  item: PreferencePopularDongItem | null;
}) {
  return (
    <Card className="flex h-full flex-col rounded-2xl border-[#DCE8ED] bg-white shadow-[0_3px_12px_rgba(18,48,71,0.05)]">
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
      <CardContent className="flex flex-1 flex-col justify-between p-4">
        {!item || !item.districtName || !item.dongName ? (
          <CardEmpty />
        ) : (
          <MainPopularDongMap
            districtName={item.districtName}
            dongName={item.dongName}
          />
        )}
      </CardContent>
    </Card>
  );
}
