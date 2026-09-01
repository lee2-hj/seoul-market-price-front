import type {
  AiSearchResponse,
  DistrictRankingResponse,
  PriceRankingResponse,
  RagAnswerResponse,
  TradeVolumeRankingResponse,
} from "@/api/api";

export type AiSearchResult =
  | AiSearchResponse
  | TradeVolumeRankingResponse
  | PriceRankingResponse
  | DistrictRankingResponse
  | RagAnswerResponse;

function isRagAnswerResponse(result: AiSearchResult): result is RagAnswerResponse {
  return "answer" in result;
}

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
  return text.replace(/(?<![\d,])(\d{5,})(?![\d,])/g, (value) =>
    Number(value).toLocaleString("ko-KR"),
  );
}

export function toAiDisplayResult(result: AiSearchResult): AiSearchResponse {
  if (isRagAnswerResponse(result)) {
    return {
      summary: result.answer,
      keyPoints: [],
      cautions: ["서비스 안내 문서를 근거로 한 답변입니다."],
    };
  }

  if (isDistrictRankingResponse(result)) {
    return {
      summary: "서울시 자치구 평균 평단가 순위입니다.",
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
      summary: result.summary || `${result.regionName} ${metricLabel} 상위 아파트입니다.`,
      criteria: result.criteria,
      keyPoints: result.items.map(
        (item) => `${item.rank}. ${item.regionName ? `${item.regionName} · ` : ""}${item.apartmentName}${item.exclusiveAreaM2 != null || item.pyeong != null ? ` · 전용 ${item.exclusiveAreaM2 ?? "-"}㎡ (${item.pyeong?.toFixed(1) ?? "-"}평)` : ""} · ${metricLabel} ${item.metricValue?.toLocaleString("ko-KR") ?? "정보 없음"}${metricUnit} · 거래 ${item.dealCount}건${item.dealDate ? ` · 거래일 ${item.dealDate}` : ""}`,
      ),
      cautions: result.baseDate ? [`기준일: ${result.baseDate}`] : [],
    };
  }

  if (!isTradeVolumeRankingResponse(result)) return result;

  return {
    summary: `${result.regionName} 거래량 상위 아파트입니다.`,
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
