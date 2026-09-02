// 이 파일은 .ts(비-JSX) 확장자로 유지되므로, 아이콘 컴포넌트는 createElement로 작성한다.
import { createElement, type ReactElement } from "react";

/**
 * 로그인 방식
 */
export type LoginType = "LOCAL" | "SOCIAL";

export type Profile = {
  loginType: LoginType;
  name: string;
  userId: string;
  phone: string;
  email: string;
  address: string;
  detailAddress: string;
};

export type MyPageSettings = {
  profile: Partial<Profile>;
  preferredDistrict: string;
  selectedSggCd?: string | null;
  favoriteItems?: string[];
  notificationSettings?: Record<string, boolean>;
  priceAlerts?: unknown[];
};

export type ProfileDraft = {
  email: string;
  address: string;
  detailAddress: string;
  preferredDistrict: string;
  selectedSggCd?: string | null;
  selectedSggName?: string;
};

export const DEFAULT_PROFILE: Profile = {
  loginType: "LOCAL",
  name: "",
  userId: "",
  phone: "",
  email: "",
  address: "",
  detailAddress: "",
};

export const sanitizePlainText = (val?: string | null): string => {
  if (!val || typeof val !== "string") return "";
  const trimmed = val.trim();
  if (trimmed.startsWith("enc:v1:")) return "";
  return trimmed;
};

/**
 * 휴대폰 번호 정규식 자동 포맷터 (01012345678 -> 010-1234-5678)
 */
export const formatPhoneNumber = (value: string): string => {
  if (!value) return "";
  const raw = value.replace(/[^0-9]/g, "");
  if (raw.length <= 3) return raw;
  if (raw.length <= 7) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
  if (raw.length <= 10) {
    return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
  }
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
};

/**
 * 기본 주소 입력값 정제 (특수문자나 주소에 불필요한 기호 입력 방지)
 * 한글, 영문, 숫자, 공백, 하이픈(-), 쉼표(,), 괄호(()), 마침표(.)만 허용
 */
export const sanitizeAddress = (value: string): string => {
  if (!value) return "";
  return value.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9\s\-(),.]/g, "");
};

export const normalizeIdentity = (value?: string | null): string =>
  (value || "").trim().toLowerCase();

export function getStoredSocialProvider(): string {
  return (
    sessionStorage.getItem("social_provider") ||
    localStorage.getItem("social_provider") ||
    ""
  );
}

export function getSocialProviderName(userId: string, loginType: LoginType): string {
  const storedProvider = normalizeIdentity(getStoredSocialProvider());
  if (storedProvider.includes("kakao")) return "카카오";
  if (storedProvider.includes("naver")) return "네이버";
  if (storedProvider.includes("google")) return "구글";

  const normalizedId = normalizeIdentity(userId);
  if (normalizedId.includes("kakao")) return "카카오";
  if (normalizedId.includes("naver")) return "네이버";
  if (normalizedId.includes("google")) return "구글";
  if (loginType === "SOCIAL" || userId.startsWith("enc:v1:")) return "구글";
  return "";
}

export function isSocialAccount(userId: string, loginType: LoginType): boolean {
  return Boolean(getSocialProviderName(userId, loginType));
}

export function getStorageKey(userId?: string): string {
  const cleanId = normalizeIdentity(userId);
  return cleanId ? `myPageSettings_${cleanId}` : "myPageSettings_guest";
}

export function getStoredMyPageSettings(userId?: string): MyPageSettings | null {
  const key = getStorageKey(userId);
  const saved = localStorage.getItem(key);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as MyPageSettings;
  } catch {
    return null;
  }
}

export function getLocalProfileSettings(profile: Profile): Partial<Profile> {
  return {
    loginType: profile.loginType,
    name: profile.name,
    userId: profile.userId,
    phone: profile.phone,
  };
}

export function getProfileDraftKey(userId: string): string {
  return `mypage_draft_${normalizeIdentity(userId)}`;
}

function isProfileDraft(value: unknown): value is ProfileDraft {
  if (typeof value !== "object" || value === null) return false;

  return (
    "email" in value &&
    typeof value.email === "string" &&
    "address" in value &&
    typeof value.address === "string" &&
    "detailAddress" in value &&
    typeof value.detailAddress === "string" &&
    "preferredDistrict" in value &&
    typeof value.preferredDistrict === "string"
  );
}

export function getStoredProfileDraft(userId: string): ProfileDraft | null {
  const key = getProfileDraftKey(userId);
  const saved = sessionStorage.getItem(key);
  if (!saved) return null;

  try {
    const parsed: unknown = JSON.parse(saved);
    if (isProfileDraft(parsed)) return parsed;
  } catch {
    // 파싱에 실패해도 저장된 초안은 임의로 삭제하지 않는다.
  }

  return null;
}

export function removeStoredProfileDraft(userId?: string): void {
  const normalizedUserId = normalizeIdentity(userId);
  if (!normalizedUserId) return;
  sessionStorage.removeItem(getProfileDraftKey(normalizedUserId));
}

export function GoogleIcon({ className }: { className?: string }): ReactElement {
  return createElement(
    "svg",
    { viewBox: "0 0 48 48", className, "aria-hidden": "true" },
    createElement("path", {
      fill: "#FFC107",
      d: "M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z",
    }),
    createElement("path", {
      fill: "#FF3D00",
      d: "M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z",
    }),
    createElement("path", {
      fill: "#4CAF50",
      d: "M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z",
    }),
    createElement("path", {
      fill: "#1976D2",
      d: "M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z",
    }),
  );
}

export function KakaoIcon({ className }: { className?: string }): ReactElement {
  return createElement(
    "svg",
    { viewBox: "0 0 32 32", className, "aria-hidden": "true" },
    createElement("rect", { width: "32", height: "32", rx: "8", fill: "#FEE500" }),
    createElement("path", {
      fill: "#191919",
      d: "M16 7c-5.523 0-10 3.582-10 8 0 2.864 1.896 5.378 4.757 6.753l-1.213 4.453c-.114.418.35.748.706.505l5.35-3.56c.131.01.264.016.4.016 5.523 0 10-3.582 10-8s-4.477-8-10-8z",
    }),
  );
}
