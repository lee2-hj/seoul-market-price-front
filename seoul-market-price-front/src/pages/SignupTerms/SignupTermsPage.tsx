import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/* =========================
   약관 데이터

   실제 서비스 적용 전 레이아웃 확인용 임시 텍스트
========================= */

type TermKey = "service" | "location" | "privacy";

interface TermItem {
  key: TermKey;
  required: boolean;
  title: string;
  content: string;
}

const TERMS: TermItem[] = [
  {
    key: "service",
    required: true,
    title: "이용약관",
    content: `제1조 (목적)
이 약관은 싸부(이하 "회사")가 제공하는 부동산 시세 및 실거래가 정보 관련 서비스(이하 "서비스")의 이용조건 및 절차, 회사와 회원의 권리·의무 및 책임사항 등을 규정함을 목적으로 합니다.

제2조 (정의)
① "서비스"란 회사가 제공하는 주변 부동산 매물 시세 및 실거래가 정보 제공, 회원 관리 등 일체의 서비스를 의미합니다.
② "회원"이란 본 약관에 동의하고 서비스 이용계약을 체결한 자를 말합니다.

제3조 (약관의 효력 및 변경)
① 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 공지함으로써 효력이 발생합니다.
② 회사는 관련 법령을 위반하지 않는 범위에서 약관을 개정할 수 있으며, 개정 시 적용일자 및 개정사유를 명시하여 사전 공지합니다.

제4조 (서비스의 제공 및 변경)
회사는 부동산 시세 정보, 위치 기반 매물 정보 등을 안정적으로 제공하기 위해 노력하며, 서비스의 내용은 운영상·기술상 필요에 따라 변경될 수 있습니다.

제5조 (회원가입)
회원가입은 이용자가 약관 내용에 동의하고 회사가 정한 절차에 따라 가입을 신청한 후, 회사가 이를 승낙함으로써 체결됩니다.

제6조 (회원의 의무)
회원은 관계 법령, 본 약관의 규정, 이용안내 및 서비스와 관련하여 공지한 주의사항을 준수하여야 하며, 타인의 정보를 도용하거나 서비스 운영을 방해하는 행위를 해서는 안 됩니다.

제7조 (계약해지 및 이용제한)
회원은 언제든지 서비스 내 회원탈퇴를 통해 이용계약을 해지할 수 있으며, 회사는 회원이 약관을 위반한 경우 서비스 이용을 제한할 수 있습니다.

제8조 (면책조항)
회사는 천재지변 등 불가항력적 사유로 서비스를 제공할 수 없는 경우 책임이 면제되며, 회원이 게재한 정보의 신뢰성에 대해서는 책임을 지지 않습니다.`,
  },
  {
    key: "privacy",
    required: true,
    title: "개인정보 수집 및 이용 동의",
    content: `1. 수집 목적
회원 식별 및 관리, 부동산 시세 및 알림 등 맞춤 서비스 제공, 이벤트 및 혜택 정보 안내

2. 수집 항목
아이디, 비밀번호, 이름, 휴대전화번호, 이메일, 주소

3. 보유 및 이용기간
회원 탈퇴 시까지 보관하며, 탈퇴 후에는 관계 법령에 따라 일정 기간 보관 후 지체 없이 파기합니다.

4. 동의를 거부할 권리 및 불이익
이용자는 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다. 다만 선택 항목에 동의하지 않아도 서비스 이용에는 제한이 없으며, 관련 맞춤 혜택 안내가 제공되지 않을 수 있습니다.`,
  },
  {
    key: "location",
    required: false,
    title: "위치기반서비스 이용약관",
    content: `제1조 (목적)
이 약관은 싸부(싸게 보는 부동산)가 제공하는 위치기반서비스와 관련하여 회사와 회원의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (서비스 내용)
회사는 회원의 위치정보를 이용하여 주변 부동산 실거래가 및 매물 시세 안내 등의 서비스를 제공합니다.

제3조 (개인위치정보의 수집)
회사는 회원의 단말기에 내장된 GPS 또는 네트워크를 통해 확인된 위치정보를 수집할 수 있으며, 이는 서비스 제공 목적으로만 이용됩니다.

제4조 (위치정보의 이용 및 제공)
수집된 위치정보는 주변 매장 안내, 거리순 정렬 등 서비스 제공 목적으로만 이용되며, 회원의 동의 없이 제3자에게 제공되지 않습니다.

제5조 (위치정보의 보유 및 이용기간)
위치정보는 서비스 제공이 완료되면 즉시 파기하며, 별도로 저장하지 않는 것을 원칙으로 합니다.

제6조 (동의의 철회)
회원은 언제든지 단말기 설정 또는 서비스 내 설정을 통해 위치정보 이용에 대한 동의를 철회할 수 있으며, 이 경우 위치기반 서비스 이용이 제한될 수 있습니다.`,
  },
];

/* =========================
   체크마크 아이콘 버튼

   기존 shadcn Checkbox 대신,
   참고 디자인처럼 원형 체크 아이콘으로 통일
========================= */

