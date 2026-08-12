import type {
  GuDongOption,
  TrendsDataResponse,
  ComplexRankingItem,
  MonthlyPriceTrendPoint,
} from "../types/trends.types";

/**
 * 서울시 주요 자치구 및 법정동 목록
 */
export const SEOUL_GU_DONG_LIST: GuDongOption[] = [
  {
    gu: "송파구",
    dongs: ["전체", "가락동", "잠실동", "신천동", "문정동", "방이동", "오금동"],
  },
  {
    gu: "강남구",
    dongs: ["전체", "대치동", "개포동", "압구정동", "도곡동", "역삼동", "삼성동", "청담동"],
  },
  {
    gu: "서초구",
    dongs: ["전체", "반포동", "잠원동", "서초동", "방배동", "양재동"],
  },
  {
    gu: "마포구",
    dongs: ["전체", "아현동", "공덕동", "염리동", "용강동", "상암동", "망원동", "합정동"],
  },
  {
    gu: "용산구",
    dongs: ["전체", "한남동", "이촌동", "보광동", "효창동", "원효로"],
  },
  {
    gu: "성동구",
    dongs: ["전체", "성수동1가", "성수동2가", "옥수동", "금호동", "행당동", "왕십리"],
  },
  {
    gu: "영등포구",
    dongs: ["전체", "여의도동", "당산동", "문래동", "신길동", "영등포동"],
  },
  {
    gu: "강동구",
    dongs: ["전체", "길동", "둔촌동", "고덕동", "상일동", "명일동", "암사동", "천호동", "성내동"],
  },
  {
    gu: "노원구",
    dongs: ["전체", "상계동", "중계동", "하계동", "공릉동", "월계동"],
  },
  {
    gu: "양천구",
    dongs: ["전체", "목동", "신정동", "신월동"],
  },
];

/**
 * 구/동별 Mock 거래동향 데이터 생성기
 * - 추후 백엔드 API (FastAPI / Spring Boot) 연동 시 이 함수 내부를 실제 API 호출로 1줄 교체 가능
 */
export async function getMarketTrendsData(
  gu: string = "송파구",
  dong: string = "전체"
): Promise<TrendsDataResponse> {
  // 실제 API 지연 시뮬레이션
  await new Promise((resolve) => setTimeout(resolve, 80));

  // 1. 구/동별 맞춤 단지 랭킹 생성
  const rankings: ComplexRankingItem[] = getMockRankingsByRegion(gu, dong);

  // 2. 12개월 과거 실거래 + 3개월 AI 예상 가격 추이 생성
  const monthlyTrends: MonthlyPriceTrendPoint[] = getMockMonthlyTrendsByRegion(gu);

  // 3. 주요 요약 지표
  const totalTransactions = rankings.reduce((acc, cur) => acc + cur.txCount, 0) * 4;
  const avgPricePerPyeong = Math.round(
    rankings.reduce((acc, cur) => acc + cur.avgTradePrice, 0) / (rankings.length || 1) / 3.3
  );

  const highestTradeItem = [...rankings].sort((a, b) => b.recentTradePrice - a.recentTradePrice)[0];

  return {
    selectedGu: gu,
    selectedDong: dong,
    summary: {
      period: "2026년 8월 기준",
      totalTransactions: totalTransactions > 0 ? totalTransactions : 420,
      txChangeRate: gu === "송파구" || gu === "강남구" ? 14.8 : 8.2,
      avgPricePerPyeong: avgPricePerPyeong > 0 ? avgPricePerPyeong : 5850,
      priceChangeRate: 2.4,
      highestTradeComplex: highestTradeItem ? highestTradeItem.complexName : "헬리오시티",
      highestTradePrice: highestTradeItem ? highestTradeItem.recentTradePrice : 265000,
    },
    rankings,
    monthlyTrends,
    lastUpdated: new Date().toISOString().slice(0, 10),
  };
}

/**
 * 지역별 랭킹 Mock 데이터
 */
/**
 * 지역별(구/동) 실거래 랭킹 전체 데이터 맵
 * - 서울 10대 구의 모든 등록 법정동에 대해 최소 1~3개 이상의 실제 유명 아파트 단지 데이터 완비
 */
