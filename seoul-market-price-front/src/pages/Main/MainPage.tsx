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

  // 서울 전체 시세 개요(구별 TOP5, 상승/하락)는 로그인 여부와 무관한
  // 공개 데이터라 인증 확인을 기다리지 않고 곧바로 요청한다.
  const mainPageQuery = useMainPageData();
  // 반면 이 대시보드는 resolvedRegion(선호지역 등 user 값에 의존)을
  // 파라미터로 쓰므로, 로그인 여부가 확정되기 전에 쏘면 guCode가
  // 틀린 채로 한 번 요청됐다가 로그인 복원 후 다시 요청되며
  // "기본 지역 → 선호지역"처럼 화면이 깜빡일 수 있다. 그래서
  // isAuthInitialized가 true가 될 때까지 계속 대기시킨다.
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
              {isAuthInitialized ? (
                <span className="rounded-full bg-[#E8F6F9] px-2.5 py-0.5 text-[11px] font-extrabold text-[#0F8AA8]">
                  {resolvedRegion.displayBadge}
                </span>
              ) : (
                // resolvedRegion은 user(로그인 시 선호지역)에 따라 값이 바뀐다.
                // 인증 복원 전에 먼저 그리면 "기본 지역" → "선호지역"으로
                // 뱃지 문구가 바뀌는 깜빡임이 생기므로 확정 전까지는 스켈레톤만 보여준다.
                <span className="h-[19px] w-28 animate-pulse rounded-full bg-[#E8F6F9]" aria-hidden="true" />
              )}
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

              {/* user는 로그인 복원 전 항상 null이므로, 로그인/선호지역
                  안내 배너는 isAuthInitialized가 true인 뒤에만 판단한다. */}
              {isAuthInitialized && !user && <PreferenceLoginBanner />}
              {isAuthInitialized && user && !user.myGuCode && <PreferenceSetupBanner />}
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
