import { Link } from "react-router-dom";
import { LockKeyhole, Settings2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardError, CardSkeleton } from "@/features/main/components/DataCardState";
import { PreferencePopularDongCard } from "@/features/main/components/PreferencePopularDongCard";
import { PreferencePriceTrendCard } from "@/features/main/components/PreferencePriceTrendCard";
import {
  PreferenceTradingApartmentsCard,
  PreferenceTradingDongsCard,
} from "@/features/main/components/PreferenceRankingCards";
import type { PreferenceDashboardData } from "@/features/main/types/mainPage.types";

function PreferenceLoadingCard({ chart = false }: { chart?: boolean }) {
  return (
    <Card className="rounded-2xl border-[#DCE8ED] bg-white shadow-[0_3px_12px_rgba(18,48,71,0.05)]">
      <CardContent className="p-5">
        <div className="mb-4 h-7 w-44 animate-pulse rounded-lg bg-[#EAF2F5]" />
        <CardSkeleton rows={chart ? 5 : 4} />
      </CardContent>
    </Card>
  );
}

function PreferenceErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="rounded-2xl border-[#DCE8ED] bg-white shadow-[0_3px_12px_rgba(18,48,71,0.05)]">
      <CardContent className="p-5">
        <CardError onRetry={onRetry} />
      </CardContent>
    </Card>
  );
}

export function PreferenceDashboardLoading() {
  return (
    <>
      <PreferenceLoadingCard chart />
      <PreferenceLoadingCard />
      <PreferenceLoadingCard />
      <PreferenceLoadingCard />
    </>
  );
}

export function PreferenceDashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      <PreferenceErrorCard onRetry={onRetry} />
      <PreferenceErrorCard onRetry={onRetry} />
      <PreferenceErrorCard onRetry={onRetry} />
      <PreferenceErrorCard onRetry={onRetry} />
    </>
  );
}

export function PreferenceLoginNotice() {
  return (
    <Card className="rounded-2xl border-[#CFE7EE] bg-white shadow-[0_4px_18px_rgba(18,48,71,0.06)] md:col-span-2 xl:col-span-3">
      <CardContent className="flex flex-col items-start gap-4 p-5 sm:p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F6F9] text-[#0F8AA8]">
            <LockKeyhole className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="m-0 text-base sm:text-lg font-black text-[#123047]">선호지역 대시보드</h2>
            <p className="mb-0 mt-1 text-xs sm:text-sm leading-5 sm:leading-6 text-[#526573]">
              로그인하면 선호지역의 실거래 추이와 거래량을 확인할 수 있습니다.
            </p>
          </div>
        </div>
        <Button asChild className="h-10 sm:h-11 shrink-0 rounded-lg bg-[#0F8AA8] px-5 text-sm font-bold text-white hover:bg-[#0B5E73]">
          <Link to="/login">로그인</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function PreferenceSetupNotice() {
  return (
    <Card className="rounded-2xl border-[#CFE7EE] bg-white shadow-[0_4px_18px_rgba(18,48,71,0.06)] md:col-span-2 xl:col-span-3">
      <CardContent className="flex flex-col items-start gap-4 p-5 sm:p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F6F9] text-[#0F8AA8]">
            <Settings2 className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="m-0 text-base sm:text-lg font-black text-[#123047]">선호지역을 설정해 보세요</h2>
            <p className="mb-0 mt-1 text-xs sm:text-sm leading-5 sm:leading-6 text-[#526573]">
              선호지역을 설정하면 맞춤형 시장 정보를 확인할 수 있습니다.
            </p>
          </div>
        </div>
        <Button asChild className="h-10 sm:h-11 shrink-0 rounded-lg bg-[#0F8AA8] px-5 text-sm font-bold text-white hover:bg-[#0B5E73]">
          <Link to="/mypage">선호지역 설정</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function PreferenceDashboard({
  districtName,
  data,
  middleCard,
}: {
  districtName?: string | null;
  data: PreferenceDashboardData;
  middleCard: ReactNode;
}) {
  return (
    <>
      <PreferencePriceTrendCard districtName={districtName} items={data.priceTrend} />
      <PreferencePopularDongCard item={data.popularDong} />
      {middleCard}
      <PreferenceTradingDongsCard items={data.topTradingDongs} />
      <PreferenceTradingApartmentsCard items={data.topTradingApartments} />
    </>
  );
}
