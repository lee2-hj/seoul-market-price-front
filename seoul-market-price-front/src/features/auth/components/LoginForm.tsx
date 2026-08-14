import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import axios from "axios";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { saveLogin } from "../../auth/utils/auth";
import { getMemberMeApi, loginApi } from "@/api/api";
import { useAuthStore } from "@/features/auth/store/useAuthStore";

/* ===============================
   로그인 폼 입력값 타입
=============================== */

type LoginFormValues = {
  userId: string;
  password: string;
};

const defaultValues: LoginFormValues = {
  userId: "",
  password: "",
};

const inputClassName =
  "h-[52px] border-[#d8e8d8] bg-[#fbfffb] px-[16px] py-0 text-[15px] shadow-none transition-all duration-300 placeholder:text-[14px] placeholder:text-[#aaa] focus-visible:border-[#4caf50] focus-visible:ring-[#4caf50]/15 md:text-[15px] max-[600px]:h-[48px] max-[600px]:text-[14px]";

function LoginForm() {
  const navigate = useNavigate();

  const { getValues, setValue, watch } = useForm<LoginFormValues>({
    defaultValues,
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    const values = getValues();
    const trimUserId = values.userId.trim();

    if (!trimUserId || !values.password) {
      alert("아이디와 비밀번호를 입력해주세요.");

      return;
    }

    try {
      setLoading(true);

      const data = await loginApi(trimUserId, values.password);

      /*
        백엔드 LoginResponse는 평평한 구조로 내려온다.

        {
          accessToken,
          memberId,
          userId,
          name
        }

        백엔드는 accessToken 쿠키가 아니라 Authorization 헤더만
        검사하므로, 응답 바디의 accessToken을 zustand에 저장해
        요청마다 헤더로 실어보내야 한다.
      */

      if (!data?.userId || !data.accessToken) {
        throw new Error("로그인 응답 데이터 오류");
      }

      /*
        로그인 정보 저장

        zustand(useAuthStore)
              ↓
        Header 등에서 구독 / axios 요청 인터셉터에서 Authorization 헤더로 사용
              ↓
        MainPage 이동

      */

      saveLogin(
        {
          userId: data.userId,

          name: data.name,

          // 백엔드 로그인 응답에는 role이 내려오지 않는다.
          role: "",
        },
        data.accessToken,
      );

      // 로그인 직후 회원 선호 자치구 우선순위를 헤더에 반영한다.
      const me = await getMemberMeApi();
      useAuthStore.getState().setUser({
        userId: me.userId,
        name: me.name,
        role: "",
        myGu: me.myGu,
        preferredDistrict: me.preferredDistrict,
        myDong: me.myDong,
      });

      /*
        주소 유지

        /
        ↓
        Home.tsx 재실행

      */

      navigate("/");


    } catch (error) {
      console.error("로그인 오류", error);

      // 백엔드가 { code, message } 형태로 상태 메시지를 내려주므로
      // 있으면 그 메시지를, 없으면(네트워크 오류 등) 기본 문구를 보여준다.
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "서버 연결 실패";

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-[16px]">
      <Input
        type="text"
        placeholder="아이디"
        value={watch("userId")}
        disabled={loading}
        onChange={(e) => setValue("userId", e.target.value)}
        className={inputClassName}
      />

      <Input
        type="password"
        placeholder="비밀번호"
        value={watch("password")}
        disabled={loading}
        onChange={(e) => setValue("password", e.target.value)}
        className={inputClassName}
      />

      <Button
        type="submit"
        disabled={loading}
        className="mt-[8px] h-[54px] w-full rounded-[14px] border-0 bg-gradient-to-br from-[#66bb6a] to-[#2e7d32] text-[17px] font-extrabold text-white shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:cursor-pointer hover:opacity-100 hover:shadow-[0_10px_25px_rgba(46,125,50,0.25)] active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none max-[600px]:h-[50px] max-[600px]:text-[16px]"
      >
        {loading ? "로그인 중..." : "로그인"}
      </Button>
    </form>
  );
}

export default LoginForm;
