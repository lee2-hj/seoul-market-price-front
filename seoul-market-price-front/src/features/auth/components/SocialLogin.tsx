import { useState } from "react";

import styles from "./SocialLogin.module.css";

import { getKakaoLoginUrl, getGoogleLoginUrl } from "@/api/api";

interface SocialLoginProps {
  mode?: "login" | "signup";
}

function SocialLogin({ mode = "login" }: SocialLoginProps) {
  const [loading, setLoading] = useState(false);

  /*
    카카오 OAuth 이동

  */

  const handleKakaoLogin = () => {
    if (loading) {
      return;
    }

    setLoading(true);

    window.location.href = getKakaoLoginUrl(mode);
  };

  /*
    구글 OAuth 이동

  */

  const handleGoogleLogin = () => {
    if (loading) {
      return;
    }

    setLoading(true);

    window.location.href = getGoogleLoginUrl(mode);
  };

  const kakaoText = mode === "login" ? "카카오로 로그인" : "카카오로 회원가입";

  const googleText = mode === "login" ? "구글로 로그인" : "구글로 회원가입";

  return (
    <div className={styles.socialBox}>
      {/* =====================
          구분선
      ====================== */}

      <div className={styles.divider}>
        <span></span>

        <p>또는</p>

        <span></span>
      </div>

      {/* =====================
          카카오 로그인
      ====================== */}

      <button
        type="button"
        className={styles.kakaoButton}
        onClick={handleKakaoLogin}
        disabled={loading}
        aria-label={kakaoText}
      >
        {loading ? "이동중..." : kakaoText}
      </button>

      {/* =====================
          구글 로그인
      ====================== */}

      <button
        type="button"
        className={styles.googleButton}
        onClick={handleGoogleLogin}
        disabled={loading}
        aria-label={googleText}
      >
        {loading ? "이동중..." : googleText}
      </button>
    </div>
  );
}

export default SocialLogin;
