import { getMemberMeApi, logoutApi } from "@/api/api";
import { useAuthStore, type AuthUser } from "../store/useAuthStore";
import { clearDetectedDistrict } from "@/features/region-map/utils/regionSelection";

export type { AuthUser as LoginUser };

/* 로그아웃 버튼으로 로그아웃했음을 표시하는 sessionStorage 키.

   Header의 로그아웃은 로그아웃 처리 직후 window.location.href로
   페이지를 다시 불러온다. 이때 zustand는 새 값으로 초기화되므로,
   "로그아웃했다"는 사실은 sessionStorage에 남겨둬야 새로고침된
   페이지의 ensureAuthLoaded()가 이를 알 수 있다.

   saveLogin()으로 다시 로그인하기 전까지는 지우지 않는다 — 첫
   새로고침에서만 지우면, 그다음 새로고침부터는 다시 서버에 로그인
   여부를 묻게 되어 로그인 상태로 되돌아가 버릴 수 있다. */

const JUST_LOGGED_OUT_KEY = "auth:justLoggedOut";

/* "방금 로그아웃했다" 표시 제거

   일반 로그인(saveLogin)뿐 아니라, 카카오/구글 같은 소셜 로그인도
   다시 로그인을 시도하는 것이므로 이 표시를 지워야 한다. 소셜 로그인은
   백엔드 OAuth 인증 페이지로 완전히 이동했다가 돌아오는 방식이라
   saveLogin()을 거치지 않으므로, 리다이렉트 직전에 이 함수를 따로
   호출해 지워둬야 한다. 지우지 않으면 로그아웃 이력이 있는 브라우저
   탭에서는 소셜 로그인에 성공해도 ensureAuthLoaded()가 서버 확인을
   계속 건너뛰어 로그인 처리가 안 된 것처럼 보인다. */

export function clearJustLoggedOut() {
  try {
    sessionStorage.removeItem(JUST_LOGGED_OUT_KEY);
  } catch {
    // sessionStorage에 접근할 수 없는 환경은 무시한다.
  }
}

/* 로그인 정보 저장

   accessToken은 쿠키(HttpOnly)로도 내려오지만, 백엔드가 인증 시
   Authorization 헤더만 검사하므로 응답 바디의 accessToken 값을
   zustand 메모리에 저장해 요청마다 헤더로 실어보낸다. */

export function saveLogin(user: AuthUser, accessToken?: string) {
  const token = accessToken || user.accessToken || "";
  useAuthStore.getState().setSession(user, token);

  // 로그아웃 이후 다시 로그인한 것이므로, 남아있을 수 있는
  // "방금 로그아웃했다" 표시를 지워 다음 새로고침에서
  // 로그인 상태 복구가 정상적으로 이루어지게 한다.
  clearJustLoggedOut();
}

/* 로그인 사용자 조회 (zustand 기준) */

export function getLoginUser(): AuthUser | null {
  return useAuthStore.getState().user;
}

/* 로그인 여부 확인 (zustand 기준) */

export function isLogin(): boolean {
  return useAuthStore.getState().user !== null;
}

/* 관리자 권한 확인

   인자로 유저 객체를 전달받거나, 전달받지 않으면 현재 로그인된 사용자(zustand 기준)의
   role을 검사하여 관리자(ADMIN, ROLE_ADMIN) 권한 소유 여부를 반증한다. */

export function isAdmin(user?: AuthUser | null): boolean {
  const targetUser = user !== undefined ? user : useAuthStore.getState().user;
  if (!targetUser || !targetUser.role) return false;
  const role = targetUser.role.toUpperCase();
  return role === "ADMIN" || role === "ROLE_ADMIN";
}

/* 관리자 권한 확인 (isAdmin의 래퍼/별칭 함수) */

export function hasAdminRole(user?: AuthUser | null): boolean {
  return isAdmin(user);
}

/* 마스터 권한 확인

   MASTER 또는 ROLE_MASTER 역할을 가진 사용자인지 검사한다.
   MASTER는 백오피스의 모든 메뉴에 접근하고 메뉴/계정을 관리할 수 있다. */

