import { MapPin } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardEmpty } from "@/features/main/components/DataCardState";
import type { PreferencePopularDongItem } from "@/features/main/types/mainPage.types";

export function PreferencePopularDongCard({ item }: { item: PreferencePopularDongItem | null }) {
  return <Card className="h-full rounded-2xl border-[#DCE8ED] bg-white shadow-[0_3px_12px_rgba(18,48,71,0.05)]"><CardHeader className="border-b border-[#E8EFF2] p-4"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-[#E8F6F9] text-[#0F8AA8]"><MapPin className="size-4" aria-hidden="true" /></span><div><CardTitle className="text-base font-black text-[#123047]">내 선호지역 인기지역</CardTitle><p className="mb-0 mt-0.5 text-xs text-[#6B7280]">최근 거래가 가장 활발한 법정동</p></div></div></CardHeader><CardContent className="p-4">{!item ? <CardEmpty /> : <div className="flex min-h-[144px] flex-col justify-center"><span className="text-xs font-semibold text-[#6B7280]">{item.districtName}</span><strong className="mt-1 break-words text-2xl font-black tracking-[-0.03em] text-[#123047]">{item.dongName}</strong><p className="mb-0 mt-3 text-sm leading-6 text-[#526573]">최근 거래가 가장 활발한 지역입니다.</p></div>}</CardContent></Card>;
}
