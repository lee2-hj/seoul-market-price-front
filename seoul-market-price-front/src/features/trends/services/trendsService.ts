import type {
  GuDongOption,
  TrendsDataResponse,
  ComplexRankingItem,
  MonthlyPriceTrendPoint,
  ApartmentSearchItem,
  ApartmentTrendDetailResponse,
  MonthlyVolumeAndPricePoint,
  AreaDistributionItem,
  RecentTradeRecord,
  AreaTradeStat,
  TrendInsight,
} from "../types/trends.types";

/**
 * 서울시 25개 자치구 전체 & 467개 법정동(Legal Dong) 전체 데이터베이스
 */
export const SEOUL_GU_DONG_LIST: GuDongOption[] = [
  {
    gu: "강남구",
    dongs: [
      "전체",
      "개포동",
      "논현동",
      "대치동",
      "도곡동",
      "삼성동",
      "세곡동",
      "수서동",
      "신사동",
      "압구정동",
      "역삼동",
      "율현동",
      "일원동",
      "자곡동",
      "청담동",
    ],
  },
  {
    gu: "강동구",
    dongs: [
      "전체",
      "강일동",
      "고덕동",
      "길동",
      "둔촌동",
      "명일동",
      "상일동",
      "성내동",
      "암사동",
      "천호동",
    ],
  },
  {
    gu: "강북구",
    dongs: ["전체", "미아동", "번동", "수유동", "우이동"],
  },
  {
    gu: "강서구",
    dongs: [
      "전체",
      "가양동",
      "개화동",
      "공항동",
      "과해동",
      "내발산동",
      "등촌동",
      "마곡동",
      "방화동",
      "외발산동",
      "염창동",
      "오곡동",
      "오쇠동",
      "화곡동",
    ],
  },
  {
    gu: "관악구",
    dongs: ["전체", "남현동", "봉천동", "신림동"],
  },
  {
    gu: "광진구",
    dongs: [
      "전체",
      "광장동",
      "구의동",
      "군자동",
      "능동",
      "자양동",
      "중곡동",
      "화양동",
    ],
  },
  {
    gu: "구로구",
    dongs: [
      "전체",
      "가리봉동",
      "개봉동",
      "고척동",
      "구로동",
      "궁동",
      "신도림동",
      "오류동",
      "온수동",
      "천왕동",
      "항동",
    ],
  },
  {
    gu: "금천구",
    dongs: ["전체", "가산동", "독산동", "시흥동"],
  },
  {
    gu: "노원구",
    dongs: ["전체", "공릉동", "상계동", "월계동", "중계동", "하계동"],
  },
  {
    gu: "도봉구",
    dongs: ["전체", "도봉동", "방학동", "쌍문동", "창동"],
  },
  {
    gu: "동대문구",
    dongs: [
      "전체",
      "답십리동",
      "신설동",
      "용두동",
      "이문동",
      "장안동",
      "전농동",
      "제기동",
      "청량리동",
      "회기동",
      "휘경동",
    ],
  },
  {
    gu: "동작구",
    dongs: [
      "전체",
      "노량진동",
      "대방동",
      "동작동",
      "본동",
      "사당동",
      "상도동",
      "상도1동",
      "신대방동",
      "흑석동",
    ],
  },
  {
    gu: "마포구",
    dongs: [
      "전체",
      "공덕동",
      "구수동",
      "당인동",
      "대흥동",
      "도화동",
      "동교동",
      "마포동",
      "망원동",
      "상수동",
      "상암동",
      "서교동",
      "성산동",
      "신공덕동",
      "신수동",
      "신정동",
      "아현동",
      "연남동",
      "염리동",
      "용강동",
      "중동",
      "창전동",
      "토정동",
      "하중동",
      "합정동",
      "현석동",
    ],
  },
  {
    gu: "서대문구",
    dongs: [
      "전체",
      "남가좌동",
      "냉천동",
      "대신동",
      "대현동",
      "미근동",
      "봉원동",
      "북가좌동",
      "북아현동",
      "신촌동",
      "연희동",
      "영천동",
      "옥천동",
      "창천동",
      "천연동",
      "충정로2가",
      "충정로3가",
      "합동",
      "현저동",
      "홍은동",
      "홍제동",
    ],
  },
  {
    gu: "서초구",
    dongs: [
      "전체",
      "내곡동",
      "반포동",
      "방배동",
      "서초동",
      "신원동",
      "양재동",
      "염곡동",
      "우면동",
      "원지동",
      "잠원동",
    ],
  },
  {
    gu: "성동구",
    dongs: [
      "전체",
      "금호동1가",
      "금호동2가",
      "금호동3가",
      "금호동4가",
      "도선동",
      "마장동",
      "사근동",
      "상왕십리동",
      "성수동1가",
      "성수동2가",
      "송정동",
      "옥수동",
      "용답동",
      "응봉동",
      "하왕십리동",
      "행당동",
      "홍익동",
    ],
  },
  {
    gu: "성북구",
    dongs: [
      "전체",
      "길음동",
      "돈암동",
      "동선동1가",
      "동선동2가",
      "동선동3가",
      "동선동4가",
      "동선동5가",
      "동소문동1가",
      "동소문동2가",
      "동소문동3가",
      "동소문동4가",
      "동소문동5가",
      "동소문동6가",
      "동소문동7가",
      "보문동1가",
      "보문동2가",
      "보문동3가",
      "보문동4가",
      "보문동5가",
      "보문동6가",
      "보문동7가",
      "삼선동1가",
      "삼선동2가",
      "삼선동3가",
      "삼선동4가",
      "삼선동5가",
      "상월곡동",
      "석관동",
      "성북동",
      "성북동1가",
      "안암동1가",
      "안암동2가",
      "안암동3가",
      "안암동4가",
      "안암동5가",
      "장위동",
      "정릉동",
      "종암동",
      "하월곡동",
    ],
  },
  {
    gu: "송파구",
    dongs: [
      "전체",
      "가락동",
      "거여동",
      "마천동",
      "문정동",
      "방이동",
      "삼전동",
      "석촌동",
      "송파동",
      "신천동",
      "오금동",
      "오륜동",
      "잠실동",
      "장지동",
      "풍납동",
    ],
  },
  {
    gu: "양천구",
    dongs: ["전체", "목동", "신월동", "신정동"],
  },
  {
    gu: "영등포구",
    dongs: [
      "전체",
      "당산동",
      "당산동1가",
      "당산동2가",
      "당산동3가",
      "당산동4가",
      "당산동5가",
      "당산동6가",
      "대림동",
      "도림동",
      "문래동1가",
      "문래동2가",
      "문래동3가",
      "문래동4가",
      "문래동5가",
      "문래동6가",
      "신길동",
      "양평동",
      "양평동1가",
      "양평동2가",
      "양평동3가",
      "양평동4가",
      "양평동5가",
      "양평동6가",
      "양화동",
      "여의도동",
      "영등포동",
      "영등포동1가",
      "영등포동2가",
      "영등포동3가",
      "영등포동4가",
      "영등포동5가",
      "영등포동6가",
      "영등포동7가",
      "영등포동8가",
    ],
  },
  {
    gu: "용산구",
    dongs: [
      "전체",
      "갈월동",
      "남영동",
      "도원동",
      "동빙고동",
      "동자동",
      "문배동",
      "보광동",
      "산천동",
      "서계동",
      "서빙고동",
      "신계동",
      "신창동",
      "용문동",
      "용산동1가",
      "용산동2가",
      "용산동3가",
      "용산동4가",
      "용산동5가",
      "용산동6가",
      "원효로1가",
      "원효로2가",
      "원효로3가",
      "원효로4가",
      "이촌동",
      "이태원동",
      "주교동",
      "주자동",
      "청암동",
      "청파동1가",
      "청파동2가",
      "청파동3가",
      "한강로1가",
      "한강로2가",
      "한강로3가",
      "한남동",
      "효창동",
      "후암동",
    ],
  },
  {
    gu: "은평구",
    dongs: [
      "전체",
      "갈현동",
      "구산동",
      "녹번동",
      "대조동",
      "불광동",
      "수색동",
      "신사동",
      "역촌동",
      "응암동",
      "증산동",
      "진관동",
    ],
  },
  {
    gu: "종로구",
    dongs: [
      "전체",
      "가회동",
      "견지동",
      "경운동",
      "계동",
      "공평동",
      "관수동",
      "관철동",
      "관훈동",
      "교남동",
      "교북동",
      "구기동",
      "궁정동",
      "권농동",
      "낙원동",
      "내수동",
      "내자동",
      "누상동",
      "누하동",
      "당주동",
      "도렴동",
      "돈의동",
      "동숭동",
      "명륜1가",
      "명륜2가",
      "명륜3가",
      "명륜4가",
      "묘동",
      "무악동",
      "봉익동",
      "부암동",
      "사간동",
      "사직동",
      "삼청동",
      "서린동",
      "세종로",
      "소격동",
      "송월동",
      "송현동",
      "수송동",
      "숭인동",
      "신교동",
      "신문로1가",
      "신문로2가",
      "신영동",
      "안국동",
      "연건동",
      "연지동",
      "예지동",
      "옥인동",
      "와룡동",
      "운니동",
      "원남동",
      "원서동",
      "이화동",
      "익선동",
      "인사동",
      "인의동",
      "장사동",
      "재동",
      "적선동",
      "종로1가",
      "종로2가",
      "종로3가",
      "종로4가",
      "종로5가",
      "종로6가",
      "중학동",
      "창성동",
      "창신동",
      "청운동",
      "청진동",
      "체부동",
      "충신동",
      "통의동",
      "통인동",
      "팔판동",
      "평동",
      "평창동",
      "필운동",
      "행촌동",
      "혜화동",
      "홍지동",
      "홍파동",
      "화동",
      "효자동",
      "효제동",
      "훈정동",
    ],
  },
  {
    gu: "중구",
    dongs: [
      "전체",
      "광희동1가",
      "광희동2가",
      "남대문로1가",
      "남대문로2가",
      "남대문로3가",
      "남대문로4가",
      "남대문로5가",
      "남산동1가",
      "남산동2가",
      "남산동3가",
      "남창동",
      "다동",
      "만리동1가",
      "만리동2가",
      "명동1가",
      "명동2가",
      "무교동",
      "무학동",
      "묵정동",
      "방산동",
      "봉래동1가",
      "봉래동2가",
      "북창동",
      "산림동",
      "삼각동",
      "서소문동",
      "소공동",
      "수표동",
      "수하동",
      "순화동",
      "신당동",
      "쌍림동",
      "예관동",
      "예장동",
      "오장동",
      "을지로1가",
      "을지로2가",
      "을지로3가",
      "을지로4가",
      "을지로5가",
      "을지로6가",
      "을지로7가",
      "의주로1가",
      "의주로2가",
      "인현동1가",
      "인현동2가",
      "입정동",
      "장교동",
      "장충동1가",
      "장충동2가",
      "저동1가",
      "저동2가",
      "정동",
      "주교동",
      "주자동",
      "중림동",
      "초동",
      "충무로1가",
      "충무로2가",
      "충무로3가",
      "충무로4가",
      "충무로5가",
      "태평로1가",
      "태평로2가",
      "필동1가",
      "필동2가",
      "필동3가",
      "황학동",
      "회현동1가",
      "회현동2가",
      "회현동3가",
      "흥인동",
    ],
  },
  {
    gu: "중랑구",
    dongs: ["전체", "망우동", "면목동", "묵동", "상봉동", "신내동", "중화동"],
  },
];

