export interface LoginUser {


    userId:string;


    name:string;


    role:string;


    accessToken?:string;


}



/*
    로그인 정보 저장

    localStorage

    loginUser
        ↓
    사용자 정보

    accessToken
        ↓
    JWT 인증

*/

export function saveLogin(
    user:LoginUser
){


    const loginUser:LoginUser = {


        userId:user.userId,


        name:user.name,


        role:user.role,


        accessToken:user.accessToken


    };



    localStorage.setItem(

        "loginUser",

        JSON.stringify(loginUser)

    );



    if(user.accessToken){


        localStorage.setItem(

            "accessToken",

            user.accessToken

        );


    }

}





/*
    로그인 사용자 조회

*/

export function getLoginUser():LoginUser|null{


    const savedUser =

        localStorage.getItem(
            "loginUser"
        );



    if(!savedUser){


        return null;


    }



    try{


        return JSON.parse(
            savedUser
        ) as LoginUser;



    }catch(error){


        console.error(
            "로그인 정보 파싱 오류",
            error
        );



        logout();


        return null;


    }


}



<<<<<<< HEAD
=======
// 쿠키 조회

function getCookie(
    name: string
): string | null {

    const match = document.cookie.match(
        new RegExp(
            "(?:^|; )" +
            name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") +
            "=([^;]*)"
        )
    );

    return match ? decodeURIComponent(match[1]) : null;

}



// 쿠키 삭제

function deleteCookie(
    name: string
) {

    const expire =
        "expires=Thu, 01 Jan 1970 00:00:00 UTC; max-age=0";

    const host = window.location.hostname;

    // 백엔드가 쿠키를 심을 때 Domain 속성을 지정했을 수도 있어
    // path/domain 조합을 바꿔가며 지워야 실제로 삭제된다.
    [
        `${name}=; ${expire}; path=/;`,
        `${name}=; ${expire}; path=/; domain=${host};`,
        `${name}=; ${expire}; path=/; domain=.${host};`,
    ].forEach((cookieString) => {

        document.cookie = cookieString;

    });

}



// 토큰 조회
// accessToken은 백엔드가 심어주는 쿠키가 기준(source of truth)이다.
// 쿠키가 삭제/만료되면 localStorage에 값이 남아있더라도 로그인되지 않은 것으로 처리해야 한다.
>>>>>>> 6bbe5297d8c32f30031ef523190c3c0ce50f9c16


/*
    JWT 토큰 조회

*/

export function getToken():string|null{


    return getCookie(
        "accessToken"
    );

<<<<<<< HEAD
=======
}



// JWT payload 디코딩

function decodeTokenPayload(
    token: string
): { exp?: number } | null {

    try {

        const payload = token.split(".")[1];

        if (!payload) {
            return null;
        }

        const base64 =
            payload
                .replace(/-/g, "+")
                .replace(/_/g, "/");

        const json = decodeURIComponent(
            atob(base64)
                .split("")
                .map(
                    (c) =>
                        "%" +
                        c.charCodeAt(0).toString(16).padStart(2, "0")
                )
                .join("")
        );

        return JSON.parse(json);

    } catch {

        return null;

    }

}



// 토큰 만료(또는 위조) 여부 확인

export function isTokenExpired(
    token: string
): boolean {

    const decoded = decodeTokenPayload(token);

    if (!decoded || !decoded.exp) {

        return true;

    }

    return decoded.exp * 1000 <= Date.now();

}



// 로그인 상태 확인
// accessToken이 없거나, 형식이 올바르지 않거나, 만료된 경우 모두 로그인되지 않은 것으로 처리

export function isLogin(): boolean {

    const token = getToken();

    if (!token) {

        return false;

    }

    return !isTokenExpired(token);
>>>>>>> 6bbe5297d8c32f30031ef523190c3c0ce50f9c16

}





/*
    로그인 여부

*/

export function isLogin():boolean{


    return Boolean(
        getToken()
    );


}





/*
    로그아웃

*/

export function logout(){


    localStorage.removeItem(
        "loginUser"
    );


    localStorage.removeItem(
        "accessToken"
    );


<<<<<<< HEAD
=======
    deleteCookie(
        "accessToken"
    );


    deleteCookie(
        "refreshToken"
    );

>>>>>>> 6bbe5297d8c32f30031ef523190c3c0ce50f9c16
}