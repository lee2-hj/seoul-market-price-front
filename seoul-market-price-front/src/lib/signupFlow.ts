/* ===============================
   회원가입 플로우 sessionStorage 관리

   /signup/select 에서 "일반 회원가입"을 선택해야
   /signup/terms → /signup/verify → /signup 흐름에
   진입한 것으로 간주한다.
=============================== */

const FLOW_FLAG_KEY = "signup_flow_active";
const FLOW_BOOT_ID_KEY = "signup_flow_boot_id";
const FLOW_PATH_KEY = "signup_flow_last_path";
const VERIFIED_NAME_KEY = "signup_verified_name";
const VERIFIED_PHONE_KEY = "signup_verified_phone";
const VERIFIED_IDENTITY_KEY = "signup_verified_identity_id";
const TERMS_AGREED_KEY = "is_terms_agreed";
const LOCATION_AGREED_KEY = "is_location_agreed";
const PRIVACY_AGREED_KEY = "is_privacy_agreed";

/*
  SignupFlowLayout의 흐름 추적 메타데이터만 담는다.

  약관 동의 값(TERMS/LOCATION/PRIVACY_AGREED_KEY)과 PASS 인증 결과
  (VERIFIED_NAME_KEY/VERIFIED_PHONE_KEY)는 이 목록에 포함하지 않는다.
  /signup이 (임시로) SignupFlowLayout 밖에 있어서, 이 목록에 넣으면
  /signup/verify → /signup 이동만으로도 레이아웃이 언마운트되며
  /signup이 값을 읽기도 전에 지워져버린다.
*/
const FLOW_STORAGE_KEYS = [
  FLOW_FLAG_KEY,
  FLOW_BOOT_ID_KEY,
  FLOW_PATH_KEY,
] as const;

/*
  회원가입 플로우에서 쓰는 sessionStorage 값 전체.

  - 주소창에 지금 머무는 페이지와 다른 URL을 직접 입력해 새 문서가
    열린 경우
  - /signup에서 최종 회원가입이 완료된 경우

  위 두 경우에는 흐름 메타데이터뿐 아니라 약관 동의 값, PASS 인증
  결과까지 전부 지워야 하므로 별도 목록으로 관리한다.
*/
const ALL_SIGNUP_STORAGE_KEYS = [
  ...FLOW_STORAGE_KEYS,
  TERMS_AGREED_KEY,
  LOCATION_AGREED_KEY,
  PRIVACY_AGREED_KEY,
  VERIFIED_NAME_KEY,
  VERIFIED_PHONE_KEY,
  VERIFIED_IDENTITY_KEY,
] as const;

/*
  현재 문서(탭에서 실제로 로드된 이 페이지)를 식별하는 고유 값.

  모듈이 새로 평가될 때(=브라우저가 문서를 새로 불러올 때)마다 새 값이
  생성되고, 같은 문서 안에서 벌어지는 SPA 내부 이동(navigate)에는
  절대 바뀌지 않는다. sessionStorage는 탭 안에서 다른 URL로 이동해도
  값이 남아있기 때문에, 이 값으로 "지금 이 문서에서 직접 설정된
  플래그인지" 아니면 "예전 문서에서 남은 낡은 플래그인지"를 구분한다.
*/
const CURRENT_BOOT_ID =
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

export function startSignupFlow() {
  sessionStorage.setItem(FLOW_FLAG_KEY, "1");
  sessionStorage.setItem(FLOW_BOOT_ID_KEY, CURRENT_BOOT_ID);
}

/*
  플래그가 켜져 있을 뿐 아니라, 그 플래그가 "지금 이 문서"에서
  설정된 것이어야 유효하다고 본다. 다른 문서(예전 방문, 새로고침 전
  세션)에서 남은 플래그는 무시한다 — 그래야 같은 탭에서 이전에
  플로우를 완료한 뒤 주소창에 다시 /signup/terms 등을 직접 입력해도
  더 이상 통과되지 않는다.
*/
export function isSignupFlowActive() {
  return (
    sessionStorage.getItem(FLOW_FLAG_KEY) === "1" &&
    sessionStorage.getItem(FLOW_BOOT_ID_KEY) === CURRENT_BOOT_ID
  );
}

