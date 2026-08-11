import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";

import { signupApi, checkUserIdApi } from "@/api/api";
import { clearAllSignupStorage, getPassVerifiedInfo } from "@/lib/signupFlow";
import { isValidEmail, isValidPassword } from "@/lib/validators";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import AddressSearchLayer from "./AddressSearchLayer";

/* ===============================
   회원가입 폼 입력값 타입
=============================== */

type SignupFormValues = {
  userId: string;
  password: string;
  passwordCheck: string;
  name: string;
  phone: string;
  zipCode: string;
  address: string;
  detailAddress: string;
  email: string;
  is_terms_agreed: string;
  is_location_agreed: string;
  is_privacy_agreed: string;
  // my_location: string; 현재 자치구 데이터가 없는 관계로 추후 추가
};

const defaultValues: SignupFormValues = {
  userId: "",
  password: "",
  passwordCheck: "",
  name: "",
  phone: "",
  zipCode: "",
  address: "",
  detailAddress: "",
  email: "",
  is_terms_agreed: "",
  is_location_agreed: "",
  is_privacy_agreed: "",
};

function SignupPage() {
  const navigate = useNavigate();

  // Form handling (react-hook-form)
  const { getValues, setValue, watch } = useForm<SignupFormValues>({
    defaultValues,
  });

  // ID duplication check state
  const [isIdUnique, setIsIdUnique] = useState<boolean | null>(null);
  const [checkingId, setCheckingId] = useState(false);

  // Reset ID check when userId changes
  const userId = watch("userId");
  useEffect(() => {
    setIsIdUnique(null);
  }, [userId]);






  /* ===============================
     PASS 인증
  =============================== */

  const [phoneVerified, setPhoneVerified] = useState(false);

  /* ===============================
     주소 검색 레이어팝업
  =============================== */

  const [isAddressSearchOpen, setIsAddressSearchOpen] = useState(false);

  /* ===============================
     /signup/verify에서 PASS 인증 완료 후
     저장된 이름/휴대폰 번호 자동 입력

     sessionStorage에서 읽어오므로 새로고침 후에도 유지된다.
  =============================== */

  useEffect(() => {
    const verified = getPassVerifiedInfo();

    if (!verified) {
      return;
    }

    setValue("name", verified.name);
    setValue("phone", verified.phone);

    setPhoneVerified(true);
  }, [setValue]);

  /* ===============================
     입력 변경
  =============================== */

  const handleFieldChange =
    (field: keyof SignupFormValues) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(field, e.target.value);
      };

  // ID duplicate check handler
  const handleCheckId = async () => {
    if (!userId.trim()) {
      alert('아이디를 입력해주세요.');
      return;
    }
    setCheckingId(true);
    try {
      const available = await checkUserIdApi(userId.trim());
      // API returns { available: boolean } or boolean directly
      const isAvailable = typeof available === 'object' && typeof available.available === 'boolean' ? available.available : !!available;
      setIsIdUnique(isAvailable);
      if (isAvailable) {
        alert('사용 가능한 아이디입니다.');
      } else {
        alert('이미 사용 중인 아이디입니다.');
      }
    } catch (err) {
      console.error(err);
      alert('아이디 확인 중 오류가 발생했습니다.');
    } finally {
      setCheckingId(false);
    }
  };

  /* ===============================
     주소 검색
  =============================== */

  const handleAddressSearch = () => {
    setIsAddressSearchOpen(true);
  };

  const handleAddressComplete = (data: DaumPostcodeData) => {
    let address =
      data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;

    if (data.userSelectedType === "R") {
      let extraAddress = "";

      if (data.bname && /(동|로|가)$/.test(data.bname)) {
        extraAddress += data.bname;
      }

      if (data.buildingName && data.apartment === "Y") {
        extraAddress += extraAddress
          ? `, ${data.buildingName}`
          : data.buildingName;
      }

      if (extraAddress) {
        address += ` (${extraAddress})`;
      }
    }

    setValue("zipCode", data.zonecode);
    setValue("address", address);
    setIsAddressSearchOpen(false);
  };

  /* ===============================
     회원가입 (TanStack Query mutation)
  =============================== */

  const signupMutation = useMutation({
    mutationKey: ["signupStart"],
    mutationFn: (values: SignupFormValues) => {
      const verified = getPassVerifiedInfo();

      if (!verified) {
        throw new Error("PASS 본인인증 정보가 없습니다.");
      }

      return signupApi({
        name: values.name.trim(),
        userId: values.userId.trim(),
        identityVerificationId: verified.identityVerificationId,
        password: values.password,
        phone: values.phone.trim(),
        address: values.address,
        addressDetail: values.detailAddress,
        zipcode: values.zipCode,
        email: values.email,
        is_terms_agreed: values.is_terms_agreed === "1" ? 1 : 0,
        is_location_agreed: values.is_location_agreed === "1" ? 1 : 0,
        is_privacy_agreed: values.is_privacy_agreed === "1" ? 1 : 0,
      });
    },
    onSuccess: async (data) => {
      clearAllSignupStorage();
      await alert(data.msg);
      navigate("/login");
    },
    onError: async (error) => {
      console.error("회원가입 오류", error);

      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "회원가입 실패";

      await alert(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    /* /signup/terms 에서 sessionStorage에 저장해둔 약관 동의 값을
       폼 데이터로 가져와 회원가입 요청에 함께 실어보낸다. */
    setValue(
      "is_terms_agreed",
      sessionStorage.getItem("is_terms_agreed") ?? ""
    );
    setValue(
      "is_location_agreed",
      sessionStorage.getItem("is_location_agreed") ?? ""
    );
    setValue(
      "is_privacy_agreed",
      sessionStorage.getItem("is_privacy_agreed") ?? ""
    );

    const values = getValues();

    if (!values.userId) {
      alert("아이디를 입력해주세요.");
      return;
    }

    if (!values.password) {
      alert("비밀번호를 입력해주세요.");
      return;
    }

    if (!isValidPassword(values.password)) {
      alert(
        "비밀번호는 영문, 숫자, 특수문자만 사용하여 8자 이상 16자 이하로 입력해주세요."
      );
      return;
    }

    if (!values.passwordCheck) {
      alert("비밀번호 확인을 입력해주세요.");
      return;
    }

    if (values.password !== values.passwordCheck) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (values.email && !isValidEmail(values.email)) {
      alert("이메일 형식이 올바르지 않습니다.");
      return;
    }

    signupMutation.mutate(values);
  };

  return (
    <div className="tw-scope flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-[#f5f8f3] to-white px-4 py-10 sm:px-6">
      <div className="flex w-full max-w-[520px] flex-col items-center gap-5 max-[900px]:gap-4 max-[600px]:gap-[14px] max-[380px]:gap-3">
        {/* =========================
            로고
        ========================== */}

        <Link to="/" style={{ textDecoration: "none" }} className="block no-underline">
          <img
            src="/logo.png"
            alt="싸부 로고"
            className="mx-auto block h-[145px] sm:h-[160px] w-auto max-[900px]:h-32 max-[600px]:h-28 object-contain drop-shadow-sm"
          />
        </Link>

        {/* =========================
            회원가입 카드
        ========================== */}

        <Card className="w-full rounded-2xl border-border/60 shadow-lg sm:rounded-3xl">
          <CardContent className="px-6 py-8 sm:px-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
              <div className="flex flex-col gap-2">
                <Label htmlFor="userId">
                  아이디<span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="userId"
                    type="text"
                    name="userId"
                    placeholder="아이디"
                    className="h-11"
                    value={watch("userId")}
                    onChange={(e) => setValue("userId", e.target.value)}
                  />
                  <Button
                    type="button"
                    className="h-11 shrink-0 px-3 sm:px-4"
                    onClick={handleCheckId}
                    disabled={checkingId || signupMutation.isPending}
                  >
                    {checkingId ? '확인 중...' : '중복 확인'}
                  </Button>
                </div>
                {isIdUnique === true && (
                  <p className="text-xs font-semibold text-primary">
                    ✔ 사용 가능한 아이디입니다.
                  </p>
                )}
                {isIdUnique === false && (
                  <p className="text-xs font-semibold text-red-500">
                    ❌ 이미 사용 중인 아이디입니다.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password">
                  비밀번호<span className="text-red-500">*</span>
                </Label>

                <Input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="비밀번호"
                  className="h-11"
                  value={watch("password")}
                  onChange={(e) => setValue("password", e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="passwordCheck">
                  비밀번호 확인<span className="text-red-500">*</span>
                </Label>

                <Input
                  id="passwordCheck"
                  type="password"
                  name="passwordCheck"
                  placeholder="비밀번호 확인"
                  className="h-11"
                  value={watch("passwordCheck")}
                  onChange={(e) => setValue("passwordCheck", e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="name">
                  이름<span className="text-red-500">*</span>
                </Label>

                <Input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="이름"
                  className="h-11"
                  value={watch("name")}
                  disabled={phoneVerified}
                  readOnly
                  onChange={handleFieldChange("name")}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">
                  전화번호<span className="text-red-500">*</span>
                </Label>

                <Input
                  id="phone"
                  type="tel"
                  name="phone"
                  placeholder="휴대폰 번호"
                  className="h-11"
                  value={watch("phone")}
                  disabled={phoneVerified}
                  readOnly
                  onChange={handleFieldChange("phone")}
                />

                {phoneVerified && (
                  <p className="text-xs font-semibold text-primary">
                    ✔ PASS 휴대폰 인증 완료
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="address">주소</Label>

                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 border-0 px-3 hover:cursor-pointer sm:px-4"
                    onClick={handleAddressSearch}
                  >
                    주소검색
                  </Button>
                </div>

                <Input
                  id="zipCode"
                  type="text"
                  name="zipCode"
                  placeholder="우편번호"
                  maxLength={6}
                  className="h-11 w-full sm:w-[130px]"
                  value={watch("zipCode")}
                  onChange={(e) => setValue("zipCode", e.target.value)}
                />

                <Input
                  id="address"
                  type="text"
                  name="address"
                  placeholder="주소"
                  className="h-11"
                  value={watch("address")}
                  onChange={(e) => setValue("address", e.target.value)}
                />
              </div>

              <Input
                type="text"
                name="detailAddress"
                placeholder="상세주소"
                className="h-11"
                value={watch("detailAddress")}
                onChange={(e) => setValue("detailAddress", e.target.value)}
              />

              <div className="flex flex-col gap-2">
                <Label>이메일</Label>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    type="text"
                    placeholder="예) abc@naver.com"
                    className="h-11 w-full"
                    value={watch("email")}
                    onChange={e => setValue("email", e.target.value)}
                  />
                </div>
              </div>

                <Button
                  type="submit"
                  size="lg"
                  className="mt-1 w-full border-0 hover:cursor-pointer"
                  disabled={signupMutation.isPending || isIdUnique !== true}
                >
                {signupMutation.isPending ? "가입 중..." : "가입하기"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <AddressSearchLayer
        open={isAddressSearchOpen}
        onClose={() => setIsAddressSearchOpen(false)}
        onComplete={handleAddressComplete}
      />
    </div>
  );
}

export default SignupPage;
