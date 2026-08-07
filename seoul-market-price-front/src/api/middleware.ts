import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import { getToken } from "@/features/auth/utils/auth";
import { handleSessionExpired } from "@/features/auth/utils/session";


// 백엔드 서버 주소 (외부 노출 금지: api.ts를 통해서만 사용)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;


// 백엔드와 통신하는 미들웨어
const apiMiddleware = axios.create({

    baseURL: BACKEND_URL,

    // 백엔드가 심어주는 accessToken/refreshToken 쿠키를 주고받으려면 필요
    withCredentials: true,

    headers: {

        "Content-Type": "application/json"

    },

    timeout: 5000

});


// 요청 전에 토큰 자동 추가
apiMiddleware.interceptors.request.use(

    (config) => {

        const token = getToken();

        if (token) {

            config.headers.Authorization = `Bearer ${token}`;

        }

        return config;

    },


    (error) => {

        return Promise.reject(error);

    }

);


// 재발급 요청 중복 호출을 막고, 대기 중인 요청들을 재발급 완료 후 이어서 처리하기 위한 상태
let isRefreshing = false;
let refreshSubscribers: Array<() => void> = [];

function subscribeTokenRefresh(callback: () => void) {
    refreshSubscribers.push(callback);
}

function onTokenRefreshed() {
    refreshSubscribers.forEach((callback) => callback());
    refreshSubscribers = [];
}

interface RetryableRequestConfig extends AxiosRequestConfig {
    _retry?: boolean;
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

        if (
            error.response?.status === 401 &&
            !isReissueRequest &&
            !originalRequest._retry
        ) {

            originalRequest._retry = true;

            // 이미 다른 요청이 재발급을 진행 중이면,
            // 그 재발급이 끝난 뒤에 원래 요청을 다시 보낸다.
            if (isRefreshing) {
                return new Promise((resolve) => {
                    subscribeTokenRefresh(() => {
                        resolve(apiMiddleware(originalRequest));
                    });
                });
            }

            isRefreshing = true;

            try {
                // accessToken 쿠키는 백엔드가 응답에서 직접 갱신해준다.
                await apiMiddleware.post("/api/auth/reissue");

                isRefreshing = false;
                onTokenRefreshed();

                return apiMiddleware(originalRequest);

            } catch (reissueError) {
                isRefreshing = false;
                refreshSubscribers = [];

                void handleSessionExpired();

                return Promise.reject(reissueError);
            }
        }

        if (error.response?.status === 401) {
            void handleSessionExpired();
        }

        return Promise.reject(error);

    }

);


export { BACKEND_URL };
export default apiMiddleware;