const SEOUL_COMPLEX_DATA_MAP: Record<string, ComplexRankingItem[]> = {
  송파구: [
    { rank: 1, complexName: "헬리오시티", dong: "가락동", pyeongType: "84㎡ (33평)", txCount: 42, avgTradePrice: 228000, recentTradePrice: 235000, changeFromLastMonth: 5000, isNewHighPrice: true },
    { rank: 2, complexName: "파크리오", dong: "신천동", pyeongType: "84㎡ (32평)", txCount: 36, avgTradePrice: 231000, recentTradePrice: 236000, changeFromLastMonth: 4000, isNewHighPrice: false },
    { rank: 3, complexName: "잠실엘스", dong: "잠실동", pyeongType: "84㎡ (34평)", txCount: 31, avgTradePrice: 268000, recentTradePrice: 275000, changeFromLastMonth: 7000, isNewHighPrice: true },
    { rank: 4, complexName: "리센츠", dong: "잠실동", pyeongType: "84㎡ (33평)", txCount: 28, avgTradePrice: 265000, recentTradePrice: 270000, changeFromLastMonth: 3000, isNewHighPrice: false },
    { rank: 5, complexName: "올림픽선수기자촌", dong: "방이동", pyeongType: "84㎡ (34평)", txCount: 22, avgTradePrice: 215000, recentTradePrice: 220000, changeFromLastMonth: 2500, isNewHighPrice: false },
    { rank: 6, complexName: "올림픽훼밀리타운", dong: "문정동", pyeongType: "84㎡ (32평)", txCount: 19, avgTradePrice: 185000, recentTradePrice: 190000, changeFromLastMonth: 4000, isNewHighPrice: false },
    { rank: 7, complexName: "가락쌍용1차", dong: "가락동", pyeongType: "59㎡ (25평)", txCount: 17, avgTradePrice: 112000, recentTradePrice: 115000, changeFromLastMonth: 3000, isNewHighPrice: false },
    { rank: 8, complexName: "오금현대백조", dong: "오금동", pyeongType: "84㎡ (32평)", txCount: 15, avgTradePrice: 135000, recentTradePrice: 138000, changeFromLastMonth: 2000, isNewHighPrice: false },
  ],
  강남구: [
    { rank: 1, complexName: "디에이치퍼스티어아이파크", dong: "개포동", pyeongType: "84㎡ (34평)", txCount: 45, avgTradePrice: 305000, recentTradePrice: 315000, changeFromLastMonth: 8000, isNewHighPrice: true },
    { rank: 2, complexName: "래미안대치팰리스", dong: "대치동", pyeongType: "84㎡ (34평)", txCount: 38, avgTradePrice: 325000, recentTradePrice: 330000, changeFromLastMonth: 6000, isNewHighPrice: false },
    { rank: 3, complexName: "압구정현대1·2차", dong: "압구정동", pyeongType: "131㎡ (43평)", txCount: 30, avgTradePrice: 510000, recentTradePrice: 530000, changeFromLastMonth: 15000, isNewHighPrice: true },
    { rank: 4, complexName: "도곡렉슬", dong: "도곡동", pyeongType: "84㎡ (33평)", txCount: 26, avgTradePrice: 285000, recentTradePrice: 290000, changeFromLastMonth: 4000, isNewHighPrice: false },
    { rank: 5, complexName: "역삼래미안", dong: "역삼동", pyeongType: "84㎡ (33평)", txCount: 22, avgTradePrice: 245000, recentTradePrice: 250000, changeFromLastMonth: 3500, isNewHighPrice: false },
    { rank: 6, complexName: "래미안라클래시", dong: "삼성동", pyeongType: "84㎡ (34평)", txCount: 19, avgTradePrice: 335000, recentTradePrice: 340000, changeFromLastMonth: 5000, isNewHighPrice: false },
    { rank: 7, complexName: "청담자이", dong: "청담동", pyeongType: "82㎡ (33평)", txCount: 16, avgTradePrice: 310000, recentTradePrice: 315000, changeFromLastMonth: 4000, isNewHighPrice: false },
  ],
  서초구: [
    { rank: 1, complexName: "래미안원베일리", dong: "반포동", pyeongType: "84㎡ (34평)", txCount: 46, avgTradePrice: 430000, recentTradePrice: 450000, changeFromLastMonth: 12000, isNewHighPrice: true },
    { rank: 2, complexName: "아크로리버파크", dong: "반포동", pyeongType: "84㎡ (34평)", txCount: 39, avgTradePrice: 420000, recentTradePrice: 435000, changeFromLastMonth: 9000, isNewHighPrice: false },
    { rank: 3, complexName: "아크로리버뷰신반포", dong: "잠원동", pyeongType: "84㎡ (33평)", txCount: 28, avgTradePrice: 385000, recentTradePrice: 395000, changeFromLastMonth: 7000, isNewHighPrice: true },
    { rank: 4, complexName: "서초그랑자이", dong: "서초동", pyeongType: "84㎡ (34평)", txCount: 24, avgTradePrice: 310000, recentTradePrice: 320000, changeFromLastMonth: 6000, isNewHighPrice: false },
    { rank: 5, complexName: "방배그랑자이", dong: "방배동", pyeongType: "84㎡ (33평)", txCount: 20, avgTradePrice: 275000, recentTradePrice: 280000, changeFromLastMonth: 4500, isNewHighPrice: false },
    { rank: 6, complexName: "양재우성", dong: "양재동", pyeongType: "84㎡ (32평)", txCount: 15, avgTradePrice: 175000, recentTradePrice: 178000, changeFromLastMonth: 2500, isNewHighPrice: false },
  ],
  마포구: [
    { rank: 1, complexName: "마포래미안푸르지오", dong: "아현동", pyeongType: "84㎡ (34평)", txCount: 38, avgTradePrice: 188000, recentTradePrice: 194000, changeFromLastMonth: 4500, isNewHighPrice: true },
    { rank: 2, complexName: "마포프레스티지자이", dong: "염리동", pyeongType: "84㎡ (34평)", txCount: 29, avgTradePrice: 205000, recentTradePrice: 210000, changeFromLastMonth: 5000, isNewHighPrice: true },
    { rank: 3, complexName: "공덕래미안5차", dong: "공덕동", pyeongType: "84㎡ (34평)", txCount: 25, avgTradePrice: 178000, recentTradePrice: 182000, changeFromLastMonth: 3000, isNewHighPrice: false },
    { rank: 4, complexName: "래미안마포리버웰", dong: "용강동", pyeongType: "84㎡ (34평)", txCount: 19, avgTradePrice: 182000, recentTradePrice: 185000, changeFromLastMonth: 2000, isNewHighPrice: false },
    { rank: 5, complexName: "상암월드컵파크4단지", dong: "상암동", pyeongType: "84㎡ (33평)", txCount: 16, avgTradePrice: 118000, recentTradePrice: 120000, changeFromLastMonth: 1500, isNewHighPrice: false },
    { rank: 6, complexName: "망원동휴먼빌", dong: "망원동", pyeongType: "84㎡ (32평)", txCount: 12, avgTradePrice: 105000, recentTradePrice: 108000, changeFromLastMonth: 1500, isNewHighPrice: false },
    { rank: 7, complexName: "마포한강푸르지오", dong: "합정동", pyeongType: "84㎡ (33평)", txCount: 11, avgTradePrice: 172000, recentTradePrice: 175000, changeFromLastMonth: 2000, isNewHighPrice: false },
  ],
  강동구: [
    { rank: 1, complexName: "올림픽파크포레온", dong: "둔촌동", pyeongType: "84㎡ (34평)", txCount: 48, avgTradePrice: 220000, recentTradePrice: 232000, changeFromLastMonth: 7500, isNewHighPrice: true },
    { rank: 2, complexName: "강동헤리티지자이", dong: "길동", pyeongType: "59㎡ (25평)", txCount: 34, avgTradePrice: 115000, recentTradePrice: 119000, changeFromLastMonth: 4000, isNewHighPrice: true },
    { rank: 3, complexName: "e편한세상강동에코포레", dong: "길동", pyeongType: "84㎡ (33평)", txCount: 26, avgTradePrice: 132000, recentTradePrice: 136000, changeFromLastMonth: 3500, isNewHighPrice: false },
    { rank: 4, complexName: "고덕그라시움", dong: "고덕동", pyeongType: "84㎡ (34평)", txCount: 25, avgTradePrice: 185000, recentTradePrice: 190000, changeFromLastMonth: 3000, isNewHighPrice: false },
    { rank: 5, complexName: "고덕아르테온", dong: "상일동", pyeongType: "84㎡ (34평)", txCount: 21, avgTradePrice: 178000, recentTradePrice: 182000, changeFromLastMonth: 2500, isNewHighPrice: false },
    { rank: 6, complexName: "길동 삼익파크맨션", dong: "길동", pyeongType: "78㎡ (31평)", txCount: 20, avgTradePrice: 102000, recentTradePrice: 105000, changeFromLastMonth: 2500, isNewHighPrice: false },
    { rank: 7, complexName: "래미안솔베뉴", dong: "명일동", pyeongType: "84㎡ (34평)", txCount: 17, avgTradePrice: 165000, recentTradePrice: 169000, changeFromLastMonth: 2000, isNewHighPrice: false },
    { rank: 8, complexName: "강동롯데캐슬퍼스트", dong: "암사동", pyeongType: "84㎡ (34평)", txCount: 15, avgTradePrice: 138000, recentTradePrice: 141000, changeFromLastMonth: 1500, isNewHighPrice: false },
    { rank: 9, complexName: "래미안강동팰리스", dong: "천호동", pyeongType: "84㎡ (36평)", txCount: 14, avgTradePrice: 148000, recentTradePrice: 152000, changeFromLastMonth: 2000, isNewHighPrice: false },
    { rank: 10, complexName: "성내삼성아파트", dong: "성내동", pyeongType: "84㎡ (32평)", txCount: 12, avgTradePrice: 112000, recentTradePrice: 115000, changeFromLastMonth: 1500, isNewHighPrice: false },
  ],
  용산구: [
    { rank: 1, complexName: "나인원한남", dong: "한남동", pyeongType: "206㎡ (75평)", txCount: 18, avgTradePrice: 980000, recentTradePrice: 1050000, changeFromLastMonth: 45000, isNewHighPrice: true },
    { rank: 2, complexName: "래미안첼리투스", dong: "이촌동", pyeongType: "124㎡ (50평)", txCount: 15, avgTradePrice: 490000, recentTradePrice: 510000, changeFromLastMonth: 18000, isNewHighPrice: true },
    { rank: 3, complexName: "보광신동아", dong: "보광동", pyeongType: "84㎡ (32평)", txCount: 12, avgTradePrice: 155000, recentTradePrice: 160000, changeFromLastMonth: 4000, isNewHighPrice: false },
    { rank: 4, complexName: "효창파크KCC스위첸", dong: "효창동", pyeongType: "84㎡ (34평)", txCount: 11, avgTradePrice: 168000, recentTradePrice: 172000, changeFromLastMonth: 3000, isNewHighPrice: false },
    { rank: 5, complexName: "용산더프라임", dong: "원효로", pyeongType: "84㎡ (35평)", txCount: 10, avgTradePrice: 175000, recentTradePrice: 178000, changeFromLastMonth: 2500, isNewHighPrice: false },
  ],
  성동구: [
    { rank: 1, complexName: "트리마제", dong: "성수동1가", pyeongType: "84㎡ (38평)", txCount: 22, avgTradePrice: 410000, recentTradePrice: 425000, changeFromLastMonth: 12000, isNewHighPrice: true },
    { rank: 2, complexName: "아크로서울포레스트", dong: "성수동2가", pyeongType: "159㎡ (62평)", txCount: 16, avgTradePrice: 880000, recentTradePrice: 930000, changeFromLastMonth: 35000, isNewHighPrice: true },
    { rank: 3, complexName: "옥수리버젠", dong: "옥수동", pyeongType: "84㎡ (33평)", txCount: 24, avgTradePrice: 195000, recentTradePrice: 200000, changeFromLastMonth: 5000, isNewHighPrice: false },
    { rank: 4, complexName: "힐스테이트금호", dong: "금호동", pyeongType: "84㎡ (33평)", txCount: 19, avgTradePrice: 178000, recentTradePrice: 182000, changeFromLastMonth: 3500, isNewHighPrice: false },
    { rank: 5, complexName: "서울숲리버뷰자이", dong: "행당동", pyeongType: "84㎡ (33평)", txCount: 17, avgTradePrice: 185000, recentTradePrice: 189000, changeFromLastMonth: 3000, isNewHighPrice: false },
    { rank: 6, complexName: "센트라스", dong: "왕십리", pyeongType: "84㎡ (34평)", txCount: 20, avgTradePrice: 165000, recentTradePrice: 168000, changeFromLastMonth: 2500, isNewHighPrice: false },
  ],
  영등포구: [
    { rank: 1, complexName: "여의도 시범아파트", dong: "여의도동", pyeongType: "79㎡ (24평)", txCount: 27, avgTradePrice: 235000, recentTradePrice: 245000, changeFromLastMonth: 8000, isNewHighPrice: true },
    { rank: 2, complexName: "당산센트럴아이파크", dong: "당산동", pyeongType: "84㎡ (34평)", txCount: 23, avgTradePrice: 175000, recentTradePrice: 180000, changeFromLastMonth: 4000, isNewHighPrice: false },
    { rank: 3, complexName: "문래자이", dong: "문래동", pyeongType: "84㎡ (35평)", txCount: 18, avgTradePrice: 148000, recentTradePrice: 152000, changeFromLastMonth: 3000, isNewHighPrice: false },
    { rank: 4, complexName: "보라매SK뷰", dong: "신길동", pyeongType: "84㎡ (34평)", txCount: 21, avgTradePrice: 155000, recentTradePrice: 159000, changeFromLastMonth: 3500, isNewHighPrice: false },
    { rank: 5, complexName: "아크로타워스퀘어", dong: "영등포동", pyeongType: "84㎡ (35평)", txCount: 19, avgTradePrice: 162000, recentTradePrice: 165000, changeFromLastMonth: 2500, isNewHighPrice: false },
  ],
  노원구: [
    { rank: 1, complexName: "상계주공5단지", dong: "상계동", pyeongType: "37㎡ (16평)", txCount: 33, avgTradePrice: 54000, recentTradePrice: 56000, changeFromLastMonth: 1500, isNewHighPrice: false },
    { rank: 2, complexName: "중계청구3차", dong: "중계동", pyeongType: "84㎡ (31평)", txCount: 26, avgTradePrice: 128000, recentTradePrice: 132000, changeFromLastMonth: 3000, isNewHighPrice: true },
    { rank: 3, complexName: "하계현대우성", dong: "하계동", pyeongType: "84㎡ (31평)", txCount: 19, avgTradePrice: 92000, recentTradePrice: 94500, changeFromLastMonth: 1800, isNewHighPrice: false },
    { rank: 4, complexName: "태릉현대", dong: "공릉동", pyeongType: "84㎡ (32평)", txCount: 15, avgTradePrice: 82000, recentTradePrice: 84000, changeFromLastMonth: 1200, isNewHighPrice: false },
    { rank: 5, complexName: "꿈의숲아이파크", dong: "월계동", pyeongType: "84㎡ (33평)", txCount: 18, avgTradePrice: 105000, recentTradePrice: 108000, changeFromLastMonth: 2000, isNewHighPrice: false },
  ],
  양천구: [
    { rank: 1, complexName: "목동신시가지7단지", dong: "목동", pyeongType: "89㎡ (27평)", txCount: 35, avgTradePrice: 245000, recentTradePrice: 255000, changeFromLastMonth: 8500, isNewHighPrice: true },
    { rank: 2, complexName: "목동신시가지14단지", dong: "신정동", pyeongType: "84㎡ (30평)", txCount: 28, avgTradePrice: 182000, recentTradePrice: 188000, changeFromLastMonth: 4500, isNewHighPrice: false },
    { rank: 3, complexName: "목동센트럴아이파크위브", dong: "신월동", pyeongType: "84㎡ (33평)", txCount: 22, avgTradePrice: 118000, recentTradePrice: 121000, changeFromLastMonth: 2500, isNewHighPrice: false },
  ],
};

