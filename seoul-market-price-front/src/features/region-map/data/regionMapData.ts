export interface ApartmentPriceItem {
  name: string;
  salePrice: number;
  rentPrice: number;
}

export interface DistrictPriceItem {
  name: string;
  averagePrice: number;
  dongs: string[];
  apartments: ApartmentPriceItem[];
}

const BASE_APARTMENTS = [
  { name: "래미안 대치팰리스", salePrice: 348000, rentPrice: 185000 },
  { name: "디에이치 대치 에델루이", salePrice: 321000, rentPrice: 170000 },
  { name: "대치 푸르지오 써밋", salePrice: 302000, rentPrice: 164000 },
  { name: "대치 아이파크", salePrice: 287000, rentPrice: 152000 },
  { name: "대치 르엘", salePrice: 275000, rentPrice: 148000 },
  { name: "대치 코오롱하늘채", salePrice: 132000, rentPrice: 78000 },
  { name: "대치 현대2차", salePrice: 128000, rentPrice: 72000 },
  { name: "대치 쌍용2차", salePrice: 123000, rentPrice: 70000 },
  { name: "대치 동부센트레빌", salePrice: 119000, rentPrice: 66000 },
  { name: "대치 한보미도맨션", salePrice: 115000, rentPrice: 62000 },
];

const DISTRICT_SEED: Array<[string, number, string[]]> = [
  ["강남구", 203000, ["대치동", "도곡동", "삼성동", "압구정동"]],
  ["강동구", 96000, ["고덕동", "명일동", "상일동", "암사동"]],
  ["강북구", 63000, ["미아동", "번동", "수유동", "우이동"]],
  ["강서구", 82000, ["마곡동", "화곡동", "등촌동", "가양동"]],
  ["관악구", 71000, ["봉천동", "신림동", "남현동"]],
  ["광진구", 108000, ["광장동", "구의동", "자양동", "화양동"]],
  ["구로구", 68000, ["구로동", "신도림동", "개봉동", "고척동"]],
  ["금천구", 61000, ["가산동", "독산동", "시흥동"]],
  ["노원구", 72000, ["상계동", "중계동", "하계동", "월계동"]],
  ["도봉구", 61000, ["도봉동", "방학동", "쌍문동", "창동"]],
  ["동대문구", 74000, ["답십리동", "전농동", "장안동", "이문동"]],
  ["동작구", 104000, ["사당동", "상도동", "흑석동", "노량진동"]],
  ["마포구", 112000, ["아현동", "공덕동", "상암동", "망원동"]],
  ["서대문구", 86000, ["북아현동", "홍제동", "남가좌동", "연희동"]],
  ["서초구", 178000, ["반포동", "잠원동", "서초동", "방배동"]],
  ["성동구", 115000, ["성수동", "옥수동", "금호동", "행당동"]],
  ["성북구", 109000, ["길음동", "돈암동", "장위동", "정릉동"]],
  ["송파구", 146000, ["잠실동", "가락동", "문정동", "방이동"]],
  ["양천구", 98000, ["목동", "신정동", "신월동"]],
  ["영등포구", 103000, ["여의도동", "당산동", "문래동", "신길동"]],
  ["용산구", 151000, ["한남동", "이촌동", "문배동", "효창동"]],
  ["은평구", 64000, ["불광동", "응암동", "진관동", "녹번동"]],
  ["종로구", 104000, ["평동", "무악동", "창신동", "숭인동"]],
  ["중구", 137000, ["신당동", "황학동", "중림동", "회현동"]],
  ["중랑구", 66000, ["면목동", "묵동", "상봉동", "신내동"]],
];

export const DISTRICT_PRICES: DistrictPriceItem[] = DISTRICT_SEED.map(
  ([name, averagePrice], districtIndex) => ({
    name,
    averagePrice,
    dongs: SEOUL_LEGAL_DONGS[name],
    apartments: BASE_APARTMENTS.map((apartment, apartmentIndex) => {
      const factor = averagePrice / 203000;
      return {
        name:
          name === "강남구"
            ? apartment.name
            : `${SEOUL_LEGAL_DONGS[name][apartmentIndex % SEOUL_LEGAL_DONGS[name].length]} ${["래미안", "자이", "푸르지오", "아이파크", "힐스테이트"][apartmentIndex % 5]}`,
        salePrice: Math.round((apartment.salePrice * factor + districtIndex * 170) / 100) * 100,
        rentPrice: Math.round((apartment.rentPrice * factor + districtIndex * 90) / 100) * 100,
      };
    }),
  }),
);

export const DISTRICT_LABEL_POSITIONS: Record<string, [number, number]> = {
  은평구: [17, 29], 도봉구: [57, 15], 노원구: [70, 22], 강북구: [46, 24], 성북구: [49, 38],
  중랑구: [68, 42], 종로구: [38, 39], 서대문구: [23, 46], 동대문구: [57, 49], 중구: [42, 53],
  마포구: [20, 58], 용산구: [42, 63], 성동구: [58, 59], 광진구: [75, 57], 강동구: [89, 56],
  강서구: [12, 69], 양천구: [25, 75], 영등포구: [37, 71], 구로구: [20, 84], 금천구: [34, 89],
  동작구: [50, 73], 관악구: [48, 87], 서초구: [62, 83], 강남구: [69, 72], 송파구: [82, 72],
};

export function formatPrice(price: number): string {
  const eok = Math.floor(price / 10000);
  const man = price % 10000;
  return man ? `${eok}억 ${man.toLocaleString("ko-KR")}만` : `${eok}억`;
}
import { SEOUL_LEGAL_DONGS } from "./seoulLegalDongs";