function AgreeCheck({
  checked,
  size = "default",
}: {
  checked: boolean;
  size?: "default" | "sm";
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border transition-colors",
        size === "default" ? "size-5" : "size-4",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-muted-foreground/30 bg-transparent text-transparent"
      )}
    >
      <Check className={cn(size === "default" ? "size-3.5" : "size-3", "stroke-[3]")} />
    </span>
  );
}

function SignupTermsPage() {
  const navigate = useNavigate();

  const [agreements, setAgreements] = useState<Record<TermKey, boolean>>({
    service: false,
    location: false,
    privacy: false,
  });

  const [expandedKey, setExpandedKey] = useState<TermKey | null>(null);

  const isAllAgreed = TERMS.every((term) => agreements[term.key]);

  const isRequiredAgreed = TERMS.filter((term) => term.required).every(
    (term) => agreements[term.key]
  );

  const handleToggleAll = (checked: boolean) => {
    setAgreements(
      TERMS.reduce(
        (acc, term) => ({ ...acc, [term.key]: checked }),
        {} as Record<TermKey, boolean>
      )
    );
  };

  const handleToggle = (key: TermKey) => {
    setAgreements((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExpand = (key: TermKey) => {
    setExpandedKey((prev) => (prev === key ? null : key));
  };

  const handleNext = () => {
    if (!isRequiredAgreed) {
      return;
    }

    sessionStorage.setItem("is_terms_agreed", agreements.service ? "1" : "0");
    sessionStorage.setItem(
      "is_location_agreed",
      agreements.location ? "1" : "0"
    );
    sessionStorage.setItem(
      "is_privacy_agreed",
      agreements.privacy ? "1" : "0"
    );

    navigate("/signup/verify");
  };

  return (
    <div className="tw-scope flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-[#f5f8f3] to-white px-4 py-10 sm:px-6">
      <div className="flex w-full max-w-md flex-col items-center gap-5 sm:max-w-lg max-[900px]:gap-4 max-[600px]:gap-[14px] max-[380px]:gap-3">
        {/* =========================
            로고
        ========================== */}

        <Link to="/" style={{ textDecoration: "none" }} className="block no-underline">
          <img
            src="/logo-teal.png"
            alt="싸부 로고"
            className="mx-auto block h-[145px] sm:h-[160px] w-auto max-[900px]:h-32 max-[600px]:h-28 max-[380px]:h-24 object-contain drop-shadow-sm"
          />
        </Link>

        {/* =========================
            약관 동의 카드
        ========================== */}

        <Card className="w-full rounded-2xl border-border/60 shadow-lg sm:rounded-3xl">
          <CardHeader className="gap-1 px-6 pb-4 pt-8 sm:px-8">
            <CardTitle className="text-xl font-extrabold leading-snug sm:text-2xl">
              회원가입을 위한
              <br />
              약관 동의가 필요해요
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col px-6 pb-6 sm:px-8">
            {/* 전체 동의 */}

            <button
              type="button"
              onClick={() => handleToggleAll(!isAllAgreed)}
              className="flex w-full items-start gap-3 border-0 bg-transparent pb-4 text-left"
            >
              <span className="mt-0.5">
                <AgreeCheck checked={isAllAgreed} />
              </span>

              <span className="flex flex-col gap-1">
                <span className="text-base font-bold text-foreground">
                  전체 동의하기
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  선택 항목에 동의하지 않아도 서비스 이용이 가능합니다
                </span>
              </span>
            </button>

            <div className="h-px w-full bg-border" />

            {/* 개별 약관 목록 */}

            <div className="flex w-full flex-col">
              {TERMS.map((term) => (
                <div key={term.key} className="w-full">
                  <div className="flex w-full items-center gap-3 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggle(term.key)}
                      className="flex min-w-0 flex-1 items-center gap-3 border-0 bg-transparent text-left"
                    >
                      <AgreeCheck checked={agreements[term.key]} />

                      <span className="truncate text-sm text-foreground sm:text-[15px]">
                        <span
                          className={cn(
                            "mr-1.5 font-bold",
                            term.required
                              ? "text-primary"
                              : "text-muted-foreground"
                          )}
                        >
                          [{term.required ? "필수" : "선택"}]
                        </span>
                        {term.title}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExpand(term.key)}
                      aria-label={`${term.title} 상세보기`}
                      className="flex shrink-0 items-center gap-0.5 border-0 bg-transparent text-xs font-medium text-muted-foreground/80 underline underline-offset-2 hover:text-foreground"
                    >
                      보기
                      <ChevronDown
                        className={cn(
                          "size-3.5 transition-transform",
                          expandedKey === term.key && "rotate-180"
                        )}
                      />
                    </button>
                  </div>

                  {expandedKey === term.key && (
                    <div className="mb-3 max-h-40 w-full overflow-y-auto whitespace-pre-line rounded-xl px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                      {term.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 px-6 pb-8 pt-0 sm:px-8">
            <Button
              type="button"
              size="lg"
              disabled={!isRequiredAgreed}
              onClick={handleNext}
              className="w-full rounded-xl text-base font-bold disabled:bg-muted disabled:text-muted-foreground sm:rounded-2xl"
            >
              다음
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default SignupTermsPage;