/**
 * 구/동/단지별 Mock 거래동향 데이터 생성기
 */
export async function getMarketTrendsData(
  gu: string = "송파구",
  dong: string = "전체",
  complex: string = "전체"
): Promise<TrendsDataResponse> {
  // 실제 API 지연 시뮬레이션
  await new Promise((resolve) => setTimeout(resolve, 80));

  // 1. 구/동에 속한 전체 단지 목록 (필터 드롭다운용)
  const allRankingsInDong: ComplexRankingItem[] = getMockRankingsByRegion(gu, dong);
  const complexList: string[] = ["전체", ...allRankingsInDong.map((c) => c.complexName)];

  // 2. 단지 필터링 적용
  const rankings: ComplexRankingItem[] =
    complex === "전체"
      ? allRankingsInDong
      : allRankingsInDong.filter((item) => item.complexName === complex);

  // 3. 선택된 단지 또는 구/동 기준 기준가 결정
  const selectedTargetComplex = allRankingsInDong.find((c) => c.complexName === complex);
  const basePrice = selectedTargetComplex
    ? selectedTargetComplex.recentTradePrice
    : rankings.length > 0
    ? rankings[0].recentTradePrice
    : 180000;

  // 4. 12개월 과거 실거래 + 3개월 AI 예상 가격 추이 생성
  const monthlyTrends: MonthlyPriceTrendPoint[] = getMockMonthlyTrendsByPrice(basePrice);

  // 5. 주요 요약 지표 계산
  const totalTransactions =
    complex === "전체"
      ? rankings.reduce((acc, cur) => acc + cur.txCount, 0) * 4
      : selectedTargetComplex?.txCount || 10;

  const avgPricePerPyeong = Math.round(
    rankings.reduce((acc, cur) => acc + cur.avgTradePrice, 0) / (rankings.length || 1) / 3.3
  );

  const highestTradeItem = [...rankings].sort((a, b) => b.recentTradePrice - a.recentTradePrice)[0];

  return {
    selectedGu: gu,
    selectedDong: dong,
    selectedComplex: complex,
    complexList,
    summary: {
      period: "2026년 8월 기준",
      totalTransactions: totalTransactions > 0 ? totalTransactions : 420,
      txChangeRate: gu === "송파구" || gu === "강남구" || gu === "서초구" ? 14.8 : 8.2,
      avgPricePerPyeong: avgPricePerPyeong > 0 ? avgPricePerPyeong : 5850,
      priceChangeRate: 2.4,
      highestTradeComplex: highestTradeItem ? highestTradeItem.complexName : "대표단지",
      highestTradePrice: highestTradeItem ? highestTradeItem.recentTradePrice : 265000,
    },
    rankings,
    monthlyTrends,
    lastUpdated: new Date().toISOString().slice(0, 10),
  };
}
/**
 * 지역별(구/동) 실거래 랭킹 대표 데이터 맵
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
    { rank: 5, complexName: "용산더프라임", dong: "원효로1가", pyeongType: "84㎡ (35평)", txCount: 10, avgTradePrice: 175000, recentTradePrice: 178000, changeFromLastMonth: 2500, isNewHighPrice: false },
  ],
  성동구: [
    { rank: 1, complexName: "트리마제", dong: "성수동1가", pyeongType: "84㎡ (38평)", txCount: 22, avgTradePrice: 410000, recentTradePrice: 425000, changeFromLastMonth: 12000, isNewHighPrice: true },
    { rank: 2, complexName: "아크로서울포레스트", dong: "성수동2가", pyeongType: "159㎡ (62평)", txCount: 16, avgTradePrice: 880000, recentTradePrice: 930000, changeFromLastMonth: 35000, isNewHighPrice: true },
    { rank: 3, complexName: "옥수리버젠", dong: "옥수동", pyeongType: "84㎡ (33평)", txCount: 24, avgTradePrice: 195000, recentTradePrice: 200000, changeFromLastMonth: 5000, isNewHighPrice: false },
    { rank: 4, complexName: "힐스테이트금호", dong: "금호동1가", pyeongType: "84㎡ (33평)", txCount: 19, avgTradePrice: 178000, recentTradePrice: 182000, changeFromLastMonth: 3500, isNewHighPrice: false },
    { rank: 5, complexName: "서울숲리버뷰자이", dong: "행당동", pyeongType: "84㎡ (33평)", txCount: 17, avgTradePrice: 185000, recentTradePrice: 189000, changeFromLastMonth: 3000, isNewHighPrice: false },
    { rank: 6, complexName: "센트라스", dong: "하왕십리동", pyeongType: "84㎡ (34평)", txCount: 20, avgTradePrice: 165000, recentTradePrice: 168000, changeFromLastMonth: 2500, isNewHighPrice: false },
  ],
  영등포구: [
    { rank: 1, complexName: "여의도 시범아파트", dong: "여의도동", pyeongType: "79㎡ (24평)", txCount: 27, avgTradePrice: 235000, recentTradePrice: 245000, changeFromLastMonth: 8000, isNewHighPrice: true },
    { rank: 2, complexName: "당산센트럴아이파크", dong: "당산동", pyeongType: "84㎡ (34평)", txCount: 23, avgTradePrice: 175000, recentTradePrice: 180000, changeFromLastMonth: 4000, isNewHighPrice: false },
    { rank: 3, complexName: "문래자이", dong: "문래동3가", pyeongType: "84㎡ (35평)", txCount: 18, avgTradePrice: 148000, recentTradePrice: 152000, changeFromLastMonth: 3000, isNewHighPrice: false },
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
  종로구: [
    { rank: 1, complexName: "경희궁자이2단지", dong: "교남동", pyeongType: "84㎡ (34평)", txCount: 24, avgTradePrice: 205000, recentTradePrice: 212000, changeFromLastMonth: 5000, isNewHighPrice: true },
    { rank: 2, complexName: "경희궁자이3단지", dong: "평동", pyeongType: "84㎡ (34평)", txCount: 18, avgTradePrice: 200000, recentTradePrice: 205000, changeFromLastMonth: 3000, isNewHighPrice: false },
    { rank: 3, complexName: "인왕산아이파크", dong: "무악동", pyeongType: "84㎡ (33평)", txCount: 14, avgTradePrice: 135000, recentTradePrice: 138000, changeFromLastMonth: 2000, isNewHighPrice: false },
  ],
  중구: [
    { rank: 1, complexName: "남산롯데캐슬아이리스", dong: "회현동1가", pyeongType: "84㎡ (34평)", txCount: 16, avgTradePrice: 155000, recentTradePrice: 158000, changeFromLastMonth: 2500, isNewHighPrice: false },
    { rank: 2, complexName: "남산타운", dong: "신당동", pyeongType: "84㎡ (32평)", txCount: 29, avgTradePrice: 138000, recentTradePrice: 142000, changeFromLastMonth: 3000, isNewHighPrice: true },
    { rank: 3, complexName: "청계천두산위브더제니스", dong: "흥인동", pyeongType: "84㎡ (34평)", txCount: 15, avgTradePrice: 145000, recentTradePrice: 148000, changeFromLastMonth: 2000, isNewHighPrice: false },
  ],
  서대문구: [
    { rank: 1, complexName: "e편한세상신촌", dong: "북아현동", pyeongType: "84㎡ (34평)", txCount: 30, avgTradePrice: 175000, recentTradePrice: 180000, changeFromLastMonth: 4000, isNewHighPrice: true },
    { rank: 2, complexName: "DMC파크뷰자이", dong: "남가좌동", pyeongType: "84㎡ (34평)", txCount: 35, avgTradePrice: 132000, recentTradePrice: 135000, changeFromLastMonth: 2500, isNewHighPrice: false },
    { rank: 3, complexName: "홍제센트럴아이파크", dong: "홍제동", pyeongType: "84㎡ (34평)", txCount: 19, avgTradePrice: 125000, recentTradePrice: 128000, changeFromLastMonth: 2000, isNewHighPrice: false },
  ],
  동대문구: [
    { rank: 1, complexName: "청량리역롯데캐슬SKY-L65", dong: "전농동", pyeongType: "84㎡ (35평)", txCount: 32, avgTradePrice: 165000, recentTradePrice: 172000, changeFromLastMonth: 6000, isNewHighPrice: true },
    { rank: 2, complexName: "래미안위브", dong: "답십리동", pyeongType: "84㎡ (33평)", txCount: 26, avgTradePrice: 125000, recentTradePrice: 128000, changeFromLastMonth: 2500, isNewHighPrice: false },
    { rank: 3, complexName: "래미안엘리니티", dong: "용두동", pyeongType: "84㎡ (34평)", txCount: 21, avgTradePrice: 138000, recentTradePrice: 142000, changeFromLastMonth: 3000, isNewHighPrice: false },
  ],
  광진구: [
    { rank: 1, complexName: "광장힐스테이트", dong: "광장동", pyeongType: "84㎡ (34평)", txCount: 22, avgTradePrice: 210000, recentTradePrice: 218000, changeFromLastMonth: 5500, isNewHighPrice: true },
    { rank: 2, complexName: "래미안프리미어팰리스", dong: "자양동", pyeongType: "84㎡ (34평)", txCount: 18, avgTradePrice: 178000, recentTradePrice: 182000, changeFromLastMonth: 3000, isNewHighPrice: false },
    { rank: 3, complexName: "구의현대2단지", dong: "구의동", pyeongType: "84㎡ (32평)", txCount: 19, avgTradePrice: 162000, recentTradePrice: 165000, changeFromLastMonth: 2000, isNewHighPrice: false },
  ],
  성북구: [
    { rank: 1, complexName: "래미안길음센터피스", dong: "길음동", pyeongType: "84㎡ (34평)", txCount: 31, avgTradePrice: 142000, recentTradePrice: 146000, changeFromLastMonth: 3500, isNewHighPrice: true },
    { rank: 2, complexName: "래미안장위포레카운티", dong: "장위동", pyeongType: "84㎡ (34평)", txCount: 27, avgTradePrice: 118000, recentTradePrice: 121000, changeFromLastMonth: 2500, isNewHighPrice: false },
    { rank: 3, complexName: "보문파크뷰자이", dong: "보문동6가", pyeongType: "84㎡ (34평)", txCount: 20, avgTradePrice: 128000, recentTradePrice: 131000, changeFromLastMonth: 2500, isNewHighPrice: false },
  ],
  강북구: [
    { rank: 1, complexName: "꿈의숲해링턴플레이스", dong: "미아동", pyeongType: "84㎡ (34평)", txCount: 23, avgTradePrice: 95000, recentTradePrice: 97500, changeFromLastMonth: 2000, isNewHighPrice: false },
    { rank: 2, complexName: "수유벽산아파트", dong: "수유동", pyeongType: "84㎡ (32평)", txCount: 17, avgTradePrice: 72000, recentTradePrice: 73500, changeFromLastMonth: 1200, isNewHighPrice: false },
    { rank: 3, complexName: "번동주공1단지", dong: "번동", pyeongType: "59㎡ (24평)", txCount: 21, avgTradePrice: 58000, recentTradePrice: 59500, changeFromLastMonth: 1000, isNewHighPrice: false },
  ],
  도봉구: [
    { rank: 1, complexName: "동아청솔", dong: "창동", pyeongType: "84㎡ (32평)", txCount: 24, avgTradePrice: 98000, recentTradePrice: 101000, changeFromLastMonth: 2000, isNewHighPrice: true },
    { rank: 2, complexName: "도봉한신", dong: "도봉동", pyeongType: "84㎡ (31평)", txCount: 20, avgTradePrice: 65000, recentTradePrice: 66500, changeFromLastMonth: 1200, isNewHighPrice: false },
    { rank: 3, complexName: "쌍문e편한세상", dong: "쌍문동", pyeongType: "84㎡ (33평)", txCount: 16, avgTradePrice: 78000, recentTradePrice: 79500, changeFromLastMonth: 1500, isNewHighPrice: false },
  ],
  은평구: [
    { rank: 1, complexName: "은평뉴타운제각말푸르지오", dong: "진관동", pyeongType: "84㎡ (34평)", txCount: 26, avgTradePrice: 92000, recentTradePrice: 94500, changeFromLastMonth: 2000, isNewHighPrice: false },
    { rank: 2, complexName: "힐스테이트녹번", dong: "녹번동", pyeongType: "84㎡ (34평)", txCount: 22, avgTradePrice: 115000, recentTradePrice: 118000, changeFromLastMonth: 2500, isNewHighPrice: true },
    { rank: 3, complexName: "백련산힐스테이트4차", dong: "응암동", pyeongType: "84㎡ (34평)", txCount: 19, avgTradePrice: 98000, recentTradePrice: 100000, changeFromLastMonth: 1500, isNewHighPrice: false },
  ],
  강서구: [
    { rank: 1, complexName: "마곡엠밸리7단지", dong: "마곡동", pyeongType: "84㎡ (34평)", txCount: 28, avgTradePrice: 168000, recentTradePrice: 173000, changeFromLastMonth: 4000, isNewHighPrice: true },
    { rank: 2, complexName: "우장산아이파크이편한세상", dong: "화곡동", pyeongType: "84㎡ (32평)", txCount: 25, avgTradePrice: 128000, recentTradePrice: 131000, changeFromLastMonth: 2500, isNewHighPrice: false },
    { rank: 3, complexName: "강서한강자이", dong: "가양동", pyeongType: "84㎡ (34평)", txCount: 20, avgTradePrice: 132000, recentTradePrice: 135000, changeFromLastMonth: 2500, isNewHighPrice: false },
  ],
  구로구: [
    { rank: 1, complexName: "신도림디큐브시티", dong: "신도림동", pyeongType: "84㎡ (35평)", txCount: 22, avgTradePrice: 152000, recentTradePrice: 156000, changeFromLastMonth: 3500, isNewHighPrice: true },
    { rank: 2, complexName: "신도림e편한세상4차", dong: "신도림동", pyeongType: "84㎡ (34평)", txCount: 25, avgTradePrice: 145000, recentTradePrice: 148000, changeFromLastMonth: 2500, isNewHighPrice: false },
    { rank: 3, complexName: "구로두산", dong: "구로동", pyeongType: "84㎡ (32평)", txCount: 19, avgTradePrice: 88000, recentTradePrice: 90000, changeFromLastMonth: 1500, isNewHighPrice: false },
  ],
  금천구: [
    { rank: 1, complexName: "롯데캐슬골드파크1차", dong: "독산동", pyeongType: "84㎡ (35평)", txCount: 26, avgTradePrice: 118000, recentTradePrice: 122000, changeFromLastMonth: 3000, isNewHighPrice: true },
    { rank: 2, complexName: "남서울힐스테이트", dong: "시흥동", pyeongType: "84㎡ (34평)", txCount: 19, avgTradePrice: 89000, recentTradePrice: 91000, changeFromLastMonth: 1500, isNewHighPrice: false },
    { rank: 3, complexName: "가산두산위브", dong: "가산동", pyeongType: "84㎡ (32평)", txCount: 14, avgTradePrice: 76000, recentTradePrice: 77500, changeFromLastMonth: 1200, isNewHighPrice: false },
  ],
  동작구: [
    { rank: 1, complexName: "아크로리버하임", dong: "흑석동", pyeongType: "84㎡ (34평)", txCount: 30, avgTradePrice: 245000, recentTradePrice: 252000, changeFromLastMonth: 6500, isNewHighPrice: true },
    { rank: 2, complexName: "래미안로이파크", dong: "사당동", pyeongType: "84㎡ (34평)", txCount: 24, avgTradePrice: 168000, recentTradePrice: 172000, changeFromLastMonth: 3500, isNewHighPrice: false },
    { rank: 3, complexName: "상도더샵1차", dong: "상도동", pyeongType: "84㎡ (33평)", txCount: 21, avgTradePrice: 148000, recentTradePrice: 151000, changeFromLastMonth: 2500, isNewHighPrice: false },
  ],
  관악구: [
    { rank: 1, complexName: "e편한세상서울대입구", dong: "봉천동", pyeongType: "84㎡ (34평)", txCount: 27, avgTradePrice: 128000, recentTradePrice: 132000, changeFromLastMonth: 3000, isNewHighPrice: true },
    { rank: 2, complexName: "신림현대", dong: "신림동", pyeongType: "84㎡ (32평)", txCount: 22, avgTradePrice: 82000, recentTradePrice: 84000, changeFromLastMonth: 1500, isNewHighPrice: false },
    { rank: 3, complexName: "남현한일유앤아이", dong: "남현동", pyeongType: "84㎡ (32평)", txCount: 15, avgTradePrice: 91000, recentTradePrice: 93000, changeFromLastMonth: 1500, isNewHighPrice: false },
  ],
  중랑구: [
    { rank: 1, complexName: "사가정센트럴아이파크", dong: "면목동", pyeongType: "84㎡ (34평)", txCount: 25, avgTradePrice: 112000, recentTradePrice: 115000, changeFromLastMonth: 2500, isNewHighPrice: true },
    { rank: 2, complexName: "신내데시앙", dong: "신내동", pyeongType: "84㎡ (33평)", txCount: 19, avgTradePrice: 88000, recentTradePrice: 90000, changeFromLastMonth: 1500, isNewHighPrice: false },
    { rank: 3, complexName: "상봉프레미어스엠코", dong: "상봉동", pyeongType: "84㎡ (35평)", txCount: 16, avgTradePrice: 98000, recentTradePrice: 100000, changeFromLastMonth: 1500, isNewHighPrice: false },
  ],
};

function getMockRankingsByRegion(gu: string, dong: string): ComplexRankingItem[] {
  const guList = SEOUL_COMPLEX_DATA_MAP[gu] || SEOUL_COMPLEX_DATA_MAP["송파구"] || [];
  const filtered = dong === "전체" ? guList : guList.filter((item) => item.dong === dong);

  // 만약 해당 동 데이터가 아직 없으면 동 이름을 맞춰서 스마트하게 2개 생성
  if (filtered.length === 0) {
    const basePriceEstimate =
      gu === "강남구" || gu === "서초구"
        ? 320000
        : gu === "송파구" || gu === "용산구"
        ? 240000
        : gu === "마포구" || gu === "성동구" || gu === "광진구" || gu === "동작구"
        ? 180000
        : 110000;

    return [
      {
        rank: 1,
        complexName: `${dong} 센트럴자이`,
        dong: dong,
        pyeongType: "84㎡ (34평)",
        txCount: 18,
        avgTradePrice: basePriceEstimate,
        recentTradePrice: basePriceEstimate + 3000,
        changeFromLastMonth: 3000,
        isNewHighPrice: true,
      },
      {
        rank: 2,
        complexName: `${dong} 래미안 파크`,
        dong: dong,
        pyeongType: "84㎡ (33평)",
        txCount: 14,
        avgTradePrice: basePriceEstimate - 6000,
        recentTradePrice: basePriceEstimate - 4000,
        changeFromLastMonth: 2000,
        isNewHighPrice: false,
      },
    ];
  }

  return filtered.map((item, idx) => ({ ...item, rank: idx + 1 }));
}

/**
 * 12개월 과거 실거래가 + 3개월 AI 예상 가격 변동 추이 데이터 생성
 */
