import axios from "axios";
import apiMiddleware, { BACKEND_URL } from "./middleware";


// 모든 API 호출은 이 파일을 거쳐야 함
// middleware.ts는 외부 노출 금지



// ===============================
// 로그인 API
// ===============================

export async function loginApi(
    userId: string,
    password: string
) {

    const response =
        await apiMiddleware.post(
            "/api/auth/login",
            {
                userId,
                password
            }
        );


    return response.data;

}



// ===============================
// 로그아웃 API
// ===============================

// HttpOnly인 refreshToken 쿠키는 프론트에서 지울 수 없어
// 서버가 로그아웃 시 Set-Cookie로 만료시켜줘야 한다.

export async function logoutApi() {

    const response =
        await apiMiddleware.post(
            "/api/auth/logout"
        );


    return response.data;

}



// ===============================
// 소셜 로그인 URL
// ===============================


// 카카오 로그인

export function getKakaoLoginUrl() {

    return `${BACKEND_URL}/oauth2/authorization/kakao`;

}



// 구글 로그인

export function getGoogleLoginUrl() {

    return `${BACKEND_URL}/oauth2/authorization/google`;

}




// ===============================
// 회원가입 API
// ===============================


export async function signupApi(
    signupData: {

        name: string;

        userId: string;

        password: string;

        phone: string;

        phoneVerified: boolean;

    }
) {


    const response =
        await apiMiddleware.post(

            "/api/users/signup",

            signupData

        );


    return response.data;

}




// ===============================
// 아이디 중복 확인
// ===============================


export async function checkUserIdApi(
    userId: string
) {


    const response =
        await apiMiddleware.get(

            "/api/users/check-id",

            {

                params: {

                    userId

                }

            }

        );


    return response.data;

}




// ===============================
// 휴대폰 인증번호 발송
// ===============================


export async function sendPhoneAuthApi(
    phone: string
) {


    const response =
        await apiMiddleware.post(

            "/api/sms/send",

            {

                phone

            }

        );


    return response.data;

}





// ===============================
// 휴대폰 인증번호 확인
// ===============================


export async function verifyPhoneAuthApi(
    phone: string,
    code: string
) {


    const response =
        await apiMiddleware.post(

            "/api/sms/verify",

            {

                phone,

                code

            }

        );


    return response.data;

}




// ===============================
// 에러 확인
// ===============================


// 서버 응답 에러인지,
// 네트워크 에러인지 구분

export function isAuthError(
    error: unknown
) {

    return axios.isAxiosError(error)
        && !!error.response;

}