function getMockRankingsByRegion(gu: string, dong: string): ComplexRankingItem[] {
  const guList = SEOUL_COMPLEX_DATA_MAP[gu] || SEOUL_COMPLEX_DATA_MAP["송파구"];
  const filtered = dong === "전체" ? guList : guList.filter((item) => item.dong === dong);
  
  // 만약 해당 동 데이터가 아직 없으면 동 이름을 맞춰서 1개 생성
  if (filtered.length === 0) {
    return [
      {
        rank: 1,
        complexName: `${dong} 센트럴 아파트`,
        dong: dong,
        pyeongType: "84㎡ (33평)",
        txCount: 15,
        avgTradePrice: 135000,
        recentTradePrice: 138000,
        changeFromLastMonth: 2000,
        isNewHighPrice: false,
      },
    ];
  }

  return filtered.map((item, idx) => ({ ...item, rank: idx + 1 }));
}

/**
 * 12개월 과거 실거래가 + 3개월 AI 예상 가격 변동 추이 데이터
 */
function getMockMonthlyTrendsByRegion(gu: string): MonthlyPriceTrendPoint[] {
  const basePrice = gu === "강남구" ? 280000 : gu === "서초구" ? 270000 : gu === "송파구" ? 215000 : 175000;

  return [
    { month: "25.09", actualAvgPrice: basePrice - 18000, predictedAvgPrice: null, txVolume: 185 },
    { month: "25.10", actualAvgPrice: basePrice - 15000, predictedAvgPrice: null, txVolume: 210 },
    { month: "25.11", actualAvgPrice: basePrice - 14000, predictedAvgPrice: null, txVolume: 195 },
    { month: "25.12", actualAvgPrice: basePrice - 11000, predictedAvgPrice: null, txVolume: 230 },
    { month: "26.01", actualAvgPrice: basePrice - 8000, predictedAvgPrice: null, txVolume: 260 },
    { month: "26.02", actualAvgPrice: basePrice - 5000, predictedAvgPrice: null, txVolume: 290 },
    { month: "26.03", actualAvgPrice: basePrice - 2000, predictedAvgPrice: null, txVolume: 340 },
    { month: "26.04", actualAvgPrice: basePrice + 1000, predictedAvgPrice: null, txVolume: 380 },
    { month: "26.05", actualAvgPrice: basePrice + 4000, predictedAvgPrice: null, txVolume: 410 },
    { month: "26.06", actualAvgPrice: basePrice + 7000, predictedAvgPrice: null, txVolume: 440 },
    { month: "26.07", actualAvgPrice: basePrice + 9500, predictedAvgPrice: null, txVolume: 425 },
    { month: "26.08", actualAvgPrice: basePrice + 12000, predictedAvgPrice: basePrice + 12000, txVolume: 450 }, // 현재월
    // 🔮 향후 3개월 AI 예측 구간
    { month: "26.09", actualAvgPrice: null, predictedAvgPrice: basePrice + 14500, txVolume: 465, isPrediction: true },
    { month: "26.10", actualAvgPrice: null, predictedAvgPrice: basePrice + 17000, txVolume: 480, isPrediction: true },
    { month: "26.11", actualAvgPrice: null, predictedAvgPrice: basePrice + 19200, txVolume: 490, isPrediction: true },
  ];
}

/**
 * 가격 포맷터 (만원 단위 ➔ 억/천만원 환산 문자열)
 */
export function formatPriceKorean(amountInManwon: number): string {
  if (!amountInManwon || isNaN(amountInManwon)) return "0원";
  const eok = Math.floor(amountInManwon / 10000);
  const man = amountInManwon % 10000;

  if (eok > 0 && man > 0) {
    return `${eok}억 ${man.toLocaleString()}만원`;
  }
  if (eok > 0) {
    return `${eok}억원`;
  }
  return `${man.toLocaleString()}만원`;
}
