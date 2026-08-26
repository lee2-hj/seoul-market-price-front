export function formatPriceInManwon(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "-";

  const rounded = Math.round(value);
  if (rounded < 10_000) return `${rounded.toLocaleString("ko-KR")}만원`;

  const eok = Math.floor(rounded / 10_000);
  const manwon = rounded % 10_000;
  return manwon === 0
    ? `${eok.toLocaleString("ko-KR")}억원`
    : `${eok.toLocaleString("ko-KR")}억 ${manwon.toLocaleString("ko-KR")}만원`;
}

export function formatPyeongPrice(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "-";
  return `${Math.round(value).toLocaleString("ko-KR")}만원/평`;
}

export function formatChangeRate(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return `${Math.abs(value).toFixed(2)}%`;
}

function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : "";
}

export function formatPeriod(start: string, end: string): string {
  const formattedStart = formatDate(start);
  const formattedEnd = formatDate(end);
  return formattedStart && formattedEnd ? `${formattedStart} ~ ${formattedEnd} 기준` : "";
}

export function formatTradeCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "-";
  return `${Math.round(value).toLocaleString("ko-KR")}건`;
}

export function formatDateRange(start: string, end: string): string {
  const formattedStart = formatDate(start);
  const formattedEnd = formatDate(end);
  return formattedStart && formattedEnd ? `${formattedStart} ~ ${formattedEnd}` : "";
}
