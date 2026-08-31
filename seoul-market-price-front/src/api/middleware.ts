import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import { handleSessionExpired } from "@/features/auth/utils/session";
import { useAuthStore } from "@/features/auth/store/useAuthStore";


// 백엔드 서버 주소 (외부 노출 금지: api.ts를 통해서만 사용)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? '';


// 백엔드와 통신하는 미들웨어
const apiMiddleware = axios.create({

    baseURL: BACKEND_URL,

    // refreshToken(HttpOnly) 쿠키를 주고받으려면 필요
    withCredentials: true,

    headers: {

        "Content-Type": "application/json"

    },

    timeout: 5000

});


// 요청 전에 accessToken을 Authorization 헤더에 자동으로 실어보낸다.
// 백엔드는 accessToken 쿠키가 아니라 이 헤더만 검사하므로 반드시 필요하다.
// (accessToken은 HttpOnly라 쿠키에서 직접 읽을 수 없어, 로그인/재발급
//  응답 바디로 받아 zustand 메모리에 보관해둔 값을 사용한다)
apiMiddleware.interceptors.request.use((config) => {

    const token = useAuthStore.getState().accessToken;

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;

});


// 재발급 요청 중복 호출을 막고, 대기 중인 요청들을 재발급 완료 후 이어서 처리하기 위한 상태
let isRefreshing = false;
let refreshSubscribers: Array<{
    resolve: (value: any) => void;
    reject: (reason: any) => void;
}> = [];

function subscribeTokenRefresh(
    resolve: (value: any) => void,
    reject: (reason: any) => void,
) {
    refreshSubscribers.push({ resolve, reject });
}

function onTokenRefreshed() {
    refreshSubscribers.forEach(({ resolve }) => resolve(true));
    refreshSubscribers = [];
}

function onTokenRefreshFailed(error: any) {
    refreshSubscribers.forEach(({ reject }) => reject(error));
    refreshSubscribers = [];
}

export interface RetryableRequestConfig extends AxiosRequestConfig {
    _retry?: boolean;

    // 로그인 여부를 조용히 확인만 하는 요청(예: 앱 진입 시 부트스트랩 체크)에 표시한다.
    // 비로그인 상태에서 401이 나는 것은 정상 상황이므로 세션 만료 alert을 띄우면 안 된다.
    silentAuthCheck?: boolean;
}

// 서버가 인증 오류(401)를 응답하면
// 1. Refresh Token으로 accessToken 재발급을 시도한다.
// 2. 재발급에 성공하면 실패했던 요청을 새 accessToken으로 재시도한다.
// 3. 재발급에 실패하면(Refresh Token도 만료/없음) 세션 만료로 처리한다.
apiMiddleware.interceptors.response.use(

    (response) => response,

    async (error) => {

        if (!axios.isAxiosError(error) || !error.config) {
            return Promise.reject(error);
        }

        const originalRequest = error.config as RetryableRequestConfig;

        // 재발급 요청 자체가 실패한 경우는 재시도하지 않는다.
        const isReissueRequest = originalRequest.url?.includes("/api/auth/reissue");

        // 로그인 여부만 조용히 확인하는 요청(예: 앱 부트스트랩의 /api/members/me)은
        // 401이 나도 정상(비로그인) 상황이므로 세션 만료 alert을 띄우지 않는다.
        const isSilent = originalRequest.silentAuthCheck === true;

        if (
            error.response?.status === 401 &&
            !isReissueRequest &&
            !originalRequest._retry
        ) {

            // 방금 로그아웃한 상태라면, 로그아웃과 무관한 다른 요청의 401을 보고
            // 자동으로 accessToken을 재발급받아 로그인 상태를 되살리면 안 된다.
            // (로그아웃 버튼 자체의 /api/auth/logout 요청은 이 401 재발급
            //  분기를 타지 않으므로 영향받지 않는다.)
            if (useAuthStore.getState().loggedOut) {
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            // 이미 다른 요청이 재발급을 진행 중이면,
            // 그 재발급이 끝난 뒤에 원래 요청을 다시 보낸다.
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    subscribeTokenRefresh(
                        () => resolve(apiMiddleware(originalRequest)),
                        (err) => reject(err),
                    );
                });
            }

            isRefreshing = true;

            try {
                // 새 accessToken은 쿠키뿐 아니라 응답 바디로도 내려온다.
                // 백엔드가 Authorization 헤더만 검사하므로, 이 값을 zustand에
                // 저장해둬야 재시도 요청에 실어보낼 수 있다.
                // silent 요청이면 재발급 요청도 silent로 표시해,
                // 재발급 자체가 401로 실패하더라도 alert이 뜨지 않게 한다.
                const reissueResponse = await apiMiddleware.post<{ accessToken: string }>(
                    "/api/auth/reissue",
                    undefined,
                    { silentAuthCheck: isSilent } as RetryableRequestConfig,
                );

                // 재발급 응답을 기다리는 사이 사용자가 로그아웃했다면,
                // 방금 지운 로그인 상태를 새 토큰으로 되살리지 않는다.
                if (useAuthStore.getState().loggedOut) {
                    isRefreshing = false;
                    onTokenRefreshFailed(error);

                    return Promise.reject(error);
                }

                useAuthStore.getState().setAccessToken(reissueResponse.data.accessToken);

                isRefreshing = false;
                onTokenRefreshed();

                return apiMiddleware(originalRequest);

            } catch (reissueError) {
                isRefreshing = false;
                onTokenRefreshFailed(reissueError);

                if (!isSilent) {
                    void handleSessionExpired();
                }

                return Promise.reject(reissueError);
            }
        }

        if (error.response?.status === 401 && !isSilent) {
            void handleSessionExpired();
        }

        return Promise.reject(error);

    }

);


export { BACKEND_URL };
export default apiMiddleware;
