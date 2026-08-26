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

export function PreferenceLoginBanner() {
  return (
    <div className="mt-1 flex flex-col items-start justify-between gap-3 rounded-2xl border border-[#DCE8ED] bg-white/80 p-4 sm:flex-row sm:items-center sm:px-6 md:col-span-2 xl:col-span-3">
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#E8F6F9] text-[#0F8AA8]">
          <LockKeyhole className="size-4" aria-hidden="true" />
        </span>
        <p className="m-0 text-xs text-[#526573] sm:text-sm">
          로그인하시면 자주 찾는 자치구를 <strong className="font-semibold text-[#123047]">선호지역</strong>으로 등록하여 맞춤형 시세를 바로 확인할 수 있습니다.
        </p>
      </div>
      <Button asChild size="sm" className="h-8 shrink-0 rounded-lg bg-[#0F8AA8] px-3.5 text-xs font-bold text-white hover:bg-[#0B5E73]">
        <Link to="/login">로그인</Link>
      </Button>
    </div>
  );
}

export function PreferenceSetupBanner() {
  return (
    <div className="mt-1 flex flex-col items-start justify-between gap-3 rounded-2xl border border-[#DCE8ED] bg-white/80 p-4 sm:flex-row sm:items-center sm:px-6 md:col-span-2 xl:col-span-3">
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#E8F6F9] text-[#0F8AA8]">
          <Settings2 className="size-4" aria-hidden="true" />
        </span>
        <p className="m-0 text-xs text-[#526573] sm:text-sm">
          선호지역이 아직 설정되지 않았습니다. 마이페이지에서 <strong className="font-semibold text-[#123047]">선호지역</strong>을 설정해 보세요.
        </p>
      </div>
      <Button asChild size="sm" className="h-8 shrink-0 rounded-lg bg-[#0F8AA8] px-3.5 text-xs font-bold text-white hover:bg-[#0B5E73]">
        <Link to="/mypage">선호지역 설정</Link>
      </Button>
    </div>
  );
}

export function PreferenceDashboard({
  titlePrefix = "내 선호지역",
  districtName,
  data,
  middleCard,
}: {
  titlePrefix?: string;
  districtName?: string | null;
  data: PreferenceDashboardData;
  middleCard: ReactNode;
}) {
  return (
    <>
      <PreferencePriceTrendCard titlePrefix={titlePrefix} districtName={districtName} items={data.priceTrend} />
      <PreferencePopularDongCard titlePrefix={titlePrefix} item={data.popularDong} />
      {middleCard}
      <PreferenceTradingDongsCard titlePrefix={titlePrefix} items={data.topTradingDongs} />
      <PreferenceTradingApartmentsCard titlePrefix={titlePrefix} items={data.topTradingApartments} />
    </>
  );
}
