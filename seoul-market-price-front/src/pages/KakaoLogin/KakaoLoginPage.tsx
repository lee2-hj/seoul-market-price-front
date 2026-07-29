import styles from "./KakaoLoginPage.module.css";


function KakaoLoginPage() {


    const handleKakaoLogin = () => {


        // Spring Boot OAuth2 카카오 인증 주소
        window.location.href =
            "http://localhost:8080/oauth2/authorization/kakao";


    };



    return (


        <div className={styles.kakaoPage}>


            <div className={styles.kakaoBox}>


                <div className={styles.logo}>

                    🛒 오늘장

                </div>




                <h1>

                    카카오로 간편하게 시작하세요

                </h1>




                <p>

                    농수산물 가격 비교 서비스

                    <br />

                    오늘 가장 저렴한 가격을 찾아드립니다.

                </p>





                <button

                    className={styles.kakaoButton}

                    onClick={handleKakaoLogin}

                >

                    카카오 로그인


                </button>




            </div>



        </div>


    );


}


export default KakaoLoginPage;