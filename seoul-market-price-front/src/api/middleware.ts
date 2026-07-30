import axios from "axios";
import { getToken } from "@/features/auth/utils/auth";


// 백엔드 서버 주소 (외부 노출 금지: api.ts를 통해서만 사용)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;


// 백엔드와 통신하는 미들웨어
const apiMiddleware = axios.create({

    baseURL: BACKEND_URL,

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


export { BACKEND_URL };
export default apiMiddleware;
