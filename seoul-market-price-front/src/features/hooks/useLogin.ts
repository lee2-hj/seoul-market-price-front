import { useState } from "react";

import {
    login
} from "../services/authApi";



export function useLogin() {


    const [loading, setLoading]
        = useState(false);



    const handleLogin =
        async (
            username: string,
            password: string
        ) => {


            try {


                setLoading(true);



                const result =
                    await login({

                        username,

                        password

                    });



                localStorage.setItem(

                    "accessToken",

                    result.accessToken

                );



                alert(
                    "로그인 성공"
                );


            }
            catch (error) {


                console.error(error);


                alert(
                    "로그인 실패"
                );


            }
            finally {


                setLoading(false);

            }

        };



    return {

        handleLogin,

        loading

    };

}