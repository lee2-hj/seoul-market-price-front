import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { cn } from "../../lib/utils";

/* 회원가입 폼 입력값 타입 */

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

  /* PASS 인증 정보 */

  const verifiedInfo = getPassVerifiedInfo();

  const phoneVerified = verifiedInfo !== null;

  /* Form handling */

  const { getValues, setValue, control } = useForm<SignupFormValues>({
    defaultValues: {
      ...defaultValues,
      name: verifiedInfo?.name ?? "",
      phone: verifiedInfo?.phone ?? "",
    },
  });

  /* React Hook Form의 전체 값을 구독 */

  const formValues = useWatch({
    control,
  });

  const {
    userId = "",
    password = "",
    passwordCheck = "",
    name = "",
    phone = "",
    zipCode = "",
    address = "",
    detailAddress = "",
    email = "",
  } = formValues;

  /* ID 중복 확인 상태 */

  const [isIdUnique, setIsIdUnique] = useState<boolean | null>(null);
  const [checkedUserId, setCheckedUserId] = useState("");
  const [checkingId, setCheckingId] = useState(false);

  /*
   * 현재 입력한 아이디와 중복 확인을 완료한 아이디가 다르면
   * 중복 확인 결과를 사용하지 않는다.
   */

  const isIdCheckValid = isIdUnique === true && checkedUserId === userId.trim();

  /* 주소 검색 레이어팝업 */

  const [isAddressSearchOpen, setIsAddressSearchOpen] = useState(false);

  /* 입력 변경 */

  const handleFieldChange =
    (field: keyof SignupFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(field, e.target.value);
    };

  /* ID 중복 확인 */

  const handleCheckId = async () => {
    const trimmedUserId = userId.trim();

    if (!trimmedUserId) {
      alert("아이디를 입력해주세요.");
      return;
    }

    setCheckingId(true);

    try {
      const available = await checkUserIdApi(trimmedUserId);

      const isAvailable =
        typeof available === "object" &&
        typeof available.available === "boolean"
          ? available.available
          : !!available;

      setIsIdUnique(isAvailable);
      setCheckedUserId(trimmedUserId);

      if (isAvailable) {
        alert("사용 가능한 아이디입니다.");
      } else {
        alert("이미 사용 중인 아이디입니다.");
      }
    } catch (err) {
      console.error(err);

      setIsIdUnique(null);
      setCheckedUserId("");

      alert("아이디 확인 중 오류가 발생했습니다.");
    } finally {
      setCheckingId(false);
    }
  };

  /* 주소 검색 */

  const handleAddressSearch = () => {
    setIsAddressSearchOpen(true);
  };

  const handleAddressComplete = (data: DaumPostcodeData) => {
    let newAddress =
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
        newAddress += ` (${extraAddress})`;
      }
    }

    setValue("zipCode", data.zonecode);
    setValue("address", newAddress);
    setIsAddressSearchOpen(false);
  };

  /* 회원가입 mutation */

  const signupMutation = useMutation({
    mutationKey: ["signupStart"],

    mutationFn: (values: SignupFormValues) =>
      signupApi({
        name: values.name.trim(),
        userId: values.userId.trim(),
        password: values.password,
        phone: values.phone.trim(),
        address: values.address,
        addressDetail: values.detailAddress,
        zipcode: values.zipCode,
        email: values.email,
        is_terms_agreed: values.is_terms_agreed === "1" ? 1 : 0,
        is_location_agreed: values.is_location_agreed === "1" ? 1 : 0,
        is_privacy_agreed: values.is_privacy_agreed === "1" ? 1 : 0,
      }),

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

  /* 회원가입 */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    /*
     * 약관 동의 값은 sessionStorage에서 직접 가져온다.
     *
     * setValue() 후 바로 getValues()를 호출하는 방식 대신
     * 제출할 객체에 직접 넣어 최신 값을 사용한다.
     */

    const values: SignupFormValues = {
      ...getValues(),

      is_terms_agreed: sessionStorage.getItem("is_terms_agreed") ?? "",

      is_location_agreed: sessionStorage.getItem("is_location_agreed") ?? "",

      is_privacy_agreed: sessionStorage.getItem("is_privacy_agreed") ?? "",
    };

    if (!values.userId.trim()) {
      alert("아이디를 입력해주세요.");
      return;
    }

    if (!isIdCheckValid) {
      alert("아이디 중복 확인을 해주세요.");
      return;
    }

    if (!values.password) {
      alert("비밀번호를 입력해주세요.");
      return;
    }

    if (!isValidPassword(values.password)) {
      alert(
        "비밀번호는 영문, 숫자, 특수문자만 사용하여 8자 이상 16자 이하로 입력해주세요.",
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

    if (!values.name.trim()) {
      alert("이름을 확인해주세요.");
      return;
    }

    if (!values.phone.trim()) {
      alert("휴대폰 번호를 확인해주세요.");
      return;
    }

    if (values.email && !isValidEmail(values.email)) {
      alert("이메일 형식이 올바르지 않습니다.");
      return;
    }

    signupMutation.mutate(values);
  };

  return (
    <div
      className={cn(
        "tw-scope",
        "flex",
        "min-h-screen",
        "w-full",
        "items-center",
        "justify-center",
        "bg-gradient-to-br",
        "from-[#f5f8f3]",
        "to-white",
        "px-4",
        "py-10",
        "sm:px-6",
      )}
    >
      <div
        className={cn(
          "flex",
          "w-full",
          "max-w-[520px]",
          "flex-col",
          "items-center",
          "gap-5",
          "max-[900px]:gap-4",
          "max-[600px]:gap-[14px]",
          "max-[380px]:gap-3",
        )}
      >
        {/* 로고 */}

        <Link to="/" className="block">
          <img
            src="/ssanong.svg"
            alt="싸농 로고"
            className={cn(
              "mx-auto",
              "h-[120px]",
              "w-auto",
              "max-[900px]:h-24",
              "max-[600px]:h-[76px]",
              "max-[380px]:h-[68px]",
            )}
          />
        </Link>

        {/* 회원가입 카드 */}

        <Card
          className={cn(
            "w-full",
            "rounded-2xl",
            "border-border/60",
            "shadow-lg",
            "sm:rounded-3xl",
          )}
        >
          <CardContent className={cn("px-6", "py-8", "sm:px-8")}>
            <form
              onSubmit={handleSubmit}
              className={cn("flex", "flex-col", "gap-[18px]")}
            >
              {/* 아이디 */}

              <div className={cn("flex", "flex-col", "gap-2")}>
                <Label htmlFor="userId">
                  아이디<span className="text-red-500">*</span>
                </Label>

                <div className={cn("flex", "items-center", "gap-2")}>
                  <Input
                    id="userId"
                    type="text"
                    name="userId"
                    placeholder="아이디"
                    className="h-11"
                    value={userId}
                    onChange={(e) => setValue("userId", e.target.value)}
                  />

                  <Button
                    type="button"
                    className={cn("h-11", "shrink-0", "px-3", "sm:px-4")}
                    onClick={handleCheckId}
                    disabled={checkingId || signupMutation.isPending}
                  >
                    {checkingId ? "확인 중..." : "중복 확인"}
                  </Button>
                </div>

                {isIdUnique === true && checkedUserId === userId.trim() && (
                  <p className={cn("text-xs", "font-semibold", "text-primary")}>
                    ✔ 사용 가능한 아이디입니다.
                  </p>
                )}

                {isIdUnique === false && checkedUserId === userId.trim() && (
                  <p className={cn("text-xs", "font-semibold", "text-red-500")}>
                    ❌ 이미 사용 중인 아이디입니다.
                  </p>
                )}

                {isIdUnique === true && checkedUserId !== userId.trim() && (
                  <p className={cn("text-xs", "font-semibold", "text-red-500")}>
                    아이디가 변경되었습니다. 다시 중복 확인해주세요.
                  </p>
                )}
              </div>

              {/* 비밀번호 */}

              <div className={cn("flex", "flex-col", "gap-2")}>
                <Label htmlFor="password">
                  비밀번호<span className="text-red-500">*</span>
                </Label>

                <Input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="비밀번호"
                  className="h-11"
                  value={password}
                  onChange={(e) => setValue("password", e.target.value)}
                />
              </div>

              {/* 비밀번호 확인 */}

              <div className={cn("flex", "flex-col", "gap-2")}>
                <Label htmlFor="passwordCheck">
                  비밀번호 확인
                  <span className="text-red-500">*</span>
                </Label>

                <Input
                  id="passwordCheck"
                  type="password"
                  name="passwordCheck"
                  placeholder="비밀번호 확인"
                  className="h-11"
                  value={passwordCheck}
                  onChange={(e) => setValue("passwordCheck", e.target.value)}
                />
              </div>

              {/* 이름 */}

              <div className={cn("flex", "flex-col", "gap-2")}>
                <Label htmlFor="name">
                  이름<span className="text-red-500">*</span>
                </Label>

                <Input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="이름"
                  className="h-11"
                  value={name}
                  disabled={phoneVerified}
                  readOnly
                  onChange={handleFieldChange("name")}
                />
              </div>

              {/* 전화번호 */}

              <div className={cn("flex", "flex-col", "gap-2")}>
                <Label htmlFor="phone">
                  전화번호<span className="text-red-500">*</span>
                </Label>

                <Input
                  id="phone"
                  type="tel"
                  name="phone"
                  placeholder="휴대폰 번호"
                  className="h-11"
                  value={phone}
                  disabled={phoneVerified}
                  readOnly
                  onChange={handleFieldChange("phone")}
                />

                {phoneVerified && (
                  <p className={cn("text-xs", "font-semibold", "text-primary")}>
                    ✔ PASS 휴대폰 인증 완료
                  </p>
                )}
              </div>

              {/* 주소 */}

              <div className={cn("flex", "flex-col", "gap-2")}>
                <div className={cn("flex", "items-center", "justify-between")}>
                  <Label htmlFor="address">주소</Label>

                  <Button
                    type="button"
                    variant="secondary"
                    className={cn(
                      "h-11",
                      "border-0",
                      "px-3",
                      "hover:cursor-pointer",
                      "sm:px-4",
                    )}
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
                  className={cn("h-11", "w-full", "sm:w-[130px]")}
                  value={zipCode}
                  onChange={(e) => setValue("zipCode", e.target.value)}
                />

                <Input
                  id="address"
                  type="text"
                  name="address"
                  placeholder="주소"
                  className="h-11"
                  value={address}
                  onChange={(e) => setValue("address", e.target.value)}
                />
              </div>

              {/* 상세주소 */}

              <Input
                id="detailAddress"
                type="text"
                name="detailAddress"
                placeholder="상세주소"
                className="h-11"
                value={detailAddress}
                onChange={(e) => setValue("detailAddress", e.target.value)}
              />

              {/* 이메일 */}

              <div className={cn("flex", "flex-col", "gap-2")}>
                <Label htmlFor="email">이메일</Label>

                <div
                  className={cn(
                    "flex",
                    "flex-col",
                    "gap-2",
                    "sm:flex-row",
                    "sm:items-center",
                  )}
                >
                  <Input
                    id="email"
                    type="text"
                    name="email"
                    placeholder="예) abc@naver.com"
                    className={cn("h-11", "w-full")}
                    value={email}
                    onChange={(e) => setValue("email", e.target.value)}
                  />
                </div>
              </div>

              {/* 가입 버튼 */}

              <Button
                type="submit"
                size="lg"
                className={cn(
                  "mt-1",
                  "w-full",
                  "border-0",
                  "hover:cursor-pointer",
                )}
                disabled={signupMutation.isPending || !isIdCheckValid}
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
