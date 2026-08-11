import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";
import LoginForm from "@/features/auth/components/LoginForm";
import SocialLogin from "@/features/auth/components/SocialLogin";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function LoginPage() {
  return (
    <div className="tw-scope flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-[#f5f8f3] to-white px-[20px] py-[40px] max-[600px]:px-[15px] max-[600px]:py-[30px]">
      {/*
        기존 CSS의 @keyframes fadeInRight(0.8s)를 순수 Tailwind
        유틸리티만으로는 표현할 수 없어(전역 파일을 건드리지 않기
        위해) 이 컴포넌트 안에서만 쓰는 키프레임을 인라인으로 선언한다.
      */}
      <style>{`
        @keyframes login-card-fade-in {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div className="flex w-full flex-col items-center gap-5 max-[900px]:gap-4 max-[600px]:gap-[14px] max-[380px]:gap-3">
        {/* =========================
            로고
        ========================== */}

        <Link to="/" style={{ textDecoration: "none" }} className="no-underline">
          <img
            src="/logo.png"
            alt="싸부 로고"
            className="mx-auto block h-[145px] sm:h-[160px] w-auto max-[900px]:h-32 max-[600px]:h-28 max-[380px]:h-24 object-contain drop-shadow-sm"
          />
        </Link>

        {/* =========================
            로그인 카드
        ========================== */}

        <Card
          className={cn(
            "w-[380px] max-w-full rounded-[25px] border-0 bg-card p-[45px]",
            "shadow-[0_20px_50px_rgba(0,0,0,0.15)]",
            "animate-[login-card-fade-in_0.8s_ease_both]",
            "max-[900px]:p-[40px]",
            "max-[600px]:rounded-[20px] max-[600px]:px-[20px] max-[600px]:py-[30px]",
            "max-[380px]:px-[15px] max-[380px]:py-[25px]"
          )}
        >
          <CardContent className="p-0">
            <LoginForm />

            <SocialLogin mode="login" />

            {/* 회원가입 안내 */}

            <div className="mt-[25px] flex items-center justify-center text-[14px] text-[#888]">
              <span>아직 계정이 없으신가요?</span>

              <Button
                asChild
                variant="link"
                className="ml-[10px] h-auto p-0 font-bold text-primary no-underline hover:underline"
              >
                <Link to="/signup/select">회원가입</Link>
              </Button>
            </div>

            {/* 아이디 / 비밀번호 찾기 */}

            <div className="mt-[20px] flex flex-wrap items-center justify-center gap-[15px]">
              <Button
                asChild
                variant="link"
                className="h-auto p-0 text-[14px] font-normal text-[#777] no-underline hover:font-bold hover:text-primary hover:no-underline"
              >
                <Link to="/find-id">아이디 찾기</Link>
              </Button>

              <span className="text-[#aaa]">|</span>

              <Button
                asChild
                variant="link"
                className="h-auto p-0 text-[14px] font-normal text-[#777] no-underline hover:font-bold hover:text-primary hover:no-underline"
              >
                <Link to="/find-password">비밀번호 찾기</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default LoginPage;
