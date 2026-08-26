import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import {
  PreferenceDashboard,
  PreferenceDashboardError,
  PreferenceDashboardLoading,
  PreferenceLoginBanner,
  PreferenceSetupBanner,
} from "@/features/main/components/PreferenceDashboard";
import { CardError, CardSkeleton } from "@/features/main/components/DataCardState";
import { DistrictTop5Card } from "@/features/main/components/DistrictTop5Card";
import { MainHeroSearch } from "@/features/main/components/MainHeroSearch";
import { PriceChangeTop5Card } from "@/features/main/components/PriceChangeTop5Card";
import { useMainPageData } from "@/features/main/hooks/useMainPageData";
import { usePreferenceDashboardData } from "@/features/main/hooks/usePreferenceDashboardData";
import { resolveMainRegion } from "@/features/main/utils/mainRegionResolver";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import {
  getValidDetectedDistrict,
  REGION_CHANGED_EVENT,
} from "@/features/region-map/utils/regionSelection";

function LoadingCard() {
  return (
    <Card className="rounded-2xl border-[#DCE8ED] bg-white shadow-[0_4px_18px_rgba(18,48,71,0.06)]">
      <CardContent className="p-5">
        <div className="mb-4 h-7 w-52 max-w-full animate-pulse rounded-lg bg-[#EAF2F5]" />
        <CardSkeleton rows={4} />
      </CardContent>
    </Card>
  );
}

export default function MainPage() {
  const user = useAuthStore((state) => state.user);
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);
  const [, setDetectedDistrict] = useState(getValidDetectedDistrict);

  useEffect(() => {
    const handleRegionChange = () => {
      setDetectedDistrict(getValidDetectedDistrict());
    };
    window.addEventListener(REGION_CHANGED_EVENT, handleRegionChange);
    return () => {
      window.removeEventListener(REGION_CHANGED_EVENT, handleRegionChange);
    };
  }, []);

  const resolvedRegion = resolveMainRegion(user);

  const mainPageQuery = useMainPageData(isAuthInitialized);
  const regionDashboardQuery = usePreferenceDashboardData({
    source: resolvedRegion.source,
    guCode: resolvedRegion.guCode,
    userId: user?.userId,
    enabled: isAuthInitialized,
  });

  const data = mainPageQuery.data;
  const regionData = regionDashboardQuery.data;

  return (
    <div className="min-w-0 w-full max-w-full bg-[#F5FAFC] text-[#13202B]">
      <MainHeroSearch />

      <section aria-labelledby="market-overview-title" className="mx-auto min-w-0 w-full max-w-[1360px] px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
        <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <p className="m-0 text-xs font-black tracking-[0.12em] text-[#0F8AA8] sm:text-sm">SEOUL MARKET OVERVIEW</p>
              <span className="rounded-full bg-[#E8F6F9] px-2.5 py-0.5 text-[11px] font-extrabold text-[#0F8AA8]">
                {resolvedRegion.displayBadge}
              </span>
            </div>
            <h2 id="market-overview-title" className="m-0 text-2xl font-black tracking-[-0.03em] text-[#123047] sm:text-3xl">한눈에 보는 서울 아파트 시장</h2>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 items-start gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
          {mainPageQuery.isPending ? (
            <><LoadingCard /><LoadingCard /></>
          ) : mainPageQuery.isError ? (
            <Card className="rounded-2xl border-[#DCE8ED] bg-white md:col-span-2">
              <CardContent className="p-5">
                <CardError onRetry={() => void mainPageQuery.refetch()} />
              </CardContent>
            </Card>
          ) : data ? (
            <>
              <DistrictTop5Card items={data.districts} />
              {regionDashboardQuery.isPending ? (
                <PreferenceDashboardLoading />
              ) : regionDashboardQuery.isError ? (
                <>
                  <PriceChangeTop5Card rising={data.rising} falling={data.falling} />
                  <PreferenceDashboardError onRetry={() => void regionDashboardQuery.refetch()} />
                </>
              ) : regionData ? (
                <PreferenceDashboard
                  titlePrefix={resolvedRegion.titlePrefix}
                  districtName={resolvedRegion.districtName}
                  data={regionData}
                  middleCard={<PriceChangeTop5Card rising={data.rising} falling={data.falling} />}
                />
              ) : (
                <PriceChangeTop5Card rising={data.rising} falling={data.falling} />
              )}

              {!user && <PreferenceLoginBanner />}
              {user && !user.myGuCode && <PreferenceSetupBanner />}
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
