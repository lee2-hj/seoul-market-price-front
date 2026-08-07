import { logoutApi } from "@/api/api";

export interface LoginUser {
  userId: string;
  name: string;
  role: string;
  accessToken?: string;
}

/* 로그인 정보 저장 */

export function saveLogin(user: LoginUser) {
  const loginUser: LoginUser = {
    userId: user.userId,
    name: user.name,
    role: user.role,
    accessToken: user.accessToken,
  };

  localStorage.setItem(
    "loginUser",
    JSON.stringify(loginUser)
  );

  if (user.accessToken) {
    localStorage.setItem(
      "accessToken",
      user.accessToken
    );
  }
}

/* 로그인 사용자 조회

   회원의 실제 이름은 로그인 응답(LoginResponse.name)에만 담겨 있고
   accessToken에는 보통 아이디(sub/userId)만 들어있어, 토큰의 아이디를
   이름 대신 보여주면 안 된다. 그래서 실제 이름이 저장된 localStorage의
   loginUser를 우선 사용하고, 그게 없을 때만 보조로 토큰을 확인하되
   토큰에 아이디가 아닌 진짜 이름 클레임이 있을 때만 사용한다. */

export function getLoginUser(): LoginUser | null {
  const savedUser = localStorage.getItem("loginUser");

  if (savedUser) {
    try {
      return JSON.parse(savedUser) as LoginUser;
    } catch (error) {
      console.error(
        "로그인 정보 파싱 오류",
        error
      );

      logout();

      return null;
    }
  }

  const token = getToken();

  if (token && !isTokenExpired(token)) {
    const decoded = decodeTokenPayload(token);

    // userId/sub는 아이디이지 이름이 아니므로 이름 클레임에서 제외한다.
    const name = decoded?.name ?? decoded?.userName ?? decoded?.nickname;

    if (name) {
      const userId = decoded?.userId ?? decoded?.sub ?? decoded?.username;

      return {
        userId: userId ?? "",
        name,
        role: decoded?.role ?? "",
      };
    }
  }

  return null;
}

/* 쿠키 조회 */

function getCookie(name: string): string | null {
  try {
    const match = document.cookie.match(
      new RegExp(
        "(?:^|; )" +
          name.replace(
            /([.$?*|{}()[\]\\/+^])/g,
            "\\$1"
          ) +
          "=([^;]*)"
      )
    );

    return match
      ? decodeURIComponent(match[1])
      : null;
  } catch {
    return null;
  }
}

/* 쿠키 삭제 */

function deleteCookie(name: string) {
  try {
    const expire =
      "expires=Thu, 01 Jan 1970 00:00:00 UTC; max-age=0";

    const host = window.location.hostname;

    [
      `${name}=; ${expire}; path=/;`,
      `${name}=; ${expire}; path=/; domain=${host};`,
      `${name}=; ${expire}; path=/; domain=.${host};`,
    ].forEach((cookieString) => {
      document.cookie = cookieString;
    });
  } catch (e) {
    console.warn("Cookie delete error", e);
  }
}

/* JWT 토큰 조회 */

export function getToken(): string | null {
  return getCookie("accessToken") || localStorage.getItem("accessToken");
}

/* accessToken에서 name 클레임 파싱 */

export function getUserNameFromToken(): string | null {
  const token = getToken();

  if (!token) {
    return null;
  }

  const decoded = decodeTokenPayload(token);

  return decoded?.name ?? null;
}

/* JWT payload 디코딩 */

interface TokenPayload {
  exp?: number;
  userId?: string;
  sub?: string;
  username?: string;
  name?: string;
  userName?: string;
  nickname?: string;
  role?: string;
}

function decodeTokenPayload(
  token: string
): TokenPayload | null {
  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    const base64 = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map(
          (character) =>
            "%" +
            character.charCodeAt(0)
              .toString(16)
              .padStart(2, "0")
        )
        .join("")
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
}

/* 토큰 만료 여부 확인 */

export function isTokenExpired(
  token: string
): boolean {
  try {
    const decoded = decodeTokenPayload(token);

    if (!decoded || !decoded.exp) {
      return true;
    }

    return decoded.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

/* 로그인 여부 확인 */

export function isLogin(): boolean {
  try {
    const token = getToken();

    if (!token) {
      return false;
    }

    return !isTokenExpired(token);
  } catch {
    return false;
  }
}

/* 로그아웃 */

export async function logout() {
  try {
    // refreshToken은 HttpOnly 쿠키라 프론트에서 못 지우므로
    // 서버가 로그아웃 처리 시 쿠키를 만료시켜주도록 요청한다.
    await logoutApi();
  } catch (e) {
    console.warn("Logout API error", e);
  }

  try {
    localStorage.removeItem("loginUser");
    localStorage.removeItem("accessToken");

    deleteCookie("accessToken");
    deleteCookie("refreshToken");
  } catch (e) {
    console.warn("Logout error", e);
  }
}
