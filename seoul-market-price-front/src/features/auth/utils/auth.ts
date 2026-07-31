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


    localStorage.setItem(
        "loginUser",
        JSON.stringify({

            userId:user.userId,

            name:user.name,

            role:user.role

        })
    );



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



// 토큰 조회

export function getToken(): string | null {


    return localStorage.getItem(
        "accessToken"
    );

}



// 로그인 상태 확인

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