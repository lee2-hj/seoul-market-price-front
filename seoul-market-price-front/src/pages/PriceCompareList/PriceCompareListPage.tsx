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

/* -------------------------------------------------------------------------- */
/* 서울시 25개 자치구 - 자치동 - 아파트단지 데이터 맵 (매매/전세 포함)       */
/* -------------------------------------------------------------------------- */

interface AptData {
  name: string;
  avgPrice: number; // 억 원 단위 (매매 평균)
  recentPrice: number; // 억 원 단위 (매매 최근)
  avgJeonsePrice: number; // 억 원 단위 (전세 평균)
  recentJeonsePrice: number; // 억 원 단위 (전세 최근)
}

interface DongData {
  dong: string;
  avgPrice: number;
  recentPrice: number;
  avgJeonsePrice: number;
  recentJeonsePrice: number;
  apts: AptData[];
}

interface DistrictData {
  district: string;
  avgPrice: number;
  recentPrice: number;
  avgJeonsePrice: number;
  recentJeonsePrice: number;
  dongs: DongData[];
}

const SEOUL_DATA: DistrictData[] = [
  {
    district: "강남구",
    avgPrice: 26.5,
    recentPrice: 27.2,
    avgJeonsePrice: 13.5,
    recentJeonsePrice: 13.9,
    dongs: [
      {
        dong: "개포동",
        avgPrice: 25.4,
        recentPrice: 26.0,
        avgJeonsePrice: 13.0,
        recentJeonsePrice: 13.4,
        apts: [
          {
            name: "디에이치자이개포",
            avgPrice: 27.0,
            recentPrice: 27.8,
            avgJeonsePrice: 14.0,
            recentJeonsePrice: 14.5,
          },
          {
            name: "래미안블레스티지",
            avgPrice: 24.5,
            recentPrice: 25.1,
            avgJeonsePrice: 12.8,
            recentJeonsePrice: 13.2,
          },
          {
            name: "개포래미안포레스트",
            avgPrice: 23.8,
            recentPrice: 24.3,
            avgJeonsePrice: 12.2,
            recentJeonsePrice: 12.5,
          },
        ],
      },
      {
        dong: "논현동",
        avgPrice: 21.0,
        recentPrice: 21.6,
        avgJeonsePrice: 10.8,
        recentJeonsePrice: 11.2,
        apts: [
          {
            name: "논현아크로힐스",
            avgPrice: 22.0,
            recentPrice: 22.5,
            avgJeonsePrice: 11.5,
            recentJeonsePrice: 11.8,
          },
          {
            name: "논현동동양파라곤",
            avgPrice: 20.0,
            recentPrice: 20.5,
            avgJeonsePrice: 10.2,
            recentJeonsePrice: 10.6,
          },
        ],
      },
      {
        dong: "대치동",
        avgPrice: 27.8,
        recentPrice: 28.5,
        avgJeonsePrice: 14.5,
        recentJeonsePrice: 14.9,
        apts: [
          {
            name: "래미안대치팰리스",
            avgPrice: 28.4,
            recentPrice: 29.1,
            avgJeonsePrice: 15.2,
            recentJeonsePrice: 15.6,
          },
          {
            name: "은마아파트",
            avgPrice: 24.2,
            recentPrice: 24.8,
            avgJeonsePrice: 7.8,
            recentJeonsePrice: 8.2,
          },
          {
            name: "대치아이파크",
            avgPrice: 26.0,
            recentPrice: 26.5,
            avgJeonsePrice: 13.5,
            recentJeonsePrice: 13.8,
          },
          {
            name: "선경아파트",
            avgPrice: 31.5,
            recentPrice: 32.0,
            avgJeonsePrice: 12.0,
            recentJeonsePrice: 12.4,
          },
        ],
      },
      {
        dong: "도곡동",
        avgPrice: 26.0,
        recentPrice: 26.8,
        avgJeonsePrice: 13.2,
        recentJeonsePrice: 13.6,
        apts: [
          {
            name: "타워팰리스1차",
            avgPrice: 29.0,
            recentPrice: 29.5,
            avgJeonsePrice: 16.5,
            recentJeonsePrice: 17.0,
          },
          {
            name: "도곡렉슬",
            avgPrice: 25.5,
            recentPrice: 26.2,
            avgJeonsePrice: 13.0,
            recentJeonsePrice: 13.4,
          },
        ],
      },
      {
        dong: "삼성동",
        avgPrice: 27.0,
        recentPrice: 27.6,
        avgJeonsePrice: 13.8,
        recentJeonsePrice: 14.2,
        apts: [
          {
            name: "삼성동아이파크",
            avgPrice: 35.0,
            recentPrice: 36.2,
            avgJeonsePrice: 18.5,
            recentJeonsePrice: 19.0,
          },
          {
            name: "삼성래미안1차",
            avgPrice: 21.5,
            recentPrice: 22.0,
            avgJeonsePrice: 11.2,
            recentJeonsePrice: 11.5,
          },
        ],
      },
      {
        dong: "세곡동",
        avgPrice: 14.5,
        recentPrice: 15.0,
        avgJeonsePrice: 7.8,
        recentJeonsePrice: 8.1,
        apts: [
          {
            name: "세곡리엔파크1단지",
            avgPrice: 14.2,
            recentPrice: 14.7,
            avgJeonsePrice: 7.6,
            recentJeonsePrice: 7.9,
          },
          {
            name: "강남효성해링턴코트",
            avgPrice: 15.0,
            recentPrice: 15.5,
            avgJeonsePrice: 8.0,
            recentJeonsePrice: 8.3,
          },
        ],
      },
      {
        dong: "수서동",
        avgPrice: 16.8,
        recentPrice: 17.3,
        avgJeonsePrice: 8.5,
        recentJeonsePrice: 8.9,
        apts: [
          {
            name: "수서신동아",
            avgPrice: 17.0,
            recentPrice: 17.5,
            avgJeonsePrice: 8.6,
            recentJeonsePrice: 9.0,
          },
          {
            name: "수서삼익",
            avgPrice: 16.2,
            recentPrice: 16.8,
            avgJeonsePrice: 8.2,
            recentJeonsePrice: 8.5,
          },
        ],
      },
      {
        dong: "신사동",
        avgPrice: 23.0,
        recentPrice: 23.8,
        avgJeonsePrice: 11.5,
        recentJeonsePrice: 12.0,
        apts: [
          {
            name: "신사현대아파트",
            avgPrice: 22.5,
            recentPrice: 23.2,
            avgJeonsePrice: 11.2,
            recentJeonsePrice: 11.8,
          },
        ],
      },
      {
        dong: "압구정동",
        avgPrice: 42.0,
        recentPrice: 43.5,
        avgJeonsePrice: 19.5,
        recentJeonsePrice: 20.2,
        apts: [
          {
            name: "신현대(현대9,11,12차)",
            avgPrice: 44.0,
            recentPrice: 45.2,
            avgJeonsePrice: 18.0,
            recentJeonsePrice: 18.5,
          },
          {
            name: "압구정현대1~7차",
            avgPrice: 41.5,
            recentPrice: 43.0,
            avgJeonsePrice: 17.5,
            recentJeonsePrice: 18.0,
          },
        ],
      },
      {
        dong: "역삼동",
        avgPrice: 22.5,
        recentPrice: 23.1,
        avgJeonsePrice: 11.8,
        recentJeonsePrice: 12.2,
        apts: [
          {
            name: "역삼자이",
            avgPrice: 23.5,
            recentPrice: 24.0,
            avgJeonsePrice: 12.5,
            recentJeonsePrice: 12.8,
          },
          {
            name: "역삼푸르지오",
            avgPrice: 21.0,
            recentPrice: 21.6,
            avgJeonsePrice: 11.0,
            recentJeonsePrice: 11.4,
          },
        ],
      },
      {
        dong: "율현동",
        avgPrice: 13.8,
        recentPrice: 14.2,
        avgJeonsePrice: 7.2,
        recentJeonsePrice: 7.5,
        apts: [
          {
            name: "강남한신휴플러스",
            avgPrice: 13.8,
            recentPrice: 14.2,
            avgJeonsePrice: 7.2,
            recentJeonsePrice: 7.5,
          },
        ],
      },
      {
        dong: "일원동",
        avgPrice: 20.5,
        recentPrice: 21.0,
        avgJeonsePrice: 10.5,
        recentJeonsePrice: 10.9,
        apts: [
          {
            name: "래미안개포루체하임",
            avgPrice: 23.5,
            recentPrice: 24.2,
            avgJeonsePrice: 12.0,
            recentJeonsePrice: 12.5,
          },
          {
            name: "일원가람아파트",
            avgPrice: 17.5,
            recentPrice: 18.0,
            avgJeonsePrice: 8.8,
            recentJeonsePrice: 9.1,
          },
        ],
      },
      {
        dong: "자곡동",
        avgPrice: 15.2,
        recentPrice: 15.8,
        avgJeonsePrice: 8.0,
        recentJeonsePrice: 8.4,
        apts: [
          {
            name: "래미안강남힐즈",
            avgPrice: 16.5,
            recentPrice: 17.0,
            avgJeonsePrice: 8.8,
            recentJeonsePrice: 9.2,
          },
          {
            name: "강남LHe편한세상",
            avgPrice: 14.0,
            recentPrice: 14.5,
            avgJeonsePrice: 7.3,
            recentJeonsePrice: 7.6,
          },
        ],
      },
      {
        dong: "청담동",
        avgPrice: 33.0,
        recentPrice: 34.0,
        avgJeonsePrice: 16.5,
        recentJeonsePrice: 17.0,
        apts: [
          {
            name: "청담자이",
            avgPrice: 28.0,
            recentPrice: 28.8,
            avgJeonsePrice: 14.2,
            recentJeonsePrice: 14.6,
          },
          {
            name: "PH129(더펜트하우스청담)",
            avgPrice: 95.0,
            recentPrice: 98.0,
            avgJeonsePrice: 45.0,
            recentJeonsePrice: 47.0,
          },
        ],
      },
    ],
  },
  {
    district: "강동구",
    avgPrice: 14.2,
    recentPrice: 14.7,
    avgJeonsePrice: 7.4,
    recentJeonsePrice: 7.7,
    dongs: [
      {
        dong: "강일동",
        avgPrice: 11.5,
        recentPrice: 12.0,
        avgJeonsePrice: 6.2,
        recentJeonsePrice: 6.5,
        apts: [
          {
            name: "강일리버파크3단지",
            avgPrice: 11.2,
            recentPrice: 11.6,
            avgJeonsePrice: 6.0,
            recentJeonsePrice: 6.3,
          },
        ],
      },
      {
        dong: "고덕동",
        avgPrice: 16.5,
        recentPrice: 17.0,
        avgJeonsePrice: 8.6,
        recentJeonsePrice: 8.9,
        apts: [
          {
            name: "고덕그라시움",
            avgPrice: 16.8,
            recentPrice: 17.4,
            avgJeonsePrice: 8.8,
            recentJeonsePrice: 9.1,
          },
          {
            name: "고덕아르테온",
            avgPrice: 15.5,
            recentPrice: 16.0,
            avgJeonsePrice: 8.2,
            recentJeonsePrice: 8.5,
          },
        ],
      },
      {
        dong: "길동",
        avgPrice: 11.8,
        recentPrice: 12.2,
        avgJeonsePrice: 6.4,
        recentJeonsePrice: 6.7,
        apts: [
          {
            name: "e편한세상강동에코포레",
            avgPrice: 12.5,
            recentPrice: 12.9,
            avgJeonsePrice: 6.8,
            recentJeonsePrice: 7.1,
          },
        ],
      },
      {
        dong: "둔촌동",
        avgPrice: 18.0,
        recentPrice: 18.6,
        avgJeonsePrice: 9.2,
        recentJeonsePrice: 9.5,
        apts: [
          {
            name: "올림픽파크포레온(둔촌주공)",
            avgPrice: 19.5,
            recentPrice: 20.2,
            avgJeonsePrice: 9.8,
            recentJeonsePrice: 10.2,
          },
        ],
      },
      {
        dong: "명일동",
        avgPrice: 13.8,
        recentPrice: 14.2,
        avgJeonsePrice: 7.2,
        recentJeonsePrice: 7.5,
        apts: [
          {
            name: "래미안솔베뉴",
            avgPrice: 14.5,
            recentPrice: 15.0,
            avgJeonsePrice: 7.6,
            recentJeonsePrice: 7.9,
          },
          {
            name: "삼익맨션",
            avgPrice: 12.5,
            recentPrice: 12.9,
            avgJeonsePrice: 6.2,
            recentJeonsePrice: 6.5,
          },
        ],
      },
      {
        dong: "상일동",
        avgPrice: 14.8,
        recentPrice: 15.3,
        avgJeonsePrice: 7.8,
        recentJeonsePrice: 8.1,
        apts: [
          {
            name: "고덕센트럴아이파크",
            avgPrice: 15.2,
            recentPrice: 15.7,
            avgJeonsePrice: 8.0,
            recentJeonsePrice: 8.3,
          },
          {
            name: "고덕자이",
            avgPrice: 14.5,
            recentPrice: 15.0,
            avgJeonsePrice: 7.6,
            recentJeonsePrice: 7.9,
          },
        ],
      },
      {
        dong: "성내동",
        avgPrice: 12.2,
        recentPrice: 12.6,
        avgJeonsePrice: 6.5,
        recentJeonsePrice: 6.8,
        apts: [
          {
            name: "성내올림픽파크한양",
            avgPrice: 12.0,
            recentPrice: 12.5,
            avgJeonsePrice: 6.4,
            recentJeonsePrice: 6.7,
          },
        ],
      },
      {
        dong: "암사동",
        avgPrice: 12.0,
        recentPrice: 12.5,
        avgJeonsePrice: 6.2,
        recentJeonsePrice: 6.5,
        apts: [
          {
            name: "강동롯데캐슬퍼스트",
            avgPrice: 12.5,
            recentPrice: 12.9,
            avgJeonsePrice: 6.5,
            recentJeonsePrice: 6.8,
          },
        ],
      },
      {
        dong: "천호동",
        avgPrice: 11.5,
        recentPrice: 11.9,
        avgJeonsePrice: 6.0,
        recentJeonsePrice: 6.3,
        apts: [
          {
            name: "강동헤리티지자이",
            avgPrice: 12.8,
            recentPrice: 13.2,
            avgJeonsePrice: 6.8,
            recentJeonsePrice: 7.1,
          },
        ],
      },
    ],
  },
  {
    district: "강북구",
    avgPrice: 7.8,
    recentPrice: 8.1,
    avgJeonsePrice: 4.2,
    recentJeonsePrice: 4.4,
    dongs: [
      {
        dong: "미아동",
        avgPrice: 8.5,
        recentPrice: 8.8,
        avgJeonsePrice: 4.6,
        recentJeonsePrice: 4.8,
        apts: [
          {
            name: "SK북한산시티",
            avgPrice: 7.2,
            recentPrice: 7.5,
            avgJeonsePrice: 4.0,
            recentJeonsePrice: 4.2,
          },
          {
            name: "꿈의숲코오롱하늘채",
            avgPrice: 9.2,
            recentPrice: 9.6,
            avgJeonsePrice: 5.2,
            recentJeonsePrice: 5.5,
          },
        ],
      },
      {
        dong: "번동",
        avgPrice: 7.0,
        recentPrice: 7.3,
        avgJeonsePrice: 3.8,
        recentJeonsePrice: 4.0,
        apts: [
          {
            name: "번동주공1단지",
            avgPrice: 6.5,
            recentPrice: 6.8,
            avgJeonsePrice: 3.5,
            recentJeonsePrice: 3.7,
          },
        ],
      },
      {
        dong: "수유동",
        avgPrice: 7.5,
        recentPrice: 7.8,
        avgJeonsePrice: 4.0,
        recentJeonsePrice: 4.2,
        apts: [
          {
            name: "수유벽산아파트",
            avgPrice: 7.2,
            recentPrice: 7.5,
            avgJeonsePrice: 3.9,
            recentJeonsePrice: 4.1,
          },
        ],
      },
      {
        dong: "우이동",
        avgPrice: 6.8,
        recentPrice: 7.1,
        avgJeonsePrice: 3.6,
        recentJeonsePrice: 3.8,
        apts: [
          {
            name: "우이동성원아파트",
            avgPrice: 6.8,
            recentPrice: 7.1,
            avgJeonsePrice: 3.6,
            recentJeonsePrice: 3.8,
          },
        ],
      },
    ],
  },
  {
    district: "강서구",
    avgPrice: 10.5,
    recentPrice: 10.9,
    avgJeonsePrice: 5.6,
    recentJeonsePrice: 5.9,
    dongs: [
      {
        dong: "가양동",
        avgPrice: 9.2,
        recentPrice: 9.6,
        avgJeonsePrice: 5.0,
        recentJeonsePrice: 5.2,
        apts: [
          {
            name: "가양6단지",
            avgPrice: 8.8,
            recentPrice: 9.2,
            avgJeonsePrice: 4.6,
            recentJeonsePrice: 4.8,
          },
          {
            name: "가양강변2단지",
            avgPrice: 8.5,
            recentPrice: 8.9,
            avgJeonsePrice: 4.5,
            recentJeonsePrice: 4.7,
          },
        ],
      },
      {
        dong: "개화동",
        avgPrice: 8.2,
        recentPrice: 8.5,
        avgJeonsePrice: 4.3,
        recentJeonsePrice: 4.5,
        apts: [
          {
            name: "개화상사마을아파트",
            avgPrice: 8.2,
            recentPrice: 8.5,
            avgJeonsePrice: 4.3,
            recentJeonsePrice: 4.5,
          },
        ],
      },
      {
        dong: "공항동",
        avgPrice: 8.8,
        recentPrice: 9.1,
        avgJeonsePrice: 4.7,
        recentJeonsePrice: 4.9,
        apts: [
          {
            name: "마곡힐스테이트",
            avgPrice: 11.5,
            recentPrice: 12.0,
            avgJeonsePrice: 6.2,
            recentJeonsePrice: 6.5,
          },
        ],
      },
      {
        dong: "과해동",
        avgPrice: 7.5,
        recentPrice: 7.8,
        avgJeonsePrice: 4.0,
        recentJeonsePrice: 4.2,
        apts: [
          {
            name: "과해동주거단지",
            avgPrice: 7.5,
            recentPrice: 7.8,
            avgJeonsePrice: 4.0,
            recentJeonsePrice: 4.2,
          },
        ],
      },
      {
        dong: "내발산동",
        avgPrice: 11.2,
        recentPrice: 11.6,
        avgJeonsePrice: 6.0,
        recentJeonsePrice: 6.3,
        apts: [
          {
            name: "우장산힐스테이트",
            avgPrice: 11.8,
            recentPrice: 12.2,
            avgJeonsePrice: 6.3,
            recentJeonsePrice: 6.6,
          },
        ],
      },
      {
        dong: "등촌동",
        avgPrice: 10.2,
        recentPrice: 10.6,
        avgJeonsePrice: 5.4,
        recentJeonsePrice: 5.7,
        apts: [
          {
            name: "등촌아이파크",
            avgPrice: 10.5,
            recentPrice: 11.0,
            avgJeonsePrice: 5.6,
            recentJeonsePrice: 5.9,
          },
        ],
      },
      {
        dong: "마곡동",
        avgPrice: 14.5,
        recentPrice: 15.1,
        avgJeonsePrice: 7.8,
        recentJeonsePrice: 8.2,
        apts: [
          {
            name: "마곡엠밸리7단지",
            avgPrice: 15.0,
            recentPrice: 15.6,
            avgJeonsePrice: 8.0,
            recentJeonsePrice: 8.4,
          },
          {
            name: "마곡13단지힐스테이트마스터",
            avgPrice: 13.8,
            recentPrice: 14.3,
            avgJeonsePrice: 7.4,
            recentJeonsePrice: 7.7,
          },
        ],
      },
      {
        dong: "방화동",
        avgPrice: 8.8,
        recentPrice: 9.2,
        avgJeonsePrice: 4.7,
        recentJeonsePrice: 4.9,
        apts: [
          {
            name: "방화5단지",
            avgPrice: 8.5,
            recentPrice: 8.8,
            avgJeonsePrice: 4.5,
            recentJeonsePrice: 4.7,
          },
        ],
      },
      {
        dong: "염창동",
        avgPrice: 11.0,
        recentPrice: 11.5,
        avgJeonsePrice: 5.8,
        recentJeonsePrice: 6.1,
        apts: [
          {
            name: "e편한세상염창",
            avgPrice: 11.8,
            recentPrice: 12.3,
            avgJeonsePrice: 6.2,
            recentJeonsePrice: 6.5,
          },
        ],
      },
      {
        dong: "오곡동",
        avgPrice: 7.0,
        recentPrice: 7.3,
        avgJeonsePrice: 3.7,
        recentJeonsePrice: 3.9,
        apts: [
          {
            name: "오곡동주택단지",
            avgPrice: 7.0,
            recentPrice: 7.3,
            avgJeonsePrice: 3.7,
            recentJeonsePrice: 3.9,
          },
        ],
      },
      {
        dong: "오쇠동",
        avgPrice: 6.8,
        recentPrice: 7.1,
        avgJeonsePrice: 3.6,
        recentJeonsePrice: 3.8,
        apts: [
          {
            name: "오쇠동주거단지",
            avgPrice: 6.8,
            recentPrice: 7.1,
            avgJeonsePrice: 3.6,
            recentJeonsePrice: 3.8,
          },
        ],
      },
      {
        dong: "외발산동",
        avgPrice: 8.0,
        recentPrice: 8.3,
        avgJeonsePrice: 4.3,
        recentJeonsePrice: 4.5,
        apts: [
          {
            name: "신월곡한신",
            avgPrice: 8.0,
            recentPrice: 8.3,
            avgJeonsePrice: 4.3,
            recentJeonsePrice: 4.5,
          },
        ],
      },
      {
        dong: "화곡동",
        avgPrice: 9.0,
        recentPrice: 9.4,
        avgJeonsePrice: 4.8,
        recentJeonsePrice: 5.0,
        apts: [
          {
            name: "강서힐스테이트",
            avgPrice: 11.0,
            recentPrice: 11.5,
            avgJeonsePrice: 6.0,
            recentJeonsePrice: 6.3,
          },
          {
            name: "우장산아이파크e편한세상",
            avgPrice: 10.5,
            recentPrice: 10.9,
            avgJeonsePrice: 5.7,
            recentJeonsePrice: 6.0,
          },
        ],
      },
    ],
  },
  {
    district: "관악구",
    avgPrice: 8.8,
    recentPrice: 9.2,
    avgJeonsePrice: 4.7,
    recentJeonsePrice: 4.9,
    dongs: [
      {
        dong: "남현동",
        avgPrice: 9.8,
        recentPrice: 10.2,
        avgJeonsePrice: 5.2,
        recentJeonsePrice: 5.5,
        apts: [
          {
            name: "남현예술단지아파트",
            avgPrice: 9.8,
            recentPrice: 10.2,
            avgJeonsePrice: 5.2,
            recentJeonsePrice: 5.5,
          },
        ],
      },
      {
        dong: "봉천동",
        avgPrice: 9.2,
        recentPrice: 9.6,
        avgJeonsePrice: 4.9,
        recentJeonsePrice: 5.1,
        apts: [
          {
            name: "e편한세상서울대입구",
            avgPrice: 10.5,
            recentPrice: 11.0,
            avgJeonsePrice: 5.8,
            recentJeonsePrice: 6.1,
          },
          {
            name: "관악드림타운",
            avgPrice: 8.2,
            recentPrice: 8.5,
            avgJeonsePrice: 4.4,
            recentJeonsePrice: 4.6,
          },
        ],
      },
      {
        dong: "신림동",
        avgPrice: 8.2,
        recentPrice: 8.5,
        avgJeonsePrice: 4.4,
        recentJeonsePrice: 4.6,
        apts: [
          {
            name: "신림현대아파트",
            avgPrice: 8.5,
            recentPrice: 8.8,
            avgJeonsePrice: 4.5,
            recentJeonsePrice: 4.7,
          },
          {
            name: "관악산휴먼시아1단지",
            avgPrice: 7.2,
            recentPrice: 7.5,
            avgJeonsePrice: 3.8,
            recentJeonsePrice: 4.0,
          },
        ],
      },
    ],
  },
  {
    district: "광진구",
    avgPrice: 15.0,
    recentPrice: 15.5,
    avgJeonsePrice: 7.8,
    recentJeonsePrice: 8.1,
    dongs: [
      {
        dong: "광장동",
        avgPrice: 18.0,
        recentPrice: 18.6,
        avgJeonsePrice: 9.4,
        recentJeonsePrice: 9.8,
        apts: [
          {
            name: "광장극동2차",
            avgPrice: 17.5,
            recentPrice: 18.0,
            avgJeonsePrice: 8.5,
            recentJeonsePrice: 8.9,
          },
          {
            name: "광장힐스테이트",
            avgPrice: 19.5,
            recentPrice: 20.1,
            avgJeonsePrice: 10.5,
            recentJeonsePrice: 10.9,
          },
        ],
      },
      {
        dong: "구의동",
        avgPrice: 14.5,
        recentPrice: 15.0,
        avgJeonsePrice: 7.6,
        recentJeonsePrice: 7.9,
        apts: [
          {
            name: "구의현대2단지",
            avgPrice: 14.2,
            recentPrice: 14.7,
            avgJeonsePrice: 7.4,
            recentJeonsePrice: 7.7,
          },
        ],
      },
      {
        dong: "군자동",
        avgPrice: 12.8,
        recentPrice: 13.2,
        avgJeonsePrice: 6.7,
        recentJeonsePrice: 7.0,
        apts: [
          {
            name: "군자일광아파트",
            avgPrice: 12.8,
            recentPrice: 13.2,
            avgJeonsePrice: 6.7,
            recentJeonsePrice: 7.0,
          },
        ],
      },
      {
        dong: "능동",
        avgPrice: 13.5,
        recentPrice: 14.0,
        avgJeonsePrice: 7.0,
        recentJeonsePrice: 7.3,
        apts: [
          {
            name: "능동이지더원",
            avgPrice: 13.5,
            recentPrice: 14.0,
            avgJeonsePrice: 7.0,
            recentJeonsePrice: 7.3,
          },
        ],
      },
      {
        dong: "자양동",
        avgPrice: 16.2,
        recentPrice: 16.8,
        avgJeonsePrice: 8.5,
        recentJeonsePrice: 8.9,
        apts: [
          {
            name: "더샵스타시티",
            avgPrice: 18.5,
            recentPrice: 19.2,
            avgJeonsePrice: 9.8,
            recentJeonsePrice: 10.2,
          },
          {
            name: "자양우성1차",
            avgPrice: 13.5,
            recentPrice: 14.0,
            avgJeonsePrice: 7.0,
            recentJeonsePrice: 7.3,
          },
        ],
      },
      {
        dong: "중곡동",
        avgPrice: 11.5,
        recentPrice: 11.9,
        avgJeonsePrice: 6.0,
        recentJeonsePrice: 6.3,
        apts: [
          {
            name: "중곡아파트",
            avgPrice: 11.5,
            recentPrice: 11.9,
            avgJeonsePrice: 6.0,
            recentJeonsePrice: 6.3,
          },
        ],
      },
      {
        dong: "화양동",
        avgPrice: 12.2,
        recentPrice: 12.6,
        avgJeonsePrice: 6.4,
        recentJeonsePrice: 6.7,
        apts: [
          {
            name: "화양현대아파트",
            avgPrice: 12.2,
            recentPrice: 12.6,
            avgJeonsePrice: 6.4,
            recentJeonsePrice: 6.7,
          },
        ],
      },
    ],
  },
  {
    district: "구로구",
    avgPrice: 8.2,
    recentPrice: 8.5,
    avgJeonsePrice: 4.3,
    recentJeonsePrice: 4.5,
    dongs: [
      {
        dong: "가리봉동",
        avgPrice: 6.5,
        recentPrice: 6.8,
        avgJeonsePrice: 3.5,
        recentJeonsePrice: 3.7,
        apts: [
          {
            name: "가리봉한신아파트",
            avgPrice: 6.5,
            recentPrice: 6.8,
            avgJeonsePrice: 3.5,
            recentJeonsePrice: 3.7,
          },
        ],
      },
      {
        dong: "개봉동",
        avgPrice: 7.8,
        recentPrice: 8.1,
        avgJeonsePrice: 4.0,
        recentJeonsePrice: 4.2,
        apts: [
          {
            name: "개봉현대아파트",
            avgPrice: 7.5,
            recentPrice: 7.8,
            avgJeonsePrice: 4.1,
            recentJeonsePrice: 4.3,
          },
        ],
      },
      {
        dong: "고척동",
        avgPrice: 8.0,
        recentPrice: 8.3,
        avgJeonsePrice: 4.2,
        recentJeonsePrice: 4.4,
        apts: [
          {
            name: "고척대우아파트",
            avgPrice: 7.8,
            recentPrice: 8.1,
            avgJeonsePrice: 4.1,
            recentJeonsePrice: 4.3,
          },
        ],
      },
      {
        dong: "구로동",
        avgPrice: 8.5,
        recentPrice: 8.8,
        avgJeonsePrice: 4.4,
        recentJeonsePrice: 4.6,
        apts: [
          {
            name: "구로두산아파트",
            avgPrice: 8.2,
            recentPrice: 8.5,
            avgJeonsePrice: 4.3,
            recentJeonsePrice: 4.5,
          },
          {
            name: "신구로자이",
            avgPrice: 9.5,
            recentPrice: 9.9,
            avgJeonsePrice: 5.0,
            recentJeonsePrice: 5.2,
          },
        ],
      },
      {
        dong: "궁동",
        avgPrice: 7.2,
        recentPrice: 7.5,
        avgJeonsePrice: 3.8,
        recentJeonsePrice: 4.0,
        apts: [
          {
            name: "궁동동양아파트",
            avgPrice: 7.2,
            recentPrice: 7.5,
            avgJeonsePrice: 3.8,
            recentJeonsePrice: 4.0,
          },
        ],
      },
      {
        dong: "신도림동",
        avgPrice: 12.5,
        recentPrice: 13.0,
        avgJeonsePrice: 6.5,
        recentJeonsePrice: 6.8,
        apts: [
          {
            name: "신도림e편한세상4차",
            avgPrice: 13.8,
            recentPrice: 14.3,
            avgJeonsePrice: 7.2,
            recentJeonsePrice: 7.5,
          },
          {
            name: "신도림동아1차",
            avgPrice: 11.5,
            recentPrice: 12.0,
            avgJeonsePrice: 6.0,
            recentJeonsePrice: 6.3,
          },
        ],
      },
      {
        dong: "오류동",
        avgPrice: 7.5,
        recentPrice: 7.8,
        avgJeonsePrice: 3.9,
        recentJeonsePrice: 4.1,
        apts: [
          {
            name: "오류동동부골든",
            avgPrice: 7.5,
            recentPrice: 7.8,
            avgJeonsePrice: 3.9,
            recentJeonsePrice: 4.1,
          },
        ],
      },
      {
        dong: "온수동",
        avgPrice: 7.0,
        recentPrice: 7.3,
        avgJeonsePrice: 3.6,
        recentJeonsePrice: 3.8,
        apts: [
          {
            name: "온수힐스테이트",
            avgPrice: 7.5,
            recentPrice: 7.8,
            avgJeonsePrice: 3.9,
            recentJeonsePrice: 4.1,
          },
        ],
      },
      {
        dong: "천왕동",
        avgPrice: 8.8,
        recentPrice: 9.1,
        avgJeonsePrice: 4.6,
        recentJeonsePrice: 4.8,
        apts: [
          {
            name: "천왕연지타운2단지",
            avgPrice: 8.8,
            recentPrice: 9.1,
            avgJeonsePrice: 4.6,
            recentJeonsePrice: 4.8,
          },
        ],
      },
      {
        dong: "항동",
        avgPrice: 8.5,
        recentPrice: 8.9,
        avgJeonsePrice: 4.5,
        recentJeonsePrice: 4.7,
        apts: [
          {
            name: "항동중흥S클래스",
            avgPrice: 8.5,
            recentPrice: 8.9,
            avgJeonsePrice: 4.5,
            recentJeonsePrice: 4.7,
          },
        ],
      },
    ],
  },
  {
    district: "금천구",
    avgPrice: 7.5,
    recentPrice: 7.8,
    avgJeonsePrice: 3.9,
    recentJeonsePrice: 4.1,
    dongs: [
      {
        dong: "가산동",
        avgPrice: 7.8,
        recentPrice: 8.1,
        avgJeonsePrice: 4.0,
        recentJeonsePrice: 4.2,
        apts: [
          {
            name: "가산두산위브",
            avgPrice: 7.8,
            recentPrice: 8.1,
            avgJeonsePrice: 4.0,
            recentJeonsePrice: 4.2,
          },
        ],
      },
      {
        dong: "독산동",
        avgPrice: 8.2,
        recentPrice: 8.5,
        avgJeonsePrice: 4.2,
        recentJeonsePrice: 4.4,
        apts: [
          {
            name: "롯데캐슬골드파크1차",
            avgPrice: 9.2,
            recentPrice: 9.6,
            avgJeonsePrice: 4.8,
            recentJeonsePrice: 5.1,
          },
        ],
      },
      {
        dong: "시흥동",
        avgPrice: 7.0,
        recentPrice: 7.3,
        avgJeonsePrice: 3.6,
        recentJeonsePrice: 3.8,
        apts: [
          {
            name: "남서울힐스테이트",
            avgPrice: 7.8,
            recentPrice: 8.1,
            avgJeonsePrice: 4.0,
            recentJeonsePrice: 4.2,
          },
        ],
      },
    ],
  },
  {
    district: "노원구",
    avgPrice: 8.0,
    recentPrice: 8.3,
    avgJeonsePrice: 4.2,
    recentJeonsePrice: 4.4,
    dongs: [
      {
        dong: "공릉동",
        avgPrice: 8.2,
        recentPrice: 8.5,
        avgJeonsePrice: 4.3,
        recentJeonsePrice: 4.5,
        apts: [
          {
            name: "공릉태강아파트",
            avgPrice: 7.8,
            recentPrice: 8.1,
            avgJeonsePrice: 4.0,
            recentJeonsePrice: 4.2,
          },
        ],
      },
      {
        dong: "상계동",
        avgPrice: 7.8,
        recentPrice: 8.1,
        avgJeonsePrice: 4.0,
        recentJeonsePrice: 4.2,
        apts: [
          {
            name: "상계주공8단지(포레나노원)",
            avgPrice: 10.5,
            recentPrice: 11.0,
            avgJeonsePrice: 5.5,
            recentJeonsePrice: 5.8,
          },
          {
            name: "상계주공5단지",
            avgPrice: 5.8,
            recentPrice: 6.0,
            avgJeonsePrice: 2.2,
            recentJeonsePrice: 2.4,
          },
        ],
      },
      {
        dong: "월계동",
        avgPrice: 7.5,
        recentPrice: 7.8,
        avgJeonsePrice: 3.9,
        recentJeonsePrice: 4.1,
        apts: [
          {
            name: "월계미륭미성삼호(미미삼)",
            avgPrice: 7.5,
            recentPrice: 7.8,
            avgJeonsePrice: 2.8,
            recentJeonsePrice: 3.0,
          },
        ],
      },
      {
        dong: "중계동",
        avgPrice: 9.2,
        recentPrice: 9.6,
        avgJeonsePrice: 4.8,
        recentJeonsePrice: 5.1,
        apts: [
          {
            name: "중계청구3차",
            avgPrice: 11.5,
            recentPrice: 12.0,
            avgJeonsePrice: 6.2,
            recentJeonsePrice: 6.5,
          },
          {
            name: "중계무지개",
            avgPrice: 6.8,
            recentPrice: 7.1,
            avgJeonsePrice: 3.5,
            recentJeonsePrice: 3.7,
          },
        ],
      },
      {
        dong: "하계동",
        avgPrice: 8.0,
        recentPrice: 8.3,
        avgJeonsePrice: 4.2,
        recentJeonsePrice: 4.4,
        apts: [
          {
            name: "하계장미아파트",
            avgPrice: 7.5,
            recentPrice: 7.8,
            avgJeonsePrice: 3.9,
            recentJeonsePrice: 4.1,
          },
        ],
      },
    ],
  },
  {
    district: "도봉구",
    avgPrice: 6.8,
    recentPrice: 7.1,
    avgJeonsePrice: 3.6,
    recentJeonsePrice: 3.8,
    dongs: [
      {
        dong: "도봉동",
        avgPrice: 6.5,
        recentPrice: 6.8,
        avgJeonsePrice: 3.4,
        recentJeonsePrice: 3.6,
        apts: [
          {
            name: "도봉한신아파트",
            avgPrice: 6.5,
            recentPrice: 6.8,
            avgJeonsePrice: 3.4,
            recentJeonsePrice: 3.6,
          },
        ],
      },
      {
        dong: "방학동",
        avgPrice: 6.2,
        recentPrice: 6.5,
        avgJeonsePrice: 3.3,
        recentJeonsePrice: 3.5,
        apts: [
          {
            name: "방학신동아1차",
            avgPrice: 6.0,
            recentPrice: 6.3,
            avgJeonsePrice: 3.2,
            recentJeonsePrice: 3.4,
          },
        ],
      },
      {
        dong: "쌍문동",
        avgPrice: 5.5,
        recentPrice: 5.8,
        avgJeonsePrice: 3.1,
        recentJeonsePrice: 3.3,
        apts: [
          {
            name: "쌍문한양1차",
            avgPrice: 5.5,
            recentPrice: 5.8,
            avgJeonsePrice: 3.1,
            recentJeonsePrice: 3.3,
          },
        ],
      },
      {
        dong: "창동",
        avgPrice: 8.0,
        recentPrice: 8.4,
        avgJeonsePrice: 4.2,
        recentJeonsePrice: 4.4,
        apts: [
          {
            name: "창동주공19단지",
            avgPrice: 8.2,
            recentPrice: 8.6,
            avgJeonsePrice: 4.2,
            recentJeonsePrice: 4.5,
          },
        ],
      },
    ],
  },
  {
    district: "동대문구",
    avgPrice: 11.2,
    recentPrice: 11.6,
    avgJeonsePrice: 5.8,
    recentJeonsePrice: 6.1,
    dongs: [
      {
        dong: "답십리동",
        avgPrice: 11.5,
        recentPrice: 12.0,
        avgJeonsePrice: 6.0,
        recentJeonsePrice: 6.3,
        apts: [
          {
            name: "래미안위브",
            avgPrice: 11.8,
            recentPrice: 12.3,
            avgJeonsePrice: 6.2,
            recentJeonsePrice: 6.5,
          },
        ],
      },
      {
        dong: "신설동",
        avgPrice: 9.8,
        recentPrice: 10.2,
        avgJeonsePrice: 5.2,
        recentJeonsePrice: 5.5,
        apts: [
          {
            name: "신설동한진아파트",
            avgPrice: 9.8,
            recentPrice: 10.2,
            avgJeonsePrice: 5.2,
            recentJeonsePrice: 5.5,
          },
        ],
      },
      {
        dong: "용두동",
        avgPrice: 12.0,
        recentPrice: 12.5,
        avgJeonsePrice: 6.3,
        recentJeonsePrice: 6.6,
        apts: [
          {
            name: "래미안엘리니티",
            avgPrice: 12.5,
            recentPrice: 13.0,
            avgJeonsePrice: 6.5,
            recentJeonsePrice: 6.8,
          },
        ],
      },
      {
        dong: "이문동",
        avgPrice: 10.5,
        recentPrice: 10.9,
        avgJeonsePrice: 5.5,
        recentJeonsePrice: 5.8,
        apts: [
          {
            name: "래미안라그란데",
            avgPrice: 11.2,
            recentPrice: 11.7,
            avgJeonsePrice: 5.8,
            recentJeonsePrice: 6.1,
          },
        ],
      },
      {
        dong: "장안동",
        avgPrice: 9.5,
        recentPrice: 9.9,
        avgJeonsePrice: 5.0,
        recentJeonsePrice: 5.2,
        apts: [
          {
            name: "장안현대홈타운1차",
            avgPrice: 9.5,
            recentPrice: 9.9,
            avgJeonsePrice: 5.0,
            recentJeonsePrice: 5.2,
          },
        ],
      },
      {
        dong: "전농동",
        avgPrice: 12.2,
        recentPrice: 12.7,
        avgJeonsePrice: 6.4,
        recentJeonsePrice: 6.7,
        apts: [
          {
            name: "래미안크레시티",
            avgPrice: 12.5,
            recentPrice: 13.0,
            avgJeonsePrice: 6.5,
            recentJeonsePrice: 6.8,
          },
        ],
      },
      {
        dong: "제기동",
        avgPrice: 9.2,
        recentPrice: 9.6,
        avgJeonsePrice: 4.8,
        recentJeonsePrice: 5.0,
        apts: [
          {
            name: "제기동한신아파트",
            avgPrice: 9.2,
            recentPrice: 9.6,
            avgJeonsePrice: 4.8,
            recentJeonsePrice: 5.0,
          },
        ],
      },
      {
        dong: "청량리동",
        avgPrice: 13.5,
        recentPrice: 14.1,
        avgJeonsePrice: 7.0,
        recentJeonsePrice: 7.4,
        apts: [
          {
            name: "청량리역롯데캐슬SKY-L65",
            avgPrice: 14.5,
            recentPrice: 15.2,
            avgJeonsePrice: 7.5,
            recentJeonsePrice: 7.9,
          },
        ],
      },
      {
        dong: "회기동",
        avgPrice: 9.0,
        recentPrice: 9.3,
        avgJeonsePrice: 4.7,
        recentJeonsePrice: 4.9,
        apts: [
          {
            name: "회기힐스테이트",
            avgPrice: 9.5,
            recentPrice: 9.9,
            avgJeonsePrice: 5.0,
            recentJeonsePrice: 5.2,
          },
        ],
      },
      {
        dong: "휘경동",
        avgPrice: 10.0,
        recentPrice: 10.4,
        avgJeonsePrice: 5.2,
        recentJeonsePrice: 5.5,
        apts: [
          {
            name: "휘경SK뷰",
            avgPrice: 10.5,
            recentPrice: 10.9,
            avgJeonsePrice: 5.5,
            recentJeonsePrice: 5.8,
          },
        ],
      },
    ],
  },
  {
    district: "동작구",
    avgPrice: 13.8,
    recentPrice: 14.3,
    avgJeonsePrice: 7.2,
    recentJeonsePrice: 7.5,
    dongs: [
      {
        dong: "노량진동",
        avgPrice: 12.5,
        recentPrice: 13.0,
        avgJeonsePrice: 6.5,
        recentJeonsePrice: 6.8,
        apts: [
          {
            name: "노량진쌍용예가",
            avgPrice: 12.5,
            recentPrice: 13.0,
            avgJeonsePrice: 6.5,
            recentJeonsePrice: 6.8,
          },
        ],
      },
      {
        dong: "대방동",
        avgPrice: 13.0,
        recentPrice: 13.5,
        avgJeonsePrice: 6.8,
        recentJeonsePrice: 7.1,
        apts: [
          {
            name: "대방대림아파트",
            avgPrice: 13.0,
            recentPrice: 13.5,
            avgJeonsePrice: 6.8,
            recentJeonsePrice: 7.1,
          },
        ],
      },
      {
        dong: "동작동",
        avgPrice: 14.0,
        recentPrice: 14.5,
        avgJeonsePrice: 7.3,
        recentJeonsePrice: 7.6,
        apts: [
          {
            name: "이수교 KCC스위첸",
            avgPrice: 14.0,
            recentPrice: 14.5,
            avgJeonsePrice: 7.3,
            recentJeonsePrice: 7.6,
          },
        ],
      },
      {
        dong: "본동",
        avgPrice: 12.8,
        recentPrice: 13.2,
        avgJeonsePrice: 6.7,
        recentJeonsePrice: 7.0,
        apts: [
          {
            name: "본동삼성래미안",
            avgPrice: 12.8,
            recentPrice: 13.2,
            avgJeonsePrice: 6.7,
            recentJeonsePrice: 7.0,
          },
        ],
      },
      {
        dong: "사당동",
        avgPrice: 13.2,
        recentPrice: 13.7,
        avgJeonsePrice: 6.9,
        recentJeonsePrice: 7.2,
        apts: [
          {
            name: "이수푸르지오더프레티움",
            avgPrice: 15.0,
            recentPrice: 15.6,
            avgJeonsePrice: 8.0,
            recentJeonsePrice: 8.3,
          },
          {
            name: "사당우성2차",
            avgPrice: 11.5,
            recentPrice: 12.0,
            avgJeonsePrice: 6.0,
            recentJeonsePrice: 6.3,
          },
        ],
      },
      {
        dong: "상도동",
        avgPrice: 12.8,
        recentPrice: 13.3,
        avgJeonsePrice: 6.7,
        recentJeonsePrice: 7.0,
        apts: [
          {
            name: "상도역롯데캐슬파크엘",
            avgPrice: 13.5,
            recentPrice: 14.0,
            avgJeonsePrice: 7.2,
            recentJeonsePrice: 7.5,
          },
          {
            name: "힐스테이트상도센트럴파크",
            avgPrice: 12.5,
            recentPrice: 13.0,
            avgJeonsePrice: 6.5,
            recentJeonsePrice: 6.8,
          },
        ],
      },
      {
        dong: "신대방동",
        avgPrice: 11.5,
        recentPrice: 12.0,
        avgJeonsePrice: 6.0,
        recentJeonsePrice: 6.3,
        apts: [
          {
            name: "보라매파크뷰",
            avgPrice: 11.5,
            recentPrice: 12.0,
            avgJeonsePrice: 6.0,
            recentJeonsePrice: 6.3,
          },
        ],
      },
      {
        dong: "흑석동",
        avgPrice: 16.5,
        recentPrice: 17.1,
        avgJeonsePrice: 8.6,
        recentJeonsePrice: 9.0,
        apts: [
          {
            name: "아크로리버하임",
            avgPrice: 19.5,
            recentPrice: 20.2,
            avgJeonsePrice: 10.2,
            recentJeonsePrice: 10.6,
          },
          {
            name: "흑석한강센트레빌1차",
            avgPrice: 14.8,
            recentPrice: 15.3,
            avgJeonsePrice: 7.8,
            recentJeonsePrice: 8.1,
          },
        ],
      },
    ],
  },
  {
    district: "마포구",
    avgPrice: 16.2,
    recentPrice: 16.8,
    avgJeonsePrice: 8.8,
    recentJeonsePrice: 9.1,
    dongs: [
      {
        dong: "공덕동",
        avgPrice: 17.5,
        recentPrice: 18.1,
        avgJeonsePrice: 9.2,
        recentJeonsePrice: 9.6,
        apts: [
          {
            name: "공덕자이",
            avgPrice: 17.8,
            recentPrice: 18.3,
            avgJeonsePrice: 9.4,
            recentJeonsePrice: 9.8,
          },
          {
            name: "공덕래미안4차",
            avgPrice: 16.5,
            recentPrice: 17.0,
            avgJeonsePrice: 8.8,
            recentJeonsePrice: 9.1,
          },
        ],
      },
      {
        dong: "구수동",
        avgPrice: 15.0,
        recentPrice: 15.5,
        avgJeonsePrice: 8.0,
        recentJeonsePrice: 8.3,
        apts: [
          {
            name: "서강해모로",
            avgPrice: 15.0,
            recentPrice: 15.5,
            avgJeonsePrice: 8.0,
            recentJeonsePrice: 8.3,
          },
        ],
      },
      {
        dong: "노고산동",
        avgPrice: 13.8,
        recentPrice: 14.2,
        avgJeonsePrice: 7.2,
        recentJeonsePrice: 7.5,
        apts: [
          {
            name: "신촌삼익아파트",
            avgPrice: 13.8,
            recentPrice: 14.2,
            avgJeonsePrice: 7.2,
            recentJeonsePrice: 7.5,
          },
        ],
      },
      {
        dong: "당인동",
        avgPrice: 16.0,
        recentPrice: 16.5,
        avgJeonsePrice: 8.5,
        recentJeonsePrice: 8.8,
        apts: [
          {
            name: "당인동한강타운",
            avgPrice: 16.0,
            recentPrice: 16.5,
            avgJeonsePrice: 8.5,
            recentJeonsePrice: 8.8,
          },
        ],
      },
      {
        dong: "대흥동",
        avgPrice: 18.5,
        recentPrice: 19.1,
        avgJeonsePrice: 9.8,
        recentJeonsePrice: 10.2,
        apts: [
          {
            name: "신촌그랑자이",
            avgPrice: 18.5,
            recentPrice: 19.1,
            avgJeonsePrice: 9.8,
            recentJeonsePrice: 10.2,
          },
        ],
      },
      {
        dong: "도화동",
        avgPrice: 13.8,
        recentPrice: 14.2,
        avgJeonsePrice: 7.4,
        recentJeonsePrice: 7.7,
        apts: [
          {
            name: "마포삼성아파트",
            avgPrice: 13.5,
            recentPrice: 14.0,
            avgJeonsePrice: 7.2,
            recentJeonsePrice: 7.5,
          },
          {
            name: "도화현대1차",
            avgPrice: 12.5,
            recentPrice: 12.9,
            avgJeonsePrice: 6.5,
            recentJeonsePrice: 6.8,
          },
        ],
      },
      {
        dong: "동교동",
        avgPrice: 15.5,
        recentPrice: 16.0,
        avgJeonsePrice: 8.2,
        recentJeonsePrice: 8.5,
        apts: [
          {
            name: "동교동삼익",
            avgPrice: 15.5,
            recentPrice: 16.0,
            avgJeonsePrice: 8.2,
            recentJeonsePrice: 8.5,
          },
        ],
      },
      {
        dong: "마포동",
        avgPrice: 16.8,
        recentPrice: 17.3,
        avgJeonsePrice: 8.8,
        recentJeonsePrice: 9.2,
        apts: [
          {
            name: "마포한화오벨리스크",
            avgPrice: 16.8,
            recentPrice: 17.3,
            avgJeonsePrice: 8.8,
            recentJeonsePrice: 9.2,
          },
        ],
      },
      {
        dong: "망원동",
        avgPrice: 12.5,
        recentPrice: 13.0,
        avgJeonsePrice: 6.6,
        recentJeonsePrice: 6.9,
        apts: [
          {
            name: "망원동휴먼빌",
            avgPrice: 12.5,
            recentPrice: 13.0,
            avgJeonsePrice: 6.6,
            recentJeonsePrice: 6.9,
          },
        ],
      },
      {
        dong: "상암동",
        avgPrice: 11.5,
        recentPrice: 12.0,
        avgJeonsePrice: 6.2,
        recentJeonsePrice: 6.5,
        apts: [
          {
            name: "상암월드컵파크4단지",
            avgPrice: 12.2,
            recentPrice: 12.6,
            avgJeonsePrice: 6.5,
            recentJeonsePrice: 6.8,
          },
        ],
      },
      {
        dong: "서교동",
        avgPrice: 16.5,
        recentPrice: 17.0,
        avgJeonsePrice: 8.8,
        recentJeonsePrice: 9.1,
        apts: [
          {
            name: "메세나폴리스",
            avgPrice: 19.5,
            recentPrice: 20.2,
            avgJeonsePrice: 10.5,
            recentJeonsePrice: 10.9,
          },
        ],
      },
      {
        dong: "성산동",
        avgPrice: 11.0,
        recentPrice: 11.5,
        avgJeonsePrice: 5.8,
        recentJeonsePrice: 6.1,
        apts: [
          {
            name: "성산시영아파트",
            avgPrice: 10.5,
            recentPrice: 11.0,
            avgJeonsePrice: 3.5,
            recentJeonsePrice: 3.7,
          },
        ],
      },
      {
        dong: "신수동",
        avgPrice: 16.0,
        recentPrice: 16.5,
        avgJeonsePrice: 8.5,
        recentJeonsePrice: 8.8,
        apts: [
          {
            name: "신촌숲아이파크",
            avgPrice: 16.8,
            recentPrice: 17.3,
            avgJeonsePrice: 9.0,
            recentJeonsePrice: 9.3,
          },
        ],
      },
      {
        dong: "신정동",
        avgPrice: 14.5,
        recentPrice: 15.0,
        avgJeonsePrice: 7.8,
        recentJeonsePrice: 8.1,
        apts: [
          {
            name: "서강서해그랑블",
            avgPrice: 14.5,
            recentPrice: 15.0,
            avgJeonsePrice: 7.8,
            recentJeonsePrice: 8.1,
          },
        ],
      },
      {
        dong: "아현동",
        avgPrice: 18.2,
        recentPrice: 18.7,
        avgJeonsePrice: 9.8,
        recentJeonsePrice: 10.1,
        apts: [
          {
            name: "마포래미안푸르지오",
            avgPrice: 18.7,
            recentPrice: 19.2,
            avgJeonsePrice: 10.0,
            recentJeonsePrice: 10.3,
          },
          {
            name: "e편한세상신촌",
            avgPrice: 17.5,
            recentPrice: 18.0,
            avgJeonsePrice: 9.2,
            recentJeonsePrice: 9.5,
          },
        ],
      },
      {
        dong: "연남동",
        avgPrice: 13.5,
        recentPrice: 14.0,
        avgJeonsePrice: 7.2,
        recentJeonsePrice: 7.5,
        apts: [
          {
            name: "연남코오롱아파트",
            avgPrice: 13.5,
            recentPrice: 14.0,
            avgJeonsePrice: 7.2,
            recentJeonsePrice: 7.5,
          },
        ],
      },
      {
        dong: "염리동",
        avgPrice: 19.0,
        recentPrice: 19.6,
        avgJeonsePrice: 10.2,
        recentJeonsePrice: 10.5,
        apts: [
          {
            name: "마포프레스티지자이",
            avgPrice: 19.8,
            recentPrice: 20.4,
            avgJeonsePrice: 10.5,
            recentJeonsePrice: 10.9,
          },
        ],
      },
      {
        dong: "용강동",
        avgPrice: 17.5,
        recentPrice: 18.0,
        avgJeonsePrice: 9.2,
        recentJeonsePrice: 9.5,
        apts: [
          {
            name: "래미안마포리버웰",
            avgPrice: 18.2,
            recentPrice: 18.8,
            avgJeonsePrice: 9.6,
            recentJeonsePrice: 10.0,
          },
        ],
      },
      {
        dong: "중동",
        avgPrice: 10.5,
        recentPrice: 10.9,
        avgJeonsePrice: 5.6,
        recentJeonsePrice: 5.9,
        apts: [
          {
            name: "마포중동월드컵참누리",
            avgPrice: 10.5,
            recentPrice: 10.9,
            avgJeonsePrice: 5.6,
            recentJeonsePrice: 5.9,
          },
        ],
      },
      {
        dong: "창전동",
        avgPrice: 14.0,
        recentPrice: 14.5,
        avgJeonsePrice: 7.4,
        recentJeonsePrice: 7.7,
        apts: [
          {
            name: "창전태영데시앙",
            avgPrice: 14.0,
            recentPrice: 14.5,
            avgJeonsePrice: 7.4,
            recentJeonsePrice: 7.7,
          },
        ],
      },
      {
        dong: "합정동",
        avgPrice: 15.5,
        recentPrice: 16.0,
        avgJeonsePrice: 8.2,
        recentJeonsePrice: 8.5,
        apts: [
          {
            name: "마포한강푸르지오",
            avgPrice: 17.5,
            recentPrice: 18.0,
            avgJeonsePrice: 9.2,
            recentJeonsePrice: 9.5,
          },
        ],
      },
      {
        dong: "현석동",
        avgPrice: 17.0,
        recentPrice: 17.5,
        avgJeonsePrice: 9.0,
        recentJeonsePrice: 9.3,
        apts: [
          {
            name: "래미안마포웰스트림",
            avgPrice: 17.0,
            recentPrice: 17.5,
            avgJeonsePrice: 9.0,
            recentJeonsePrice: 9.3,
          },
        ],
      },
    ],
  },
  {
    district: "서대문구",
    avgPrice: 11.5,
    recentPrice: 12.0,
    avgJeonsePrice: 6.0,
    recentJeonsePrice: 6.3,
    dongs: [
      {
        dong: "남가좌동",
        avgPrice: 11.2,
        recentPrice: 11.6,
        avgJeonsePrice: 5.8,
        recentJeonsePrice: 6.1,
        apts: [
          {
            name: "DMC래미안클라루스",
            avgPrice: 11.5,
            recentPrice: 12.0,
            avgJeonsePrice: 6.0,
            recentJeonsePrice: 6.3,
          },
          {
            name: "DMC파크뷰자이1단지",
            avgPrice: 11.8,
            recentPrice: 12.2,
            avgJeonsePrice: 6.2,
            recentJeonsePrice: 6.5,
          },
        ],
      },
      {
        dong: "냉천동",
        avgPrice: 14.0,
        recentPrice: 14.5,
        avgJeonsePrice: 7.3,
        recentJeonsePrice: 7.6,
        apts: [
          {
            name: "돈의문센트레빌",
            avgPrice: 14.0,
            recentPrice: 14.5,
            avgJeonsePrice: 7.3,
            recentJeonsePrice: 7.6,
          },
        ],
      },
      {
        dong: "대신동",
        avgPrice: 13.5,
        recentPrice: 14.0,
        avgJeonsePrice: 7.0,
        recentJeonsePrice: 7.3,
        apts: [
          {
            name: "이화여대입구주거단지",
            avgPrice: 13.5,
            recentPrice: 14.0,
            avgJeonsePrice: 7.0,
            recentJeonsePrice: 7.3,
          },
        ],
      },
      {
        dong: "대현동",
        avgPrice: 13.0,
        recentPrice: 13.5,
        avgJeonsePrice: 6.8,
        recentJeonsePrice: 7.1,
        apts: [
          {
            name: "신촌럭키아파트",
            avgPrice: 13.0,
            recentPrice: 13.5,
            avgJeonsePrice: 6.8,
            recentJeonsePrice: 7.1,
          },
        ],
      },
      {
        dong: "북가좌동",
        avgPrice: 11.8,
        recentPrice: 12.2,
        avgJeonsePrice: 6.1,
        recentJeonsePrice: 6.4,
        apts: [
          {
            name: "DMC래미안e편한세상",
            avgPrice: 12.0,
            recentPrice: 12.5,
            avgJeonsePrice: 6.3,
            recentJeonsePrice: 6.6,
          },
        ],
      },
      {
        dong: "북아현동",
        avgPrice: 16.5,
        recentPrice: 17.0,
        avgJeonsePrice: 8.6,
        recentJeonsePrice: 9.0,
        apts: [
          {
            name: "e편한세상신촌",
            avgPrice: 17.5,
            recentPrice: 18.0,
            avgJeonsePrice: 9.2,
            recentJeonsePrice: 9.5,
          },
          {
            name: "신촌힐스테이트",
            avgPrice: 16.0,
            recentPrice: 16.5,
            avgJeonsePrice: 8.3,
            recentJeonsePrice: 8.6,
          },
        ],
      },
      {
        dong: "신촌동",
        avgPrice: 14.0,
        recentPrice: 14.5,
        avgJeonsePrice: 7.2,
        recentJeonsePrice: 7.5,
        apts: [
          {
            name: "신촌주거단지",
            avgPrice: 14.0,
            recentPrice: 14.5,
            avgJeonsePrice: 7.2,
            recentJeonsePrice: 7.5,
          },
        ],
      },
      {
        dong: "연희동",
        avgPrice: 12.0,
        recentPrice: 12.5,
        avgJeonsePrice: 6.3,
        recentJeonsePrice: 6.6,
        apts: [
          {
            name: "연희파크푸르지오",
            avgPrice: 12.5,
            recentPrice: 13.0,
            avgJeonsePrice: 6.5,
            recentJeonsePrice: 6.8,
          },
        ],
      },
      {
        dong: "영천동",
        avgPrice: 13.2,
        recentPrice: 13.7,
        avgJeonsePrice: 6.9,
        recentJeonsePrice: 7.2,
        apts: [
          {
            name: "독립문삼호아파트",
            avgPrice: 13.2,
            recentPrice: 13.7,
            avgJeonsePrice: 6.9,
            recentJeonsePrice: 7.2,
          },
        ],
      },
      {
        dong: "창천동",
        avgPrice: 13.5,
        recentPrice: 14.0,
        avgJeonsePrice: 7.0,
        recentJeonsePrice: 7.3,
        apts: [
          {
            name: "창천동우성아파트",
            avgPrice: 13.5,
            recentPrice: 14.0,
            avgJeonsePrice: 7.0,
            recentJeonsePrice: 7.3,
          },
        ],
      },
      {
        dong: "천연동",
        avgPrice: 12.8,
        recentPrice: 13.2,
        avgJeonsePrice: 6.7,
        recentJeonsePrice: 7.0,
        apts: [
          {
            name: "천연동뜨란채",
            avgPrice: 12.8,
            recentPrice: 13.2,
            avgJeonsePrice: 6.7,
            recentJeonsePrice: 7.0,
          },
        ],
      },
      {
        dong: "충정로3가",
        avgPrice: 14.2,
        recentPrice: 14.7,
        avgJeonsePrice: 7.4,
        recentJeonsePrice: 7.7,
        apts: [
          {
            name: "충정로SK뷰",
            avgPrice: 14.2,
            recentPrice: 14.7,
            avgJeonsePrice: 7.4,
            recentJeonsePrice: 7.7,
          },
        ],
      },
      {
        dong: "홍은동",
        avgPrice: 8.8,
        recentPrice: 9.2,
        avgJeonsePrice: 4.6,
        recentJeonsePrice: 4.8,
        apts: [
          {
            name: "홍은벽산아파트",
            avgPrice: 8.5,
            recentPrice: 8.8,
            avgJeonsePrice: 4.4,
            recentJeonsePrice: 4.6,
          },
        ],
      },
      {
        dong: "홍제동",
        avgPrice: 9.5,
        recentPrice: 9.9,
        avgJeonsePrice: 5.0,
        recentJeonsePrice: 5.2,
        apts: [
          {
            name: "홍제원현대아파트",
            avgPrice: 9.5,
            recentPrice: 9.9,
            avgJeonsePrice: 5.0,
            recentJeonsePrice: 5.2,
          },
          {
            name: "홍제센트럴아이파크",
            avgPrice: 11.0,
            recentPrice: 11.5,
            avgJeonsePrice: 5.8,
            recentJeonsePrice: 6.1,
          },
        ],
      },
    ],
  },
  {
    district: "서초구",
    avgPrice: 28.0,
    recentPrice: 28.9,
    avgJeonsePrice: 14.2,
    recentJeonsePrice: 14.7,
    dongs: [
      {
        dong: "내곡동",
        avgPrice: 15.5,
        recentPrice: 16.0,
        avgJeonsePrice: 8.0,
        recentJeonsePrice: 8.3,
        apts: [
          {
            name: "서초더샵포레",
            avgPrice: 15.5,
            recentPrice: 16.0,
            avgJeonsePrice: 8.0,
            recentJeonsePrice: 8.3,
          },
        ],
      },
      {
        dong: "반포동",
        avgPrice: 32.5,
        recentPrice: 33.4,
        avgJeonsePrice: 16.8,
        recentJeonsePrice: 17.3,
        apts: [
          {
            name: "아크로리버파크",
            avgPrice: 31.2,
            recentPrice: 32.0,
            avgJeonsePrice: 16.0,
            recentJeonsePrice: 16.5,
          },
          {
            name: "래미안원베일리",
            avgPrice: 42.5,
            recentPrice: 43.8,
            avgJeonsePrice: 20.0,
            recentJeonsePrice: 20.8,
          },
          {
            name: "반포자이",
            avgPrice: 33.0,
            recentPrice: 33.9,
            avgJeonsePrice: 17.2,
            recentJeonsePrice: 17.8,
          },
          {
            name: "반포래미안퍼스티지",
            avgPrice: 34.5,
            recentPrice: 35.2,
            avgJeonsePrice: 17.5,
            recentJeonsePrice: 18.0,
          },
        ],
      },
      {
        dong: "방배동",
        avgPrice: 21.0,
        recentPrice: 21.6,
        avgJeonsePrice: 10.8,
        recentJeonsePrice: 11.2,
        apts: [
          {
            name: "방배5구역디에이치방배",
            avgPrice: 23.0,
            recentPrice: 23.5,
            avgJeonsePrice: 12.0,
            recentJeonsePrice: 12.5,
          },
          {
            name: "방배서리풀e편한세상",
            avgPrice: 20.5,
            recentPrice: 21.0,
            avgJeonsePrice: 10.5,
            recentJeonsePrice: 10.8,
          },
        ],
      },
      {
        dong: "서초동",
        avgPrice: 22.0,
        recentPrice: 22.7,
        avgJeonsePrice: 11.5,
        recentJeonsePrice: 11.9,
        apts: [
          {
            name: "래미안리더스원",
            avgPrice: 25.0,
            recentPrice: 25.8,
            avgJeonsePrice: 13.0,
            recentJeonsePrice: 13.5,
          },
          {
            name: "서초그랑자이",
            avgPrice: 26.5,
            recentPrice: 27.2,
            avgJeonsePrice: 13.8,
            recentJeonsePrice: 14.2,
          },
        ],
      },
      {
        dong: "신원동",
        avgPrice: 15.0,
        recentPrice: 15.5,
        avgJeonsePrice: 7.8,
        recentJeonsePrice: 8.1,
        apts: [
          {
            name: "서초포레스타5단지",
            avgPrice: 15.0,
            recentPrice: 15.5,
            avgJeonsePrice: 7.8,
            recentJeonsePrice: 8.1,
          },
        ],
      },
      {
        dong: "양재동",
        avgPrice: 18.5,
        recentPrice: 19.0,
        avgJeonsePrice: 9.5,
        recentJeonsePrice: 9.8,
        apts: [
          {
            name: "양재우성1차",
            avgPrice: 18.2,
            recentPrice: 18.6,
            avgJeonsePrice: 9.2,
            recentJeonsePrice: 9.5,
          },
          {
            name: "양재신동아",
            avgPrice: 17.5,
            recentPrice: 18.0,
            avgJeonsePrice: 8.8,
            recentJeonsePrice: 9.1,
          },
        ],
      },
      {
        dong: "염곡동",
        avgPrice: 16.0,
        recentPrice: 16.5,
        avgJeonsePrice: 8.2,
        recentJeonsePrice: 8.5,
        apts: [
          {
            name: "염곡동주택단지",
            avgPrice: 16.0,
            recentPrice: 16.5,
            avgJeonsePrice: 8.2,
            recentJeonsePrice: 8.5,
          },
        ],
      },
      {
        dong: "우면동",
        avgPrice: 14.5,
        recentPrice: 15.0,
        avgJeonsePrice: 7.5,
        recentJeonsePrice: 7.8,
        apts: [
          {
            name: "서초네이처힐3단지",
            avgPrice: 14.5,
            recentPrice: 15.0,
            avgJeonsePrice: 7.5,
            recentJeonsePrice: 7.8,
          },
        ],
      },
      {
        dong: "원지동",
        avgPrice: 14.0,
        recentPrice: 14.5,
        avgJeonsePrice: 7.2,
        recentJeonsePrice: 7.5,
        apts: [
          {
            name: "원지동주거단지",
            avgPrice: 14.0,
            recentPrice: 14.5,
            avgJeonsePrice: 7.2,
            recentJeonsePrice: 7.5,
          },
        ],
      },
      {
        dong: "잠원동",
        avgPrice: 27.5,
        recentPrice: 28.2,
        avgJeonsePrice: 14.0,
        recentJeonsePrice: 14.5,
        apts: [
          {
            name: "메이플자이",
            avgPrice: 29.5,
            recentPrice: 30.2,
            avgJeonsePrice: 15.0,
            recentJeonsePrice: 15.5,
          },
          {
            name: "신반포2차",
            avgPrice: 26.0,
            recentPrice: 26.8,
            avgJeonsePrice: 10.5,
            recentJeonsePrice: 11.0,
          },
        ],
      },
    ],
  },
  {
    district: "성동구",
    avgPrice: 17.8,
    recentPrice: 18.4,
    avgJeonsePrice: 9.4,
    recentJeonsePrice: 9.7,
    dongs: [
      {
        dong: "금호동1가",
        avgPrice: 14.5,
        recentPrice: 15.0,
        avgJeonsePrice: 7.5,
        recentJeonsePrice: 7.8,
        apts: [
          {
            name: "e편한세상금호파크힐스",
            avgPrice: 15.2,
            recentPrice: 15.7,
            avgJeonsePrice: 7.8,
            recentJeonsePrice: 8.1,
          },
        ],
      },
      {
        dong: "금호동2가",
        avgPrice: 14.8,
        recentPrice: 15.3,
        avgJeonsePrice: 7.6,
        recentJeonsePrice: 7.9,
        apts: [
          {
            name: "신금호파크자이",
            avgPrice: 15.5,
            recentPrice: 16.0,
            avgJeonsePrice: 8.0,
            recentJeonsePrice: 8.3,
          },
        ],
      },
      {
        dong: "금호동3가",
        avgPrice: 15.0,
        recentPrice: 15.5,
        avgJeonsePrice: 7.8,
        recentJeonsePrice: 8.1,
        apts: [
          {
            name: "금호자이1차",
            avgPrice: 15.0,
            recentPrice: 15.5,
            avgJeonsePrice: 7.8,
            recentJeonsePrice: 8.1,
          },
        ],
      },
      {
        dong: "금호동4가",
        avgPrice: 15.8,
        recentPrice: 16.3,
        avgJeonsePrice: 8.2,
        recentJeonsePrice: 8.5,
        apts: [
          {
            name: "힐스테이트서울숲리버",
            avgPrice: 16.2,
            recentPrice: 16.7,
            avgJeonsePrice: 8.5,
            recentJeonsePrice: 8.8,
          },
        ],
      },
      {
        dong: "도선동",
        avgPrice: 14.0,
        recentPrice: 14.5,
        avgJeonsePrice: 7.2,
        recentJeonsePrice: 7.5,
        apts: [
          {
            name: "도선동대림아파트",
            avgPrice: 14.0,
            recentPrice: 14.5,
            avgJeonsePrice: 7.2,
            recentJeonsePrice: 7.5,
          },
        ],
      },
      {
        dong: "마장동",
        avgPrice: 12.5,
        recentPrice: 13.0,
        avgJeonsePrice: 6.5,
        recentJeonsePrice: 6.8,
        apts: [
          {
            name: "마장동대성유니드",
            avgPrice: 12.5,
            recentPrice: 13.0,
            avgJeonsePrice: 6.5,
            recentJeonsePrice: 6.8,
          },
        ],
      },
      {
        dong: "사근동",
        avgPrice: 11.5,
        recentPrice: 12.0,
        avgJeonsePrice: 6.0,
        recentJeonsePrice: 6.3,
        apts: [
          {
            name: "사근동한양아파트",
            avgPrice: 11.5,
            recentPrice: 12.0,
            avgJeonsePrice: 6.0,
            recentJeonsePrice: 6.3,
          },
        ],
      },
      {
        dong: "상왕십리동",
        avgPrice: 15.2,
        recentPrice: 15.7,
        avgJeonsePrice: 8.0,
        recentJeonsePrice: 8.3,
        apts: [
          {
            name: "센트라스",
            avgPrice: 15.5,
            recentPrice: 16.0,
            avgJeonsePrice: 8.2,
            recentJeonsePrice: 8.5,
          },
        ],
      },
      {
        dong: "성수동1가",
        avgPrice: 32.0,
        recentPrice: 33.2,
        avgJeonsePrice: 16.0,
        recentJeonsePrice: 16.6,
        apts: [
          {
            name: "아크로서울포레스트",
            avgPrice: 62.0,
            recentPrice: 65.0,
            avgJeonsePrice: 30.0,
            recentJeonsePrice: 31.5,
          },
          {
            name: "갤러리아포레",
            avgPrice: 55.0,
            recentPrice: 57.5,
            avgJeonsePrice: 27.0,
            recentJeonsePrice: 28.0,
          },
          {
            name: "트리마제",
            avgPrice: 38.0,
            recentPrice: 39.5,
            avgJeonsePrice: 19.5,
            recentJeonsePrice: 20.0,
          },
        ],
      },
      {
        dong: "성수동2가",
        avgPrice: 22.0,
        recentPrice: 22.8,
        avgJeonsePrice: 11.0,
        recentJeonsePrice: 11.5,
        apts: [
          {
            name: "성수아이파크",
            avgPrice: 22.0,
            recentPrice: 22.8,
            avgJeonsePrice: 11.0,
            recentJeonsePrice: 11.5,
          },
        ],
      },
      {
        dong: "송정동",
        avgPrice: 11.0,
        recentPrice: 11.4,
        avgJeonsePrice: 5.8,
        recentJeonsePrice: 6.0,
        apts: [
          {
            name: "송정동건영아파트",
            avgPrice: 11.0,
            recentPrice: 11.4,
            avgJeonsePrice: 5.8,
            recentJeonsePrice: 6.0,
          },
        ],
      },
      {
        dong: "옥수동",
        avgPrice: 17.2,
        recentPrice: 17.8,
        avgJeonsePrice: 9.0,
        recentJeonsePrice: 9.3,
        apts: [
          {
            name: "래미안옥수리버젠",
            avgPrice: 17.8,
            recentPrice: 18.4,
            avgJeonsePrice: 9.4,
            recentJeonsePrice: 9.8,
          },
          {
            name: "e편한세상옥수파크힐스",
            avgPrice: 16.8,
            recentPrice: 17.3,
            avgJeonsePrice: 8.8,
            recentJeonsePrice: 9.1,
          },
        ],
      },
      {
        dong: "용답동",
        avgPrice: 11.8,
        recentPrice: 12.2,
        avgJeonsePrice: 6.1,
        recentJeonsePrice: 6.4,
        apts: [
          {
            name: "청계SK뷰",
            avgPrice: 12.5,
            recentPrice: 13.0,
            avgJeonsePrice: 6.5,
            recentJeonsePrice: 6.8,
          },
        ],
      },
      {
        dong: "응봉동",
        avgPrice: 12.8,
        recentPrice: 13.3,
        avgJeonsePrice: 6.5,
        recentJeonsePrice: 6.8,
        apts: [
          {
            name: "응봉대림아파트",
            avgPrice: 12.8,
            recentPrice: 13.3,
            avgJeonsePrice: 6.5,
            recentJeonsePrice: 6.8,
          },
        ],
      },
      {
        dong: "하왕십리동",
        avgPrice: 14.5,
        recentPrice: 15.0,
        avgJeonsePrice: 7.8,
        recentJeonsePrice: 8.1,
        apts: [
          {
            name: "텐즈힐1구역",
            avgPrice: 15.0,
            recentPrice: 15.5,
            avgJeonsePrice: 8.0,
            recentJeonsePrice: 8.3,
          },
        ],
      },
      {
        dong: "행당동",
        avgPrice: 14.8,
        recentPrice: 15.3,
        avgJeonsePrice: 7.6,
        recentJeonsePrice: 7.9,
        apts: [
          {
            name: "서울숲리버뷰자이",
            avgPrice: 16.5,
            recentPrice: 17.0,
            avgJeonsePrice: 8.5,
            recentJeonsePrice: 8.8,
          },
          {
            name: "행당대림아파트",
            avgPrice: 13.0,
            recentPrice: 13.5,
            avgJeonsePrice: 6.8,
            recentJeonsePrice: 7.1,
          },
        ],
      },
      {
        dong: "홍익동",
        avgPrice: 12.0,
        recentPrice: 12.5,
        avgJeonsePrice: 6.2,
        recentJeonsePrice: 6.5,
        apts: [
          {
            name: "홍익동청계벽산",
            avgPrice: 12.0,
            recentPrice: 12.5,
            avgJeonsePrice: 6.2,
            recentJeonsePrice: 6.5,
          },
        ],
      },
    ],
  },
  {
    district: "성북구",
    avgPrice: 9.8,
    recentPrice: 10.2,
    avgJeonsePrice: 5.2,
    recentJeonsePrice: 5.5,
    dongs: [
      {
        dong: "길음동",
        avgPrice: 10.5,
        recentPrice: 11.0,
        avgJeonsePrice: 5.6,
        recentJeonsePrice: 5.9,
        apts: [
          {
            name: "래미안길음센터피스",
            avgPrice: 12.0,
            recentPrice: 12.5,
            avgJeonsePrice: 6.5,
            recentJeonsePrice: 6.8,
          },
          {
            name: "길음뉴타운e편한세상4단지",
            avgPrice: 9.5,
            recentPrice: 9.9,
            avgJeonsePrice: 5.0,
            recentJeonsePrice: 5.3,
          },
        ],
      },
      {
        dong: "돈암동",
        avgPrice: 9.2,
        recentPrice: 9.6,
        avgJeonsePrice: 4.9,
        recentJeonsePrice: 5.1,
        apts: [
          {
            name: "돈암동한신한진아파트",
            avgPrice: 8.8,
            recentPrice: 9.2,
            avgJeonsePrice: 4.6,
            recentJeonsePrice: 4.8,
          },
        ],
      },
      {
        dong: "동선동",
        avgPrice: 8.8,
        recentPrice: 9.1,
        avgJeonsePrice: 4.6,
        recentJeonsePrice: 4.8,
        apts: [
          {
            name: "동선동코오롱아파트",
            avgPrice: 8.8,
            recentPrice: 9.1,
            avgJeonsePrice: 4.6,
            recentJeonsePrice: 4.8,
          },
        ],
      },
      {
        dong: "동소문동",
        avgPrice: 9.5,
        recentPrice: 9.9,
        avgJeonsePrice: 5.0,
        recentJeonsePrice: 5.2,
        apts: [
          {
            name: "동소문한신아파트",
            avgPrice: 9.5,
            recentPrice: 9.9,
            avgJeonsePrice: 5.0,
            recentJeonsePrice: 5.2,
          },
        ],
      },
      {
        dong: "보문동",
        avgPrice: 10.2,
        recentPrice: 10.6,
        avgJeonsePrice: 5.4,
        recentJeonsePrice: 5.7,
        apts: [
          {
            name: "보문파크뷰자이",
            avgPrice: 10.8,
            recentPrice: 11.2,
            avgJeonsePrice: 5.8,
            recentJeonsePrice: 6.1,
          },
        ],
      },
      {
        dong: "삼선동",
        avgPrice: 9.8,
        recentPrice: 10.2,
        avgJeonsePrice: 5.2,
        recentJeonsePrice: 5.5,
        apts: [
          {
            name: "삼선SK뷰",
            avgPrice: 10.2,
            recentPrice: 10.6,
            avgJeonsePrice: 5.4,
            recentJeonsePrice: 5.7,
          },
        ],
      },
      {
        dong: "상월곡동",
        avgPrice: 8.2,
        recentPrice: 8.5,
        avgJeonsePrice: 4.3,
        recentJeonsePrice: 4.5,
        apts: [
          {
            name: "상월곡동동아아파트",
            avgPrice: 8.2,
            recentPrice: 8.5,
            avgJeonsePrice: 4.3,
            recentJeonsePrice: 4.5,
          },
        ],
      },
      {
        dong: "석관동",
        avgPrice: 8.5,
        recentPrice: 8.9,
        avgJeonsePrice: 4.5,
        recentJeonsePrice: 4.7,
        apts: [
          {
            name: "래미안아트리치",
            avgPrice: 9.5,
            recentPrice: 9.9,
            avgJeonsePrice: 5.0,
            recentJeonsePrice: 5.3,
          },
        ],
      },
      {
        dong: "성북동",
        avgPrice: 15.0,
        recentPrice: 15.5,
        avgJeonsePrice: 7.8,
        recentJeonsePrice: 8.2,
        apts: [
          {
            name: "성북동외교관사택단지",
            avgPrice: 15.0,
            recentPrice: 15.5,
            avgJeonsePrice: 7.8,
            recentJeonsePrice: 8.2,
          },
        ],
      },
      {
        dong: "안암동",
        avgPrice: 9.0,
        recentPrice: 9.4,
        avgJeonsePrice: 4.8,
        recentJeonsePrice: 5.0,
        apts: [
          {
            name: "안암래미안",
            avgPrice: 9.2,
            recentPrice: 9.6,
            avgJeonsePrice: 4.9,
            recentJeonsePrice: 5.1,
          },
        ],
      },
      {
        dong: "정릉동",
        avgPrice: 7.8,
        recentPrice: 8.1,
        avgJeonsePrice: 4.0,
        recentJeonsePrice: 4.2,
        apts: [
          {
            name: "정릉힐스테이트1차",
            avgPrice: 7.8,
            recentPrice: 8.1,
            avgJeonsePrice: 4.0,
            recentJeonsePrice: 4.2,
          },
        ],
      },
      {
        dong: "종암동",
        avgPrice: 9.0,
        recentPrice: 9.4,
        avgJeonsePrice: 4.7,
        recentJeonsePrice: 5.0,
        apts: [
          {
            name: "래미안라센트",
            avgPrice: 9.5,
            recentPrice: 9.9,
            avgJeonsePrice: 5.0,
            recentJeonsePrice: 5.3,
          },
        ],
      },
      {
        dong: "하월곡동",
        avgPrice: 8.5,
        recentPrice: 8.8,
        avgJeonsePrice: 4.4,
        recentJeonsePrice: 4.6,
        apts: [
          {
            name: "월곡두산위브",
            avgPrice: 8.5,
            recentPrice: 8.8,
            avgJeonsePrice: 4.4,
            recentJeonsePrice: 4.6,
          },
        ],
      },
    ],
  },
  {
    district: "송파구",
    avgPrice: 21.5,
    recentPrice: 22.1,
    avgJeonsePrice: 11.0,
    recentJeonsePrice: 11.4,
    dongs: [
      {
        dong: "가락동",
        avgPrice: 19.5,
        recentPrice: 20.1,
        avgJeonsePrice: 9.8,
        recentJeonsePrice: 10.2,
        apts: [
          {
            name: "헬리오시티",
            avgPrice: 21.3,
            recentPrice: 21.9,
            avgJeonsePrice: 10.8,
            recentJeonsePrice: 11.2,
          },
          {
            name: "가락쌍용1차",
            avgPrice: 13.5,
            recentPrice: 14.0,
            avgJeonsePrice: 7.2,
            recentJeonsePrice: 7.5,
          },
        ],
      },
      {
        dong: "거여동",
        avgPrice: 13.5,
        recentPrice: 14.0,
        avgJeonsePrice: 6.8,
        recentJeonsePrice: 7.1,
        apts: [
          {
            name: "e편한세상송파파크센트럴",
            avgPrice: 14.2,
            recentPrice: 14.7,
            avgJeonsePrice: 7.2,
            recentJeonsePrice: 7.5,
          },
        ],
      },
      {
        dong: "마천동",
        avgPrice: 12.8,
        recentPrice: 13.3,
        avgJeonsePrice: 6.5,
        recentJeonsePrice: 6.8,
        apts: [
          {
            name: "송파파크데일2단지",
            avgPrice: 12.8,
            recentPrice: 13.3,
            avgJeonsePrice: 6.5,
            recentJeonsePrice: 6.8,
          },
        ],
      },
      {
        dong: "문정동",
        avgPrice: 16.5,
        recentPrice: 17.0,
        avgJeonsePrice: 8.5,
        recentJeonsePrice: 8.8,
        apts: [
          {
            name: "올림픽훼밀리타운",
            avgPrice: 18.0,
            recentPrice: 18.6,
            avgJeonsePrice: 8.2,
            recentJeonsePrice: 8.5,
          },
          {
            name: "문정래미안",
            avgPrice: 14.5,
            recentPrice: 15.0,
            avgJeonsePrice: 7.8,
            recentJeonsePrice: 8.1,
          },
        ],
      },
      {
        dong: "방이동",
        avgPrice: 18.2,
        recentPrice: 18.8,
        avgJeonsePrice: 9.2,
        recentJeonsePrice: 9.6,
        apts: [
          {
            name: "올림픽선수기자촌",
            avgPrice: 19.5,
            recentPrice: 20.1,
            avgJeonsePrice: 8.5,
            recentJeonsePrice: 8.9,
          },
          {
            name: "방이동대림",
            avgPrice: 14.2,
            recentPrice: 14.6,
            avgJeonsePrice: 7.5,
            recentJeonsePrice: 7.8,
          },
        ],
      },
      {
        dong: "삼전동",
        avgPrice: 14.0,
        recentPrice: 14.5,
        avgJeonsePrice: 7.0,
        recentJeonsePrice: 7.3,
        apts: [
          {
            name: "삼전동현대아파트",
            avgPrice: 14.0,
            recentPrice: 14.5,
            avgJeonsePrice: 7.0,
            recentJeonsePrice: 7.3,
          },
        ],
      },
      {
        dong: "석촌동",
        avgPrice: 15.0,
        recentPrice: 15.5,
        avgJeonsePrice: 7.5,
        recentJeonsePrice: 7.8,
        apts: [
          {
            name: "석촌동한솔아파트",
            avgPrice: 15.0,
            recentPrice: 15.5,
            avgJeonsePrice: 7.5,
            recentJeonsePrice: 7.8,
          },
        ],
      },
      {
        dong: "송파동",
        avgPrice: 16.0,
        recentPrice: 16.5,
        avgJeonsePrice: 8.0,
        recentJeonsePrice: 8.3,
        apts: [
          {
            name: "송파삼성래미안",
            avgPrice: 16.0,
            recentPrice: 16.5,
            avgJeonsePrice: 8.0,
            recentJeonsePrice: 8.3,
          },
        ],
      },
      {
        dong: "신천동",
        avgPrice: 23.0,
        recentPrice: 23.8,
        avgJeonsePrice: 11.8,
        recentJeonsePrice: 12.2,
        apts: [
          {
            name: "파크리오",
            avgPrice: 22.5,
            recentPrice: 23.1,
            avgJeonsePrice: 11.5,
            recentJeonsePrice: 11.9,
          },
          {
            name: "잠실르엘",
            avgPrice: 25.0,
            recentPrice: 25.8,
            avgJeonsePrice: 12.8,
            recentJeonsePrice: 13.2,
          },
        ],
      },
      {
        dong: "오금동",
        avgPrice: 15.5,
        recentPrice: 16.0,
        avgJeonsePrice: 7.8,
        recentJeonsePrice: 8.1,
        apts: [
          {
            name: "오금현대아파트",
            avgPrice: 16.5,
            recentPrice: 17.0,
            avgJeonsePrice: 8.2,
            recentJeonsePrice: 8.5,
          },
        ],
      },
      {
        dong: "오륜동",
        avgPrice: 19.8,
        recentPrice: 20.4,
        avgJeonsePrice: 9.5,
        recentJeonsePrice: 9.9,
        apts: [
          {
            name: "올림픽선수기자촌2단지",
            avgPrice: 19.8,
            recentPrice: 20.4,
            avgJeonsePrice: 9.5,
            recentJeonsePrice: 9.9,
          },
        ],
      },
      {
        dong: "잠실동",
        avgPrice: 24.8,
        recentPrice: 25.4,
        avgJeonsePrice: 12.5,
        recentJeonsePrice: 12.9,
        apts: [
          {
            name: "잠실엘스",
            avgPrice: 24.5,
            recentPrice: 25.1,
            avgJeonsePrice: 12.2,
            recentJeonsePrice: 12.6,
          },
          {
            name: "리센츠",
            avgPrice: 24.2,
            recentPrice: 24.8,
            avgJeonsePrice: 12.0,
            recentJeonsePrice: 12.4,
          },
          {
            name: "트리지움",
            avgPrice: 23.0,
            recentPrice: 23.6,
            avgJeonsePrice: 11.5,
            recentJeonsePrice: 11.8,
          },
          {
            name: "잠실주공5단지",
            avgPrice: 27.5,
            recentPrice: 28.3,
            avgJeonsePrice: 6.5,
            recentJeonsePrice: 6.8,
          },
        ],
      },
      {
        dong: "장지동",
        avgPrice: 14.2,
        recentPrice: 14.7,
        avgJeonsePrice: 7.2,
        recentJeonsePrice: 7.5,
        apts: [
          {
            name: "송파파인타운13단지",
            avgPrice: 14.2,
            recentPrice: 14.7,
            avgJeonsePrice: 7.2,
            recentJeonsePrice: 7.5,
          },
        ],
      },
      {
        dong: "풍납동",
        avgPrice: 13.5,
        recentPrice: 14.0,
        avgJeonsePrice: 6.8,
        recentJeonsePrice: 7.1,
        apts: [
          {
            name: "잠실올림픽아이파크",
            avgPrice: 15.5,
            recentPrice: 16.0,
            avgJeonsePrice: 8.0,
            recentJeonsePrice: 8.3,
          },
          {
            name: "풍납극동아파트",
            avgPrice: 11.5,
            recentPrice: 12.0,
            avgJeonsePrice: 5.8,
            recentJeonsePrice: 6.1,
          },
        ],
      },
    ],
  },
  {
    district: "양천구",
    avgPrice: 15.5,
    recentPrice: 16.0,
    avgJeonsePrice: 8.0,
    recentJeonsePrice: 8.3,
    dongs: [
      {
        dong: "목동",
        avgPrice: 17.8,
        recentPrice: 18.4,
        avgJeonsePrice: 9.2,
        recentJeonsePrice: 9.5,
        apts: [
          {
            name: "목동신시가지7단지",
            avgPrice: 19.5,
            recentPrice: 20.1,
            avgJeonsePrice: 8.8,
            recentJeonsePrice: 9.2,
          },
          {
            name: "목동신시가지5단지",
            avgPrice: 18.2,
            recentPrice: 18.8,
            avgJeonsePrice: 8.5,
            recentJeonsePrice: 8.9,
          },
          {
            name: "목동하이페리온1차",
            avgPrice: 21.0,
            recentPrice: 21.7,
            avgJeonsePrice: 11.5,
            recentJeonsePrice: 12.0,
          },
        ],
      },
      {
        dong: "신월동",
        avgPrice: 8.5,
        recentPrice: 8.9,
        avgJeonsePrice: 4.8,
        recentJeonsePrice: 5.0,
        apts: [
          {
            name: "신월시영아파트",
            avgPrice: 8.2,
            recentPrice: 8.5,
            avgJeonsePrice: 4.5,
            recentJeonsePrice: 4.8,
          },
        ],
      },
      {
        dong: "신정동",
        avgPrice: 13.5,
        recentPrice: 14.0,
        avgJeonsePrice: 7.0,
        recentJeonsePrice: 7.3,
        apts: [
          {
            name: "목동신시가지14단지",
            avgPrice: 14.5,
            recentPrice: 15.0,
            avgJeonsePrice: 7.2,
            recentJeonsePrice: 7.5,
          },
          {
            name: "목동아이파크위브",
            avgPrice: 12.8,
            recentPrice: 13.2,
            avgJeonsePrice: 6.8,
            recentJeonsePrice: 7.1,
          },
        ],
      },
    ],
  },
  {
    district: "영등포구",
    avgPrice: 14.5,
    recentPrice: 15.0,
    avgJeonsePrice: 7.6,
    recentJeonsePrice: 7.9,
    dongs: [
      {
        dong: "당산동",
        avgPrice: 13.8,
        recentPrice: 14.3,
        avgJeonsePrice: 7.2,
        recentJeonsePrice: 7.5,
        apts: [
          {
            name: "당산삼성래미안4차",
            avgPrice: 14.2,
            recentPrice: 14.7,
            avgJeonsePrice: 7.5,
            recentJeonsePrice: 7.8,
          },
        ],
      },
      {
        dong: "대림동",
        avgPrice: 9.2,
        recentPrice: 9.6,
        avgJeonsePrice: 4.8,
        recentJeonsePrice: 5.0,
        apts: [
          {
            name: "대림동현대3차",
            avgPrice: 9.2,
            recentPrice: 9.6,
            avgJeonsePrice: 4.8,
            recentJeonsePrice: 5.0,
          },
        ],
      },
      {
        dong: "도림동",
        avgPrice: 9.8,
        recentPrice: 10.2,
        avgJeonsePrice: 5.0,
        recentJeonsePrice: 5.3,
        apts: [
          {
            name: "도림동쌍용아파트",
            avgPrice: 9.8,
            recentPrice: 10.2,
            avgJeonsePrice: 5.0,
            recentJeonsePrice: 5.3,
          },
        ],
      },
      {
        dong: "문래동",
        avgPrice: 13.2,
        recentPrice: 13.7,
        avgJeonsePrice: 7.0,
        recentJeonsePrice: 7.3,
        apts: [
          {
            name: "문래자이",
            avgPrice: 13.8,
            recentPrice: 14.2,
            avgJeonsePrice: 7.4,
            recentJeonsePrice: 7.7,
          },
        ],
      },
      {
        dong: "신길동",
        avgPrice: 12.5,
        recentPrice: 13.0,
        avgJeonsePrice: 6.6,
        recentJeonsePrice: 6.9,
        apts: [
          {
            name: "보라매SK뷰",
            avgPrice: 13.2,
            recentPrice: 13.6,
            avgJeonsePrice: 7.0,
            recentJeonsePrice: 7.3,
          },
          {
            name: "신길센트럴자이",
            avgPrice: 12.8,
            recentPrice: 13.2,
            avgJeonsePrice: 6.8,
            recentJeonsePrice: 7.1,
          },
        ],
      },
      {
        dong: "양평동",
        avgPrice: 12.0,
        recentPrice: 12.5,
        avgJeonsePrice: 6.3,
        recentJeonsePrice: 6.6,
        apts: [
          {
            name: "양평동한신아파트",
            avgPrice: 12.0,
            recentPrice: 12.5,
            avgJeonsePrice: 6.3,
            recentJeonsePrice: 6.6,
          },
        ],
      },
      {
        dong: "여의도동",
        avgPrice: 24.5,
        recentPrice: 25.2,
        avgJeonsePrice: 11.5,
        recentJeonsePrice: 11.9,
        apts: [
          {
            name: "시범아파트",
            avgPrice: 22.0,
            recentPrice: 22.8,
            avgJeonsePrice: 6.5,
            recentJeonsePrice: 6.8,
          },
          {
            name: "여의도자이",
            avgPrice: 26.0,
            recentPrice: 26.7,
            avgJeonsePrice: 13.5,
            recentJeonsePrice: 14.0,
          },
        ],
      },
      {
        dong: "영등포동",
        avgPrice: 12.8,
        recentPrice: 13.3,
        avgJeonsePrice: 6.6,
        recentJeonsePrice: 6.9,
        apts: [
          {
            name: "영등포푸르지오",
            avgPrice: 12.8,
            recentPrice: 13.3,
            avgJeonsePrice: 6.6,
            recentJeonsePrice: 6.9,
          },
        ],
      },
      {
        dong: "영등포본동",
        avgPrice: 12.2,
        recentPrice: 12.7,
        avgJeonsePrice: 6.4,
        recentJeonsePrice: 6.7,
        apts: [
          {
            name: "영등포아트자이",
            avgPrice: 12.5,
            recentPrice: 13.0,
            avgJeonsePrice: 6.5,
            recentJeonsePrice: 6.8,
          },
        ],
      },
    ],
  },
  {
    district: "용산구",
    avgPrice: 23.5,
    recentPrice: 24.2,
    avgJeonsePrice: 11.8,
    recentJeonsePrice: 12.2,
    dongs: [
      {
        dong: "갈월동",
        avgPrice: 14.0,
        recentPrice: 14.5,
        avgJeonsePrice: 7.0,
        recentJeonsePrice: 7.3,
        apts: [
          {
            name: "갈월동주거단지",
            avgPrice: 14.0,
            recentPrice: 14.5,
            avgJeonsePrice: 7.0,
            recentJeonsePrice: 7.3,
          },
        ],
      },
      {
        dong: "남영동",
        avgPrice: 15.0,
        recentPrice: 15.5,
        avgJeonsePrice: 7.5,
        recentJeonsePrice: 7.8,
        apts: [
          {
            name: "남영동주거단지",
            avgPrice: 15.0,
            recentPrice: 15.5,
            avgJeonsePrice: 7.5,
            recentJeonsePrice: 7.8,
          },
        ],
      },
      {
        dong: "도원동",
        avgPrice: 13.5,
        recentPrice: 14.0,
        avgJeonsePrice: 6.8,
        recentJeonsePrice: 7.1,
        apts: [
          {
            name: "도원삼성래미안",
            avgPrice: 13.5,
            recentPrice: 14.0,
            avgJeonsePrice: 6.8,
            recentJeonsePrice: 7.1,
          },
        ],
      },
      {
        dong: "동빙고동",
        avgPrice: 28.0,
        recentPrice: 29.0,
        avgJeonsePrice: 14.0,
        recentJeonsePrice: 14.5,
        apts: [
          {
            name: "동빙고동빌라단지",
            avgPrice: 28.0,
            recentPrice: 29.0,
            avgJeonsePrice: 14.0,
            recentJeonsePrice: 14.5,
          },
        ],
      },
      {
        dong: "동자동",
        avgPrice: 16.5,
        recentPrice: 17.0,
        avgJeonsePrice: 8.5,
        recentJeonsePrice: 8.8,
        apts: [
          {
            name: "센트레빌아스테리움서울",
            avgPrice: 17.5,
            recentPrice: 18.0,
            avgJeonsePrice: 9.0,
            recentJeonsePrice: 9.3,
          },
        ],
      },
      {
        dong: "문배동",
        avgPrice: 14.2,
        recentPrice: 14.7,
        avgJeonsePrice: 7.2,
        recentJeonsePrice: 7.5,
        apts: [
          {
            name: "용산KCC스위첸",
            avgPrice: 14.2,
            recentPrice: 14.7,
            avgJeonsePrice: 7.2,
            recentJeonsePrice: 7.5,
          },
        ],
      },
      {
        dong: "보광동",
        avgPrice: 22.0,
        recentPrice: 22.8,
        avgJeonsePrice: 10.5,
        recentJeonsePrice: 11.0,
        apts: [
          {
            name: "보광동재개발구역",
            avgPrice: 22.0,
            recentPrice: 22.8,
            avgJeonsePrice: 10.5,
            recentJeonsePrice: 11.0,
          },
        ],
      },
      {
        dong: "산천동",
        avgPrice: 13.8,
        recentPrice: 14.3,
        avgJeonsePrice: 7.0,
        recentJeonsePrice: 7.3,
        apts: [
          {
            name: "한강삼성아파트",
            avgPrice: 13.8,
            recentPrice: 14.3,
            avgJeonsePrice: 7.0,
            recentJeonsePrice: 7.3,
          },
        ],
      },
      {
        dong: "서계동",
        avgPrice: 13.0,
        recentPrice: 13.5,
        avgJeonsePrice: 6.6,
        recentJeonsePrice: 6.9,
        apts: [
          {
            name: "서계동주거단지",
            avgPrice: 13.0,
            recentPrice: 13.5,
            avgJeonsePrice: 6.6,
            recentJeonsePrice: 6.9,
          },
        ],
      },
      {
        dong: "서빙고동",
        avgPrice: 27.0,
        recentPrice: 28.0,
        avgJeonsePrice: 13.5,
        recentJeonsePrice: 14.0,
        apts: [
          {
            name: "신동아아파트",
            avgPrice: 27.0,
            recentPrice: 28.0,
            avgJeonsePrice: 8.5,
            recentJeonsePrice: 9.0,
          },
        ],
      },
      {
        dong: "신계동",
        avgPrice: 16.0,
        recentPrice: 16.5,
        avgJeonsePrice: 8.2,
        recentJeonsePrice: 8.5,
        apts: [
          {
            name: "용산e편한세상",
            avgPrice: 16.0,
            recentPrice: 16.5,
            avgJeonsePrice: 8.2,
            recentJeonsePrice: 8.5,
          },
        ],
      },
      {
        dong: "신용산동",
        avgPrice: 24.5,
        recentPrice: 25.2,
        avgJeonsePrice: 12.5,
        recentJeonsePrice: 13.0,
        apts: [
          {
            name: "래미안용산더센트럴",
            avgPrice: 25.0,
            recentPrice: 25.8,
            avgJeonsePrice: 12.8,
            recentJeonsePrice: 13.2,
          },
        ],
      },
      {
        dong: "용산동",
        avgPrice: 22.0,
        recentPrice: 22.8,
        avgJeonsePrice: 11.0,
        recentJeonsePrice: 11.5,
        apts: [
          {
            name: "용산동아파트단지",
            avgPrice: 22.0,
            recentPrice: 22.8,
            avgJeonsePrice: 11.0,
            recentJeonsePrice: 11.5,
          },
        ],
      },
      {
        dong: "원효로",
        avgPrice: 14.5,
        recentPrice: 15.0,
        avgJeonsePrice: 7.3,
        recentJeonsePrice: 7.6,
        apts: [
          {
            name: "원효로산호아파트",
            avgPrice: 15.5,
            recentPrice: 16.0,
            avgJeonsePrice: 6.5,
            recentJeonsePrice: 6.8,
          },
        ],
      },
      {
        dong: "이촌동",
        avgPrice: 26.0,
        recentPrice: 26.8,
        avgJeonsePrice: 13.2,
        recentJeonsePrice: 13.6,
        apts: [
          {
            name: "래미안첼리투스",
            avgPrice: 38.0,
            recentPrice: 39.2,
            avgJeonsePrice: 19.0,
            recentJeonsePrice: 19.5,
          },
          {
            name: "한강맨션",
            avgPrice: 36.0,
            recentPrice: 37.0,
            avgJeonsePrice: 9.5,
            recentJeonsePrice: 10.0,
          },
        ],
      },
      {
        dong: "이태원동",
        avgPrice: 30.0,
        recentPrice: 31.0,
        avgJeonsePrice: 15.0,
        recentJeonsePrice: 15.5,
        apts: [
          {
            name: "남산대림아파트",
            avgPrice: 22.0,
            recentPrice: 22.8,
            avgJeonsePrice: 11.0,
            recentJeonsePrice: 11.4,
          },
        ],
      },
      {
        dong: "청파동",
        avgPrice: 13.2,
        recentPrice: 13.7,
        avgJeonsePrice: 6.7,
        recentJeonsePrice: 7.0,
        apts: [
          {
            name: "청파동주거단지",
            avgPrice: 13.2,
            recentPrice: 13.7,
            avgJeonsePrice: 6.7,
            recentJeonsePrice: 7.0,
          },
        ],
      },
      {
        dong: "한강로",
        avgPrice: 24.0,
        recentPrice: 24.8,
        avgJeonsePrice: 12.0,
        recentJeonsePrice: 12.4,
        apts: [
          {
            name: "용산푸르지오써밋",
            avgPrice: 23.5,
            recentPrice: 24.2,
            avgJeonsePrice: 11.8,
            recentJeonsePrice: 12.2,
          },
          {
            name: "용산파크자이",
            avgPrice: 18.5,
            recentPrice: 19.0,
            avgJeonsePrice: 9.5,
            recentJeonsePrice: 9.8,
          },
        ],
      },
      {
        dong: "한남동",
        avgPrice: 38.0,
        recentPrice: 39.5,
        avgJeonsePrice: 18.0,
        recentJeonsePrice: 18.7,
        apts: [
          {
            name: "한남더힐",
            avgPrice: 85.0,
            recentPrice: 88.0,
            avgJeonsePrice: 40.0,
            recentJeonsePrice: 42.0,
          },
          {
            name: "나인원한남",
            avgPrice: 90.0,
            recentPrice: 93.5,
            avgJeonsePrice: 45.0,
            recentJeonsePrice: 47.5,
          },
        ],
      },
      {
        dong: "효창동",
        avgPrice: 15.5,
        recentPrice: 16.0,
        avgJeonsePrice: 8.2,
        recentJeonsePrice: 8.5,
        apts: [
          {
            name: "효창파크푸르지오",
            avgPrice: 15.8,
            recentPrice: 16.2,
            avgJeonsePrice: 8.4,
            recentJeonsePrice: 8.7,
          },
        ],
      },
      {
        dong: "후암동",
        avgPrice: 14.5,
        recentPrice: 15.0,
        avgJeonsePrice: 7.3,
        recentJeonsePrice: 7.6,
        apts: [
          {
            name: "후암동주거단지",
            avgPrice: 14.5,
            recentPrice: 15.0,
            avgJeonsePrice: 7.3,
            recentJeonsePrice: 7.6,
          },
        ],
      },
    ],
  },
  {
    district: "은평구",
    avgPrice: 9.0,
    recentPrice: 9.4,
    avgJeonsePrice: 4.7,
    recentJeonsePrice: 4.9,
    dongs: [
      {
        dong: "갈현동",
        avgPrice: 8.8,
        recentPrice: 9.2,
        avgJeonsePrice: 4.5,
        recentJeonsePrice: 4.8,
        apts: [
          {
            name: "갈현동e편한세상",
            avgPrice: 8.8,
            recentPrice: 9.2,
            avgJeonsePrice: 4.5,
            recentJeonsePrice: 4.8,
          },
        ],
      },
      {
        dong: "구산동",
        avgPrice: 8.0,
        recentPrice: 8.3,
        avgJeonsePrice: 4.1,
        recentJeonsePrice: 4.3,
        apts: [
          {
            name: "구산경남아파트",
            avgPrice: 8.0,
            recentPrice: 8.3,
            avgJeonsePrice: 4.1,
            recentJeonsePrice: 4.3,
          },
        ],
      },
      {
        dong: "녹번동",
        avgPrice: 10.5,
        recentPrice: 11.0,
        avgJeonsePrice: 5.5,
        recentJeonsePrice: 5.8,
        apts: [
          {
            name: "래미안베라힐즈",
            avgPrice: 10.8,
            recentPrice: 11.3,
            avgJeonsePrice: 5.6,
            recentJeonsePrice: 5.9,
          },
          {
            name: "힐스테이트녹번",
            avgPrice: 10.2,
            recentPrice: 10.6,
            avgJeonsePrice: 5.4,
            recentJeonsePrice: 5.7,
          },
        ],
      },
      {
        dong: "대조동",
        avgPrice: 9.5,
        recentPrice: 9.9,
        avgJeonsePrice: 4.9,
        recentJeonsePrice: 5.1,
        apts: [
          {
            name: "힐스테이트메디알레",
            avgPrice: 10.5,
            recentPrice: 11.0,
            avgJeonsePrice: 5.5,
            recentJeonsePrice: 5.8,
          },
        ],
      },
      {
        dong: "불광동",
        avgPrice: 8.8,
        recentPrice: 9.2,
        avgJeonsePrice: 4.6,
        recentJeonsePrice: 4.8,
        apts: [
          {
            name: "북한산힐스테이트7차",
            avgPrice: 9.5,
            recentPrice: 9.9,
            avgJeonsePrice: 4.9,
            recentJeonsePrice: 5.2,
          },
        ],
      },
      {
        dong: "수색동",
        avgPrice: 10.8,
        recentPrice: 11.3,
        avgJeonsePrice: 5.6,
        recentJeonsePrice: 5.9,
        apts: [
          {
            name: "DMC롯데캐슬더퍼스트",
            avgPrice: 11.2,
            recentPrice: 11.7,
            avgJeonsePrice: 5.8,
            recentJeonsePrice: 6.1,
          },
        ],
      },
      {
        dong: "신사동",
        avgPrice: 8.2,
        recentPrice: 8.5,
        avgJeonsePrice: 4.2,
        recentJeonsePrice: 4.4,
        apts: [
          {
            name: "은평신사씨티아파트",
            avgPrice: 8.2,
            recentPrice: 8.5,
            avgJeonsePrice: 4.2,
            recentJeonsePrice: 4.4,
          },
        ],
      },
      {
        dong: "역촌동",
        avgPrice: 8.0,
        recentPrice: 8.3,
        avgJeonsePrice: 4.1,
        recentJeonsePrice: 4.3,
        apts: [
          {
            name: "역촌동센트레빌",
            avgPrice: 8.0,
            recentPrice: 8.3,
            avgJeonsePrice: 4.1,
            recentJeonsePrice: 4.3,
          },
        ],
      },
      {
        dong: "응암동",
        avgPrice: 9.8,
        recentPrice: 10.2,
        avgJeonsePrice: 5.1,
        recentJeonsePrice: 5.4,
        apts: [
          {
            name: "녹번역e편한세상캐슬",
            avgPrice: 10.5,
            recentPrice: 11.0,
            avgJeonsePrice: 5.5,
            recentJeonsePrice: 5.8,
          },
          {
            name: "백련산해링턴플레이스",
            avgPrice: 9.0,
            recentPrice: 9.4,
            avgJeonsePrice: 4.7,
            recentJeonsePrice: 4.9,
          },
        ],
      },
      {
        dong: "증산동",
        avgPrice: 12.0,
        recentPrice: 12.6,
        avgJeonsePrice: 6.2,
        recentJeonsePrice: 6.6,
        apts: [
          {
            name: "DMC센트럴자이",
            avgPrice: 12.8,
            recentPrice: 13.4,
            avgJeonsePrice: 6.6,
            recentJeonsePrice: 7.0,
          },
        ],
      },
      {
        dong: "진관동",
        avgPrice: 9.5,
        recentPrice: 9.9,
        avgJeonsePrice: 5.0,
        recentJeonsePrice: 5.2,
        apts: [
          {
            name: "은평뉴타운박석고개힐스테이트1단지",
            avgPrice: 9.5,
            recentPrice: 9.9,
            avgJeonsePrice: 5.0,
            recentJeonsePrice: 5.2,
          },
        ],
      },
    ],
  },
  {
    district: "광진구",
    avgPrice: 14.0,
    recentPrice: 14.5,
    avgJeonsePrice: 7.5,
    recentJeonsePrice: 7.8,
    dongs: [
      {
        dong: "광장동",
        avgPrice: 15.2,
        recentPrice: 15.7,
        avgJeonsePrice: 8.0,
        recentJeonsePrice: 8.3,
        apts: [
          {
            name: "광장극동2차",
            avgPrice: 15.8,
            recentPrice: 16.3,
            avgJeonsePrice: 7.8,
            recentJeonsePrice: 8.1,
          },
          {
            name: "광장힐스테이트",
            avgPrice: 16.5,
            recentPrice: 17.0,
            avgJeonsePrice: 8.8,
            recentJeonsePrice: 9.2,
          },
        ],
      },
      {
        dong: "구의동",
        avgPrice: 12.5,
        recentPrice: 12.9,
        avgJeonsePrice: 6.6,
        recentJeonsePrice: 6.9,
        apts: [
          {
            name: "구의현대2단지",
            avgPrice: 12.8,
            recentPrice: 13.2,
            avgJeonsePrice: 6.8,
            recentJeonsePrice: 7.1,
          },
        ],
      },
    ],
  },
  {
    district: "서대문구",
    avgPrice: 11.8,
    recentPrice: 12.3,
    avgJeonsePrice: 6.4,
    recentJeonsePrice: 6.7,
    dongs: [
      {
        dong: "남가좌동",
        avgPrice: 12.5,
        recentPrice: 13.0,
        avgJeonsePrice: 6.8,
        recentJeonsePrice: 7.1,
        apts: [
          {
            name: "DMC파크뷰자이",
            avgPrice: 13.5,
            recentPrice: 14.0,
            avgJeonsePrice: 7.2,
            recentJeonsePrice: 7.5,
          },
        ],
      },
      {
        dong: "북아현동",
        avgPrice: 14.0,
        recentPrice: 14.5,
        avgJeonsePrice: 7.5,
        recentJeonsePrice: 7.8,
        apts: [
          {
            name: "e편한세상신촌",
            avgPrice: 15.2,
            recentPrice: 15.8,
            avgJeonsePrice: 8.0,
            recentJeonsePrice: 8.3,
          },
          {
            name: "신촌힐스테이트",
            avgPrice: 14.5,
            recentPrice: 15.0,
            avgJeonsePrice: 7.8,
            recentJeonsePrice: 8.1,
          },
        ],
      },
      {
        dong: "홍은동",
        avgPrice: 8.8,
        recentPrice: 9.2,
        avgJeonsePrice: 4.8,
        recentJeonsePrice: 5.0,
        apts: [
          {
            name: "홍은벽산아파트",
            avgPrice: 8.5,
            recentPrice: 8.8,
            avgJeonsePrice: 4.5,
            recentJeonsePrice: 4.7,
          },
        ],
      },
    ],
  },
  {
    district: "동대문구",
    avgPrice: 10.5,
    recentPrice: 10.9,
    avgJeonsePrice: 5.8,
    recentJeonsePrice: 6.0,
    dongs: [
      {
        dong: "전농동",
        avgPrice: 11.2,
        recentPrice: 11.7,
        avgJeonsePrice: 6.2,
        recentJeonsePrice: 6.5,
        apts: [
          {
            name: "래미안크레시티",
            avgPrice: 12.0,
            recentPrice: 12.5,
            avgJeonsePrice: 6.6,
            recentJeonsePrice: 6.9,
          },
        ],
      },
      {
        dong: "답십리동",
        avgPrice: 10.8,
        recentPrice: 11.2,
        avgJeonsePrice: 5.9,
        recentJeonsePrice: 6.1,
        apts: [
          {
            name: "답십리래미안위브",
            avgPrice: 11.5,
            recentPrice: 11.9,
            avgJeonsePrice: 6.2,
            recentJeonsePrice: 6.5,
          },
        ],
      },
      {
        dong: "장안동",
        avgPrice: 9.2,
        recentPrice: 9.5,
        avgJeonsePrice: 5.0,
        recentJeonsePrice: 5.2,
        apts: [
          {
            name: "장안현대홈타운1차",
            avgPrice: 9.5,
            recentPrice: 9.8,
            avgJeonsePrice: 5.2,
            recentJeonsePrice: 5.4,
          },
        ],
      },
      {
        dong: "이문동",
        avgPrice: 9.8,
        recentPrice: 10.2,
        avgJeonsePrice: 5.4,
        recentJeonsePrice: 5.6,
        apts: [
          {
            name: "래미안라그란데",
            avgPrice: 10.5,
            recentPrice: 11.0,
            avgJeonsePrice: 5.8,
            recentJeonsePrice: 6.1,
          },
        ],
      },
    ],
  },
  {
    district: "성북구",
    avgPrice: 9.2,
    recentPrice: 9.6,
    avgJeonsePrice: 5.2,
    recentJeonsePrice: 5.4,
    dongs: [
      {
        dong: "길음동",
        avgPrice: 9.8,
        recentPrice: 10.2,
        avgJeonsePrice: 5.5,
        recentJeonsePrice: 5.8,
        apts: [
          {
            name: "래미안길음센터피스",
            avgPrice: 11.2,
            recentPrice: 11.7,
            avgJeonsePrice: 6.2,
            recentJeonsePrice: 6.5,
          },
          {
            name: "길음뉴타운8단지",
            avgPrice: 9.2,
            recentPrice: 9.5,
            avgJeonsePrice: 5.2,
            recentJeonsePrice: 5.4,
          },
        ],
      },
      {
        dong: "종암동",
        avgPrice: 8.5,
        recentPrice: 8.8,
        avgJeonsePrice: 4.8,
        recentJeonsePrice: 5.0,
        apts: [
          {
            name: "래미안라센트",
            avgPrice: 8.8,
            recentPrice: 9.1,
            avgJeonsePrice: 5.0,
            recentJeonsePrice: 5.2,
          },
        ],
      },
      {
        dong: "돈암동",
        avgPrice: 8.8,
        recentPrice: 9.1,
        avgJeonsePrice: 5.0,
        recentJeonsePrice: 5.2,
        apts: [
          {
            name: "돈암동한신한진",
            avgPrice: 8.2,
            recentPrice: 8.5,
            avgJeonsePrice: 4.6,
            recentJeonsePrice: 4.8,
          },
        ],
      },
    ],
  },
  {
    district: "노원구",
    avgPrice: 7.8,
    recentPrice: 8.1,
    avgJeonsePrice: 4.3,
    recentJeonsePrice: 4.5,
    dongs: [
      {
        dong: "중계동",
        avgPrice: 8.5,
        recentPrice: 8.9,
        avgJeonsePrice: 4.8,
        recentJeonsePrice: 5.0,
        apts: [
          {
            name: "중계청구3차",
            avgPrice: 9.5,
            recentPrice: 9.9,
            avgJeonsePrice: 5.4,
            recentJeonsePrice: 5.7,
          },
          {
            name: "중계건영2차",
            avgPrice: 8.2,
            recentPrice: 8.5,
            avgJeonsePrice: 4.5,
            recentJeonsePrice: 4.7,
          },
        ],
      },
      {
        dong: "상계동",
        avgPrice: 6.8,
        recentPrice: 7.1,
        avgJeonsePrice: 3.8,
        recentJeonsePrice: 4.0,
        apts: [
          {
            name: "상계주공8단지(포레나노원)",
            avgPrice: 8.2,
            recentPrice: 8.6,
            avgJeonsePrice: 4.6,
            recentJeonsePrice: 4.8,
          },
          {
            name: "상계주공7단지",
            avgPrice: 6.2,
            recentPrice: 6.5,
            avgJeonsePrice: 3.2,
            recentJeonsePrice: 3.4,
          },
        ],
      },
      {
        dong: "하계동",
        avgPrice: 7.2,
        recentPrice: 7.5,
        avgJeonsePrice: 4.0,
        recentJeonsePrice: 4.2,
        apts: [
          {
            name: "하계장미아파트",
            avgPrice: 6.8,
            recentPrice: 7.1,
            avgJeonsePrice: 3.8,
            recentJeonsePrice: 4.0,
          },
        ],
      },
      {
        dong: "공릉동",
        avgPrice: 7.5,
        recentPrice: 7.8,
        avgJeonsePrice: 4.2,
        recentJeonsePrice: 4.4,
        apts: [
          {
            name: "공릉태강아파트",
            avgPrice: 6.5,
            recentPrice: 6.8,
            avgJeonsePrice: 3.6,
            recentJeonsePrice: 3.8,
          },
        ],
      },
    ],
  },
  {
    district: "은평구",
    avgPrice: 8.5,
    recentPrice: 8.9,
    avgJeonsePrice: 4.7,
    recentJeonsePrice: 4.9,
    dongs: [
      {
        dong: "응암동",
        avgPrice: 8.8,
        recentPrice: 9.2,
        avgJeonsePrice: 4.9,
        recentJeonsePrice: 5.1,
        apts: [
          {
            name: "녹번역e편한세상캐슬",
            avgPrice: 9.8,
            recentPrice: 10.2,
            avgJeonsePrice: 5.5,
            recentJeonsePrice: 5.8,
          },
          {
            name: "백련산힐스테이트1차",
            avgPrice: 8.2,
            recentPrice: 8.5,
            avgJeonsePrice: 4.5,
            recentJeonsePrice: 4.7,
          },
        ],
      },
      {
        dong: "불광동",
        avgPrice: 7.8,
        recentPrice: 8.1,
        avgJeonsePrice: 4.3,
        recentJeonsePrice: 4.5,
        apts: [
          {
            name: "불광롯데캐슬",
            avgPrice: 8.5,
            recentPrice: 8.8,
            avgJeonsePrice: 4.7,
            recentJeonsePrice: 4.9,
          },
        ],
      },
      {
        dong: "진관동",
        avgPrice: 8.5,
        recentPrice: 8.9,
        avgJeonsePrice: 4.7,
        recentJeonsePrice: 4.9,
        apts: [
          {
            name: "은평뉴타운박석고개",
            avgPrice: 8.8,
            recentPrice: 9.1,
            avgJeonsePrice: 4.9,
            recentJeonsePrice: 5.1,
          },
        ],
      },
      {
        dong: "수색동",
        avgPrice: 9.2,
        recentPrice: 9.6,
        avgJeonsePrice: 5.1,
        recentJeonsePrice: 5.3,
        apts: [
          {
            name: "DMC롯데캐슬더퍼스트",
            avgPrice: 9.5,
            recentPrice: 9.9,
            avgJeonsePrice: 5.3,
            recentJeonsePrice: 5.5,
          },
        ],
      },
    ],
  },
  {
    district: "종로구",
    avgPrice: 13.5,
    recentPrice: 14.0,
    avgJeonsePrice: 7.2,
    recentJeonsePrice: 7.5,
    dongs: [
      {
        dong: "무악동",
        avgPrice: 14.0,
        recentPrice: 14.5,
        avgJeonsePrice: 7.5,
        recentJeonsePrice: 7.8,
        apts: [
          {
            name: "경희궁자이2단지",
            avgPrice: 17.5,
            recentPrice: 18.0,
            avgJeonsePrice: 9.5,
            recentJeonsePrice: 9.8,
          },
          {
            name: "무악현대아파트",
            avgPrice: 11.5,
            recentPrice: 11.9,
            avgJeonsePrice: 6.2,
            recentJeonsePrice: 6.5,
          },
        ],
      },
      {
        dong: "평창동",
        avgPrice: 15.5,
        recentPrice: 16.0,
        avgJeonsePrice: 8.0,
        recentJeonsePrice: 8.3,
        apts: [
          {
            name: "평창롯데낙천대",
            avgPrice: 14.5,
            recentPrice: 14.9,
            avgJeonsePrice: 7.5,
            recentJeonsePrice: 7.8,
          },
        ],
      },
      {
        dong: "혜화동",
        avgPrice: 11.0,
        recentPrice: 11.5,
        avgJeonsePrice: 6.0,
        recentJeonsePrice: 6.2,
        apts: [
          {
            name: "혜화동아남아파트",
            avgPrice: 10.8,
            recentPrice: 11.2,
            avgJeonsePrice: 5.8,
            recentJeonsePrice: 6.0,
          },
        ],
      },
    ],
  },
  {
    district: "중구",
    avgPrice: 12.8,
    recentPrice: 13.3,
    avgJeonsePrice: 6.8,
    recentJeonsePrice: 7.1,
    dongs: [
      {
        dong: "신당동",
        avgPrice: 13.0,
        recentPrice: 13.5,
        avgJeonsePrice: 7.0,
        recentJeonsePrice: 7.3,
        apts: [
          {
            name: "신당e편한세상",
            avgPrice: 13.8,
            recentPrice: 14.2,
            avgJeonsePrice: 7.4,
            recentJeonsePrice: 7.7,
          },
          {
            name: "남산타운",
            avgPrice: 11.8,
            recentPrice: 12.2,
            avgJeonsePrice: 6.2,
            recentJeonsePrice: 6.5,
          },
        ],
      },
      {
        dong: "만리동1가",
        avgPrice: 14.5,
        recentPrice: 15.0,
        avgJeonsePrice: 7.8,
        recentJeonsePrice: 8.1,
        apts: [
          {
            name: "서울역센트럴자이",
            avgPrice: 14.8,
            recentPrice: 15.3,
            avgJeonsePrice: 8.0,
            recentJeonsePrice: 8.3,
          },
        ],
      },
      {
        dong: "황학동",
        avgPrice: 10.2,
        recentPrice: 10.6,
        avgJeonsePrice: 5.5,
        recentJeonsePrice: 5.7,
        apts: [
          {
            name: "황학동롯데캐슬베네치아",
            avgPrice: 10.2,
            recentPrice: 10.6,
            avgJeonsePrice: 5.5,
            recentJeonsePrice: 5.7,
          },
        ],
      },
    ],
  },
  {
    district: "강서구",
    avgPrice: 10.2,
    recentPrice: 10.6,
    avgJeonsePrice: 5.6,
    recentJeonsePrice: 5.8,
    dongs: [
      {
        dong: "마곡동",
        avgPrice: 13.2,
        recentPrice: 13.7,
        avgJeonsePrice: 7.2,
        recentJeonsePrice: 7.5,
        apts: [
          {
            name: "마곡엠밸리7단지",
            avgPrice: 14.5,
            recentPrice: 15.0,
            avgJeonsePrice: 7.8,
            recentJeonsePrice: 8.1,
          },
          {
            name: "마곡힐스테이트",
            avgPrice: 13.5,
            recentPrice: 13.9,
            avgJeonsePrice: 7.2,
            recentJeonsePrice: 7.5,
          },
        ],
      },
      {
        dong: "염창동",
        avgPrice: 9.8,
        recentPrice: 10.2,
        avgJeonsePrice: 5.4,
        recentJeonsePrice: 5.6,
        apts: [
          {
            name: "염창동보람더하임",
            avgPrice: 9.8,
            recentPrice: 10.2,
            avgJeonsePrice: 5.4,
            recentJeonsePrice: 5.6,
          },
        ],
      },
      {
        dong: "등촌동",
        avgPrice: 8.5,
        recentPrice: 8.8,
        avgJeonsePrice: 4.6,
        recentJeonsePrice: 4.8,
        apts: [
          {
            name: "등촌아이파크",
            avgPrice: 9.2,
            recentPrice: 9.5,
            avgJeonsePrice: 5.0,
            recentJeonsePrice: 5.2,
          },
        ],
      },
      {
        dong: "화곡동",
        avgPrice: 7.5,
        recentPrice: 7.8,
        avgJeonsePrice: 4.1,
        recentJeonsePrice: 4.3,
        apts: [
          {
            name: "우장산아이파크e편한세상",
            avgPrice: 11.2,
            recentPrice: 11.6,
            avgJeonsePrice: 6.0,
            recentJeonsePrice: 6.3,
          },
        ],
      },
    ],
  },
  {
    district: "구로구",
    avgPrice: 8.2,
    recentPrice: 8.5,
    avgJeonsePrice: 4.5,
    recentJeonsePrice: 4.7,
    dongs: [
      {
        dong: "신도림동",
        avgPrice: 10.5,
        recentPrice: 10.9,
        avgJeonsePrice: 5.8,
        recentJeonsePrice: 6.0,
        apts: [
          {
            name: "신도림e편한세상4차",
            avgPrice: 12.0,
            recentPrice: 12.5,
            avgJeonsePrice: 6.5,
            recentJeonsePrice: 6.8,
          },
          {
            name: "신도림동아1차",
            avgPrice: 10.2,
            recentPrice: 10.6,
            avgJeonsePrice: 5.5,
            recentJeonsePrice: 5.8,
          },
        ],
      },
      {
        dong: "구로동",
        avgPrice: 7.5,
        recentPrice: 7.8,
        avgJeonsePrice: 4.1,
        recentJeonsePrice: 4.3,
        apts: [
          {
            name: "구로주공1차",
            avgPrice: 7.8,
            recentPrice: 8.1,
            avgJeonsePrice: 4.0,
            recentJeonsePrice: 4.2,
          },
        ],
      },
      {
        dong: "개봉동",
        avgPrice: 6.8,
        recentPrice: 7.1,
        avgJeonsePrice: 3.7,
        recentJeonsePrice: 3.9,
        apts: [
          {
            name: "개봉아이파크",
            avgPrice: 7.2,
            recentPrice: 7.5,
            avgJeonsePrice: 4.0,
            recentJeonsePrice: 4.2,
          },
        ],
      },
    ],
  },
  {
    district: "금천구",
    avgPrice: 7.2,
    recentPrice: 7.5,
    avgJeonsePrice: 4.0,
    recentJeonsePrice: 4.2,
    dongs: [
      {
        dong: "독산동",
        avgPrice: 7.8,
        recentPrice: 8.1,
        avgJeonsePrice: 4.3,
        recentJeonsePrice: 4.5,
        apts: [
          {
            name: "롯데캐슬골드파크1차",
            avgPrice: 8.5,
            recentPrice: 8.9,
            avgJeonsePrice: 4.8,
            recentJeonsePrice: 5.0,
          },
        ],
      },
      {
        dong: "시흥동",
        avgPrice: 6.5,
        recentPrice: 6.8,
        avgJeonsePrice: 3.6,
        recentJeonsePrice: 3.8,
        apts: [
          {
            name: "남서울힐스테이트",
            avgPrice: 7.2,
            recentPrice: 7.5,
            avgJeonsePrice: 4.0,
            recentJeonsePrice: 4.2,
          },
        ],
      },
      {
        dong: "가산동",
        avgPrice: 7.0,
        recentPrice: 7.3,
        avgJeonsePrice: 3.9,
        recentJeonsePrice: 4.1,
        apts: [
          {
            name: "가산두산아파트",
            avgPrice: 6.8,
            recentPrice: 7.1,
            avgJeonsePrice: 3.8,
            recentJeonsePrice: 4.0,
          },
        ],
      },
    ],
  },
  {
    district: "관악구",
    avgPrice: 8.0,
    recentPrice: 8.3,
    avgJeonsePrice: 4.4,
    recentJeonsePrice: 4.6,
    dongs: [
      {
        dong: "봉천동",
        avgPrice: 8.2,
        recentPrice: 8.5,
        avgJeonsePrice: 4.5,
        recentJeonsePrice: 4.7,
        apts: [
          {
            name: "e편한세상서울대입구",
            avgPrice: 9.8,
            recentPrice: 10.2,
            avgJeonsePrice: 5.5,
            recentJeonsePrice: 5.8,
          },
          {
            name: "관악드림타운",
            avgPrice: 7.5,
            recentPrice: 7.8,
            avgJeonsePrice: 4.0,
            recentJeonsePrice: 4.2,
          },
        ],
      },
      {
        dong: "신림동",
        avgPrice: 7.5,
        recentPrice: 7.8,
        avgJeonsePrice: 4.1,
        recentJeonsePrice: 4.3,
        apts: [
          {
            name: "신림푸르지오1차",
            avgPrice: 8.2,
            recentPrice: 8.5,
            avgJeonsePrice: 4.5,
            recentJeonsePrice: 4.7,
          },
        ],
      },
      {
        dong: "남현동",
        avgPrice: 9.0,
        recentPrice: 9.4,
        avgJeonsePrice: 5.0,
        recentJeonsePrice: 5.2,
        apts: [
          {
            name: "남현예술마을아파트",
            avgPrice: 8.8,
            recentPrice: 9.1,
            avgJeonsePrice: 4.8,
            recentJeonsePrice: 5.0,
          },
        ],
      },
    ],
  },
  {
    district: "강북구",
    avgPrice: 6.8,
    recentPrice: 7.1,
    avgJeonsePrice: 3.8,
    recentJeonsePrice: 4.0,
    dongs: [
      {
        dong: "미아동",
        avgPrice: 7.2,
        recentPrice: 7.5,
        avgJeonsePrice: 4.0,
        recentJeonsePrice: 4.2,
        apts: [
          {
            name: "SK북한산시티",
            avgPrice: 7.2,
            recentPrice: 7.5,
            avgJeonsePrice: 4.0,
            recentJeonsePrice: 4.2,
          },
          {
            name: "꿈의숲롯데캐슬",
            avgPrice: 8.5,
            recentPrice: 8.8,
            avgJeonsePrice: 4.8,
            recentJeonsePrice: 5.0,
          },
        ],
      },
      {
        dong: "번동",
        avgPrice: 6.2,
        recentPrice: 6.5,
        avgJeonsePrice: 3.5,
        recentJeonsePrice: 3.7,
        apts: [
          {
            name: "번동주공1단지",
            avgPrice: 6.0,
            recentPrice: 6.3,
            avgJeonsePrice: 3.3,
            recentJeonsePrice: 3.5,
          },
        ],
      },
      {
        dong: "수유동",
        avgPrice: 6.5,
        recentPrice: 6.8,
        avgJeonsePrice: 3.6,
        recentJeonsePrice: 3.8,
        apts: [
          {
            name: "수유벽산아파트",
            avgPrice: 6.5,
            recentPrice: 6.8,
            avgJeonsePrice: 3.6,
            recentJeonsePrice: 3.8,
          },
        ],
      },
    ],
  },
  {
    district: "도봉구",
    avgPrice: 6.2,
    recentPrice: 6.5,
    avgJeonsePrice: 3.5,
    recentJeonsePrice: 3.7,
    dongs: [
      {
        dong: "창동",
        avgPrice: 6.8,
        recentPrice: 7.1,
        avgJeonsePrice: 3.8,
        recentJeonsePrice: 4.0,
        apts: [
          {
            name: "창동주공19단지",
            avgPrice: 7.2,
            recentPrice: 7.5,
            avgJeonsePrice: 4.0,
            recentJeonsePrice: 4.2,
          },
          {
            name: "창동동아아파트",
            avgPrice: 7.8,
            recentPrice: 8.1,
            avgJeonsePrice: 4.3,
            recentJeonsePrice: 4.5,
          },
        ],
      },
      {
        dong: "방학동",
        avgPrice: 5.8,
        recentPrice: 6.1,
        avgJeonsePrice: 3.2,
        recentJeonsePrice: 3.4,
        apts: [
          {
            name: "방학성원아파트",
            avgPrice: 5.8,
            recentPrice: 6.1,
            avgJeonsePrice: 3.2,
            recentJeonsePrice: 3.4,
          },
        ],
      },
      {
        dong: "쌍문동",
        avgPrice: 5.5,
        recentPrice: 5.8,
        avgJeonsePrice: 3.1,
        recentJeonsePrice: 3.3,
        apts: [
          {
            name: "쌍문한양1차",
            avgPrice: 5.5,
            recentPrice: 5.8,
            avgJeonsePrice: 3.1,
            recentJeonsePrice: 3.3,
          },
        ],
      },
    ],
  },
  {
    district: "중랑구",
    avgPrice: 7.5,
    recentPrice: 7.8,
    avgJeonsePrice: 4.1,
    recentJeonsePrice: 4.3,
    dongs: [
      {
        dong: "망우동",
        avgPrice: 7.0,
        recentPrice: 7.3,
        avgJeonsePrice: 3.8,
        recentJeonsePrice: 4.0,
        apts: [
          {
            name: "망우동금호어울림",
            avgPrice: 7.2,
            recentPrice: 7.5,
            avgJeonsePrice: 3.9,
            recentJeonsePrice: 4.1,
          },
        ],
      },
      {
        dong: "면목동",
        avgPrice: 6.8,
        recentPrice: 7.1,
        avgJeonsePrice: 3.7,
        recentJeonsePrice: 3.9,
        apts: [
          {
            name: "면목라온프라이빗",
            avgPrice: 7.8,
            recentPrice: 8.1,
            avgJeonsePrice: 4.2,
            recentJeonsePrice: 4.4,
          },
        ],
      },
      {
        dong: "묵동",
        avgPrice: 7.5,
        recentPrice: 7.8,
        avgJeonsePrice: 4.0,
        recentJeonsePrice: 4.2,
        apts: [
          {
            name: "묵동자이",
            avgPrice: 8.2,
            recentPrice: 8.6,
            avgJeonsePrice: 4.5,
            recentJeonsePrice: 4.7,
          },
        ],
      },
      {
        dong: "상봉동",
        avgPrice: 8.0,
        recentPrice: 8.3,
        avgJeonsePrice: 4.4,
        recentJeonsePrice: 4.6,
        apts: [
          {
            name: "상봉프레미어스엠코",
            avgPrice: 9.0,
            recentPrice: 9.4,
            avgJeonsePrice: 5.0,
            recentJeonsePrice: 5.2,
          },
        ],
      },
      {
        dong: "신내동",
        avgPrice: 7.2,
        recentPrice: 7.5,
        avgJeonsePrice: 4.0,
        recentJeonsePrice: 4.2,
        apts: [
          {
            name: "신내데시앙",
            avgPrice: 7.5,
            recentPrice: 7.8,
            avgJeonsePrice: 4.1,
            recentJeonsePrice: 4.3,
          },
        ],
      },
      {
        dong: "중화동",
        avgPrice: 7.2,
        recentPrice: 7.5,
        avgJeonsePrice: 3.9,
        recentJeonsePrice: 4.1,
        apts: [
          {
            name: "중화한신아파트",
            avgPrice: 7.2,
            recentPrice: 7.5,
            avgJeonsePrice: 3.9,
            recentJeonsePrice: 4.1,
          },
        ],
      },
    ],
  },
];

