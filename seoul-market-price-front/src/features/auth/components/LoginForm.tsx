import { useState } from "react";
import styles from "./LoginForm.module.css";


function LoginForm() {


    const [userId, setUserId] = useState("");

    const [password, setPassword] = useState("");



    const handleSubmit = (e: React.FormEvent) => {

        e.preventDefault();


        console.log({

            userId,

            password

        });


        // 추후 로그인 API 연결

    }



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



            <button>

                로그인

            </button>


        </form>

    );

}


export default LoginForm;