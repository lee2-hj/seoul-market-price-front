import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, MessageCircle, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import { startSignupFlow } from "@/lib/signupFlow";
import { getKakaoLoginUrl, getGoogleLoginUrl } from "@/api/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/* =========================
   구글 로고 (G)
========================= */

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );
}

/* =========================
   회원가입 선택 항목

   shadcn Button(asChild)으로 렌더링하되, Button의 기본
   크기/정렬/타이포그래피 클래스(h-10, justify-center,
   whitespace-nowrap, font-medium 등)가 이 커스텀 행 레이아웃에
   그대로 새어 들어오지 않도록 명시적으로 되돌린다.
========================= */

const optionRowClass =
  "flex h-auto w-full items-center justify-start gap-3 whitespace-normal rounded-xl border border-border bg-card px-3 py-3 text-left font-normal no-underline transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 sm:gap-4 sm:rounded-2xl sm:px-4 sm:py-4";

interface SignupOptionProps {
  icon: ReactNode;
  iconWrapClassName: string;
  title: string;
  description: string;
  to?: string;
  onClick?: () => void;
  className?: string;
}

function SignupOption({
  icon,
  iconWrapClassName,
  title,
  description,
  to,
  onClick,
  className,
}: SignupOptionProps) {
  const content = (
    <>
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full sm:size-11",
          iconWrapClassName
        )}
      >
        {icon}
      </span>

      <span className="flex min-w-0 flex-1 flex-col items-start">
        <span className="text-sm font-bold text-foreground sm:text-base">
          {title}
        </span>

        <span className="w-full truncate text-xs text-muted-foreground">
          {description}
        </span>
      </span>

      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </>
  );

  if (to) {
    return (
      <Button
        asChild
        variant="ghost"
        className={cn(optionRowClass, className)}
        onClick={onClick}
      >
        <Link to={to}>{content}</Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(optionRowClass, className)}
      onClick={onClick}
    >
      {content}
    </Button>
  );
}

function SignupSelectPage() {
  return (
    <div className="tw-scope flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-[#f5f8f3] to-white px-4 py-10 sm:px-6">
      <div className="flex w-full max-w-md flex-col items-center gap-5 sm:max-w-lg max-[900px]:gap-4 max-[600px]:gap-[14px] max-[380px]:gap-3">
        {/* =========================
            로고
        ========================== */}

        <Link to="/" className="block">
          <img
            src="/ssanong.svg"
            alt="싸농 로고"
            className="mx-auto h-[120px] w-auto max-[900px]:h-24 max-[600px]:h-[76px] max-[380px]:h-[68px]"
          />
        </Link>

        {/* =========================
            회원가입 선택 카드
        ========================== */}

        <Card className="w-full rounded-2xl shadow-lg sm:rounded-3xl">
          <CardHeader className="items-center gap-1 px-5 pb-2 pt-6 text-center sm:px-8 sm:pt-8">
            <CardTitle className="text-xl font-extrabold sm:text-2xl">
              회원가입
            </CardTitle>

            <CardDescription className="text-xs sm:text-sm">
              원하시는 방법으로 회원가입을 진행해주세요
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-2.5 px-5 pb-6 sm:gap-3 sm:px-8 sm:pb-8">
            <SignupOption
              to="/signup/terms"
              onClick={startSignupFlow}
              icon={<UserRound className="size-5" />}
              iconWrapClassName="bg-secondary text-primary"
              title="일반 회원가입"
              description="아이디와 비밀번호로 가입할게요"
            />

            <SignupOption
              onClick={() => {
                window.location.href = getKakaoLoginUrl("signup");
              }}
              className="hover:cursor-pointer"
              icon={<MessageCircle className="size-5 fill-[#191919]" />}
              iconWrapClassName="bg-[#FEE500] text-[#191919]"
              title="카카오로 회원가입"
              description="카카오 계정으로 간편하게 가입할게요"
            />

            <SignupOption
              onClick={() => {
                window.location.href = getGoogleLoginUrl("signup");
              }}
              className="hover:cursor-pointer"
              icon={<GoogleIcon className="size-5" />}
              iconWrapClassName="border border-border bg-white"
              title="구글로 회원가입"
              description="구글 계정으로 간편하게 가입할게요"
            />
          </CardContent>

          <CardFooter className="justify-center px-5 pb-6 pt-0 sm:px-8 sm:pb-8">
            <CardDescription>
              이미 계정이 있으신가요?{" "}
              <Button asChild variant="link" className="h-auto p-0 font-bold">
                <Link to="/login">로그인</Link>
              </Button>
            </CardDescription>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default SignupSelectPage;