export function isMaster(user?: AuthUser | null): boolean {
  const targetUser = user !== undefined ? user : useAuthStore.getState().user;
  if (!targetUser || !targetUser.role) return false;
  const role = targetUser.role.toUpperCase();
  return role === "MASTER" || role === "ROLE_MASTER";
}

/* ADMIN 또는 MASTER 권한 확인

   백오피스 진입 자체를 허용할지 판단할 때 사용한다. */

export function isAdminOrMaster(user?: AuthUser | null): boolean {
  return isAdmin(user) || isMaster(user);
}

/* zustand 로그인 정보 복구

   새로고침 등으로 zustand(메모리)가 초기화되어 비어있을 때 시도한다.
   accessToken이 없는 채로 /api/members/me를 호출하면 401이 나지만,
   axios 인터셉터가 이를 잡아 refreshToken(HttpOnly 쿠키)으로
   /api/auth/reissue를 조용히 시도하고, 성공하면 새 accessToken을
   zustand에 저장한 뒤 /api/members/me를 재시도해준다.
   refreshToken마저 없거나 만료된 경우(비로그인)에는 실패로 끝나고
   비로그인 상태로 확정한다. */

export async function ensureAuthLoaded(): Promise<void> {
  if (useAuthStore.getState().user || useAuthStore.getState().isInitialized) {
    return;
  }

  // 로그아웃 버튼으로 로그아웃한 뒤라면, 서버에 로그인 여부를 다시
  // 묻지 않고 곧바로 비로그인 상태로 확정한다. 이 표시는 saveLogin()으로
  // 실제 재로그인이 일어나기 전까지 지우지 않는다 — 로그아웃 직후 첫
  // 새로고침에서만 지워버리면, 그다음 새로고침부터는 다시 서버 확인
  // 로직을 타면서 (아직 서버에서 완전히 무효화되지 않은 세션 탓에)
  // 로그인 상태로 되돌아가 버리는 문제가 있었다.
  try {
    if (sessionStorage.getItem(JUST_LOGGED_OUT_KEY) === "1") {
      useAuthStore.getState().setInitialized();

      return;
    }
  } catch {
    // sessionStorage에 접근할 수 없는 환경은 무시하고 평소대로 진행한다.
  }

  try {
    const me = await getMemberMeApi();

    // /api/members/me 요청이 진행되는 동안 로그인이 완료되어
    // zustand가 이미 채워졌다면, 뒤늦게 도착한 이 응답으로
    // 로그인 직후의 값을 덮어쓰면 안 된다.
    if (useAuthStore.getState().user) {
      return;
    }

    useAuthStore.getState().setUser({
      userId: me.userId,
      name: me.name,
      role: me.role || "",
      myGu: me.myGu,
      myGuCode: me.myGuCode,
      preferredDistrict: me.preferredDistrict,
      myDong: me.myDong,
      isLocationAgreed: me.isLocationAgreed,
    });
  } catch {
    if (!useAuthStore.getState().user) {
      useAuthStore.getState().setInitialized();
    }
  }
}

/* 로그아웃 */

export async function logout() {
  try {
    // accessToken/refreshToken 모두 HttpOnly 쿠키라 프론트에서 못 지우므로
    // 서버가 로그아웃 처리 시 쿠키를 만료시켜줘야 한다.
    await logoutApi();
  } catch (e) {
    console.warn("Logout API error", e);
  }

  useAuthStore.getState().clearSession();

  // 현재 위치 세션 데이터(이름, 코드) 명시적 삭제 및 이벤트 발생
  clearDetectedDistrict();

  // 모든 세션 스토리지(아파트 거래동향 검색 market_trends_query, 게시판 검색, 지역 선택, 초안 등)를 100% 일괄 초기화
  try {
    sessionStorage.clear();
    sessionStorage.setItem(JUST_LOGGED_OUT_KEY, "1");
  } catch {
    // sessionStorage에 접근할 수 없는 환경은 무시한다.
  }
}
