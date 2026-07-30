import styles from "./SocialLogin.module.css";
import { getKakaoLoginUrl } from "@/api/api";

interface SocialLoginProps { mode?: "login" | "signup";}

function SocialLogin({mode = "login"
}: SocialLoginProps) {

    const handleKakao = () => {
        console.log(
            mode === "login"
                ? "카카오 로그인"
                : "카카오 회원가입"
        );

        // Spring Boot OAuth 연결
        window.location.href =
            getKakaoLoginUrl();};
    return (
        <div className={styles.socialBox}>
            {/* 또는 구분선 */}
            <div className={styles.divider}>
                <span></span><p>또는</p><span></span>
            </div>
            <button
                type="button"
                className={styles.kakaoButton}
                onClick={handleKakao}>

                {
                    mode === "login"
                    ? "카카오로 로그인"
                    : "카카오로 회원가입"
                }


            </button>


        </div>


    );

}


export default SocialLogin;