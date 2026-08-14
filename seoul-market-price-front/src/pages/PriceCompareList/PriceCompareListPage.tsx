import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  HelpCircle,
  Home,
  Info,
  Loader2,
  Map,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { cn } from "../../lib/utils";

/* ========================================================================== */
/* 1. 타입 정의 (Types & Interfaces)                                         */
/* ========================================================================== */

export interface DongData {
  dong: string;
  avgPrice: number; // 단위: 억 원 (평균 매매가)
  recentPrice: number; // 단위: 억 원 (최근 실거래가)
  avgJeonsePrice: number; // 단위: 억 원 (평균 전세가)
  recentJeonsePrice: number; // 단위: 억 원 (최근 전세 실거래가)
}

export interface DistrictData {
  district: string;
  avgPrice: number;
  recentPrice: number;
  avgJeonsePrice: number;
  recentJeonsePrice: number;
  dongs: DongData[];
}

export interface MetricResult {
  avgPrice: number;
  recentPrice: number;
  avgJeonsePrice: number;
  recentJeonsePrice: number;
}

export interface SelectedRegion {
  district: string;
  dong: string;
}

/* ========================================================================== */
/* 2. 서울시 25개 자치구 & 전체 467개 자치동 목록 데이터                    */
/* ========================================================================== */

const SEOUL_GU_DONGS: Record<string, string[]> = {
  강남구: [
    "개포동", "논현동", "대치동", "도곡동", "삼성동", "세곡동", "수서동", "신사동",
    "압구정동", "역삼동", "율현동", "일원동", "자곡동", "청담동",
  ],
  강동구: [
    "강일동", "고덕동", "길동", "둔촌동", "명일동", "상일동", "성내동", "암사동", "천호동",
  ],
  강북구: ["미아동", "번동", "수유동", "우이동"],
  강서구: [
    "가양동", "개화동", "공항동", "과해동", "내발산동", "등촌동", "마곡동", "방화동",
    "염창동", "오곡동", "오쇠동", "외발산동", "화곡동",
  ],
  관악구: ["남현동", "봉천동", "신림동"],
  광진구: ["광장동", "구의동", "군자동", "능동", "자양동", "중곡동", "화양동"],
  구로구: [
    "가리봉동", "개봉동", "고척동", "구로동", "궁동", "신도림동", "오류동", "온수동", "천왕동", "항동",
  ],
  금천구: ["가산동", "독산동", "시흥동"],
  노원구: ["공릉동", "상계동", "월계동", "중계동", "하계동"],
  도봉구: ["도봉동", "방학동", "쌍문동", "창동"],
  동대문구: [
    "답십리동", "신설동", "용두동", "이문동", "장안동", "전농동", "제기동", "청량리동", "회기동", "휘경동",
  ],
  동작구: [
    "노량진동", "대방동", "동작동", "본동", "사당동", "상도동", "상도1동", "신대방동", "흑석동",
  ],
  마포구: [
    "공덕동", "구수동", "당인동", "대흥동", "도화동", "동교동", "마포동", "망원동", "상수동", "상암동",
    "서교동", "성산동", "신공덕동", "신수동", "신정동", "아현동", "연남동", "염리동", "용강동", "중동",
    "창전동", "토정동", "하중동", "합정동", "현석동",
  ],
  서대문구: [
    "남가좌동", "냉천동", "대신동", "대현동", "미근동", "봉원동", "북가좌동", "북아현동", "신촌동",
    "연희동", "영천동", "옥천동", "창천동", "천연동", "충정로2가", "충정로3가", "합동", "현저동", "홍은동", "홍제동",
  ],
  서초구: [
    "내곡동", "반포동", "방배동", "서초동", "신원동", "양재동", "염곡동", "우면동", "원지동", "잠원동",
  ],
  성동구: [
    "금호동1가", "금호동2가", "금호동3가", "금호동4가", "도선동", "마장동", "사근동", "상왕십리동",
    "성수동1가", "성수동2가", "송정동", "옥수동", "용답동", "응봉동", "하왕십리동", "행당동", "홍익동",
  ],
  성북구: [
    "길음동", "돈암동", "동선동1가", "동선동2가", "동선동3가", "동선동4가", "동선동5가",
    "동소문동1가", "동소문동2가", "동소문동3가", "동소문동4가", "동소문동5가", "동소문동6가", "동소문동7가",
    "보문동1가", "보문동2가", "보문동3가", "보문동4가", "보문동5가", "보문동6가", "보문동7가",
    "삼선동1가", "삼선동2가", "삼선동3가", "삼선동4가", "삼선동5가",
    "상월곡동", "석관동", "성북동", "성북동1가", "안암동1가", "안암동2가", "안암동3가", "안암동4가", "안암동5가",
    "장위동", "정릉동", "종암동", "하월곡동",
  ],
  송파구: [
    "가락동", "거여동", "마천동", "문정동", "방이동", "삼전동", "석촌동", "송파동", "신천동",
    "오금동", "오륜동", "잠실동", "장지동", "풍납동",
  ],
  양천구: ["목동", "신월동", "신정동"],
  영등포구: [
    "당산동", "당산동1가", "당산동2가", "당산동3가", "당산동4가", "당산동5가", "당산동6가",
    "대림동", "도림동", "문래동1가", "문래동2가", "문래동3가", "문래동4가", "문래동5가", "문래동6가",
    "신길동", "양평동", "양평동1가", "양평동2가", "양평동3가", "양평동4가", "양평동5가", "양평동6가",
    "양화동", "여의도동", "영등포동", "영등포동1가", "영등포동2가", "영등포동3가", "영등포동4가", "영등포동5가", "영등포동6가", "영등포동7가", "영등포동8가",
  ],
  용산구: [
    "갈월동", "남영동", "도원동", "동빙고동", "동자동", "문배동", "보광동", "산천동", "서계동", "서빙고동",
    "신계동", "신창동", "용문동", "용산동1가", "용산동2가", "용산동3가", "용산동4가", "용산동5가", "용산동6가",
    "원효로1가", "원효로2가", "원효로3가", "원효로4가", "이촌동", "이태원동", "주교동", "주자동", "청암동",
    "청파동1가", "청파동2가", "청파동3가", "한강로1가", "한강로2가", "한강로3가", "한남동", "효창동", "후암동",
  ],
  은평구: [
    "갈현동", "구산동", "녹번동", "대조동", "불광동", "수색동", "신사동", "역촌동", "응암동", "증산동", "진관동",
  ],
  종로구: [
    "가회동", "견지동", "경운동", "계동", "공평동", "관수동", "관철동", "관훈동", "교남동", "교북동",
    "구기동", "궁정동", "권농동", "낙원동", "내수동", "내자동", "누상동", "누하동", "당주동", "도렴동",
    "돈의동", "동숭동", "명륜1가", "명륜2가", "명륜3가", "명륜4가", "묘동", "무악동", "봉익동", "부암동",
    "사간동", "사직동", "삼청동", "서린동", "세종로", "소격동", "송월동", "송현동", "수송동", "숭인동",
    "신교동", "신문로1가", "신문로2가", "신영동", "안국동", "연건동", "연지동", "예지동", "옥인동", "와룡동",
    "운니동", "원남동", "원서동", "이화동", "익선동", "인사동", "인의동", "장사동", "재동", "적선동",
    "종로1가", "종로2가", "종로3가", "종로4가", "종로5가", "종로6가", "중학동", "창성동", "창신동", "청운동",
    "청진동", "체부동", "충신동", "통의동", "통인동", "팔판동", "평동", "평창동", "필운동", "행촌동",
    "혜화동", "홍지동", "홍파동", "화동", "효자동", "효제동", "훈정동",
  ],
  중구: [
    "광희동1가", "광희동2가", "남대문로1가", "남대문로2가", "남대문로3가", "남대문로4가", "남대문로5가",
    "남산동1가", "남산동2가", "남산동3가", "남창동", "다동", "만리동1가", "만리동2가", "명동1가", "명동2가",
    "무교동", "무학동", "묵정동", "방산동", "봉래동1가", "봉래동2가", "북창동", "산림동", "삼각동",
    "서소문동", "소공동", "수표동", "수하동", "순화동", "신당동", "쌍림동", "예관동", "예장동", "오장동",
    "을지로1가", "을지로2가", "을지로3가", "을지로4가", "을지로5가", "을지로6가", "을지로7가", "의주로1가", "의주로2가",
    "인현동1가", "인현동2가", "입정동", "장교동", "장충동1가", "장충동2가", "저동1가", "저동2가", "정동",
    "주교동", "주자동", "중림동", "초동", "충무로1가", "충무로2가", "충무로3가", "충무로4가", "충무로5가",
    "태평로1가", "태평로2가", "필동1가", "필동2가", "필동3가", "황학동", "회현동1가", "회현동2가", "회현동3가", "흥인동",
  ],
  중랑구: ["망우동", "면목동", "묵동", "상봉동", "신내동", "중화동"],
};

