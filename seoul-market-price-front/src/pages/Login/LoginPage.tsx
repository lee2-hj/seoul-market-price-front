import { useState } from "react";
import { Link } from "react-router-dom";

import LoginForm from "@/features/auth/components/LoginForm";
import SocialLogin from "@/features/auth/components/SocialLogin";

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


        {/* 브랜드 영역 */}

        <div className={styles.brandBox}>


          {/* 아이콘 */}

          <div className={styles.categoryIcons}>

            {
              categoryItems.map((item, index) => (

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


              ))

            }

          </div>







          {/* 브랜드 문구 */}

          <div className={styles.brandBox}>


            <div className={styles.brandTitle}>
              싸.농
            </div>


            <div className={styles.brandSubTitle}>
              <span className={styles.point}>싸</span>게 보는 내 주변{" "} <span className={styles.point}>농</span>수산물
            </div>


            <h1>

              <span className={styles.catchPhrase}>
                시세 미쳤습니까 휴먼?
              </span>


              <span className={styles.description}>
                월급 빼고 다 오르는데,
                <br />
                내 밥상 주식은 언제 사야 쌈?
              </span>

            </h1>


          </div>


        </div>









        {/* 로그인 카드 */}


        <div className={styles.loginBox}>


          <h2>

            로그인

          </h2>




          <p className={styles.loginGuide}>


            제철인지, 바가지인지 궁금할 땐?

            <br />

            "오늘 싸다! 지금이 풀매수 타이밍"


          </p>





          <LoginForm />





          <SocialLogin mode="login" />






          {/* 회원가입 안내 */}


          <div className={styles.signupGuide}>


            <span>

              아직 계정이 없으신가요?

            </span>


            <Link to="/signup">

              회원가입

            </Link>


          </div>






          {/* 아이디 / 비밀번호 찾기 */}


          <div className={styles.links}>


            <Link to="/find-id">

              아이디 찾기

            </Link>



            <span>

              |

            </span>



            <Link to="/find-password">

              비밀번호 찾기

            </Link>


          </div>



        </div>



      </div>



    </div>


  );


}


export default LoginPage;