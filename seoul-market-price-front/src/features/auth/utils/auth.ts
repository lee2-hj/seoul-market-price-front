export interface LoginUser {

    userId: string;

    name: string;

    role: string;

    accessToken?: string;

}



// 로그인 저장

export function saveLogin(
    user: LoginUser
) {


    // 사용자 정보 저장

    localStorage.setItem(
        "loginUser",

        JSON.stringify({

            userId: user.userId,

            name: user.name,

            role: user.role

        })
    );



    // JWT 저장

    if(user.accessToken){

        localStorage.setItem(
            "accessToken",
            user.accessToken
        );

    }

}




// 로그인 사용자 조회

export function getLoginUser(): LoginUser | null {


    const user =
        localStorage.getItem(
            "loginUser"
        );


    if(!user){

        return null;

    }


    return JSON.parse(user) as LoginUser;

}




// ⭐ middleware.ts에서 사용하는 토큰 조회

export function getToken(): string | null {


    return localStorage.getItem(
        "accessToken"
    );

}




// 로그인 여부 확인

export function isLogin(): boolean {


    return !!getToken();

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