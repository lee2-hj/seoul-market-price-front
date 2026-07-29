export interface User {
    id:string;
}


// 로그인 저장
export function saveLogin(id:string){

    const user = {
        id:id
    };


    localStorage.setItem(
        "loginUser",
        JSON.stringify(user)
    );

}



// 로그인 정보 가져오기
export function getLoginUser(){

    const user =
        localStorage.getItem("loginUser");


    return user
        ? JSON.parse(user)
        : null;

}



// 로그아웃
export function logout(){

    localStorage.removeItem(
        "loginUser"
    );

}



// 로그인 여부
export function isLogin(){

    return !!localStorage.getItem(
        "loginUser"
    );

}