/* 자치구 목록 (가나다 오름차순 정렬) */
const DISTRICT_NAMES = SEOUL_DATA.map((d) => d.district).sort((a, b) =>
  a.localeCompare(b, "ko"),
);

/* 기본값 선언 */
interface MetricResult {
  avgPrice: number;
  recentPrice: number;
  avgJeonsePrice: number;
  recentJeonsePrice: number;
}

/* 억 원 숫자를 한글 금액 표현(예: 15억 5,000만 원)으로 정밀 변환하는 유틸리티 */
const formatPriceKRW = (priceInEok: number) => {
  const eok = Math.floor(priceInEok);
  const remainderMan = Math.round((priceInEok - eok) * 10000);
  if (remainderMan === 0) return `${eok}억 원`;
  return `${eok}억 ${remainderMan.toLocaleString()}만 원`;
};

/* 시세 및 비교 리포트 통계 계산 함수 */
const getMetrics = (
  district: string,
  dong: string,
  apt: string,
): MetricResult => {
  const distData = SEOUL_DATA.find((d) => d.district === district);
  if (!distData) {
    return {
      avgPrice: 15.0,
      recentPrice: 15.5,
      avgJeonsePrice: 8.0,
      recentJeonsePrice: 8.3,
    };
  }

  if (dong !== "전체") {
    const dongData = distData.dongs.find((d) => d.dong === dong);
    if (dongData) {
      if (apt !== "전체") {
        const aptData = dongData.apts.find((a) => a.name === apt);
        if (aptData) {
          return {
            avgPrice: aptData.avgPrice,
            recentPrice: aptData.recentPrice,
            avgJeonsePrice: aptData.avgJeonsePrice,
            recentJeonsePrice: aptData.recentJeonsePrice,
          };
        }
      }
      return {
        avgPrice: dongData.avgPrice,
        recentPrice: dongData.recentPrice,
        avgJeonsePrice: dongData.avgJeonsePrice,
        recentJeonsePrice: dongData.recentJeonsePrice,
      };
    }
  }

  return {
    avgPrice: distData.avgPrice,
    recentPrice: distData.recentPrice,
    avgJeonsePrice: distData.avgJeonsePrice,
    recentJeonsePrice: distData.recentJeonsePrice,
  };
};

