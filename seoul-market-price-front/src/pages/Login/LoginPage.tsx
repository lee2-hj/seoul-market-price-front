import { useState } from "react";
import { Link } from "react-router-dom";

import LoginForm from "../../features/auth/components/LoginForm";
import styles from "./LoginPage.module.css";


function LoginPage() {


    const [activeItem, setActiveItem] =
        useState<number | null>(null);



    const categoryItems = [

        "🍎",
        "🥬",
        "🐟",
        "🛒"

    ];



    const handleIconClick = (index: number) => {


        setActiveItem(

            activeItem === index

                ? null

                : index

        );


    };




    return (


        <div className={styles.loginPage}>


            <div className={styles.container}>


                {/* ======================
                    브랜드 영역
                ====================== */}

                <div className={styles.brandBox}>


                    {/* 카테고리 아이콘 */}

                    <div className={styles.categoryIcons}>


                        {

                            categoryItems.map(

                                (item, index) => (


                                    <span


                                        key={index}



                                        role="button"



                                        tabIndex={0}



                                        className={

                                            activeItem === index

                                                ? styles.activeIcon

                                                : ""

                                        }



                                        onClick={() =>

                                            handleIconClick(index)

                                        }



                                        onKeyDown={(e) => {


                                            if (e.key === "Enter") {

                                                handleIconClick(index);

                                            }


                                        }}


                                    >

                                        {item}


                                    </span>


                                )


                            )

                        }


                    </div>





                    {/* 브랜드명 */}

                    <div className={styles.brandTitle}>

                        SEOUL MARKET

                    </div>





                    {/* 서비스 설명 */}

                    <h1>

                        농수산물 가격 비교 서비스

                    </h1>



                    <p>

                        신선한 가격 정보를 한눈에 비교하세요

                    </p>



                </div>








                {/* ======================
                    로그인 영역
                ====================== */}


                <div className={styles.loginBox}>


                    <h2>

                        로그인

                    </h2>



                    <p className={styles.loginGuide}>

                        서울의 신선한 농수산물 가격을 비교하세요

                    </p>





                    {/* 로그인 폼 */}

                    <LoginForm />








                    {/* 메뉴 링크 */}

                    <div className={styles.links}>


                        <Link

                            to="/signup"

                            className={styles.link}

                        >

                            회원가입

                        </Link>





                        <span className={styles.divider}>

                            |

                        </span>





                        <Link

                            to="/find-id"

                            className={styles.link}

                        >

                            아이디 찾기

                        </Link>





                        <span className={styles.divider}>

                            /

                        </span>





                        <Link

                            to="/find-password"

                            className={styles.link}

                        >

                            비밀번호 찾기

                        </Link>



                    </div>



                </div>



            </div>



        </div>


    );

}


export default LoginPage;