export function clearSignupFlowStorage() {
  FLOW_STORAGE_KEYS.forEach((key) => sessionStorage.removeItem(key));
}

/*
  흐름 메타데이터뿐 아니라 약관 동의 값, PASS 인증 결과까지 전부
  지운다. 주소창 직접 입력으로 다른 URL의 새 문서가 열렸을 때(Router)와
  /signup에서 최종 회원가입이 완료됐을 때(SignupPage) 호출한다.
*/
export function clearAllSignupStorage() {
  ALL_SIGNUP_STORAGE_KEYS.forEach((key) => sessionStorage.removeItem(key));
}

/*
  플로우 안에서 현재 머물러 있는 페이지의 경로를 기록해둔다.
  (terms → verify → signup 로 이동할 때마다 갱신)
*/
export function setSignupFlowPath(pathname: string) {
  sessionStorage.setItem(FLOW_PATH_KEY, pathname);
}

/*
  주소창에 "지금 머물러 있던 페이지와 동일한 URL"을 직접 입력한
  경우를 새로고침과 동일하게 취급하기 위한 판별.

  이 경우 문서가 새로 로드되며 boot id가 바뀌므로 isSignupFlowActive()
  로는 통과시킬 수 없고, Navigation Timing API의 type도 브라우저에
  따라 "reload"가 아닌 "navigate"로 잡힐 수 있어 isPageReload()로도
  잡히지 않는다. 대신 마지막으로 머물렀던 경로를 sessionStorage에
  남겨두고, 지금 로드된 경로와 같다면 같은 페이지를 다시 연 것으로
  간주한다.
*/
export function isFlowPathMatch(pathname: string): boolean {
  return (
    sessionStorage.getItem(FLOW_FLAG_KEY) === "1" &&
    sessionStorage.getItem(FLOW_PATH_KEY) === pathname
  );
}

/* ===============================
   현재 문서가 "새로고침"으로 로드되었는지 여부

   브라우저 주소창 직접 입력/북마크/링크 이동과 새로고침(F5)을
   구분하기 위해 Navigation Timing API를 사용한다.
   SPA 내부 이동(react-router navigate)은 문서를 새로 로드하지
   않으므로 이 값에 영향을 주지 않는다.
=============================== */

export function isPageReload(): boolean {
  if (typeof performance === "undefined" || !performance.getEntriesByType) {
    return false;
  }

  const [entry] = performance.getEntriesByType(
    "navigation"
  ) as PerformanceNavigationTiming[];

  return entry?.type === "reload";
}

/* ===============================
   PASS 인증으로 확인된 이름/휴대폰 번호

   /signup 새로고침 시에도 값이 유지되어야 하므로
   router state 대신 sessionStorage에 저장한다.
=============================== */

export function savePassVerifiedInfo(info: {
  name: string;
  phone: string;
  identityVerificationId: string;
}) {
  sessionStorage.setItem(VERIFIED_NAME_KEY, info.name);
  sessionStorage.setItem(VERIFIED_PHONE_KEY, info.phone);
  sessionStorage.setItem(
    VERIFIED_IDENTITY_KEY,
    info.identityVerificationId,
  );
}

export function getPassVerifiedInfo(): {
  name: string;
  phone: string;
  identityVerificationId: string;
} | null {
  const name = sessionStorage.getItem(VERIFIED_NAME_KEY);
  const phone = sessionStorage.getItem(VERIFIED_PHONE_KEY);
  const identityVerificationId = sessionStorage.getItem(VERIFIED_IDENTITY_KEY);

  if (!name || !phone || !identityVerificationId) {
    return null;
  }

  return { name, phone, identityVerificationId };
}
