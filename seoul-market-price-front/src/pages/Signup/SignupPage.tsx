import styles from "./SignupPage.module.css";

import SocialLogin from "../../features/auth/components/SocialLogin";

import { Link } from "react-router-dom";


function SignupPage(){


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




                <form>


                    <input

                        type="text"

                        placeholder="이름"

                    />



                    <input

                        type="text"

                        placeholder="아이디"

                    />



                    <input

                        type="password"

                        placeholder="비밀번호"

                    />



                    <input

                        type="password"

                        placeholder="비밀번호 확인"

                    />





                    <div className={styles.phoneGroup}>


                        <input

                            type="tel"

                            placeholder="휴대폰 번호"

                        />


                        <button

                            type="button"

                        >

                            인증받기

                        </button>


                    </div>





                    <input

                        type="text"

                        placeholder="인증번호"

                    />





                    <button

                        type="submit"

                        className={styles.signupButton}

                    >

                        회원가입


                    </button>



                </form>






                {/* 카카오 회원가입 */}

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