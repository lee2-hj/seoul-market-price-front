import axios from "axios";
import apiMiddleware, { BACKEND_URL } from "./middleware";


// 모든 API 호출은 이 파일을 거쳐야 함 (middleware.ts는 외부 노출 금지)


export async function loginApi(
    userId: string,
    password: string
) {

    const response = await apiMiddleware.post(
        "/api/auth/login",
        {
            userId,
            password
        }
    );

    return response.data;

}



export function getKakaoLoginUrl() {

    return `${BACKEND_URL}/oauth2/authorization/kakao`;

}



// 서버가 응답한 에러(예: 로그인 실패)인지, 네트워크/연결 에러인지 구분
export function isAuthError(error: unknown) {

    return axios.isAxiosError(error) && !!error.response;

}
