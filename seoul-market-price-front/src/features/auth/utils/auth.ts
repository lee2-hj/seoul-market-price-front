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





/*
    JWT 토큰 조회

*/

export function getToken():string|null{


    return localStorage.getItem(
        "accessToken"
    );


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


}