/* ========================================================================== */
/* 3. 시세 통계 기준 데이터 및 계산 헬퍼 (백엔드 API 연동 전 임시 시뮬레이터) */
/* ========================================================================== */

// 구별 기준 시세
const DISTRICT_BASE_PRICES: Record<string, MetricResult> = {
  강남구: { avgPrice: 26.5, recentPrice: 27.2, avgJeonsePrice: 13.5, recentJeonsePrice: 13.9 },
  서초구: { avgPrice: 25.8, recentPrice: 26.5, avgJeonsePrice: 13.2, recentJeonsePrice: 13.7 },
  송파구: { avgPrice: 21.5, recentPrice: 22.2, avgJeonsePrice: 11.0, recentJeonsePrice: 11.5 },
  용산구: { avgPrice: 23.5, recentPrice: 24.2, avgJeonsePrice: 12.0, recentJeonsePrice: 12.6 },
  성동구: { avgPrice: 17.2, recentPrice: 17.8, avgJeonsePrice: 9.1, recentJeonsePrice: 9.5 },
  마포구: { avgPrice: 16.5, recentPrice: 17.1, avgJeonsePrice: 8.8, recentJeonsePrice: 9.2 },
  광진구: { avgPrice: 14.5, recentPrice: 15.0, avgJeonsePrice: 7.8, recentJeonsePrice: 8.2 },
  양천구: { avgPrice: 14.6, recentPrice: 15.1, avgJeonsePrice: 7.8, recentJeonsePrice: 8.2 },
  영등포구: { avgPrice: 14.2, recentPrice: 14.7, avgJeonsePrice: 7.5, recentJeonsePrice: 7.9 },
  동작구: { avgPrice: 14.8, recentPrice: 15.3, avgJeonsePrice: 7.9, recentJeonsePrice: 8.3 },
  강동구: { avgPrice: 12.8, recentPrice: 13.2, avgJeonsePrice: 6.8, recentJeonsePrice: 7.1 },
  종로구: { avgPrice: 12.5, recentPrice: 13.0, avgJeonsePrice: 6.8, recentJeonsePrice: 7.1 },
  중구: { avgPrice: 13.2, recentPrice: 13.7, avgJeonsePrice: 7.2, recentJeonsePrice: 7.6 },
  서대문구: { avgPrice: 11.6, recentPrice: 12.0, avgJeonsePrice: 6.3, recentJeonsePrice: 6.6 },
  동대문구: { avgPrice: 10.8, recentPrice: 11.2, avgJeonsePrice: 5.9, recentJeonsePrice: 6.2 },
  강서구: { avgPrice: 10.4, recentPrice: 10.8, avgJeonsePrice: 5.6, recentJeonsePrice: 5.9 },
  성북구: { avgPrice: 10.2, recentPrice: 10.6, avgJeonsePrice: 5.6, recentJeonsePrice: 5.9 },
  은평구: { avgPrice: 9.2, recentPrice: 9.6, avgJeonsePrice: 5.1, recentJeonsePrice: 5.4 },
  구로구: { avgPrice: 8.8, recentPrice: 9.1, avgJeonsePrice: 4.9, recentJeonsePrice: 5.2 },
  노원구: { avgPrice: 8.5, recentPrice: 8.8, avgJeonsePrice: 4.7, recentJeonsePrice: 5.0 },
  관악구: { avgPrice: 8.6, recentPrice: 8.9, avgJeonsePrice: 4.8, recentJeonsePrice: 5.1 },
  중랑구: { avgPrice: 7.8, recentPrice: 8.1, avgJeonsePrice: 4.4, recentJeonsePrice: 4.6 },
  금천구: { avgPrice: 7.6, recentPrice: 7.9, avgJeonsePrice: 4.3, recentJeonsePrice: 4.5 },
  강북구: { avgPrice: 7.5, recentPrice: 7.8, avgJeonsePrice: 4.2, recentJeonsePrice: 4.4 },
  도봉구: { avgPrice: 7.2, recentPrice: 7.5, avgJeonsePrice: 4.0, recentJeonsePrice: 4.2 },
};

