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

  const formattedMoney = text.replace(/(?<![\d,])(\d[\d,]*)\s*만원/g, (_match, rawValue: string) => {
    const amountInManwon = Number(rawValue.replaceAll(",", ""));
    if (!Number.isFinite(amountInManwon) || amountInManwon < 10000) {
      return `${Number.isFinite(amountInManwon) ? amountInManwon.toLocaleString("ko-KR") : rawValue}만원`;
    }

    const hundredMillion = Math.floor(amountInManwon / 10000);
    const remainder = amountInManwon % 10000;
    return remainder === 0
      ? `${hundredMillion.toLocaleString("ko-KR")}억원`
      : `${hundredMillion.toLocaleString("ko-KR")}억 ${remainder.toLocaleString("ko-KR")}만원`;
  });

  return formattedMoney.replace(/(?<![\d,])(\d{5,})(?![\d,])/g, (value) =>
    Number(value).toLocaleString("ko-KR"),
  );
}

export function toAiDisplayResult(result: AiSearchResult): AiSearchResponse {
  if (isRagAnswerResponse(result)) {
    return {
      summary: result.answer,
      keyPoints: [],
      cautions: ["서비스 안내 문서를 근거로 응답했습니다."],
    };
  }

  if (isDistrictRankingResponse(result)) {
    return {
      summary: "서울시 자치구 평균 평당 가격 순위입니다.",
      criteria: result.criteria,
      rankingItems: result.items.map((item) => ({
        rank: item.rank,
        regionName: item.districtName,
        apartmentName: item.districtName,
        primaryLabel: "평균 평당 가격",
        primaryValue: `${item.averagePyeongAmount.toLocaleString("ko-KR")}만원/평`,
        dealCount: item.dealCount,
      })),
      keyPoints: result.items.map(
        (item) => `${item.rank}. ${item.districtName} · 평균 평당 가격 ${item.averagePyeongAmount.toLocaleString("ko-KR")}만원/평 · 거래 ${item.dealCount.toLocaleString("ko-KR")}건`,
      ),
      cautions: result.baseDate ? [`기준일: ${result.baseDate}`] : [],
    };
  }

  if (isPriceRankingResponse(result)) {
    const metricLabel = result.metricType === "pyeong" ? "평당 가격" : "평균 거래가";
    const metricUnit = result.metricType === "pyeong" ? "만원/평" : "만원";
    return {
      summary: result.summary || `${result.regionName} ${metricLabel} 순위 아파트입니다.`,
      criteria: result.criteria,
      rankingItems: result.items.map((item) => ({
        rank: item.rank,
        regionName: item.regionName,
        apartmentName: item.apartmentName,
        primaryLabel: metricLabel,
        primaryValue: `${item.metricValue?.toLocaleString("ko-KR") ?? "-"}${metricUnit}`,
        exclusiveAreaM2: item.exclusiveAreaM2,
        pyeong: item.pyeong,
        dealCount: item.dealCount,
        dealDate: item.dealDate,
      })),
      keyPoints: result.items.map(
        (item) => `${item.rank}. ${item.regionName ? `${item.regionName} · ` : ""}${item.apartmentName} · ${metricLabel} ${item.metricValue?.toLocaleString("ko-KR") ?? "정보 없음"}${metricUnit} · 전용 ${item.exclusiveAreaM2 ?? "-"}㎡ (${item.pyeong?.toFixed(1) ?? "-"}평) · 거래 ${item.dealCount}건${item.dealDate ? ` · 거래일 ${item.dealDate}` : ""}`,
      ),
      cautions: result.baseDate ? [`기준일: ${result.baseDate}`] : [],
    };
  }

  if (!isTradeVolumeRankingResponse(result)) return result;

  return {
    summary: `${result.regionName} 거래량 상위 아파트입니다.`,
    criteria: result.criteria,
    rankingItems: result.items.map((item) => ({
      rank: item.rank,
      regionName: item.regionName,
      apartmentName: item.apartmentName,
      primaryLabel: "거래 건수",
      primaryValue: `${item.dealCount.toLocaleString("ko-KR")}건`,
      dealCount: item.dealCount,
    })),
    keyPoints: result.items.map(
      (item) => `${item.rank}. ${item.regionName ? `${item.regionName} · ` : ""}${item.apartmentName} · 거래 ${item.dealCount}건 · 평균 거래가 ${item.averageTradeAmount?.toLocaleString("ko-KR") ?? "정보 없음"}만원`,
    ),
    cautions: [
      `조회 기간: ${result.periodStart} ~ ${result.periodEnd}`,
      `해당 지역 전체 거래량: ${result.totalDealCount.toLocaleString("ko-KR")}건`,
    ],
  };
}
