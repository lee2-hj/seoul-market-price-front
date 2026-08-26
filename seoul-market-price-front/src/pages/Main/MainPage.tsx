import { CalendarDays } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  PreferenceDashboard,
  PreferenceDashboardError,
  PreferenceDashboardLoading,
  PreferenceLoginNotice,
  PreferenceSetupNotice,
} from "@/features/main/components/PreferenceDashboard";
import { CardError, CardSkeleton } from "@/features/main/components/DataCardState";
import { DistrictTop5Card } from "@/features/main/components/DistrictTop5Card";
import { MainHeroSearch } from "@/features/main/components/MainHeroSearch";
import { PriceChangeTop5Card } from "@/features/main/components/PriceChangeTop5Card";
import { useMainPageData } from "@/features/main/hooks/useMainPageData";
import { usePreferenceDashboardData } from "@/features/main/hooks/usePreferenceDashboardData";
import { formatPeriod } from "@/features/main/utils/mainPageFormat";
import { useAuthStore } from "@/features/auth/store/useAuthStore";

function LoadingCard() {
  return (
    <Card className="rounded-2xl border-[#DCE8ED] bg-white shadow-[0_4px_18px_rgba(18,48,71,0.06)]">
      <CardContent className="p-5"><div className="mb-4 h-7 w-52 max-w-full animate-pulse rounded-lg bg-[#EAF2F5]" /><CardSkeleton rows={4} /></CardContent>
    </Card>
  );
}

export default function MainPage() {
  const user = useAuthStore((state) => state.user);
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);
  const myGuCode = user?.myGuCode?.trim();
  const hasPreferredDistrict = Boolean(myGuCode && /^\d+$/.test(myGuCode));
  const mainPageQuery = useMainPageData(isAuthInitialized);
  const preferenceQuery = usePreferenceDashboardData({
    userId: user?.userId,
    myGuCode: user?.myGuCode,
    enabled: isAuthInitialized,
  });
  const data = mainPageQuery.data;
  const preferenceData = preferenceQuery.data;
  const period = data ? formatPeriod(data.periodStart, data.periodEnd) : "";
  const hasPreferenceData = Boolean(
    isAuthInitialized && user && hasPreferredDistrict && preferenceData,
  );

  return (
    <div className="min-w-0 w-full max-w-full bg-[#F5FAFC] text-[#13202B]">
      <MainHeroSearch />

      <section aria-labelledby="market-overview-title" className="mx-auto min-w-0 w-full max-w-[1360px] px-5 py-7 md:px-8 md:py-8">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-black tracking-[0.12em] text-[#0F8AA8]">SEOUL MARKET OVERVIEW</p>
            <h2 id="market-overview-title" className="m-0 text-2xl font-black tracking-[-0.03em] text-[#123047] md:text-3xl">한눈에 보는 서울 아파트 시장</h2>
          </div>
          {period && <p className="m-0 flex items-center gap-2 text-sm font-bold text-[#526573]"><CalendarDays className="size-4 text-[#0F8AA8]" aria-hidden="true" />{period}</p>}
        </div>

        <div className="grid min-w-0 items-start gap-4 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
          {mainPageQuery.isPending ? <><LoadingCard /><LoadingCard /></> : mainPageQuery.isError ? <Card className="rounded-2xl border-[#DCE8ED] bg-white md:col-span-2"><CardContent className="p-5"><CardError onRetry={() => void mainPageQuery.refetch()} /></CardContent></Card> : data ? <>
            <DistrictTop5Card items={data.districts} />
            {hasPreferenceData && preferenceData ? <PreferenceDashboard districtName={user?.myGu} data={preferenceData} middleCard={<PriceChangeTop5Card rising={data.rising} falling={data.falling} />} /> : <><PriceChangeTop5Card rising={data.rising} falling={data.falling} />{!isAuthInitialized ? <PreferenceDashboardLoading /> : !user ? <PreferenceLoginNotice /> : !hasPreferredDistrict ? <PreferenceSetupNotice /> : preferenceQuery.isPending ? <PreferenceDashboardLoading /> : preferenceQuery.isError ? <PreferenceDashboardError onRetry={() => void preferenceQuery.refetch()} /> : null}</>}
          </> : null}
        </div>
      </section>
    </div>
  );
}