function getMockMonthlyTrendsByPrice(basePrice: number): MonthlyPriceTrendPoint[] {
  const step = Math.round(basePrice * 0.015);

  return [
    { month: "25.09", actualAvgPrice: basePrice - step * 6, predictedAvgPrice: null, txVolume: 185 },
    { month: "25.10", actualAvgPrice: basePrice - step * 5, predictedAvgPrice: null, txVolume: 210 },
    { month: "25.11", actualAvgPrice: basePrice - step * 4.5, predictedAvgPrice: null, txVolume: 195 },
    { month: "25.12", actualAvgPrice: basePrice - step * 3.5, predictedAvgPrice: null, txVolume: 230 },
    { month: "26.01", actualAvgPrice: basePrice - step * 2.5, predictedAvgPrice: null, txVolume: 260 },
    { month: "26.02", actualAvgPrice: basePrice - step * 1.8, predictedAvgPrice: null, txVolume: 290 },
    { month: "26.03", actualAvgPrice: basePrice - step * 1.0, predictedAvgPrice: null, txVolume: 340 },
    { month: "26.04", actualAvgPrice: basePrice - step * 0.3, predictedAvgPrice: null, txVolume: 380 },
    { month: "26.05", actualAvgPrice: basePrice + step * 0.5, predictedAvgPrice: null, txVolume: 410 },
    { month: "26.06", actualAvgPrice: basePrice + step * 1.2, predictedAvgPrice: null, txVolume: 440 },
    { month: "26.07", actualAvgPrice: basePrice + step * 1.8, predictedAvgPrice: null, txVolume: 425 },
    { month: "26.08", actualAvgPrice: basePrice + step * 2.4, predictedAvgPrice: basePrice + step * 2.4, txVolume: 450 },
    // 🔮 향후 3개월 AI 예측 구간
    { month: "26.09", actualAvgPrice: null, predictedAvgPrice: basePrice + step * 3.2, txVolume: 465, isPrediction: true },
    { month: "26.10", actualAvgPrice: null, predictedAvgPrice: basePrice + step * 4.0, txVolume: 480, isPrediction: true },
    { month: "26.11", actualAvgPrice: null, predictedAvgPrice: basePrice + step * 4.8, txVolume: 490, isPrediction: true },
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

/**
 * 서울시 주요 대표 아파트 단지 목록 (자동완성 및 검색용)
 */
export const SEOUL_POPULAR_APARTMENTS: ApartmentSearchItem[] = [
  { name: "래미안대치팰리스", gu: "강남구", dong: "대치동" },
  { name: "래미안원베일리", gu: "서초구", dong: "반포동" },
  { name: "헬리오시티", gu: "송파구", dong: "가락동" },
  { name: "파크리오", gu: "송파구", dong: "신천동" },
  { name: "잠실엘스", gu: "송파구", dong: "잠실동" },
  { name: "리센츠", gu: "송파구", dong: "잠실동" },
  { name: "디에이치퍼스티어아이파크", gu: "강남구", dong: "개포동" },
  { name: "압구정현대", gu: "강남구", dong: "압구정동" },
  { name: "아크로리버파크", gu: "서초구", dong: "반포동" },
  { name: "반포자이", gu: "서초구", dong: "반포동" },
  { name: "마포래미안푸르지오", gu: "마포구", dong: "아현동" },
  { name: "DMC파크뷰자이", gu: "서대문구", dong: "남가좌동" },
  { name: "고덕그라시움", gu: "강동구", dong: "고덕동" },
  { name: "고덕아르테온", gu: "강동구", dong: "상일동" },
  { name: "목동신시가지7단지", gu: "양천구", dong: "목동" },
  { name: "경희궁자이", gu: "종로구", dong: "홍파동" },
  { name: "텐즈힐", gu: "성동구", dong: "하왕십리동" },
  { name: "래미안옥수리버젠", gu: "성동구", dong: "옥수동" },
  { name: "올림픽선수기자촌", gu: "송파구", dong: "방이동" },
  { name: "도곡렉슬", gu: "강남구", dong: "도곡동" },
  { name: "은마아파트", gu: "강남구", dong: "대치동" },
  { name: "트리마제", gu: "성동구", dong: "성수동1가" },
  { name: "아크로서울포레스트", gu: "성동구", dong: "성수동1가" },
];

/**
 * 아파트명 검색 자동완성
 */
export function searchApartments(keyword: string): ApartmentSearchItem[] {
  const q = keyword.trim().toLowerCase();
  if (!q) return SEOUL_POPULAR_APARTMENTS.slice(0, 5);

  const matched = SEOUL_POPULAR_APARTMENTS.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.gu.toLowerCase().includes(q) ||
      item.dong.toLowerCase().includes(q)
  );

  return matched.length > 0
    ? matched
    : [
        {
          name: keyword.trim(),
          gu: "서울시",
          dong: "주요동",
        },
      ];
}

/**
 * 아파트별 거래동향 상세 데이터 조회 (시안 1:1 맞춤형 데이터 생성 및 계산)
 */
export async function getApartmentTrendDetail(
  apt: ApartmentSearchItem = SEOUL_POPULAR_APARTMENTS[0],
  period: string = "최근 1년"
): Promise<ApartmentTrendDetailResponse> {
  // 실제 API 지연 시뮬레이션
  await new Promise((resolve) => setTimeout(resolve, 60));

  // 아파트 기본 가격 책정 (래미안대치팰리스: 22억대, 원베일리: 35억대, 헬리오시티: 20억대 등)
  let basePrice = 221900; // 22억 1,900만원
  let maxPrice = 325000; // 32억 5,000만원
  let totalCount = 128;
  let totalAmountEok = 2840;

  if (apt.name.includes("원베일리") || apt.name.includes("아크로리버파크") || apt.name.includes("압구정")) {
    basePrice = 385000;
    maxPrice = 540000;
    totalCount = 94;
    totalAmountEok = 3619;
  } else if (apt.name.includes("헬리오시티") || apt.name.includes("파크리오") || apt.name.includes("잠실엘스")) {
    basePrice = 238000;
    maxPrice = 285000;
    totalCount = 186;
    totalAmountEok = 4426;
  } else if (apt.name.includes("마포래미안") || apt.name.includes("고덕그라시움") || apt.name.includes("DMC")) {
    basePrice = 175000;
    maxPrice = 215000;
    totalCount = 142;
    totalAmountEok = 2485;
  }

  // 기간별 건수 스케일링
  if (period === "최근 6개월") {
    totalCount = Math.round(totalCount * 0.55);
    totalAmountEok = Math.round(totalAmountEok * 0.55);
  } else if (period === "최근 2년") {
    totalCount = Math.round(totalCount * 1.85);
    totalAmountEok = Math.round(totalAmountEok * 1.85);
  } else if (period === "최근 3년") {
    totalCount = Math.round(totalCount * 2.7);
    totalAmountEok = Math.round(totalAmountEok * 2.7);
  }

  // 12개월 월별 거래량 & 평균 거래가 추이
  const monthlyTrends: MonthlyVolumeAndPricePoint[] = [
    { month: "2023.05", volume: 23, avgPrice: Math.round(basePrice * 0.92) },
    { month: "2023.06", volume: 25, avgPrice: Math.round(basePrice * 0.94) },
    { month: "2023.07", volume: 21, avgPrice: Math.round(basePrice * 0.93) },
    { month: "2023.08", volume: 22, avgPrice: Math.round(basePrice * 0.93) },
    { month: "2023.09", volume: 28, avgPrice: Math.round(basePrice * 0.96) },
    { month: "2023.10", volume: 24, avgPrice: Math.round(basePrice * 0.95) },
    { month: "2023.11", volume: 32, avgPrice: Math.round(basePrice * 0.98) },
    { month: "2023.12", volume: 25, avgPrice: Math.round(basePrice * 0.94) },
    { month: "2024.01", volume: 21, avgPrice: Math.round(basePrice * 0.94) },
    { month: "2024.02", volume: 24, avgPrice: Math.round(basePrice * 0.96) },
    { month: "2024.03", volume: 21, avgPrice: Math.round(basePrice * 0.95) },
    { month: "2024.04", volume: 27, avgPrice: Math.round(basePrice * 0.98) },
    { month: "2024.05", volume: 24, avgPrice: Math.round(basePrice * 1.01) },
  ];

  // 전용면적별 거래 비중
  const areaDistribution: AreaDistributionItem[] = [
    { range: "59㎡ 이하", count: Math.round(totalCount * 0.125), percentage: 12.5, color: "#2563EB" },
    { range: "60~84㎡", count: Math.round(totalCount * 0.477), percentage: 47.7, color: "#16A34A" },
    { range: "85~114㎡", count: Math.round(totalCount * 0.266), percentage: 26.6, color: "#7C3AED" },
    { range: "115㎡ 이상", count: Math.round(totalCount * 0.132), percentage: 13.2, color: "#D1D5DB" },
  ];

  // 최근 실거래 내역 5건
  const recentTrades: RecentTradeRecord[] = [
    { dealDate: "2024.05.19", area: 84.98, floor: 12, price: Math.round(basePrice * 1.08) },
    { dealDate: "2024.05.18", area: 109.98, floor: 21, price: Math.round(maxPrice * 0.98) },
    { dealDate: "2024.05.17", area: 76.79, floor: 8, price: Math.round(basePrice * 0.96) },
    { dealDate: "2024.05.16", area: 59.91, floor: 15, price: Math.round(basePrice * 0.82) },
    { dealDate: "2024.05.15", area: 59.97, floor: 7, price: Math.round(basePrice * 0.78) },
  ];

  // 면적별 거래 현황
  const areaStats: AreaTradeStat[] = [
    { areaRange: "59㎡ 이하", dealCount: Math.round(totalCount * 0.125), avgPrice: Math.round(basePrice * 0.8) },
    { areaRange: "60~84㎡", dealCount: Math.round(totalCount * 0.477), avgPrice: Math.round(basePrice * 0.98) },
    { areaRange: "85~114㎡", dealCount: Math.round(totalCount * 0.266), avgPrice: Math.round(basePrice * 1.16) },
    { areaRange: "115㎡ 이상", dealCount: Math.round(totalCount * 0.132), avgPrice: Math.round(basePrice * 1.35) },
  ];

  // AI / 실거래 트렌드 요약 인사이트 3건
  const insights: TrendInsight[] = [
    {
      id: "insight-1",
      iconType: "up",
      title: "거래량이 전년 대비 8.7% 증가했어요.",
      subtitle: "시장이 활발해지고 있어요.",
    },
    {
      id: "insight-2",
      iconType: "chart",
      title: "평균 거래가는 전년 대비 3.6% 상승했어요.",
      subtitle: "지속적인 가격 상승세를 보이고 있어요.",
    },
    {
      id: "insight-3",
      iconType: "star",
      title: "85~114㎡ 구간의 거래 비중이 26.6%로 높아요.",
      subtitle: "중대형 평형에 대한 수요가 꾸준해요.",
    },
  ];

  const avgPriceEok = Math.floor(basePrice / 10000);
  const avgPriceMan = basePrice % 10000;
  const maxPriceEok = Math.floor(maxPrice / 10000);
  const maxPriceMan = maxPrice % 10000;

  return {
    apartment: apt,
    kpi: {
      totalTradeCount: totalCount,
      totalTradeCountChangeRate: 8.7,
      totalTradeAmountEok: totalAmountEok,
      totalTradeAmountChangeRate: 12.3,
      avgTradePriceEok: avgPriceEok,
      avgTradePriceMan: avgPriceMan,
      avgTradePriceChangeRate: 3.6,
      maxTradePriceEok: maxPriceEok,
      maxTradePriceMan: maxPriceMan,
      maxTradePriceChangeRate: 5.2,
      tradeVolumeChangeRate: 8.7,
      periodLabel: "(2023.05 ~ 2024.05)",
    },
    monthlyTrends,
    areaDistribution,
    recentTrades,
    areaStats,
    insights,
    baseDate: "2024.05.20",
  };
}
