export interface DistrictPriceItem {
  name: string;
  averagePrice: number;
}

export const PRICE_LEGEND = [
  { label: "15억 이상", color: "#F47768" },
  { label: "11억~15억", color: "#F7A36B" },
  { label: "9억~11억", color: "#F7D381" },
  { label: "7억~9억", color: "#AAD8A3" },
  { label: "7억 미만", color: "#9DBFE4" },
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
  ([name, averagePrice]) => ({ name, averagePrice }),
);

export function formatPrice(price: number): string {
  const eok = Math.floor(price / 10000);
  const man = price % 10000;
  if (eok === 0) return `${man.toLocaleString("ko-KR")}만`;
  return man ? `${eok}억 ${man.toLocaleString("ko-KR")}만` : `${eok}억`;
}