// 주요 랜드마크 동 개별 시세
const DONG_CUSTOM_PRICES: Record<string, MetricResult> = {
  압구정동: { avgPrice: 42.5, recentPrice: 43.8, avgJeonsePrice: 20.5, recentJeonsePrice: 21.2 },
  청담동: { avgPrice: 34.2, recentPrice: 35.0, avgJeonsePrice: 17.5, recentJeonsePrice: 18.2 },
  반포동: { avgPrice: 38.5, recentPrice: 39.8, avgJeonsePrice: 19.5, recentJeonsePrice: 20.3 },
  한남동: { avgPrice: 36.0, recentPrice: 37.5, avgJeonsePrice: 18.5, recentJeonsePrice: 19.4 },
  대치동: { avgPrice: 28.6, recentPrice: 29.5, avgJeonsePrice: 14.8, recentJeonsePrice: 15.3 },
  삼성동: { avgPrice: 27.5, recentPrice: 28.3, avgJeonsePrice: 14.0, recentJeonsePrice: 14.5 },
  잠실동: { avgPrice: 28.5, recentPrice: 29.4, avgJeonsePrice: 14.6, recentJeonsePrice: 15.3 },
  성수동1가: { avgPrice: 29.5, recentPrice: 30.8, avgJeonsePrice: 15.2, recentJeonsePrice: 16.0 },
  여의도동: { avgPrice: 25.5, recentPrice: 26.4, avgJeonsePrice: 13.0, recentJeonsePrice: 13.7 },
  목동: { avgPrice: 21.5, recentPrice: 22.4, avgJeonsePrice: 11.2, recentJeonsePrice: 11.8 },
  흑석동: { avgPrice: 20.5, recentPrice: 21.2, avgJeonsePrice: 11.0, recentJeonsePrice: 11.6 },
};

// 동별 자연스러운 시세 생성 헬퍼
const generateDongPrice = (dong: string, base: MetricResult): DongData => {
  if (DONG_CUSTOM_PRICES[dong]) {
    return { dong, ...DONG_CUSTOM_PRICES[dong] };
  }
  let hash = 0;
  for (let i = 0; i < dong.length; i++) {
    hash = (hash << 5) - hash + dong.charCodeAt(i);
    hash |= 0;
  }
  const factor = 0.94 + (Math.abs(hash) % 13) * 0.01;
  const avg = Math.round(base.avgPrice * factor * 10) / 10;
  const recent = Math.round((avg + 0.3 + (Math.abs(hash) % 5) * 0.1) * 10) / 10;
  const avgJeonse = Math.round(base.avgJeonsePrice * factor * 10) / 10;
  const recentJeonse = Math.round((avgJeonse + 0.2 + (Math.abs(hash) % 4) * 0.1) * 10) / 10;

  return {
    dong,
    avgPrice: avg,
    recentPrice: recent,
    avgJeonsePrice: avgJeonse,
    recentJeonsePrice: recentJeonse,
  };
};

