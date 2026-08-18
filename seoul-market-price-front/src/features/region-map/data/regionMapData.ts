export interface ApartmentPriceItem {
  name: string;
  salePrice: number;
  recentTradeDate: string;
  exclusiveArea: number;
}

export interface DistrictPriceItem {
  name: string;
  averagePrice: number;
  apartments: ApartmentPriceItem[];
}

export const PRICE_LEGEND = [
  { label: "15억 이상", color: "#F47768" },
  { label: "11억~15억", color: "#F7A36B" },
  { label: "9억~11억", color: "#F7D381" },
  { label: "7억~9억", color: "#AAD8A3" },
  { label: "7억 미만", color: "#9DBFE4" },
];

const BASE_APARTMENTS = [
  { name: "래미안 대치팰리스", salePrice: 348000, recentTradeDate: "2026.08.12", exclusiveArea: 84.97 },
  { name: "디에이치 대치 에델루이", salePrice: 321000, recentTradeDate: "2026.08.10", exclusiveArea: 84.93 },
  { name: "대치 푸르지오 써밋", salePrice: 302000, recentTradeDate: "2026.08.08", exclusiveArea: 84.95 },
  { name: "대치 아이파크", salePrice: 287000, recentTradeDate: "2026.08.06", exclusiveArea: 84.91 },
  { name: "대치 르엘", salePrice: 275000, recentTradeDate: "2026.08.04", exclusiveArea: 84.99 },
  { name: "대치 코오롱하늘채", salePrice: 132000, recentTradeDate: "2026.08.02", exclusiveArea: 59.86 },
  { name: "대치 현대2차", salePrice: 128000, recentTradeDate: "2026.07.30", exclusiveArea: 59.72 },
  { name: "대치 쌍용2차", salePrice: 123000, recentTradeDate: "2026.07.28", exclusiveArea: 59.94 },
  { name: "대치 동부센트레빌", salePrice: 119000, recentTradeDate: "2026.07.25", exclusiveArea: 59.88 },
  { name: "대치 한보미도맨션", salePrice: 115000, recentTradeDate: "2026.07.22", exclusiveArea: 59.76 },
];

const DISTRICT_SEED: Array<[string, number]> = [
  ["강남구", 203000], ["강동구", 96000], ["강북구", 63000], ["강서구", 82000],
  ["관악구", 71000], ["광진구", 108000], ["구로구", 68000], ["금천구", 61000],
  ["노원구", 72000], ["도봉구", 61000], ["동대문구", 74000], ["동작구", 104000],
  ["마포구", 112000], ["서대문구", 86000], ["서초구", 178000], ["성동구", 115000],
  ["성북구", 109000], ["송파구", 146000], ["양천구", 98000], ["영등포구", 103000],
  ["용산구", 151000], ["은평구", 64000], ["종로구", 104000], ["중구", 137000],
  ["중랑구", 66000],
];

export const DISTRICT_PRICES: DistrictPriceItem[] = DISTRICT_SEED.map(
  ([name, averagePrice], districtIndex) => ({
    name,
    averagePrice,
    apartments: BASE_APARTMENTS.map((apartment, apartmentIndex) => {
      const factor = averagePrice / 203000;
      return {
        name:
          name === "강남구"
            ? apartment.name
            : `${name} ${["래미안", "자이", "푸르지오", "아이파크", "힐스테이트"][apartmentIndex % 5]}`,
        salePrice: Math.round((apartment.salePrice * factor + districtIndex * 170) / 100) * 100,
        recentTradeDate: apartment.recentTradeDate,
        exclusiveArea: apartment.exclusiveArea,
      };
    }),
  }),
);

export function formatPrice(price: number): string {
  const eok = Math.floor(price / 10000);
  const man = price % 10000;
  if (eok === 0) return `${man.toLocaleString("ko-KR")}만`;
  return man ? `${eok}억 ${man.toLocaleString("ko-KR")}만` : `${eok}억`;
}
