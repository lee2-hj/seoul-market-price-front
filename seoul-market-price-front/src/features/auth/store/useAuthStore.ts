import { create } from "zustand";

/* accessToken은 HttpOnly 쿠키로도 내려오지만, 백엔드 인증은 쿠키가 아니라
   Authorization: Bearer 헤더만 검사한다(쿠키만으로 /api/members/me를
   호출하면 401). 로그인/재발급 응답 바디에 담겨 오는 accessToken 값을
   메모리(zustand)에만 잠깐 들고 있다가 요청 헤더에 실어 보낸다.
   XSS 위험을 줄이기 위해 localStorage 등에는 절대 영속화하지 않고,
   새로고침으로 사라지면 refreshToken(HttpOnly 쿠키)으로 재발급받아 복구한다. */

export interface AuthUser {
  userId: string;
  name: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  // /api/members/me 조회가 끝났는지 여부. 앱 최초 진입 시
  // zustand가 비어있는 상태와 "아직 로그인 여부를 확인 못한 상태"를
  // 구분하기 위해 필요하다.
  isInitialized: boolean;
  // 방금 로그아웃 버튼으로 로그아웃했는지 여부.
  // axios 인터셉터가 (로그아웃과 무관한) 다른 요청의 401을 보고
  // 자동으로 accessToken을 재발급받아 로그인 상태를 되살리는 것을
  // 막기 위해 필요하다. 새 로그인이 성공하면 다시 false로 돌아간다.
  loggedOut: boolean;
  // 로그인: 유저 정보 + accessToken을 함께 저장한다.
  setSession: (user: AuthUser, accessToken: string) => void;
  // 토큰 재발급: accessToken만 갱신한다.
  setAccessToken: (accessToken: string) => void;
  // /api/members/me로 복구: 유저 정보만 채운다(토큰은 재발급 과정에서 이미 저장됨).
  setUser: (user: AuthUser) => void;
  clearSession: () => void;
  setInitialized: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isInitialized: false,
  loggedOut: false,
  setSession: (user, accessToken) =>
    set({ user, accessToken, isInitialized: true, loggedOut: false }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user, isInitialized: true, loggedOut: false }),
  clearSession: () =>
    set({ user: null, accessToken: null, isInitialized: true, loggedOut: true }),
  setInitialized: () => set({ isInitialized: true }),
}));
