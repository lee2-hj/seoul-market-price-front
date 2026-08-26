export const REGION_STORAGE_KEY = "ssabu_selected_region";
export const REGION_CODE_STORAGE_KEY = "ssabu_selected_region_code";
export const REGION_CHANGED_EVENT = "ssabu_region_changed";

export const SEOUL_DISTRICTS = [
  "강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구",
  "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구",
  "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구",
] as const;

export function isSeoulDistrict(value: string): boolean {
  return (SEOUL_DISTRICTS as readonly string[]).includes(value.trim());
}

export function getDetectedDistrict(): string {
  const district = sessionStorage.getItem(REGION_STORAGE_KEY)?.trim() ?? "";
  return isSeoulDistrict(district) ? district : "";
}

export function getDetectedDistrictCode(): string {
  return sessionStorage.getItem(REGION_CODE_STORAGE_KEY)?.trim() ?? "";
}

export function storeDetectedDistrict(district: string, sggCd?: string): void {
  const normalizedDistrict = district.trim();
  sessionStorage.setItem(REGION_STORAGE_KEY, normalizedDistrict);
  if (sggCd?.trim()) {
    sessionStorage.setItem(REGION_CODE_STORAGE_KEY, sggCd.trim());
  } else {
    sessionStorage.removeItem(REGION_CODE_STORAGE_KEY);
  }
  window.dispatchEvent(
    new CustomEvent<string>(REGION_CHANGED_EVENT, { detail: normalizedDistrict }),
  );
}

export function clearDetectedDistrict(): void {
  sessionStorage.removeItem(REGION_STORAGE_KEY);
  sessionStorage.removeItem(REGION_CODE_STORAGE_KEY);
  window.dispatchEvent(
    new CustomEvent<string>(REGION_CHANGED_EVENT, { detail: "" }),
  );
}
