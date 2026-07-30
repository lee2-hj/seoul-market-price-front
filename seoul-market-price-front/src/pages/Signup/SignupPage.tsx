import styles from "./SignupPage.module.css";

import SocialLogin from "../../features/auth/components/SocialLogin";

import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";


function SignupPage(){


    const navigate = useNavigate();


    const [form,setForm] = useState({

        name:"",
        userId:"",
        password:"",
        passwordCheck:"",
        phone:"",
        authNumber:""

    });



    const handleChange = (
        e:React.ChangeEvent<HTMLInputElement>
    )=>{

        setForm({

            ...form,

            [e.target.name]:
            e.target.value

        });

    };




    const handleSubmit = (
        e:React.FormEvent
    )=>{

        e.preventDefault();



        if(
            !form.userId ||
            !form.password
        ){

            alert(
                "아이디와 비밀번호를 입력해주세요."
            );

            return;

        }



        if(
            form.password !==
            form.passwordCheck
        ){

            alert(
                "비밀번호가 일치하지 않습니다."
            );

            return;

        }



        // 임시 회원 저장
        localStorage.setItem(

            "tempUser",

            JSON.stringify({

                userId:form.userId,

                password:form.password

            })

        );



        alert(
            "회원가입 완료"
        );



        navigate("/");


    };




    return(

        <div className={styles.signupContainer}>


            <div className={styles.signupCard}>


                <h2>
                    회원가입
                </h2>


                <p>
                    싸.농 서비스를 이용하려면
                    <br/>
                    회원가입이 필요합니다.
                </p>



                <form
                    onSubmit={handleSubmit}
                >


                    <input

                        type="text"

                        name="name"

                        placeholder="이름"

                        value={form.name}

                        onChange={handleChange}

                    />



                    <input

                        type="text"

                        name="userId"

                        placeholder="아이디"

                        value={form.userId}

                        onChange={handleChange}

                    />



                    <input

                        type="password"

                        name="password"

                        placeholder="비밀번호"

                        value={form.password}

                        onChange={handleChange}

                    />



                    <input

                        type="password"

                        name="passwordCheck"

                        placeholder="비밀번호 확인"

                        value={form.passwordCheck}

                        onChange={handleChange}

                    />




                    <div className={styles.phoneGroup}>


                        <input

                            type="tel"

                            name="phone"

                            placeholder="휴대폰 번호"

                            value={form.phone}

                            onChange={handleChange}

                        />


                        <button
                            type="button"
                        >
                            인증받기
                        </button>


                    </div>





                    <input

                        type="text"

                        name="authNumber"

                        placeholder="인증번호"

                        value={form.authNumber}

                        onChange={handleChange}

                    />





                    <button

                        type="submit"

                        className={styles.signupButton}

                    >

                        회원가입

                    </button>



                </form>





                <SocialLogin

                    mode="signup"

                />





                <div className={styles.loginLink}>

                    이미 회원이신가요?


                    <Link to="/">

                        로그인

                    </Link>


                </div>



            </div>


        </div>

    );

}


export default SignupPage;