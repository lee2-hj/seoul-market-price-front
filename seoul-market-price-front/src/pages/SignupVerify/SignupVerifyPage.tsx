import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

import PassAuth from "@/features/auth/components/PassAuth";
import { checkMemberApi } from "@/api/api";
import { savePassVerifiedInfo } from "@/lib/signupFlow";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const passButtonClass =
  "inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:pointer-events-none disabled:opacity-50 sm:rounded-2xl";

function SignupVerifyPage() {
  const navigate = useNavigate();

  /* =========================
     PASS 인증 성공

     인증된 이름/휴대폰 번호로 이미 가입된 회원인지 먼저 확인한다.
     이미 가입된 회원이면 로그인 화면으로 안내하고, 그렇지 않으면
     기존대로 회원가입 화면으로 이동한다. PASS로 확인된 이름/휴대폰
     번호는 sessionStorage에 저장해, /signup 새로고침 시에도 값이
     유지되도록 한다.
  ========================= */
  const formatPhoneNumber = (value: string): string => {
    if (!value) return "";
    const raw = value.replace(/[^0-9]/g, "");
    if (raw.length <= 3) return raw;
    if (raw.length <= 7) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
    if (raw.length <= 10) return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
    return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
  };

  const handleSuccess = async (result: {
    identityVerificationId: string;
    name: string;
    phoneNumber: string;
  }) => {
    try {
      const { isduplicated } = await checkMemberApi(
        result.name,
        result.phoneNumber
      );

      if (isduplicated) {
        alert("이미 가입된 회원입니다");
        navigate("/login");
        return;
      }
    } catch (error) {
      console.error("회원 가입 여부 확인 오류", error);
      alert("회원 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    savePassVerifiedInfo({
      name: result.name,
      phone: formatPhoneNumber(result.phoneNumber),
      identityVerificationId: result.identityVerificationId,
    });

    navigate("/signup", { replace: true });
  };

  return (
    <div className="tw-scope flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-[#f5f8f3] to-white px-4 py-10 sm:px-6">
      <div className="flex w-full max-w-md flex-col items-center gap-5 sm:max-w-lg max-[900px]:gap-4 max-[600px]:gap-[14px] max-[380px]:gap-3">
        {/* =========================
            로고
        ========================== */}

        <Link to="/" style={{ textDecoration: "none" }} className="block no-underline">
          <img
            src="/logo.png"
            alt="싸부 로고"
            className="mx-auto block h-[145px] sm:h-[160px] w-auto max-[900px]:h-32 max-[600px]:h-28 max-[380px]:h-24 object-contain drop-shadow-sm"
          />
        </Link>

        {/* =========================
            본인인증 카드
        ========================== */}

        <Card className="w-full rounded-2xl border-border/60 shadow-lg sm:rounded-3xl">
          <CardHeader className="items-center gap-2 px-6 pb-2 pt-8 text-center sm:px-8">
            <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-primary">
              <ShieldCheck className="size-7" />
            </span>

            <CardTitle className="text-xl font-extrabold sm:text-2xl">
              본인인증이 필요해요
            </CardTitle>

            <CardDescription className="text-sm leading-relaxed">
              PASS 인증으로 이름과 휴대폰 번호를
              <br />
              안전하게 확인할게요
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-2 pt-4 sm:px-8">
            <CardDescription className="rounded-xl bg-secondary/60 px-4 py-3 text-center text-xs leading-relaxed">
              인증이 완료되면 회원가입 화면으로 자동 이동하며
              <br />
              이름과 휴대폰 번호가 자동으로 입력됩니다
            </CardDescription>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 px-6 pb-8 pt-4 sm:px-8">
            <PassAuth onSuccess={handleSuccess} className={passButtonClass} />
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default SignupVerifyPage;
