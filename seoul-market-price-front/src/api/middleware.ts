import axios from "axios";
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


// 서버가 인증 오류(401)를 응답하면 세션 만료로 처리
apiMiddleware.interceptors.response.use(

    (response) => response,

    (error) => {

        if (
            axios.isAxiosError(error) &&
            error.response?.status === 401
        ) {

            void handleSessionExpired();

        }

        return Promise.reject(error);

    }

);


export { BACKEND_URL };
export default apiMiddleware;
