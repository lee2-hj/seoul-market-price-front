import styles from "./SocialLogin.module.css";
import { getKakaoLoginUrl } from "@/api/api";

interface SocialLoginProps {
  mode?: "login" | "signup";
}

function SocialLogin({ mode = "login" }: SocialLoginProps) {
  const handleKakao = () => {
    console.log(mode === "login" ? "카카오 로그인" : "카카오 회원가입");

    // Spring Boot OAuth 연결
    window.location.href = getKakaoLoginUrl();
  };

  const handleGoogle = () => {
    console.log(mode === "login" ? "구글 로그인" : "구글 회원가입");

    // Spring Boot OAuth 연결
    window.location.href = "http://localhost:8081/oauth2/authorization/google";
  };

  return (
    <div className={styles.socialBox}>
      {/* 구분선 */}

      <div className={styles.divider}>
        <span></span>

        <p>또는</p>

        <span></span>
      </div>

      {/* 카카오 */}

      <button
        type="button"
        className={styles.kakaoButton}
        onClick={handleKakao}
      >
        {mode === "login" ? "카카오로 로그인" : "카카오로 회원가입"}
      </button>

      {/* 구글 */}

      <button
        type="button"
        className={styles.googleButton}
        onClick={handleGoogle}
      >
        {mode === "login" ? "구글로 로그인" : "구글로 회원가입"}
      </button>
    </div>
  );
}

export default SocialLogin;
