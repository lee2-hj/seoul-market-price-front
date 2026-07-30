export interface User {
    id:string;
}


const ACCESS_TOKEN_COOKIE = "accessToken";


// middleware.ts와 순환 참조 없이 백엔드 주소를 사용하기 위해 직접 읽는다.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;


// document.cookie에서 특정 쿠키 값을 읽어온다.
function getCookieValue(name:string){

    const match = document.cookie
        .split("; ")
        .find(
            (row) => row.startsWith(`${name}=`)
        );


    return match
        ? decodeURIComponent(
            match.substring(name.length + 1)
        )
        : null;

}



// 로그인 사용자 저장
// Access Token은 백엔드가 로그인 응답과 함께
// accessToken 쿠키로 직접 심어주므로 저장하지 않는다.
export function saveLogin(
    id:string
){

    const user = {
        id:id
    };


    // 사용자 정보 저장
    localStorage.setItem(
        "loginUser",
        JSON.stringify(user)
    );

}



// 로그인 사용자 가져오기
export function getLoginUser(){

    const user =
        localStorage.getItem(
            "loginUser"
        );


    return user
        ? JSON.parse(user)
        : null;

}



// Token 가져오기
// 백엔드가 로그인/재발급 시 심어주는 accessToken 쿠키에서 읽는다.
export function getToken(){

    return getCookieValue(
        ACCESS_TOKEN_COOKIE
    );

}



// 로그아웃
// refreshToken은 HttpOnly 쿠키라 JS에서 직접 지울 수 없으므로,
// 백엔드 로그아웃 API를 호출해 accessToken/refreshToken 쿠키를 모두 삭제한다.
export async function logout(){

    try {

        await fetch(
            `${BACKEND_URL}/api/auth/logout`,
            {
                method: "POST",
                credentials: "include"
            }
        );

    } catch {

        // 네트워크 오류가 나도 클라이언트 쪽 정리는 계속 진행한다.

    }


    localStorage.removeItem(
        "loginUser"
    );


    // 응답을 못 받은 경우를 대비해 클라이언트에서도 accessToken 쿠키를 정리한다.
    document.cookie =
        `${ACCESS_TOKEN_COOKIE}=; path=/; max-age=0`;

}



// 로그인 여부 확인
export function isLogin(){

    return !!getToken();

}
