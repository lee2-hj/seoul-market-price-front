import type { MainPageResponse } from "@/api/api";
import type {
  MainPageViewData,
  PreferenceDashboardData,
  PriceChangeItem,
} from "@/features/main/types/mainPage.types";

function mapChangeItems(
  items: MainPageResponse["price_change_top5"]["rising_top5"],
  direction: "rising" | "falling",
): PriceChangeItem[] {
  // API 목록의 순위가 보장되지 않으므로 원본을 보존한 복사본을 등락 방향에 맞게 정렬한다.
  return [...(items ?? [])]
    .filter((item) => item && typeof item.bldg_nm === "string" && Number.isFinite(item.change_rate))
    .sort((a, b) => direction === "rising" ? b.change_rate - a.change_rate : a.change_rate - b.change_rate)
    .slice(0, 5)
    .map((item, index) => ({
      rank: index + 1,
      apartmentName: item.bldg_nm,
      changeRate: item.change_rate,
    }));
}

export function mapMainPageResponse(response: MainPageResponse): MainPageViewData {
  const priceChanges = response.price_change_top5;
  return {
    periodStart: response.period_start ?? "",
    periodEnd: response.period_end ?? "",
    districts: (response.seoul_top5_districts ?? []).slice(0, 5).map((item, index) => ({
      rank: index + 1,
      districtName: item.cgg_nm,
      averageDealPrice: item.avg_deal_price,
      averagePyeongPrice: item.avg_pyeong_price,
    })),
    rising: mapChangeItems(priceChanges?.rising_top5 ?? [], "rising"),
    falling: mapChangeItems(priceChanges?.falling_top5 ?? [], "falling"),
  };
}

export function mapPreferenceDashboardData(
  response: MainPageResponse,
): PreferenceDashboardData {
  const priceTrend = (response.preference_price_trend ?? [])
    .filter((item) =>
      Boolean(item?.period_label) &&
      Number.isFinite(item.avg_deal_price) &&
      Number.isFinite(item.avg_pyeong_price) &&
      Number.isFinite(item.deal_cnt),
    )
    .map((item) => ({
      periodLabel: item.period_label,
      startDate: item.start_date,
      endDate: item.end_date,
      averageDealPrice: item.avg_deal_price,
      averagePyeongPrice: item.avg_pyeong_price,
      dealCount: item.deal_cnt,
    }));

  const topTradingDongs = [...(response.preference_top_trading_dongs ?? [])]
    .filter((item) =>
      Boolean(item?.cgg_nm) && Boolean(item?.stdg_nm) && Number.isFinite(item.deal_cnt),
    )
    .sort((a, b) => b.deal_cnt - a.deal_cnt)
    .slice(0, 5)
    .map((item, index) => ({
      rank: index + 1,
      districtName: item.cgg_nm,
      dongName: item.stdg_nm,
      dealCount: item.deal_cnt,
    }));

  const popularDong = response.preference_popular_dong?.cgg_nm && response.preference_popular_dong.stdg_nm
    ? {
        districtName: response.preference_popular_dong.cgg_nm,
        dongName: response.preference_popular_dong.stdg_nm,
      }
    : null;

  const topTradingApartments = [...(response.preference_top_trading_apts ?? [])]
    .filter((item) =>
      Boolean(item?.bldg_nm) &&
      Number.isFinite(item.recent_thing_amt) &&
      Number.isFinite(item.deal_cnt),
    )
    .sort((a, b) => b.deal_cnt - a.deal_cnt)
    .slice(0, 5)
    .map((item, index) => ({
      rank: index + 1,
      apartmentName: item.bldg_nm,
      recentDealPrice: item.recent_thing_amt,
      dealCount: item.deal_cnt,
    }));

  return { priceTrend, topTradingDongs, popularDong, topTradingApartments };
}
