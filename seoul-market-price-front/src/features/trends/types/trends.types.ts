/**
 * 부동산 거래동향(Market Trends) 데이터 타입 정의
 * - 추후 FastAPI / Spring Boot API 연동 시 1:1 매핑 가능하도록 표준 DTO 구조로 설계
 */

export interface GuDongOption {
  gu: string;
  dongs: string[];
}

export interface MarketSummary {
  period: string; // e.g. "2026년 8월 기준"
  totalTransactions: number; // 총 거래량
  txChangeRate: number; // 전월 대비 거래량 증감율 (%)
  avgPricePerPyeong: number; // 평균 평당가 (만원)
  priceChangeRate: number; // 전월 대비 가격 증감율 (%)
  highestTradeComplex: string; // 최고가 거래 단지
  highestTradePrice: number; // 최고 거래가 (만원)
}

export interface ComplexRankingItem {
  rank: number;
  complexName: string;
  dong: string;
  pyeongType: string; // e.g. "84㎡ (34평)"
  txCount: number; // 거래 건수
  avgTradePrice: number; // 평균 거래가 (만원)
  recentTradePrice: number; // 최근 실거래가 (만원)
  changeFromLastMonth: number; // 전월 대비 변동 (만원)
  isNewHighPrice: boolean; // 신고가 경신 여부
}

export interface MonthlyPriceTrendPoint {
  month: string; // e.g. "25.09", "25.10" ... "26.08" (과거), "26.09" (AI 예측)
  actualAvgPrice: number | null; // 실제 거래 평균가 (만원)
  predictedAvgPrice: number | null; // AI 예상 가격 (만원)
  txVolume: number; // 해당 월 거래량
  isPrediction?: boolean; // AI 예상치 여부
}

export interface TrendsDataResponse {
  selectedGu: string;
  selectedDong: string;
  selectedComplex: string;
  complexList: string[];
  summary: MarketSummary;
  rankings: ComplexRankingItem[];
  monthlyTrends: MonthlyPriceTrendPoint[];
  lastUpdated: string;
}
