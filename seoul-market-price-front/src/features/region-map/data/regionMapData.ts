export interface ApartmentPriceItem {
  name: string;
  salePrice: number;
  rentPrice: number;
}

export interface DistrictPriceItem {
  name: string;
  averagePrice: number;
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
        rentPrice: Math.round((apartment.rentPrice * factor + districtIndex * 90) / 100) * 100,
      };
    }),
  }),
);

export function formatPrice(price: number): string {
  const eok = Math.floor(price / 10000);
  const man = price % 10000;
  return man ? `${eok}억 ${man.toLocaleString("ko-KR")}만` : `${eok}억`;
}
