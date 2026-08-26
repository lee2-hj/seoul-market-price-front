import type { PreferencePriceTrendItem } from "@/features/main/types/mainPage.types";
import {
  formatDateRange,
  formatPriceInManwon,
  formatTradeCount,
} from "@/features/main/utils/mainPageFormat";

export interface NinetyDayTrendSummary {
  averageDealPrice: number;
  averagePyeongPrice: number;
  totalDealCount: number;
}

export type TrendChartHeaderColumn =
  | string
  | { role: string; type?: string; p?: Record<string, unknown> };

export type TrendChartCell =
  | string
  | number
  | { v: number; f: string }
  | TrendChartHeaderColumn;

/**
 * 최근 90일 전체 기간의 거래량 가중평균 거래가, 가중평균 평당가격 및 총 거래량을 계산합니다.
 *
 * [가중평균 적용 이유]
 * 구간별(예: 1~4구간)로 거래 건수(deal_cnt)가 상이하므로 각 구간의 평균가를 단순 산술평균하면
 * 거래량이 많은 구간의 영향력이 과소평가되는 통계적 왜곡이 발생합니다.
 * 따라서 거래량(deal_cnt)을 가중치로 적용한 가중평균을 계산하여 실제 최근 90일 전체의 정확한 평균을 도출합니다.
 */
export function calculateNinetyDayTrendSummary(
  items: PreferencePriceTrendItem[],
): NinetyDayTrendSummary {
  if (!items || items.length === 0) {
    return { averageDealPrice: 0, averagePyeongPrice: 0, totalDealCount: 0 };
  }

  let totalDealCount = 0;
  let weightedDealPriceSum = 0;
  let weightedPyeongPriceSum = 0;

  for (const item of items) {
    const count = typeof item?.dealCount === "number" ? item.dealCount : Number(item?.dealCount);
    const dealPrice = typeof item?.averageDealPrice === "number" ? item.averageDealPrice : Number(item?.averageDealPrice);
    const pyeongPrice = typeof item?.averagePyeongPrice === "number" ? item.averagePyeongPrice : Number(item?.averagePyeongPrice);

    if (Number.isFinite(count) && count > 0) {
      totalDealCount += count;
      if (Number.isFinite(dealPrice) && dealPrice >= 0) {
        weightedDealPriceSum += dealPrice * count;
      }
      if (Number.isFinite(pyeongPrice) && pyeongPrice >= 0) {
        weightedPyeongPriceSum += pyeongPrice * count;
      }
    }
  }

  if (totalDealCount <= 0) {
    return { averageDealPrice: 0, averagePyeongPrice: 0, totalDealCount: 0 };
  }

  return {
    averageDealPrice: weightedDealPriceSum / totalDealCount,
    averagePyeongPrice: weightedPyeongPriceSum / totalDealCount,
    totalDealCount,
  };
}

/**
 * 전체 추이 데이터의 시작일부터 종료일까지의 전체 기간 범위를 포맷팅합니다.
 */
export function formatTrendPeriodRange(items: PreferencePriceTrendItem[]): string {
  if (!items || items.length === 0) return "-";
  const firstItem = items[0];
  const lastItem = items[items.length - 1];
  const start = firstItem?.startDate ?? "";
  const end = lastItem?.endDate ?? "";
  return formatDateRange(start, end) || "-";
}

/**
 * Google Charts ComboChart에서 사용할 DataTable 행 데이터를 생성합니다.
 * X축에는 D-90~D-68 대신 순서대로 '1구간', '2구간' 등을 표시하고,
 * 마우스 오버 툴팁에는 실제 날짜 범위(YYYY.MM.DD ~ YYYY.MM.DD)와 상세 수치를 제공합니다.
 */
export function createTrendChartRows(
  items: PreferencePriceTrendItem[],
): TrendChartCell[][] {
  const header: TrendChartHeaderColumn[] = [
    "구간",
    "거래량",
    { role: "tooltip", type: "string" },
    "평균 거래가",
    { role: "tooltip", type: "string" },
  ];

  if (!items || items.length === 0) {
    return [header];
  }

  const rows = items.map((item, index) => {
    const sectionName = `${index + 1}구간`;
    const dateRange = formatDateRange(item.startDate, item.endDate);
    const dateLine = dateRange ? `기간: ${dateRange}` : "";
    const tradeCountLine = `거래량: ${formatTradeCount(item.dealCount)}`;
    const priceLine = `평균 거래가: ${formatPriceInManwon(item.averageDealPrice)}`;

    const barTooltip = [sectionName, dateLine, tradeCountLine, priceLine]
      .filter(Boolean)
      .join("\n");

    const lineTooltip = [sectionName, dateLine, priceLine, tradeCountLine]
      .filter(Boolean)
      .join("\n");

    return [
      sectionName,
      Number.isFinite(item.dealCount) && item.dealCount >= 0 ? item.dealCount : 0,
      barTooltip,
      {
        v: Number.isFinite(item.averageDealPrice) && item.averageDealPrice >= 0 ? item.averageDealPrice : 0,
        f: formatPriceInManwon(item.averageDealPrice),
      },
      lineTooltip,
    ];
  });

  return [header, ...rows];
}
