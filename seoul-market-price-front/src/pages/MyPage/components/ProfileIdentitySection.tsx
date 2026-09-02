import type { UseFormRegister, UseFormSetValue } from "react-hook-form";
import { CheckCircle2 } from "lucide-react";

import PassAuth, { type PassAuthResult } from "@/features/auth/components/PassAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Profile } from "../utils/myProfileUtils";
import ProfileSocialBanner from "./ProfileSocialBanner";

export interface ProfileIdentitySectionProps {
  register: UseFormRegister<Profile>;
  setValue: UseFormSetValue<Profile>;
  isLoggedIn: boolean;
  isSocialUser: boolean;
  socialProvider: string;
  phoneVerified: boolean;
  phoneValue: string;
  onOpenPasswordModal: () => void;
  onPassSuccess: (result: PassAuthResult) => void;
}

export default function ProfileIdentitySection({
  register,
  setValue,
  isLoggedIn,
  isSocialUser,
  socialProvider,
  phoneVerified,
  phoneValue,
  onOpenPasswordModal,
  onPassSuccess,
}: ProfileIdentitySectionProps) {
  return (
    <>
      {/* ROW 1: 로그인 방식에 따른 분기 */}
      {isSocialUser ? (
        <ProfileSocialBanner socialProvider={socialProvider} />
      ) : (
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <div className="space-y-1.5 flex-1 w-full md:w-1/2">
            <label className="text-[14px] font-bold text-[#13202B] block">아이디</label>
            <Input
              {...register("userId")}
              readOnly
              placeholder="아이디 정보가 없습니다"
              className="h-[48px] rounded-[8px] border-[#DCE8ED] bg-[#F0F7FA] text-[15px] text-[#6B7280] cursor-not-allowed font-medium"
            />
          </div>

          <div className="space-y-1.5 flex-1 w-full md:w-1/2">
            <div className="flex items-center justify-between">
              <label className="text-[14px] font-bold text-[#13202B] block">비밀번호 변경</label>
              {phoneVerified ? (
                <span className="text-[12px] font-extrabold text-[#0F766E]">
                  ✔ 본인인증 완료 (변경 가능)
                </span>
              ) : (
                <span className="text-[12px] text-[#6B7280]">
                  본인인증 후 변경 가능
                </span>
              )}
            </div>
            <Button
              type="button"
              disabled={!isLoggedIn || !phoneVerified}
              onClick={onOpenPasswordModal}
              className={`h-[48px] w-full rounded-[8px] border font-bold text-[14px] shadow-xs ${
                phoneVerified
                  ? "bg-[#0F8AA8] hover:bg-[#0B5E73] text-white border-[#0F8AA8]"
                  : "bg-[#F0F7FA] text-[#6B7280] border-[#DCE8ED] select-none opacity-85"
              }`}
            >
              비밀번호 변경하기
            </Button>
          </div>
        </div>
      )}

      {/* ROW 2: 이름 (본인인증 완료 시 자동 반영 및 수정 가능) */}
      <div className="space-y-1.5 w-full">
        <div className="flex items-center justify-between">
          <label className="text-[14px] font-bold text-[#13202B] block">이름</label>
          {phoneVerified ? (
            <span className="inline-flex items-center gap-1 text-[12px] font-extrabold text-[#0F766E]">
              <CheckCircle2 className="w-3.5 h-3.5" /> 실명 인증 완료
            </span>
          ) : (
            <span className="text-[12px] text-[#6B7280]">
              본인인증 후 수정 가능
            </span>
          )}
        </div>
        <Input
          {...register("name", {
            onChange: (e) => {
              const val = e.target.value.replace(/[^a-zA-Z가-힣ㄱ-ㅎㅏ-ㅣ]/g, "");
              setValue("name", val);
            },
          })}
          readOnly={!phoneVerified}
          disabled={!isLoggedIn}
          placeholder={
            phoneVerified
              ? "이름을 입력해주세요 (숫자, 공백 불가)"
              : "본인인증 시 실명이 자동 입력됩니다"
          }
          className={`h-[48px] rounded-[8px] border-[#DCE8ED] text-[15px] ${
            phoneVerified
              ? "bg-white text-[#13202B] focus-visible:border-[#0F8AA8]"
              : "bg-[#F0F7FA] text-[#6B7280] cursor-not-allowed"
          }`}
        />
        <p className="text-[12px] text-[#6B7280]">
          {phoneVerified
            ? "본인인증이 완료되어 실명이 적용되었습니다."
            : "회원 실명 보호를 위해 아래 본인인증 완료 시 자동으로 반영 및 수정이 활성화됩니다."}
        </p>
      </div>

      {/* ROW 3: 휴대폰 번호 + 본인인증 버튼 (직접 수정 불가, 본인인증 시 자동 입력) */}
      <div className="space-y-1.5 w-full">
        <div className="flex items-center justify-between">
          <label className="text-[14px] font-bold text-[#13202B] block">휴대폰 번호</label>
          {phoneVerified && (
            <span className="inline-flex items-center gap-1 text-[12px] font-extrabold text-[#0F766E]">
              <CheckCircle2 className="w-4 h-4" /> 본인인증 완료
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            {...register("phone")}
            readOnly
            disabled={!isLoggedIn}
            placeholder="본인인증 시 번호가 자동 입력됩니다"
            className="h-[48px] flex-1 rounded-[8px] border-[#DCE8ED] bg-[#F0F7FA] text-[15px] text-[#13202B] cursor-not-allowed font-medium"
          />
          <PassAuth
            phone={phoneValue}
            onSuccess={onPassSuccess}
            className="h-[48px] px-5 bg-[#0F8AA8] hover:bg-[#0B5E73] text-white font-bold text-[14px] rounded-[8px] cursor-pointer whitespace-nowrap transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs shrink-0"
          />
        </div>
        <p className="text-[12px] text-[#6B7280]">
          휴대폰 번호는 직접 입력할 수 없으며, 우측 [인증하기]를 진행하면 실제 인증 번호가 자동 입력됩니다.
        </p>
      </div>
    </>
  );
}
