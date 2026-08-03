import axios from "axios";

import apiMiddleware, {
    BACKEND_URL
} from "./middleware";



// ===============================
// 로그인 응답
// ===============================

// 백엔드 LoginResponse DTO(record)가 평평한 구조로 내려주므로 그대로 맞춘다.
// refreshToken은 HttpOnly 쿠키로만 전달되어 응답 바디에 없다.
export interface LoginResponse {

    accessToken:string;

    memberId:number;

    userId:string;

    name:string;

}



// ===============================
// 로그인
// ===============================

export async function loginApi(
    userId:string,
    password:string
):Promise<LoginResponse>{


    const response =
        await apiMiddleware.post<LoginResponse>(
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

export async function logoutApi(){

    const response =
        await apiMiddleware.post(
            "/api/auth/logout"
        );


    return response.data;

}





// ===============================
// OAuth
// ===============================


// 백엔드가 로그인용(kakao, google)과 회원가입용(kakao-signup, google-signup)
// client 등록을 분리했으므로 registrationId도 mode에 맞게 골라야 한다.

export function getKakaoLoginUrl(mode:"login"|"signup" = "login"){

    const registrationId = mode === "signup" ? "kakao-signup" : "kakao";

    return `${BACKEND_URL}/oauth2/authorization/${registrationId}`;

}



export function getGoogleLoginUrl(mode:"login"|"signup" = "login"){

    const registrationId = mode === "signup" ? "google-signup" : "google";

    return `${BACKEND_URL}/oauth2/authorization/${registrationId}`;

}





// ===============================
// 회원가입 요청
// ===============================

export interface SignupRequest {

    name:string;

    userId:string;

    password:string;

    phone:string;

    address?:string;

    detailAddress?:string;

    email?:string;

    phoneVerified:boolean;

}





export async function signupApi(
    signupData:SignupRequest
){

    const response =
        await apiMiddleware.post(
            "/api/users/signup",
            signupData
        );


    return response.data;

}





// ===============================
// 아이디 찾기
// ===============================

export async function findIdApi(
    phone:string
){

    const response =
        await apiMiddleware.post(
            "/api/users/find-id",
            {
                phone
            }
        );


    return response.data;

}





// ===============================
// 비밀번호 찾기
// ===============================

export async function findPasswordApi(
    userId:string,
    phone:string
){

    const response =
        await apiMiddleware.post(
            "/api/users/find-password",
            {
                userId,
                phone
            }
        );


    return response.data;

}





// ===============================
// PASS 인증 요청
// ===============================

export interface PassResponse {

    passUrl:string;

}



export async function requestPassApi(
    phone:string
):Promise<PassResponse>{


    const response =
        await apiMiddleware.post<PassResponse>(
            "/api/pass/request",
            {
                phone
            }
        );


    return response.data;

}





// ===============================
// 휴대폰 SMS 인증 요청
// ===============================

export async function sendPhoneAuthApi(
    phone:string
){

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
// 휴대폰 SMS 인증 확인
// ===============================

export async function verifyPhoneAuthApi(
    phone:string,
    code:string
){

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
// 아이디 중복 확인
// ===============================

export async function checkUserIdApi(
    userId:string
){

    const response =
        await apiMiddleware.get(
            "/api/users/check-id",
            {
                params:{
                    userId
                }
            }
        );


    return response.data;

}





// ===============================
// 인증 에러 확인
// ===============================

export function isAuthError(
    error:unknown
){

    return axios.isAxiosError(error)
        && error.response?.status === 401;

}