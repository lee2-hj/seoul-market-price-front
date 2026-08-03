import axios from "axios";

import apiMiddleware, {
    BACKEND_URL
} from "./middleware";



// ===============================
// 사용자 타입
// ===============================

export interface User {

    id?: number;

    name:string;

    userId:string;

    role:string;

    phone?:string;

    email?:string;

    address?:string;

    detailAddress?:string;

}



// ===============================
// 로그인 응답
// ===============================

export interface LoginResponse {

    user:User;

    accessToken:string;

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
// OAuth
// ===============================


export function getKakaoLoginUrl(){

    return `${BACKEND_URL}/oauth2/authorization/kakao`;

}



export function getGoogleLoginUrl(){

    return `${BACKEND_URL}/oauth2/authorization/google`;

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