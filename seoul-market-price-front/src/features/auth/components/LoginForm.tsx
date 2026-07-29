import { useState } from "react";

import styles from "./LoginForm.module.css";




function LoginForm() {


    const [userId, setUserId] = useState("");

    const [password, setPassword] = useState("");




   const handleSubmit = async (
    e: React.FormEvent
) => {


    e.preventDefault();



    if(!userId || !password){


        alert(
            "아이디와 비밀번호를 입력해주세요."
        );


        return;

    }




    try{


        const response =
            await fetch(
                "http://localhost:8080/api/auth/login",
                {


                    method:"POST",


                    headers:{


                        "Content-Type":
                        "application/json"


                    },


                    body:JSON.stringify({

                        userId:userId,

                        password:password

                    })


                }

            );





        if(!response.ok){


            throw new Error(
                "로그인 실패"
            );


        }





        const data =
            await response.json();






        /*
          백엔드 응답 예시

          {
             token:"xxxxx",
             userId:"abc"
          }

        */






        localStorage.setItem(

            "token",

            data.token

        );




        localStorage.setItem(

            "userId",

            data.userId

        );





        alert(
            "로그인 되었습니다."
        );





        window.location.href="/";



    }

    catch(error){


        console.error(error);



        alert(
            "아이디 또는 비밀번호가 맞지 않습니다."
        );


    }


};






    return (


        <form

            onSubmit={handleSubmit}

            className={styles.form}

        >



            <input

                type="text"

                placeholder="아이디"

                value={userId}

                onChange={(e) =>

                    setUserId(e.target.value)

                }

            />





            <input

                type="password"

                placeholder="비밀번호"

                value={password}

                onChange={(e) =>

                    setPassword(e.target.value)

                }

            />






            <button

                type="submit"

            >

                로그인


            </button>



        </form>


    );

}


export default LoginForm;