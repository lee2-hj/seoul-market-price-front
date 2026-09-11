import type {
  AiSearchResponse,
  DistrictRankingResponse,
  PriceRankingResponse,
  TradeVolumeRankingResponse,
} from "@/api/api";

export type AiSearchResult =
  | AiSearchResponse
  | TradeVolumeRankingResponse
  | PriceRankingResponse
  | DistrictRankingResponse;

function isTradeVolumeRankingResponse(result: AiSearchResult): result is TradeVolumeRankingResponse {
  return "totalDealCount" in result;
}

function isPriceRankingResponse(result: AiSearchResult): result is PriceRankingResponse {
  return "metricType" in result && result.metricType !== "district_pyeong";
}

function isDistrictRankingResponse(result: AiSearchResult): result is DistrictRankingResponse {
  return "metricType" in result && result.metricType === "district_pyeong";
}

export function formatAiMoneyText(text?: string): string {
  if (!text) return "";

  // AI 금액은 만원 단위로 내려오므로 10,000만원 이상을 억 단위로 변환합니다.
  const formattedMoney = text.replace(
    /(?<![\d,])(\d[\d,]*)\s*\uB9CC\uC6D0/g,
    (_match, rawValue: string) => {
      const amountInManwon = Number(rawValue.replaceAll(",", ""));
      if (!Number.isFinite(amountInManwon)) return `${rawValue}\uB9CC\uC6D0`;

      if (amountInManwon < 10000) {
        return `${amountInManwon.toLocaleString("ko-KR")}\uB9CC\uC6D0`;
      }

      const billion = Math.floor(amountInManwon / 10000);
      const remainder = amountInManwon % 10000;
      return remainder === 0
        ? `${billion.toLocaleString("ko-KR")}\uC5B5\uC6D0`
        : `${billion.toLocaleString("ko-KR")}\uC5B5 ${remainder.toLocaleString("ko-KR")}\uB9CC\uC6D0`;
    },
  );

  return formattedMoney.replace(/(?<![\d,])(\d{5,})(?![\d,])/g, (value) =>
    Number(value).toLocaleString("ko-KR"),
  );
}

export function toAiDisplayResult(result: AiSearchResult): AiSearchResponse {
  if (isDistrictRankingResponse(result)) {
    return {
      summary: result.summary,
      criteria: result.criteria,
      keyPoints: result.items.map(
        (item) => `${item.rank}. ${item.districtName} · 평균 평단가 ${item.averagePyeongAmount.toLocaleString("ko-KR")}만원/평 · 거래 ${item.dealCount.toLocaleString("ko-KR")}건`,
      ),
      cautions: result.baseDate ? [`기준일: ${result.baseDate}`] : [],
    };
  }

  if (isPriceRankingResponse(result)) {
    const metricLabel = result.metricType === "pyeong" ? "평당가" : "평균 거래가";
    const metricUnit = result.metricType === "pyeong" ? "만원/평" : "만원";
    return {
      summary: result.summary,
      description: result.description,
      criteria: result.criteria,
      rankingItems: result.items.map((item) => ({
        rank: item.rank,
        regionName: item.regionName,
        apartmentName: item.apartmentName,
        primaryLabel: metricLabel,
        primaryValue: `${item.metricValue?.toLocaleString("ko-KR") ?? "-"}${metricUnit}`,
        exclusiveAreaM2: item.exclusiveAreaM2,
        pyeong: item.pyeong ?? (item.exclusiveAreaM2 != null ? item.exclusiveAreaM2 / 3.305785 : undefined),
        dealCount: item.dealCount,
        dealDate: item.dealDate,
      })),
      keyPoints: result.items.map(
        (item) => `${item.rank}. ${item.regionName ? `${item.regionName} · ` : ""}${item.apartmentName} · ${metricLabel} ${item.metricValue?.toLocaleString("ko-KR") ?? "정보 없음"}${metricUnit} · 거래 ${item.dealCount}건`,
      ),
      cautions: result.baseDate ? [`기준일: ${result.baseDate}`] : [],
    };
  }

  if (!isTradeVolumeRankingResponse(result)) return result;

  return {
    summary: result.summary,
    criteria: result.criteria,
    keyPoints: result.items.map(
      (item) => `${item.rank}. ${item.regionName ? `${item.regionName} · ` : ""}${item.apartmentName} · 거래 ${item.dealCount}건 · 평균 거래가 ${item.averageTradeAmount?.toLocaleString("ko-KR") ?? "정보 없음"}만원`,
    ),
    cautions: [
      `조회 기간: ${result.periodStart} ~ ${result.periodEnd}`,
      `해당 지역 전체 거래량: ${result.totalDealCount.toLocaleString("ko-KR")}건`,
    ],
  };
}