// 서울시 25개 구/467개 동 데이터 맵
const SEOUL_DATA: DistrictData[] = Object.entries(SEOUL_GU_DONGS).map(([gu, dongsList]) => {
  const base = DISTRICT_BASE_PRICES[gu] || {
    avgPrice: 12.0,
    recentPrice: 12.5,
    avgJeonsePrice: 6.5,
    recentJeonsePrice: 6.8,
  };
  return {
    district: gu,
    avgPrice: base.avgPrice,
    recentPrice: base.recentPrice,
    avgJeonsePrice: base.avgJeonsePrice,
    recentJeonsePrice: base.recentJeonsePrice,
    dongs: dongsList.map((dong) => generateDongPrice(dong, base)),
  };
});

// 가나다순 자치구 목록
const DISTRICT_NAMES = SEOUL_DATA.map((d) => d.district).sort((a, b) =>
  a.localeCompare(b, "ko"),
);

// 억 원 단위 금액을 한글 표기(예: 15억 5,000만 원)로 변환
const formatPriceKRW = (priceInEok: number) => {
  const eok = Math.floor(priceInEok);
  const remainderMan = Math.round((priceInEok - eok) * 10000);
  if (remainderMan === 0) return `${eok}억 원`;
  return `${eok}억 ${remainderMan.toLocaleString()}만 원`;
};

// 시세 데이터 조회 함수
const getMetrics = (district: string, dong: string): MetricResult => {
  const dist = SEOUL_DATA.find((d) => d.district === district);
  if (!dist) {
    return { avgPrice: 15.0, recentPrice: 15.5, avgJeonsePrice: 8.0, recentJeonsePrice: 8.3 };
  }
  if (dong !== "전체") {
    const dongItem = dist.dongs.find((d) => d.dong === dong);
    if (dongItem) {
      return {
        avgPrice: dongItem.avgPrice,
        recentPrice: dongItem.recentPrice,
        avgJeonsePrice: dongItem.avgJeonsePrice,
        recentJeonsePrice: dongItem.recentJeonsePrice,
      };
    }
  }
  return {
    avgPrice: dist.avgPrice,
    recentPrice: dist.recentPrice,
    avgJeonsePrice: dist.avgJeonsePrice,
    recentJeonsePrice: dist.recentJeonsePrice,
  };
};

// 백엔드 API 연동을 위한 비동기 함수 인터페이스 (백엔드 완성 시 fetch/axios로 교체)
async function fetchPriceCompareMetricsApi(
  region1: SelectedRegion,
  region2: SelectedRegion,
): Promise<{ r1: MetricResult; r2: MetricResult }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        r1: getMetrics(region1.district, region1.dong),
        r2: getMetrics(region2.district, region2.dong),
      });
    }, 400);
  });
}

const DEFAULT_REGION1: SelectedRegion = { district: "강남구", dong: "전체" };
const DEFAULT_REGION2: SelectedRegion = { district: "서초구", dong: "전체" };

/* ========================================================================== */
/* 4. 메인 컴포넌트 (PriceCompareListPage)                                   */
/* ========================================================================== */

