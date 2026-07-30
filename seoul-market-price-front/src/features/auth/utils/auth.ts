export interface User {
    id:string;
}


// 로그인 사용자 저장
export function saveLogin(
    id:string,
    token:string
){

    const user = {
        id:id
    };


    // 사용자 정보 저장
    localStorage.setItem(
        "loginUser",
        JSON.stringify(user)
    );


    // JWT Token 저장
    localStorage.setItem(
        "accessToken",
        token
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
export function getToken(){

    return localStorage.getItem(
        "accessToken"
    );

}



// 로그아웃
export function logout(){

    localStorage.removeItem(
        "loginUser"
    );


    localStorage.removeItem(
        "accessToken"
    );

}



// 로그인 여부 확인
export function isLogin(){

    return !!localStorage.getItem(
        "accessToken"
    );

}