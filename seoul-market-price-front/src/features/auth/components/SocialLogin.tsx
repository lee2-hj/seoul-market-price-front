import { useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getKakaoLoginUrl, getGoogleLoginUrl } from "@/api/api";

interface SocialLoginProps {
  mode?: "login" | "signup";
}

const socialButtonBase =
  "h-[50px] w-full gap-[8px] rounded-[12px] text-[16px] font-bold shadow-none transition-all duration-300 hover:cursor-pointer active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none max-[600px]:h-[48px] max-[600px]:text-[15px]";

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

  const kakaoText = mode === "login" ? "카카오 로그인" : "카카오로 회원가입";

  const googleText = mode === "login" ? "구글 로그인" : "구글로 회원가입";

  return (
    <div className="mt-[20px] w-full">
      {/* =====================
          구분선
      ====================== */}

      <div className="my-[25px] flex w-full items-center gap-[12px] text-[14px] text-[#999] max-[600px]:my-[20px]">
        <span className="h-px flex-1 bg-[#ddd]" />

        <p className="m-0 whitespace-nowrap">또는</p>

        <span className="h-px flex-1 bg-[#ddd]" />
      </div>

      {/* =====================
          카카오 로그인
      ====================== */}

      <Button
        type="button"
        variant="ghost"
        onClick={handleKakaoLogin}
        disabled={loading}
        aria-label={kakaoText}
        className={cn(
          socialButtonBase,
          "border-0 bg-[#FEE500] text-[#191919] hover:-translate-y-0.5 hover:bg-[#FEE500] hover:text-[#191919] hover:shadow-[0_8px_15px_rgba(0,0,0,0.15)]"
        )}
      >
        {loading ? (
          "이동중..."
        ) : (
          <>
            <img
              src="/kakao-logo.svg"
              alt=""
              className="block h-[20px] w-[20px]"
            />
            {kakaoText}
          </>
        )}
      </Button>

      {/* =====================
          구글 로그인
      ====================== */}

      <Button
        type="button"
        variant="ghost"
        onClick={handleGoogleLogin}
        disabled={loading}
        aria-label={googleText}
        className={cn(
          socialButtonBase,
          "mt-[12px] border border-[#ddd] bg-white text-[#333] hover:-translate-y-0.5 hover:bg-[#f5f5f5] hover:text-[#333] hover:shadow-[0_8px_15px_rgba(0,0,0,0.12)]"
        )}
      >
        {loading ? (
          "이동중..."
        ) : (
          <>
            <img
              src="/google-logo.svg"
              alt=""
              className="block h-[20px] w-[20px]"
            />
            {googleText}
          </>
        )}
      </Button>
    </div>
  );
}

export default SocialLogin;
