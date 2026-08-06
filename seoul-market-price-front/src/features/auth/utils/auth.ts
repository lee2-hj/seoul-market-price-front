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

/* 로그인 사용자 조회 */

export function getLoginUser(): LoginUser | null {
  const savedUser = localStorage.getItem("loginUser");

  if (!savedUser) {
    return null;
  }

  try {
    const parsedUser = JSON.parse(savedUser) as LoginUser;

    return parsedUser;
  } catch (error) {
    console.error(
      "로그인 정보 파싱 오류",
      error
    );

    logout();

    return null;
  }
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
  return getCookie("accessToken");
}

/* JWT payload 디코딩 */

function decodeTokenPayload(
  token: string
): { exp?: number } | null {
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

export function logout() {
  try {
    localStorage.removeItem("loginUser");
    localStorage.removeItem("accessToken");

    deleteCookie("accessToken");
    deleteCookie("refreshToken");
  } catch (e) {
    console.warn("Logout error", e);
  }
}
