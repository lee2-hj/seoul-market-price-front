export const REGION_STORAGE_KEY = "ssabu_selected_region";
export const REGION_CODE_STORAGE_KEY = "ssabu_selected_region_code";
export const REGION_CHANGED_EVENT = "ssabu_region_changed";

export const SEOUL_DISTRICTS = [
  "강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구",
  "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구",
  "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구",
] as const;

export function isSeoulDistrict(value?: string | null): boolean {
  if (!value) return false;
  return (SEOUL_DISTRICTS as readonly string[]).includes(value.trim());
}

export function isSeoulDistrictCode(code?: string | null): boolean {
  if (!code) return false;
  const trimmed = code.trim();
  return /^\d{5}$/.test(trimmed) && trimmed.startsWith("11");
}

export function getValidDetectedDistrict(): { district: string; sggCd: string } | null {
  const district = sessionStorage.getItem(REGION_STORAGE_KEY)?.trim() ?? "";
  const sggCd = sessionStorage.getItem(REGION_CODE_STORAGE_KEY)?.trim() ?? "";
  if (isSeoulDistrict(district) && isSeoulDistrictCode(sggCd)) {
    return { district, sggCd };
  }
  return null;
}

export function getDetectedDistrict(): string {
  const valid = getValidDetectedDistrict();
  return valid ? valid.district : "";
}

export function getDetectedDistrictCode(): string {
  const valid = getValidDetectedDistrict();
  return valid ? valid.sggCd : "";
}

export function storeDetectedDistrict(district: string, sggCd?: string): void {
  const normalizedDistrict = district.trim();
  const normalizedCode = sggCd?.trim() ?? "";
  if (isSeoulDistrict(normalizedDistrict) && isSeoulDistrictCode(normalizedCode)) {
    sessionStorage.setItem(REGION_STORAGE_KEY, normalizedDistrict);
    sessionStorage.setItem(REGION_CODE_STORAGE_KEY, normalizedCode);
  } else {
    sessionStorage.removeItem(REGION_STORAGE_KEY);
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