export default function PriceCompareListPage() {
  // 상태 관리
  const [hasCompared, setHasCompared] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 지역 1 선택 상태
  const [r1District, setR1District] = useState(DEFAULT_REGION1.district);
  const [r1Dong, setR1Dong] = useState(DEFAULT_REGION1.dong);

  // 지역 2 선택 상태
  const [r2District, setR2District] = useState(DEFAULT_REGION2.district);
  const [r2Dong, setR2Dong] = useState(DEFAULT_REGION2.dong);

  // 적용된 비교 지역
  const [appliedR1, setAppliedR1] = useState(DEFAULT_REGION1);
  const [appliedR2, setAppliedR2] = useState(DEFAULT_REGION2);

  // 비교 통계 결과
  const [r1Metrics, setR1Metrics] = useState<MetricResult>(() =>
    getMetrics(DEFAULT_REGION1.district, DEFAULT_REGION1.dong),
  );
  const [r2Metrics, setR2Metrics] = useState<MetricResult>(() =>
    getMetrics(DEFAULT_REGION2.district, DEFAULT_REGION2.dong),
  );

  // 지역 1 동 목록 옵션
  const r1DongOptions = useMemo(() => {
    const found = SEOUL_DATA.find((d) => d.district === r1District);
    if (!found) return ["전체"];
    const dongs = [...found.dongs.map((d) => d.dong)].sort((a, b) =>
      a.localeCompare(b, "ko"),
    );
    return ["전체", ...dongs];
  }, [r1District]);

  // 지역 2 동 목록 옵션
  const r2DongOptions = useMemo(() => {
    const found = SEOUL_DATA.find((d) => d.district === r2District);
    if (!found) return ["전체"];
    const dongs = [...found.dongs.map((d) => d.dong)].sort((a, b) =>
      a.localeCompare(b, "ko"),
    );
    return ["전체", ...dongs];
  }, [r2District]);

  // 초기화 핸들러
  const handleReset = () => {
    setR1District(DEFAULT_REGION1.district);
    setR1Dong("전체");
    setR2District(DEFAULT_REGION2.district);
    setR2Dong("전체");
    setHasCompared(false);
    setIsLoading(false);
    setAppliedR1(DEFAULT_REGION1);
    setAppliedR2(DEFAULT_REGION2);
  };

  // 비교하기 클릭 핸들러
  const handleCompare = async () => {
    setIsLoading(true);
    const target1 = { district: r1District, dong: r1Dong };
    const target2 = { district: r2District, dong: r2Dong };
    setAppliedR1(target1);
    setAppliedR2(target2);

    try {
      const res = await fetchPriceCompareMetricsApi(target1, target2);
      setR1Metrics(res.r1);
      setR2Metrics(res.r2);
      setHasCompared(true);
    } catch (err) {
      console.error("비교 데이터 조회 실패:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 라벨 및 차이 계산
  const r1Label = `${appliedR1.district}${appliedR1.dong !== "전체" ? ` ${appliedR1.dong}` : ""}`;
  const r2Label = `${appliedR2.district}${appliedR2.dong !== "전체" ? ` ${appliedR2.dong}` : ""}`;

  const avgDiff = Math.abs(r1Metrics.avgPrice - r2Metrics.avgPrice).toFixed(1);
  const recentDiff = Math.abs(r1Metrics.recentPrice - r2Metrics.recentPrice).toFixed(1);
  const avgJeonseDiff = Math.abs(r1Metrics.avgJeonsePrice - r2Metrics.avgJeonsePrice).toFixed(1);

  const formatDiffText = (val1: number, val2: number, diff: string) => {
    if (val1 > val2) return `지역1이 ${diff}억 높음`;
    if (val1 < val2) return `지역2가 ${diff}억 높음`;
    return "동일함";
  };

  const avgDiffText = formatDiffText(r1Metrics.avgPrice, r2Metrics.avgPrice, avgDiff);
  const recentDiffText = formatDiffText(r1Metrics.recentPrice, r2Metrics.recentPrice, recentDiff);
  const avgJeonseDiffText = formatDiffText(r1Metrics.avgJeonsePrice, r2Metrics.avgJeonsePrice, avgJeonseDiff);

  // 차트 막대 너비 (%)
  const maxAvgPrice = Math.max(r1Metrics.avgPrice, r2Metrics.avgPrice, 10);
  const r1AvgWidth = `${Math.min(100, Math.max(15, (r1Metrics.avgPrice / maxAvgPrice) * 100))}%`;
  const r2AvgWidth = `${Math.min(100, Math.max(15, (r2Metrics.avgPrice / maxAvgPrice) * 100))}%`;

  const maxAvgJeonse = Math.max(r1Metrics.avgJeonsePrice, r2Metrics.avgJeonsePrice, 5);
  const r1JeonseWidth = `${Math.min(100, Math.max(15, (r1Metrics.avgJeonsePrice / maxAvgJeonse) * 100))}%`;
  const r2JeonseWidth = `${Math.min(100, Math.max(15, (r2Metrics.avgJeonsePrice / maxAvgJeonse) * 100))}%`;

  return (
    <div className={cn("tw-scope", "min-h-screen", "bg-[#F8FAFC]")}>
      <main className="py-8">
        <div
          className={cn(
            "mx-auto",
            "flex",
            "w-[min(1490px,calc(100%-48px))]",
            "gap-8",
            "max-[1240px]:w-[min(980px,calc(100%-36px))]",
            "max-[760px]:w-[calc(100%-24px)]",
            "max-[900px]:flex-col",
          )}
        >
          {/* ================================================================ */}
          {/* 좌측 사이드바 네비게이션                                         */}
          {/* ================================================================ */}
          <aside className="w-[240px] shrink-0 max-[900px]:w-full">
            <div className="sticky top-[96px] rounded-[16px] border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
              <h2 className="mb-4 text-[16px] font-black text-[#0F172A]">가격정보</h2>

              <nav className="flex flex-col gap-1">
                <Link
                  to="/price/compare-list"
                  className="flex items-center gap-2.5 rounded-[10px] bg-[#E8F6F9] px-3.5 py-3 text-[13px] font-extrabold text-[#0F8AA8] no-underline"
                >
                  <BarChart3 className="size-4" />
                  <span>지역별 비교(리스트)</span>
                </Link>
                <Link
                  to="/price"
                  className="flex items-center gap-2.5 rounded-[10px] px-3.5 py-3 text-[13px] font-semibold text-[#64748B] no-underline hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                >
                  <Map className="size-4" />
                  <span>지역별 비교(지도)</span>
                </Link>
                <Link
                  to="/price"
                  className="flex items-center gap-2.5 rounded-[10px] px-3.5 py-3 text-[13px] font-semibold text-[#64748B] no-underline hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                >
                  <Building2 className="size-4" />
                  <span>단지별 시세</span>
                </Link>
              </nav>

              <div className="mt-6 rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-[#475569]">
                  <HelpCircle className="size-3.5 text-[#0F8AA8]" />
                  <span>이용 가이드</span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#64748B]">
                  비교할 두 지역의 자치구와 자치동을 선택하고 &apos;비교하기&apos;를 눌러보세요.
                  매매 및 전세 시세 차이를 한눈에 확인할 수 있습니다.
                </p>
              </div>
            </div>
          </aside>

          {/* ================================================================ */}
          {/* 메인 콘텐츠 영역                                                  */}
          {/* ================================================================ */}
          <section className="min-w-0 flex-1">
            {/* 타이틀 및 초기화 버튼 */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h1 className="text-[24px] font-black text-[#0F172A]">지역별 비교(리스트)</h1>
                <p className="mt-1 text-[13px] font-medium text-[#64748B]">
                  자치구와 자치동을 선택하여 두 지역의 매매/전세 시세를 비교해보세요.
                </p>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 py-2 text-[12px] font-bold text-[#475569] shadow-sm transition-all hover:border-[#0F8AA8] hover:bg-[#F8FAFC] hover:text-[#0F8AA8]"
              >
                <RotateCcw className="size-3.5" />
                <span>초기화</span>
              </button>
            </div>

            {/* ============================================================== */}
            {/* 지역 선택 카드 (지역 1 vs 지역 2)                              */}
            {/* ============================================================== */}
            <div className="mb-8 rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
              <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-6 max-[1100px]:grid-cols-1">
                
                {/* 지역 1 (Blue) */}
                <div className="rounded-[16px] border border-[#2563EB]/20 bg-[#F0F6FF] p-5">
                  <div className="mb-4 inline-flex items-center rounded-full bg-[#2563EB] px-3 py-1 text-[11px] font-black text-white">
                    지역 1
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                      <span className="text-[13px] font-bold text-[#475569]">자치구</span>
                      <select
                        value={r1District}
                        onChange={(e) => {
                          setR1District(e.target.value);
                          setR1Dong("전체");
                        }}
                        className="h-10 rounded-[8px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-semibold text-[#0F172A] outline-none focus:border-[#2563EB]"
                      >
                        {DISTRICT_NAMES.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                      <span className="text-[13px] font-bold text-[#475569]">자치동</span>
                      <select
                        value={r1Dong}
                        onChange={(e) => setR1Dong(e.target.value)}
                        className="h-10 rounded-[8px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-semibold text-[#0F172A] outline-none focus:border-[#2563EB]"
                      >
                        {r1DongOptions.map((dong) => (
                          <option key={dong} value={dong}>
                            {dong}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* VS 구분 배지 */}
                <div className="flex items-center justify-center">
                  <div className="flex size-11 items-center justify-center rounded-full border border-[#E2E8F0] bg-white font-black text-[#94A3B8] shadow-sm">
                    VS
                  </div>
                </div>

                {/* 지역 2 (Green) */}
                <div className="rounded-[16px] border border-[#16A34A]/20 bg-[#F0FDF4] p-5">
                  <div className="mb-4 inline-flex items-center rounded-full bg-[#16A34A] px-3 py-1 text-[11px] font-black text-white">
                    지역 2
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                      <span className="text-[13px] font-bold text-[#475569]">자치구</span>
                      <select
                        value={r2District}
                        onChange={(e) => {
                          setR2District(e.target.value);
                          setR2Dong("전체");
                        }}
                        className="h-10 rounded-[8px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-semibold text-[#0F172A] outline-none focus:border-[#16A34A]"
                      >
                        {DISTRICT_NAMES.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                      <span className="text-[13px] font-bold text-[#475569]">자치동</span>
                      <select
                        value={r2Dong}
                        onChange={(e) => setR2Dong(e.target.value)}
                        className="h-10 rounded-[8px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-semibold text-[#0F172A] outline-none focus:border-[#16A34A]"
                      >
                        {r2DongOptions.map((dong) => (
                          <option key={dong} value={dong}>
                            {dong}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 비교하기 실행 버튼 */}
                <div className="flex flex-col items-center justify-center text-center">
                  <button
                    type="button"
                    onClick={handleCompare}
                    disabled={isLoading}
                    className="flex h-[110px] w-full max-w-[140px] flex-col items-center justify-center gap-2.5 rounded-[16px] border border-[#0B5E73] bg-gradient-to-b from-[#0F8AA8] to-[#0B5E73] p-4 text-white shadow-[0_8px_20px_rgba(15,138,168,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_25px_rgba(15,138,168,0.35)] active:translate-y-0 disabled:opacity-80"
                  >
                    {isLoading ? (
                      <Loader2 className="size-6 animate-spin" />
                    ) : (
                      <BarChart3 className="size-6 stroke-[2.2]" />
                    )}
                    <span className="text-[14px] font-black tracking-tight">
                      {isLoading ? "조회 중..." : "비교하기"}
                    </span>
                  </button>
                  <p className="mt-3 text-[11px] leading-tight text-[#94A3B8]">
                    선택한 지역의 시세 정보를 기반으로 리포트가 제공됩니다.
                  </p>
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* 비교 리포트 출력 영역                                          */}
            {/* ============================================================== */}
            {isLoading ? (
              // 로딩 스켈레톤 UI
              <div className="flex flex-col gap-6 animate-pulse">
                <div className="grid grid-cols-[1fr_340px] gap-6 max-[1100px]:grid-cols-1">
                  <div className="h-[260px] rounded-[20px] border border-[#E2E8F0] bg-white p-6" />
                  <div className="h-[260px] rounded-[20px] border border-[#E2E8F0] bg-white p-6" />
                </div>
                <div className="grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
                  <div className="h-[180px] rounded-[20px] border border-[#E2E8F0] bg-white p-6" />
                  <div className="h-[180px] rounded-[20px] border border-[#E2E8F0] bg-white p-6" />
                </div>
              </div>
            ) : !hasCompared ? (
              // 대기 안내 화면
              <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-12 text-center shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-[#E8F6F9] text-[#0F8AA8]">
                  <BarChart3 className="size-8" />
                </div>
                <h3 className="text-[18px] font-black text-[#0F172A]">
                  비교할 지역을 선택하고 &apos;비교하기&apos; 버튼을 눌러주세요
                </h3>
                <p className="mx-auto mt-2 max-w-[420px] text-[13px] font-medium leading-relaxed text-[#64748B]">
                  두 지역(자치구, 자치동)을 지정한 뒤{" "}
                  <span className="font-extrabold text-[#0F8AA8]">&apos;비교하기&apos;</span>{" "}
                  버튼을 클릭하면 매매 및 전세 시세 비교 표와 그래프가 나타납니다.
                </p>
              </div>
            ) : (
              // 비교 결과 리포트 화면
              <div className="flex flex-col gap-6">
                
                {/* 1. 상단: 비교 리포트 표 + 한눈에 보는 요약 */}
                <div className="grid grid-cols-[1fr_340px] gap-6 max-[1100px]:grid-cols-1">
                  
                  {/* 비교 표 카드 */}
                  <div className="flex flex-col justify-between rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
                    <div>
                      <div className="mb-5 flex items-center justify-between border-b border-[#F1F5F9] pb-4">
                        <h2 className="text-[18px] font-black text-[#0F172A]">비교 리포트</h2>
                        <span className="flex items-center gap-1 rounded-full bg-[#F1F5F9] px-3 py-1 text-[11px] font-bold text-[#64748B]">
                          <Info className="size-3 text-[#0F8AA8]" />
                          2024.05.20 기준 (최근 1개월)
                        </span>
                      </div>

                      <div className="overflow-hidden rounded-[14px] border border-[#E2E8F0]">
                        <table className="w-full text-left text-[13px]">
                          <thead>
                            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                              <th className="w-[140px] px-5 py-3.5 font-bold text-[#475569]">항목</th>
                              <th className="px-5 py-3.5 font-extrabold text-[#2563EB]">
                                <span className="mr-2 inline-block size-2 rounded-full bg-[#2563EB]" />
                                지역 1 <span className="font-bold text-[#475569]">{r1Label}</span>
                              </th>
                              <th className="px-5 py-3.5 font-extrabold text-[#16A34A]">
                                <span className="mr-2 inline-block size-2 rounded-full bg-[#16A34A]" />
                                지역 2 <span className="font-bold text-[#475569]">{r2Label}</span>
                              </th>
                              <th className="w-[160px] px-5 py-3.5 font-bold text-[#475569]">비교</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0] bg-white">
                            {/* 평균 매매가 */}
                            <tr className="hover:bg-[#F8FAFC]">
                              <td className="flex items-center gap-2 px-5 py-4 font-extrabold text-[#0F172A]">
                                <Building2 className="size-4 text-[#0F8AA8]" />
                                평균 매매가
                              </td>
                              <td className="px-5 py-4 font-black text-[#2563EB]">
                                {r1Metrics.avgPrice}억 원
                                <span className="ml-1.5 text-[11px] font-normal text-[#64748B]">
                                  ({formatPriceKRW(r1Metrics.avgPrice)})
                                </span>
                              </td>
                              <td className="px-5 py-4 font-black text-[#16A34A]">
                                {r2Metrics.avgPrice}억 원
                                <span className="ml-1.5 text-[11px] font-normal text-[#64748B]">
                                  ({formatPriceKRW(r2Metrics.avgPrice)})
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="inline-block rounded-full bg-[#FEE2E2] px-3 py-1 text-[12px] font-extrabold text-[#DC2626]">
                                  {avgDiffText}
                                </span>
                              </td>
                            </tr>

                            {/* 최근 실거래가 */}
                            <tr className="hover:bg-[#F8FAFC]">
                              <td className="flex items-center gap-2 px-5 py-4 font-extrabold text-[#0F172A]">
                                <TrendingUp className="size-4 text-[#0F8AA8]" />
                                최근 실거래가
                              </td>
                              <td className="px-5 py-4 font-black text-[#2563EB]">
                                {r1Metrics.recentPrice}억 원
                                <span className="ml-1.5 text-[11px] font-normal text-[#64748B]">
                                  ({formatPriceKRW(r1Metrics.recentPrice)})
                                </span>
                              </td>
                              <td className="px-5 py-4 font-black text-[#16A34A]">
                                {r2Metrics.recentPrice}억 원
                                <span className="ml-1.5 text-[11px] font-normal text-[#64748B]">
                                  ({formatPriceKRW(r2Metrics.recentPrice)})
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="inline-block rounded-full bg-[#FEE2E2] px-3 py-1 text-[12px] font-extrabold text-[#DC2626]">
                                  {recentDiffText}
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* 한눈에 보는 요약 카드 */}
                  <div className="flex flex-col justify-between rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
                    <div>
                      <h3 className="mb-4 text-[16px] font-black text-[#0F172A]">한눈에 보는 요약</h3>
                      <div className="flex flex-col gap-3">
                        <div className="rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                          <div className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-[#0F172A]">
                            <Building2 className="size-4 text-[#0F8AA8]" />
                            <span>평균 매매가</span>
                          </div>
                          <p className="text-[12px] font-extrabold text-[#DC2626]">{avgDiffText}.</p>
                        </div>

                        <div className="rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                          <div className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-[#0F172A]">
                            <Home className="size-4 text-[#0F8AA8]" />
                            <span>평균 전세가</span>
                          </div>
                          <p className="text-[12px] font-extrabold text-[#0284C7]">{avgJeonseDiffText}.</p>
                        </div>

                        <div className="rounded-[12px] border border-[#0F8AA8]/30 bg-[#E8F6F9] p-3.5">
                          <div className="mb-1 flex items-center gap-1.5 text-[12px] font-black text-[#0F8AA8]">
                            <Sparkles className="size-4" />
                            <span>종합 의견</span>
                          </div>
                          <p className="text-[11px] font-semibold leading-relaxed text-[#0F5C70]">
                            {r1Metrics.avgPrice >= r2Metrics.avgPrice
                              ? appliedR1.district
                              : appliedR2.district}
                            이(가) 매매가 및 전세가가 상대적으로 더 높게 형성되어 있으며,
                            두 지역 모두 서울 주요 선호 주거 지역입니다.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-[#16A34A]">
                      <CheckCircle2 className="size-3.5" />
                      <span>비교 분석이 반영되었습니다.</span>
                    </div>
                  </div>
                </div>

                {/* 2. 하단: 평균 매매가 & 평균 전세가 바 차트 */}
                <div className="grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
                  
                  {/* 평균 매매가 바 차트 */}
                  <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
                    <div className="mb-5 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-[15px] font-black text-[#0F172A]">
                        <Building2 className="size-4 text-[#0F8AA8]" />
                        평균 매매가 비교
                      </h3>
                      <span className="text-[11px] font-bold text-[#94A3B8]">(단위: 억 원)</span>
                    </div>

                    <div className="flex flex-col gap-5">
                      <div>
                        <div className="mb-1.5 flex justify-between text-[12px] font-bold">
                          <span className="text-[#2563EB]">지역 1 ({appliedR1.district})</span>
                          <span className="font-black text-[#0F172A]">{r1Metrics.avgPrice}억 원</span>
                        </div>
                        <div className="h-6 w-full rounded-full bg-[#F1F5F9] p-1">
                          <div
                            className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
                            style={{ width: r1AvgWidth }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-1.5 flex justify-between text-[12px] font-bold">
                          <span className="text-[#16A34A]">지역 2 ({appliedR2.district})</span>
                          <span className="font-black text-[#0F172A]">{r2Metrics.avgPrice}억 원</span>
                        </div>
                        <div className="h-6 w-full rounded-full bg-[#F1F5F9] p-1">
                          <div
                            className="h-full rounded-full bg-[#16A34A] transition-all duration-500"
                            style={{ width: r2AvgWidth }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 평균 전세가 바 차트 */}
                  <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
                    <div className="mb-5 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-[15px] font-black text-[#0F172A]">
                        <Home className="size-4 text-[#0F8AA8]" />
                        평균 전세가 비교
                      </h3>
                      <span className="text-[11px] font-bold text-[#94A3B8]">(단위: 억 원)</span>
                    </div>

                    <div className="flex flex-col gap-5">
                      <div>
                        <div className="mb-1.5 flex justify-between text-[12px] font-bold">
                          <span className="text-[#2563EB]">지역 1 ({appliedR1.district})</span>
                          <span className="font-black text-[#0F172A]">{r1Metrics.avgJeonsePrice}억 원</span>
                        </div>
                        <div className="h-6 w-full rounded-full bg-[#F1F5F9] p-1">
                          <div
                            className="h-full rounded-full bg-[#3B82F6] transition-all duration-500"
                            style={{ width: r1JeonseWidth }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-1.5 flex justify-between text-[12px] font-bold">
                          <span className="text-[#16A34A]">지역 2 ({appliedR2.district})</span>
                          <span className="font-black text-[#0F172A]">{r2Metrics.avgJeonsePrice}억 원</span>
                        </div>
                        <div className="h-6 w-full rounded-full bg-[#F1F5F9] p-1">
                          <div
                            className="h-full rounded-full bg-[#22C55E] transition-all duration-500"
                            style={{ width: r2JeonseWidth }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. 하단 데이터 제공 출처 안내 */}
                <div className="flex items-center justify-between rounded-[16px] border border-[#E2E8F0] bg-white px-6 py-4 text-[11px] text-[#94A3B8]">
                  <div className="flex items-center gap-1.5">
                    <Info className="size-3.5 text-[#0F8AA8]" />
                    <span>
                      본 정보는 국토교통부 실거래가 공개시스템 데이터를 기반으로 제공되며, 실제 거래가와 차이가 있을 수 있습니다.
                    </span>
                  </div>
                  <span>데이터 기준일: 2024.05.20</span>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