/* 백엔드 API 연동을 대비한 비동기 API 수신 시뮬레이션 함수 */
async function fetchPriceCompareMetricsApi(
  region1: { district: string; dong: string; apt: string },
  region2: { district: string; dong: string; apt: string },
): Promise<{ r1: MetricResult; r2: MetricResult }> {
  // 백엔드 REST API 연동 시 fetch('/api/price-compare', ...)로 대체
  return new Promise((resolve) => {
    setTimeout(() => {
      const r1 = getMetrics(region1.district, region1.dong, region1.apt);
      const r2 = getMetrics(region2.district, region2.dong, region2.apt);
      resolve({ r1, r2 });
    }, 450);
  });
}

/* 기본값 선언 */
const DEFAULT_REGION1 = {
  district: "강남구",
  dong: "전체",
  apt: "전체",
};

const DEFAULT_REGION2 = {
  district: "서초구",
  dong: "전체",
  apt: "전체",
};

export default function PriceCompareListPage() {
  /* 비교 실행 여부 및 로딩 상태 */
  const [hasCompared, setHasCompared] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  /* 지역 1 선택 상태 */
  const [r1District, setR1District] = useState(DEFAULT_REGION1.district);
  const [r1Dong, setR1Dong] = useState(DEFAULT_REGION1.dong);
  const [r1Apt, setR1Apt] = useState(DEFAULT_REGION1.apt);

  /* 지역 2 선택 상태 */
  const [r2District, setR2District] = useState(DEFAULT_REGION2.district);
  const [r2Dong, setR2Dong] = useState(DEFAULT_REGION2.dong);
  const [r2Apt, setR2Apt] = useState(DEFAULT_REGION2.apt);

  /* 현재 적용된 비교 상태 */
  const [appliedR1, setAppliedR1] = useState(DEFAULT_REGION1);
  const [appliedR2, setAppliedR2] = useState(DEFAULT_REGION2);

  /* 비교 통계 결과 상태 (비동기 연동 수신) */
  const [r1Metrics, setR1Metrics] = useState<MetricResult>(() =>
    getMetrics(
      DEFAULT_REGION1.district,
      DEFAULT_REGION1.dong,
      DEFAULT_REGION1.apt,
    ),
  );
  const [r2Metrics, setR2Metrics] = useState<MetricResult>(() =>
    getMetrics(
      DEFAULT_REGION2.district,
      DEFAULT_REGION2.dong,
      DEFAULT_REGION2.apt,
    ),
  );

  /* -------------------------------------------------------------------------- */
  /* 드롭다운 옵션 동적 도출 (가나다 오름차순 정렬 적용)                        */
  /* -------------------------------------------------------------------------- */

  // 지역 1 동 목록
  const r1DongOptions = useMemo(() => {
    const found = SEOUL_DATA.find((d) => d.district === r1District);
    if (!found) return ["전체"];
    const dongs = [...found.dongs.map((d) => d.dong)].sort((a, b) =>
      a.localeCompare(b, "ko"),
    );
    return ["전체", ...dongs];
  }, [r1District]);

  // 지역 1 아파트 목록
  const r1AptOptions = useMemo(() => {
    const dist = SEOUL_DATA.find((d) => d.district === r1District);
    if (!dist) return ["전체"];
    if (r1Dong === "전체") {
      const allApts = dist.dongs.flatMap((d) => d.apts.map((a) => a.name));
      const sortedApts = Array.from(new Set(allApts)).sort((a, b) =>
        a.localeCompare(b, "ko"),
      );
      return ["전체", ...sortedApts];
    }
    const dongData = dist.dongs.find((d) => d.dong === r1Dong);
    if (!dongData) return ["전체"];
    const apts = [...dongData.apts.map((a) => a.name)].sort((a, b) =>
      a.localeCompare(b, "ko"),
    );
    return ["전체", ...apts];
  }, [r1District, r1Dong]);

  // 지역 2 동 목록
  const r2DongOptions = useMemo(() => {
    const found = SEOUL_DATA.find((d) => d.district === r2District);
    if (!found) return ["전체"];
    const dongs = [...found.dongs.map((d) => d.dong)].sort((a, b) =>
      a.localeCompare(b, "ko"),
    );
    return ["전체", ...dongs];
  }, [r2District]);

  // 지역 2 아파트 목록
  const r2AptOptions = useMemo(() => {
    const dist = SEOUL_DATA.find((d) => d.district === r2District);
    if (!dist) return ["전체"];
    if (r2Dong === "전체") {
      const allApts = dist.dongs.flatMap((d) => d.apts.map((a) => a.name));
      const sortedApts = Array.from(new Set(allApts)).sort((a, b) =>
        a.localeCompare(b, "ko"),
      );
      return ["전체", ...sortedApts];
    }
    const dongData = dist.dongs.find((d) => d.dong === r2Dong);
    if (!dongData) return ["전체"];
    const apts = [...dongData.apts.map((a) => a.name)].sort((a, b) =>
      a.localeCompare(b, "ko"),
    );
    return ["전체", ...apts];
  }, [r2District, r2Dong]);

  /* -------------------------------------------------------------------------- */
  /* 핸들러: 선택값 변경 시 하위 옵션 자동 리셋                               */
  /* -------------------------------------------------------------------------- */

  const handleR1DistrictChange = (val: string) => {
    setR1District(val);
    setR1Dong("전체");
    setR1Apt("전체");
  };

  const handleR1DongChange = (val: string) => {
    setR1Dong(val);
    setR1Apt("전체");
  };

  const handleR2DistrictChange = (val: string) => {
    setR2District(val);
    setR2Dong("전체");
    setR2Apt("전체");
  };

  const handleR2DongChange = (val: string) => {
    setR2Dong(val);
    setR2Apt("전체");
  };

  /* 초기화 버튼 클릭 */
  const handleReset = () => {
    setR1District(DEFAULT_REGION1.district);
    setR1Dong("전체");
    setR1Apt("전체");

    setR2District(DEFAULT_REGION2.district);
    setR2Dong("전체");
    setR2Apt("전체");

    setHasCompared(false);
    setIsLoading(false);
    setAppliedR1(DEFAULT_REGION1);
    setAppliedR2(DEFAULT_REGION2);
  };

  /* 비교하기 버튼 클릭 (비동기 백엔드 API 연동 구조) */
  const handleCompare = async () => {
    setIsLoading(true);
    const newAppliedR1 = { district: r1District, dong: r1Dong, apt: r1Apt };
    const newAppliedR2 = { district: r2District, dong: r2Dong, apt: r2Apt };

    setAppliedR1(newAppliedR1);
    setAppliedR2(newAppliedR2);

    try {
      const res = await fetchPriceCompareMetricsApi(newAppliedR1, newAppliedR2);
      setR1Metrics(res.r1);
      setR2Metrics(res.r2);
      setHasCompared(true);
    } catch (err) {
      console.error("Failed to fetch compare metrics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  /* 라벨 라우팅 */
  const r1Label = `${appliedR1.district} ${appliedR1.dong}${
    appliedR1.apt !== "전체" ? ` / ${appliedR1.apt}` : ""
  }`;
  const r2Label = `${appliedR2.district} ${appliedR2.dong}${
    appliedR2.apt !== "전체" ? ` / ${appliedR2.apt}` : ""
  }`;

  /* 차이 계산 */
  const avgDiff = Math.abs(r1Metrics.avgPrice - r2Metrics.avgPrice).toFixed(1);
  const recentDiff = Math.abs(
    r1Metrics.recentPrice - r2Metrics.recentPrice,
  ).toFixed(1);
  const avgJeonseDiff = Math.abs(
    r1Metrics.avgJeonsePrice - r2Metrics.avgJeonsePrice,
  ).toFixed(1);

  const getDiffText = (val1: number, val2: number, diff: string) => {
    if (val1 > val2) return `지역1이 ${diff}억 높음`;
    if (val1 < val2) return `지역2가 ${diff}억 높음`;
    return "동일함";
  };

  const avgDiffText = getDiffText(
    r1Metrics.avgPrice,
    r2Metrics.avgPrice,
    avgDiff,
  );
  const recentDiffText = getDiffText(
    r1Metrics.recentPrice,
    r2Metrics.recentPrice,
    recentDiff,
  );
  const avgJeonseDiffText = getDiffText(
    r1Metrics.avgJeonsePrice,
    r2Metrics.avgJeonsePrice,
    avgJeonseDiff,
  );

  /* 그래프 비율 계산 */
  const maxAvgPrice = Math.max(r1Metrics.avgPrice, r2Metrics.avgPrice, 10);
  const r1AvgWidth = `${Math.min(100, Math.max(15, (r1Metrics.avgPrice / maxAvgPrice) * 100))}%`;
  const r2AvgWidth = `${Math.min(100, Math.max(15, (r2Metrics.avgPrice / maxAvgPrice) * 100))}%`;

  const maxAvgJeonse = Math.max(
    r1Metrics.avgJeonsePrice,
    r2Metrics.avgJeonsePrice,
    5,
  );
  const r1JeonseWidth = `${Math.min(100, Math.max(15, (r1Metrics.avgJeonsePrice / maxAvgJeonse) * 100))}%`;
  const r2JeonseWidth = `${Math.min(100, Math.max(15, (r2Metrics.avgJeonsePrice / maxAvgJeonse) * 100))}%`;

  return (
    <div className={cn("tw-scope", "min-h-screen", "bg-[#F8FAFC]")}>
      <main className={cn("py-8")}>
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
          {/* ------------------------------------------------------------------ */}
          {/* 좌측 사이드바                                                     */}
          {/* ------------------------------------------------------------------ */}
          <aside className={cn("w-[240px]", "shrink-0", "max-[900px]:w-full")}>
            <div
              className={cn(
                "sticky",
                "top-[96px]",
                "rounded-[16px]",
                "border",
                "border-[#E2E8F0]",
                "bg-white",
                "p-5",
                "shadow-[0_4px_20px_rgba(15,23,42,0.04)]",
              )}
            >
              <h2
                className={cn(
                  "mb-4",
                  "text-[16px]",
                  "font-black",
                  "text-[#0F172A]",
                )}
              >
                가격정보
              </h2>

              <nav className={cn("flex", "flex-col", "gap-1")}>
                <Link
                  to="/price/compare-list"
                  className={cn(
                    "flex",
                    "items-center",
                    "gap-2.5",
                    "rounded-[10px]",
                    "bg-[#E8F6F9]",
                    "px-3.5",
                    "py-3",
                    "text-[13px]",
                    "font-extrabold",
                    "text-[#0F8AA8]",
                    "no-underline",
                    "transition-colors",
                  )}
                >
                  <BarChart3 className="size-4" />
                  <span>지역별 비교(리스트)</span>
                </Link>

                <Link
                  to="/price"
                  className={cn(
                    "flex",
                    "items-center",
                    "gap-2.5",
                    "rounded-[10px]",
                    "px-3.5",
                    "py-3",
                    "text-[13px]",
                    "font-semibold",
                    "text-[#64748B]",
                    "no-underline",
                    "transition-colors",
                    "hover:bg-[#F1F5F9]",
                    "hover:text-[#0F172A]",
                  )}
                >
                  <Map className="size-4" />
                  <span>지역별 비교(지도)</span>
                </Link>

                <Link
                  to="/price"
                  className={cn(
                    "flex",
                    "items-center",
                    "gap-2.5",
                    "rounded-[10px]",
                    "px-3.5",
                    "py-3",
                    "text-[13px]",
                    "font-semibold",
                    "text-[#64748B]",
                    "no-underline",
                    "transition-colors",
                    "hover:bg-[#F1F5F9]",
                    "hover:text-[#0F172A]",
                  )}
                >
                  <Building2 className="size-4" />
                  <span>단지별 시세</span>
                </Link>
              </nav>

              {/* 이용 가이드 박스 */}
              <div
                className={cn(
                  "mt-6",
                  "rounded-[12px]",
                  "border",
                  "border-[#E2E8F0]",
                  "bg-[#F8FAFC]",
                  "p-4",
                )}
              >
                <div
                  className={cn(
                    "mb-1.5",
                    "flex",
                    "items-center",
                    "gap-1.5",
                    "text-[12px]",
                    "font-bold",
                    "text-[#475569]",
                  )}
                >
                  <HelpCircle className={cn("size-3.5", "text-[#0F8AA8]")} />
                  <span>이용 가이드</span>
                </div>
                <p
                  className={cn(
                    "text-[11px]",
                    "leading-relaxed",
                    "text-[#64748B]",
                  )}
                >
                  비교할 두 지역을 선택하고 &apos;비교하기&apos; 버튼을
                  눌러보세요. 매매 및 전세 시세 차이와 거래 흐름을 한눈에 확인할
                  수 있습니다.
                </p>
              </div>
            </div>
          </aside>

          {/* ------------------------------------------------------------------ */}
          {/* 메인 콘텐츠 영역                                                  */}
          {/* ------------------------------------------------------------------ */}
          <section className={cn("min-w-0", "flex-1")}>
            {/* 타이틀 및 초기화 버튼 */}
            <div
              className={cn("mb-6", "flex", "items-start", "justify-between")}
            >
              <div>
                <h1
                  className={cn("text-[24px]", "font-black", "text-[#0F172A]")}
                >
                  지역별 비교(리스트)
                </h1>
                <p
                  className={cn(
                    "mt-1",
                    "text-[13px]",
                    "font-medium",
                    "text-[#64748B]",
                  )}
                >
                  자치구, 자치동, 아파트단지까지 선택하여 두 지역의 매매/전세
                  시세를 비교해보세요.
                </p>
              </div>

              {/* 초기화 버튼 */}
              <button
                type="button"
                onClick={handleReset}
                className={cn(
                  "flex",
                  "items-center",
                  "gap-1.5",
                  "rounded-[10px]",
                  "border",
                  "border-[#CBD5E1]",
                  "bg-white",
                  "px-3.5",
                  "py-2",
                  "text-[12px]",
                  "font-bold",
                  "text-[#475569]",
                  "shadow-sm",
                  "transition-all",
                  "hover:border-[#0F8AA8]",
                  "hover:bg-[#F8FAFC]",
                  "hover:text-[#0F8AA8]",
                )}
              >
                <RotateCcw className="size-3.5" />
                <span>초기화</span>
              </button>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* 지역 1 vs 지역 2 선택 카드                                        */}
            {/* ---------------------------------------------------------------- */}
            <div
              className={cn(
                "mb-8",
                "rounded-[20px]",
                "border",
                "border-[#E2E8F0]",
                "bg-white",
                "p-6",
                "shadow-[0_4px_24px_rgba(15,23,42,0.04)]",
              )}
            >
              <div
                className={cn(
                  "grid",
                  "grid-cols-[1fr_auto_1fr_auto]",
                  "items-center",
                  "gap-6",
                  "max-[1100px]:grid-cols-1",
                )}
              >
                {/* 지역 1 (Blue) */}
                <div
                  className={cn(
                    "rounded-[16px]",
                    "border",
                    "border-[#2563EB]/20",
                    "bg-[#F0F6FF]",
                    "p-5",
                  )}
                >
                  <div
                    className={cn(
                      "mb-4",
                      "inline-flex",
                      "items-center",
                      "gap-1.5",
                      "rounded-full",
                      "bg-[#2563EB]",
                      "px-3",
                      "py-1",
                      "text-[11px]",
                      "font-black",
                      "text-white",
                    )}
                  >
                    지역 1
                  </div>

                  <div className={cn("flex", "flex-col", "gap-3")}>
                    <div
                      className={cn(
                        "grid",
                        "grid-cols-[80px_1fr]",
                        "items-center",
                        "gap-2",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[13px]",
                          "font-bold",
                          "text-[#475569]",
                        )}
                      >
                        자치구
                      </span>
                      <select
                        value={r1District}
                        onChange={(e) => handleR1DistrictChange(e.target.value)}
                        className={cn(
                          "h-10",
                          "rounded-[8px]",
                          "border",
                          "border-[#CBD5E1]",
                          "bg-white",
                          "px-3",
                          "text-[13px]",
                          "font-semibold",
                          "text-[#0F172A]",
                          "outline-none",
                          "focus:border-[#2563EB]",
                        )}
                      >
                        {DISTRICT_NAMES.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div
                      className={cn(
                        "grid",
                        "grid-cols-[80px_1fr]",
                        "items-center",
                        "gap-2",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[13px]",
                          "font-bold",
                          "text-[#475569]",
                        )}
                      >
                        자치동
                      </span>
                      <select
                        value={r1Dong}
                        onChange={(e) => handleR1DongChange(e.target.value)}
                        className={cn(
                          "h-10",
                          "rounded-[8px]",
                          "border",
                          "border-[#CBD5E1]",
                          "bg-white",
                          "px-3",
                          "text-[13px]",
                          "font-semibold",
                          "text-[#0F172A]",
                          "outline-none",
                          "focus:border-[#2563EB]",
                        )}
                      >
                        {r1DongOptions.map((dong) => (
                          <option key={dong} value={dong}>
                            {dong}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div
                      className={cn(
                        "grid",
                        "grid-cols-[80px_1fr]",
                        "items-center",
                        "gap-2",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[13px]",
                          "font-bold",
                          "text-[#475569]",
                        )}
                      >
                        아파트단지
                      </span>
                      <select
                        value={r1Apt}
                        onChange={(e) => setR1Apt(e.target.value)}
                        className={cn(
                          "h-10",
                          "rounded-[8px]",
                          "border",
                          "border-[#CBD5E1]",
                          "bg-white",
                          "px-3",
                          "text-[13px]",
                          "font-semibold",
                          "text-[#0F172A]",
                          "outline-none",
                          "focus:border-[#2563EB]",
                        )}
                      >
                        {r1AptOptions.map((apt) => (
                          <option key={apt} value={apt}>
                            {apt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* VS 구분선 */}
                <div className={cn("flex", "items-center", "justify-center")}>
                  <div
                    className={cn(
                      "flex",
                      "size-11",
                      "items-center",
                      "justify-center",
                      "rounded-full",
                      "border",
                      "border-[#E2E8F0]",
                      "bg-white",
                      "font-black",
                      "text-[#94A3B8]",
                      "shadow-sm",
                    )}
                  >
                    VS
                  </div>
                </div>

                {/* 지역 2 (Green) */}
                <div
                  className={cn(
                    "rounded-[16px]",
                    "border",
                    "border-[#16A34A]/20",
                    "bg-[#F0FDF4]",
                    "p-5",
                  )}
                >
                  <div
                    className={cn(
                      "mb-4",
                      "inline-flex",
                      "items-center",
                      "gap-1.5",
                      "rounded-full",
                      "bg-[#16A34A]",
                      "px-3",
                      "py-1",
                      "text-[11px]",
                      "font-black",
                      "text-white",
                    )}
                  >
                    지역 2
                  </div>

                  <div className={cn("flex", "flex-col", "gap-3")}>
                    <div
                      className={cn(
                        "grid",
                        "grid-cols-[80px_1fr]",
                        "items-center",
                        "gap-2",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[13px]",
                          "font-bold",
                          "text-[#475569]",
                        )}
                      >
                        자치구
                      </span>
                      <select
                        value={r2District}
                        onChange={(e) => handleR2DistrictChange(e.target.value)}
                        className={cn(
                          "h-10",
                          "rounded-[8px]",
                          "border",
                          "border-[#CBD5E1]",
                          "bg-white",
                          "px-3",
                          "text-[13px]",
                          "font-semibold",
                          "text-[#0F172A]",
                          "outline-none",
                          "focus:border-[#16A34A]",
                        )}
                      >
                        {DISTRICT_NAMES.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div
                      className={cn(
                        "grid",
                        "grid-cols-[80px_1fr]",
                        "items-center",
                        "gap-2",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[13px]",
                          "font-bold",
                          "text-[#475569]",
                        )}
                      >
                        자치동
                      </span>
                      <select
                        value={r2Dong}
                        onChange={(e) => handleR2DongChange(e.target.value)}
                        className={cn(
                          "h-10",
                          "rounded-[8px]",
                          "border",
                          "border-[#CBD5E1]",
                          "bg-white",
                          "px-3",
                          "text-[13px]",
                          "font-semibold",
                          "text-[#0F172A]",
                          "outline-none",
                          "focus:border-[#16A34A]",
                        )}
                      >
                        {r2DongOptions.map((dong) => (
                          <option key={dong} value={dong}>
                            {dong}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div
                      className={cn(
                        "grid",
                        "grid-cols-[80px_1fr]",
                        "items-center",
                        "gap-2",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[13px]",
                          "font-bold",
                          "text-[#475569]",
                        )}
                      >
                        아파트단지
                      </span>
                      <select
                        value={r2Apt}
                        onChange={(e) => setR2Apt(e.target.value)}
                        className={cn(
                          "h-10",
                          "rounded-[8px]",
                          "border",
                          "border-[#CBD5E1]",
                          "bg-white",
                          "px-3",
                          "text-[13px]",
                          "font-semibold",
                          "text-[#0F172A]",
                          "outline-none",
                          "focus:border-[#16A34A]",
                        )}
                      >
                        {r2AptOptions.map((apt) => (
                          <option key={apt} value={apt}>
                            {apt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 비교하기 버튼 */}
                <div
                  className={cn(
                    "flex",
                    "flex-col",
                    "items-center",
                    "justify-center",
                    "text-center",
                  )}
                >
                  <button
                    type="button"
                    onClick={handleCompare}
                    disabled={isLoading}
                    className={cn(
                      "flex",
                      "h-[110px]",
                      "w-full",
                      "max-w-[140px]",
                      "flex-col",
                      "items-center",
                      "justify-center",
                      "gap-2.5",
                      "rounded-[16px]",
                      "border",
                      "border-[#0B5E73]",
                      "bg-gradient-to-b",
                      "from-[#0F8AA8]",
                      "to-[#0B5E73]",
                      "p-4",
                      "text-white",
                      "shadow-[0_8px_20px_rgba(15,138,168,0.25)]",
                      "transition-all",
                      "hover:-translate-y-0.5",
                      "hover:shadow-[0_12px_25px_rgba(15,138,168,0.35)]",
                      "active:translate-y-0",
                      "disabled:pointer-events-none",
                      "disabled:opacity-80",
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className={cn("size-6", "animate-spin")} />
                    ) : (
                      <BarChart3 className={cn("size-6", "stroke-[2.2]")} />
                    )}
                    <span
                      className={cn(
                        "text-[14px]",
                        "font-black",
                        "tracking-tight",
                      )}
                    >
                      {isLoading ? "조회 중..." : "비교하기"}
                    </span>
                  </button>
                  <p
                    className={cn(
                      "mt-3",
                      "text-[11px]",
                      "leading-tight",
                      "text-[#94A3B8]",
                    )}
                  >
                    선택한 지역의 시세 정보를 기반으로 비교 리포트가 제공됩니다.
                  </p>
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* 비교 리포트 영역                                                */}
            {/* ---------------------------------------------------------------- */}
            {isLoading ? (
              /* 로딩 중 스켈레톤 UI (Skeleton Loader) */
              <div className={cn("flex", "flex-col", "gap-6", "animate-pulse")}>
                <div
                  className={cn(
                    "grid",
                    "grid-cols-[1fr_340px]",
                    "gap-6",
                    "max-[1100px]:grid-cols-1",
                  )}
                >
                  <div
                    className={cn(
                      "h-[280px]",
                      "rounded-[20px]",
                      "border",
                      "border-[#E2E8F0]",
                      "bg-white",
                      "p-6",
                      "shadow-[0_4px_24px_rgba(15,23,42,0.04)]",
                    )}
                  >
                    <div
                      className={cn(
                        "mb-4",
                        "h-6",
                        "w-1/3",
                        "rounded-md",
                        "bg-[#F1F5F9]",
                      )}
                    />
                    <div
                      className={cn(
                        "h-[180px]",
                        "w-full",
                        "rounded-xl",
                        "bg-[#F8FAFC]",
                      )}
                    />
                  </div>
                  <div
                    className={cn(
                      "h-[280px]",
                      "rounded-[20px]",
                      "border",
                      "border-[#E2E8F0]",
                      "bg-white",
                      "p-6",
                      "shadow-[0_4px_24px_rgba(15,23,42,0.04)]",
                    )}
                  >
                    <div
                      className={cn(
                        "mb-4",
                        "h-6",
                        "w-1/2",
                        "rounded-md",
                        "bg-[#F1F5F9]",
                      )}
                    />
                    <div className={cn("flex", "flex-col", "gap-3")}>
                      <div
                        className={cn(
                          "h-14",
                          "w-full",
                          "rounded-lg",
                          "bg-[#F8FAFC]",
                        )}
                      />
                      <div
                        className={cn(
                          "h-14",
                          "w-full",
                          "rounded-lg",
                          "bg-[#F8FAFC]",
                        )}
                      />
                      <div
                        className={cn(
                          "h-16",
                          "w-full",
                          "rounded-lg",
                          "bg-[#F8FAFC]",
                        )}
                      />
                    </div>
                  </div>
                </div>
                <div
                  className={cn(
                    "grid",
                    "grid-cols-2",
                    "gap-6",
                    "max-[900px]:grid-cols-1",
                  )}
                >
                  <div
                    className={cn(
                      "h-[180px]",
                      "rounded-[20px]",
                      "border",
                      "border-[#E2E8F0]",
                      "bg-white",
                      "p-6",
                    )}
                  />
                  <div
                    className={cn(
                      "h-[180px]",
                      "rounded-[20px]",
                      "border",
                      "border-[#E2E8F0]",
                      "bg-white",
                      "p-6",
                    )}
                  />
                </div>
              </div>
            ) : !hasCompared ? (
              <div
                className={cn(
                  "rounded-[20px]",
                  "border",
                  "border-[#E2E8F0]",
                  "bg-white",
                  "p-12",
                  "shadow-[0_4px_24px_rgba(15,23,42,0.04)]",
                )}
              >
                <div
                  className={cn(
                    "flex",
                    "flex-col",
                    "items-center",
                    "justify-center",
                    "text-center",
                  )}
                >
                  <div
                    className={cn(
                      "mb-4",
                      "flex",
                      "size-16",
                      "items-center",
                      "justify-center",
                      "rounded-full",
                      "bg-[#E8F6F9]",
                      "text-[#0F8AA8]",
                    )}
                  >
                    <BarChart3 className="size-8" />
                  </div>
                  <h3
                    className={cn(
                      "text-[18px]",
                      "font-black",
                      "text-[#0F172A]",
                    )}
                  >
                    비교할 지역을 선택하고 &apos;비교하기&apos; 버튼을
                    눌러주세요
                  </h3>
                  <p
                    className={cn(
                      "mt-2",
                      "max-w-[420px]",
                      "text-[13px]",
                      "font-medium",
                      "text-[#64748B]",
                      "leading-relaxed",
                    )}
                  >
                    상단 드롭다운에서 두 지역(자치구, 자치동, 아파트단지)을
                    지정한 뒤
                    <br />
                    <span className={cn("font-extrabold", "text-[#0F8AA8]")}>
                      &apos;비교하기&apos;
                    </span>{" "}
                    버튼을 클릭하면 실거래 시세 비교 표와 그래프가 나타납니다.
                  </p>
                </div>
              </div>
            ) : (
              <div className={cn("flex", "flex-col", "gap-6")}>
                {/* -------------------------------------------------------------- */}
                {/* 1. 상단: 비교 리포트 표 (좌) + 한눈에 보는 요약 (우)             */}
                {/* -------------------------------------------------------------- */}
                <div
                  className={cn(
                    "grid",
                    "grid-cols-[1fr_340px]",
                    "gap-6",
                    "max-[1100px]:grid-cols-1",
                  )}
                >
                  {/* 비교 리포트 카드 (표) */}
                  <div
                    className={cn(
                      "flex",
                      "flex-col",
                      "justify-between",
                      "rounded-[20px]",
                      "border",
                      "border-[#E2E8F0]",
                      "bg-white",
                      "p-6",
                      "shadow-[0_4px_24px_rgba(15,23,42,0.04)]",
                    )}
                  >
                    <div>
                      {/* 리포트 헤더 */}
                      <div
                        className={cn(
                          "mb-5",
                          "flex",
                          "items-center",
                          "justify-between",
                          "border-b",
                          "border-[#F1F5F9]",
                          "pb-4",
                        )}
                      >
                        <div className={cn("flex", "items-center", "gap-2")}>
                          <h2
                            className={cn(
                              "text-[18px]",
                              "font-black",
                              "text-[#0F172A]",
                            )}
                          >
                            비교 리포트
                          </h2>
                          <span
                            className={cn(
                              "flex",
                              "items-center",
                              "gap-1",
                              "rounded-full",
                              "bg-[#F1F5F9]",
                              "px-3",
                              "py-1",
                              "text-[11px]",
                              "font-bold",
                              "text-[#64748B]",
                            )}
                          >
                            <Info className={cn("size-3", "text-[#0F8AA8]")} />
                            2024.05.20 기준 (최근 1개월)
                          </span>
                        </div>
                      </div>

                      {/* 비교 표 (평균 매매가 & 최근 실거래가만 배치) */}
                      <div
                        className={cn(
                          "overflow-hidden",
                          "rounded-[14px]",
                          "border",
                          "border-[#E2E8F0]",
                        )}
                      >
                        <table
                          className={cn("w-full", "text-left", "text-[13px]")}
                        >
                          <thead>
                            <tr
                              className={cn(
                                "border-b",
                                "border-[#E2E8F0]",
                                "bg-[#F8FAFC]",
                              )}
                            >
                              <th
                                className={cn(
                                  "w-[140px]",
                                  "px-5",
                                  "py-3.5",
                                  "font-bold",
                                  "text-[#475569]",
                                )}
                              >
                                항목
                              </th>
                              <th
                                className={cn(
                                  "px-5",
                                  "py-3.5",
                                  "font-extrabold",
                                  "text-[#2563EB]",
                                )}
                              >
                                <span
                                  className={cn(
                                    "mr-2",
                                    "inline-block",
                                    "size-2",
                                    "rounded-full",
                                    "bg-[#2563EB]",
                                  )}
                                />
                                지역 1{" "}
                                <span
                                  className={cn("font-bold", "text-[#475569]")}
                                >
                                  {r1Label}
                                </span>
                              </th>
                              <th
                                className={cn(
                                  "px-5",
                                  "py-3.5",
                                  "font-extrabold",
                                  "text-[#16A34A]",
                                )}
                              >
                                <span
                                  className={cn(
                                    "mr-2",
                                    "inline-block",
                                    "size-2",
                                    "rounded-full",
                                    "bg-[#16A34A]",
                                  )}
                                />
                                지역 2{" "}
                                <span
                                  className={cn("font-bold", "text-[#475569]")}
                                >
                                  {r2Label}
                                </span>
                              </th>
                              <th
                                className={cn(
                                  "w-[160px]",
                                  "px-5",
                                  "py-3.5",
                                  "font-bold",
                                  "text-[#475569]",
                                )}
                              >
                                비교
                              </th>
                            </tr>
                          </thead>
                          <tbody
                            className={cn(
                              "divide-y",
                              "divide-[#E2E8F0]",
                              "bg-white",
                            )}
                          >
                            {/* 평균 매매가 */}
                            <tr
                              className={cn(
                                "transition-colors",
                                "hover:bg-[#F8FAFC]",
                              )}
                            >
                              <td
                                className={cn(
                                  "flex",
                                  "items-center",
                                  "gap-2",
                                  "px-5",
                                  "py-4",
                                  "font-extrabold",
                                  "text-[#0F172A]",
                                )}
                              >
                                <Building2
                                  className={cn("size-4", "text-[#0F8AA8]")}
                                />
                                평균 매매가
                              </td>
                              <td
                                className={cn(
                                  "px-5",
                                  "py-4",
                                  "font-black",
                                  "text-[#2563EB]",
                                )}
                              >
                                {r1Metrics.avgPrice}억 원
                                <span
                                  className={cn(
                                    "ml-1.5",
                                    "text-[11px]",
                                    "font-normal",
                                    "text-[#64748B]",
                                  )}
                                >
                                  ({formatPriceKRW(r1Metrics.avgPrice)})
                                </span>
                              </td>
                              <td
                                className={cn(
                                  "px-5",
                                  "py-4",
                                  "font-black",
                                  "text-[#16A34A]",
                                )}
                              >
                                {r2Metrics.avgPrice}억 원
                                <span
                                  className={cn(
                                    "ml-1.5",
                                    "text-[11px]",
                                    "font-normal",
                                    "text-[#64748B]",
                                  )}
                                >
                                  ({formatPriceKRW(r2Metrics.avgPrice)})
                                </span>
                              </td>
                              <td className={cn("px-5", "py-4")}>
                                <span
                                  className={cn(
                                    "inline-block",
                                    "rounded-full",
                                    "bg-[#FEE2E2]",
                                    "px-3",
                                    "py-1",
                                    "text-[12px]",
                                    "font-extrabold",
                                    "text-[#DC2626]",
                                  )}
                                >
                                  {avgDiffText}
                                </span>
                              </td>
                            </tr>

                            {/* 최근 실거래가 */}
                            <tr
                              className={cn(
                                "transition-colors",
                                "hover:bg-[#F8FAFC]",
                              )}
                            >
                              <td
                                className={cn(
                                  "flex",
                                  "items-center",
                                  "gap-2",
                                  "px-5",
                                  "py-4",
                                  "font-extrabold",
                                  "text-[#0F172A]",
                                )}
                              >
                                <TrendingUp
                                  className={cn("size-4", "text-[#0F8AA8]")}
                                />
                                최근 실거래가
                              </td>
                              <td
                                className={cn(
                                  "px-5",
                                  "py-4",
                                  "font-black",
                                  "text-[#2563EB]",
                                )}
                              >
                                {r1Metrics.recentPrice}억 원
                                <span
                                  className={cn(
                                    "ml-1.5",
                                    "text-[11px]",
                                    "font-normal",
                                    "text-[#64748B]",
                                  )}
                                >
                                  ({formatPriceKRW(r1Metrics.recentPrice)})
                                </span>
                              </td>
                              <td
                                className={cn(
                                  "px-5",
                                  "py-4",
                                  "font-black",
                                  "text-[#16A34A]",
                                )}
                              >
                                {r2Metrics.recentPrice}억 원
                                <span
                                  className={cn(
                                    "ml-1.5",
                                    "text-[11px]",
                                    "font-normal",
                                    "text-[#64748B]",
                                  )}
                                >
                                  ({formatPriceKRW(r2Metrics.recentPrice)})
                                </span>
                              </td>
                              <td className={cn("px-5", "py-4")}>
                                <span
                                  className={cn(
                                    "inline-block",
                                    "rounded-full",
                                    "bg-[#FEE2E2]",
                                    "px-3",
                                    "py-1",
                                    "text-[12px]",
                                    "font-extrabold",
                                    "text-[#DC2626]",
                                  )}
                                >
                                  {recentDiffText}
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* 우측: 한눈에 보는 요약 카드 */}
                  <div
                    className={cn(
                      "flex",
                      "flex-col",
                      "justify-between",
                      "rounded-[20px]",
                      "border",
                      "border-[#E2E8F0]",
                      "bg-white",
                      "p-6",
                      "shadow-[0_4px_24px_rgba(15,23,42,0.04)]",
                    )}
                  >
                    <div>
                      <h3
                        className={cn(
                          "mb-4",
                          "text-[16px]",
                          "font-black",
                          "text-[#0F172A]",
                        )}
                      >
                        한눈에 보는 요약
                      </h3>

                      <div className={cn("flex", "flex-col", "gap-3")}>
                        {/* 평균 매매가 요약 */}
                        <div
                          className={cn(
                            "rounded-[12px]",
                            "border",
                            "border-[#E2E8F0]",
                            "bg-[#F8FAFC]",
                            "p-3.5",
                          )}
                        >
                          <div
                            className={cn(
                              "mb-1",
                              "flex",
                              "items-center",
                              "gap-1.5",
                              "text-[12px]",
                              "font-bold",
                              "text-[#0F172A]",
                            )}
                          >
                            <Building2
                              className={cn("size-4", "text-[#0F8AA8]")}
                            />
                            <span>평균 매매가</span>
                          </div>
                          <p
                            className={cn(
                              "text-[12px]",
                              "font-extrabold",
                              "text-[#DC2626]",
                            )}
                          >
                            {avgDiffText}.
                          </p>
                        </div>

                        {/* 평균 전세가 요약 */}
                        <div
                          className={cn(
                            "rounded-[12px]",
                            "border",
                            "border-[#E2E8F0]",
                            "bg-[#F8FAFC]",
                            "p-3.5",
                          )}
                        >
                          <div
                            className={cn(
                              "mb-1",
                              "flex",
                              "items-center",
                              "gap-1.5",
                              "text-[12px]",
                              "font-bold",
                              "text-[#0F172A]",
                            )}
                          >
                            <Home className={cn("size-4", "text-[#0F8AA8]")} />
                            <span>평균 전세가</span>
                          </div>
                          <p
                            className={cn(
                              "text-[12px]",
                              "font-extrabold",
                              "text-[#0284C7]",
                            )}
                          >
                            {avgJeonseDiffText}.
                          </p>
                        </div>

                        {/* 종합 의견 */}
                        <div
                          className={cn(
                            "rounded-[12px]",
                            "border",
                            "border-[#0F8AA8]/30",
                            "bg-[#E8F6F9]",
                            "p-3.5",
                          )}
                        >
                          <div
                            className={cn(
                              "mb-1",
                              "flex",
                              "items-center",
                              "gap-1.5",
                              "text-[12px]",
                              "font-black",
                              "text-[#0F8AA8]",
                            )}
                          >
                            <Sparkles className="size-4" />
                            <span>종합 의견</span>
                          </div>
                          <p
                            className={cn(
                              "text-[11px]",
                              "leading-relaxed",
                              "font-semibold",
                              "text-[#0F5C70]",
                            )}
                          >
                            {r1Metrics.avgPrice >= r2Metrics.avgPrice
                              ? appliedR1.district
                              : appliedR2.district}
                            이(가) 매매가 및 전세가가 상대적으로 더 높게
                            형성되어 있으며, 두 지역 모두 서울 주요 선호 주거
                            지역입니다.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "mt-4",
                        "flex",
                        "items-center",
                        "gap-1",
                        "text-[11px]",
                        "font-bold",
                        "text-[#16A34A]",
                      )}
                    >
                      <CheckCircle2 className="size-3.5" />
                      <span>비교 분석이 반영되었습니다.</span>
                    </div>
                  </div>
                </div>

                {/* -------------------------------------------------------------- */}
                {/* 2. 하단: 평균 매매가 비교 & 평균 전세가 비교 (나란히 배치)      */}
                {/* -------------------------------------------------------------- */}
                <div
                  className={cn(
                    "grid",
                    "grid-cols-2",
                    "gap-6",
                    "max-[900px]:grid-cols-1",
                  )}
                >
                  {/* 평균 매매가 비교 바 그래프 카드 */}
                  <div
                    className={cn(
                      "rounded-[20px]",
                      "border",
                      "border-[#E2E8F0]",
                      "bg-white",
                      "p-6",
                      "shadow-[0_4px_24px_rgba(15,23,42,0.04)]",
                    )}
                  >
                    <div
                      className={cn(
                        "mb-5",
                        "flex",
                        "items-center",
                        "justify-between",
                      )}
                    >
                      <h3
                        className={cn(
                          "flex",
                          "items-center",
                          "gap-2",
                          "text-[15px]",
                          "font-black",
                          "text-[#0F172A]",
                        )}
                      >
                        <Building2 className={cn("size-4", "text-[#0F8AA8]")} />
                        평균 매매가 비교
                      </h3>
                      <span
                        className={cn(
                          "text-[11px]",
                          "font-bold",
                          "text-[#94A3B8]",
                        )}
                      >
                        (단위: 억 원)
                      </span>
                    </div>

                    <div className={cn("flex", "flex-col", "gap-5")}>
                      {/* 지역 1 매매 바 */}
                      <div>
                        <div
                          className={cn(
                            "mb-1.5",
                            "flex",
                            "justify-between",
                            "text-[12px]",
                            "font-bold",
                          )}
                        >
                          <span className="text-[#2563EB]">
                            지역 1 ({appliedR1.district})
                          </span>
                          <span className={cn("font-black", "text-[#0F172A]")}>
                            {r1Metrics.avgPrice}억 원
                          </span>
                        </div>
                        <div
                          className={cn(
                            "h-6",
                            "w-full",
                            "rounded-full",
                            "bg-[#F1F5F9]",
                            "p-1",
                          )}
                        >
                          <div
                            className={cn(
                              "h-full",
                              "rounded-full",
                              "bg-[#2563EB]",
                              "transition-all",
                              "duration-500",
                            )}
                            style={{ width: r1AvgWidth }}
                          />
                        </div>
                      </div>

                      {/* 지역 2 매매 바 */}
                      <div>
                        <div
                          className={cn(
                            "mb-1.5",
                            "flex",
                            "justify-between",
                            "text-[12px]",
                            "font-bold",
                          )}
                        >
                          <span className="text-[#16A34A]">
                            지역 2 ({appliedR2.district})
                          </span>
                          <span className={cn("font-black", "text-[#0F172A]")}>
                            {r2Metrics.avgPrice}억 원
                          </span>
                        </div>
                        <div
                          className={cn(
                            "h-6",
                            "w-full",
                            "rounded-full",
                            "bg-[#F1F5F9]",
                            "p-1",
                          )}
                        >
                          <div
                            className={cn(
                              "h-full",
                              "rounded-full",
                              "bg-[#16A34A]",
                              "transition-all",
                              "duration-500",
                            )}
                            style={{ width: r2AvgWidth }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 평균 전세가 비교 바 그래프 카드 */}
                  <div
                    className={cn(
                      "rounded-[20px]",
                      "border",
                      "border-[#E2E8F0]",
                      "bg-white",
                      "p-6",
                      "shadow-[0_4px_24px_rgba(15,23,42,0.04)]",
                    )}
                  >
                    <div
                      className={cn(
                        "mb-5",
                        "flex",
                        "items-center",
                        "justify-between",
                      )}
                    >
                      <h3
                        className={cn(
                          "flex",
                          "items-center",
                          "gap-2",
                          "text-[15px]",
                          "font-black",
                          "text-[#0F172A]",
                        )}
                      >
                        <Home className={cn("size-4", "text-[#0F8AA8]")} />
                        평균 전세가 비교
                      </h3>
                      <span
                        className={cn(
                          "text-[11px]",
                          "font-bold",
                          "text-[#94A3B8]",
                        )}
                      >
                        (단위: 억 원)
                      </span>
                    </div>

                    <div className={cn("flex", "flex-col", "gap-5")}>
                      {/* 지역 1 전세 바 */}
                      <div>
                        <div
                          className={cn(
                            "mb-1.5",
                            "flex",
                            "justify-between",
                            "text-[12px]",
                            "font-bold",
                          )}
                        >
                          <span className="text-[#2563EB]">
                            지역 1 ({appliedR1.district})
                          </span>
                          <span className={cn("font-black", "text-[#0F172A]")}>
                            {r1Metrics.avgJeonsePrice}억 원
                          </span>
                        </div>
                        <div
                          className={cn(
                            "h-6",
                            "w-full",
                            "rounded-full",
                            "bg-[#F1F5F9]",
                            "p-1",
                          )}
                        >
                          <div
                            className={cn(
                              "h-full",
                              "rounded-full",
                              "bg-[#3B82F6]",
                              "transition-all",
                              "duration-500",
                            )}
                            style={{ width: r1JeonseWidth }}
                          />
                        </div>
                      </div>

                      {/* 지역 2 전세 바 */}
                      <div>
                        <div
                          className={cn(
                            "mb-1.5",
                            "flex",
                            "justify-between",
                            "text-[12px]",
                            "font-bold",
                          )}
                        >
                          <span className="text-[#16A34A]">
                            지역 2 ({appliedR2.district})
                          </span>
                          <span className={cn("font-black", "text-[#0F172A]")}>
                            {r2Metrics.avgJeonsePrice}억 원
                          </span>
                        </div>
                        <div
                          className={cn(
                            "h-6",
                            "w-full",
                            "rounded-full",
                            "bg-[#F1F5F9]",
                            "p-1",
                          )}
                        >
                          <div
                            className={cn(
                              "h-full",
                              "rounded-full",
                              "bg-[#22C55E]",
                              "transition-all",
                              "duration-500",
                            )}
                            style={{ width: r2JeonseWidth }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* -------------------------------------------------------------- */}
                {/* 3. 하단 데이터 제공 출처 안내                                  */}
                {/* -------------------------------------------------------------- */}
                <div
                  className={cn(
                    "flex",
                    "items-center",
                    "justify-between",
                    "rounded-[16px]",
                    "border",
                    "border-[#E2E8F0]",
                    "bg-white",
                    "px-6",
                    "py-4",
                    "text-[11px]",
                    "text-[#94A3B8]",
                  )}
                >
                  <div className={cn("flex", "items-center", "gap-1.5")}>
                    <Info className={cn("size-3.5", "text-[#0F8AA8]")} />
                    <span>
                      본 정보는 국토교통부 실거래가 공개시스템 데이터를 기반으로
                      제공되며, 실제 거래가와 차이가 있을 수 있습니다.
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
