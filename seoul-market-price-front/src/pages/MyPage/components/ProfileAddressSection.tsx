import type { UseFormRegister, UseFormSetValue } from "react-hook-form";

import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { Input } from "@/components/ui/input";
import { sanitizeAddress, type Profile } from "../utils/myProfileUtils";

export interface ProfileAddressSectionProps {
  register: UseFormRegister<Profile>;
  setValue: UseFormSetValue<Profile>;
  isLoggedIn: boolean;
  preferredDistrict: string;
  districtOptions: string[];
  isDistrictDisabled: boolean;
  preferredDistrictError: string;
  onPreferredDistrictChange: (value: string) => void;
  onInvalidBlur: () => void;
}

export default function ProfileAddressSection({
  register,
  setValue,
  isLoggedIn,
  preferredDistrict,
  districtOptions,
  isDistrictDisabled,
  preferredDistrictError,
  onPreferredDistrictChange,
  onInvalidBlur,
}: ProfileAddressSectionProps) {
  return (
    <>
      {/* ROW 4: 이메일 주소 (인증 없이 직접 입력) */}
      <div className="space-y-1.5 w-full">
        <label className="text-[14px] font-bold text-[#13202B] block">이메일 주소</label>
        <Input
          {...register("email")}
          type="email"
          disabled={!isLoggedIn}
          placeholder="이메일 주소를 입력해 주세요 (예: user@example.com)"
          className="h-[48px] rounded-[8px] border-[#DCE8ED] bg-white text-[15px] text-[#13202B] focus-visible:border-[#0F8AA8] disabled:bg-[#F0F7FA]"
        />
      </div>

      {/* ROW 5: 기본 주소 & 상세 주소 (특수문자 및 불필요한 기호 필터링 적용) */}
      <div className="flex flex-col md:flex-row gap-4 w-full">
        <div className="space-y-1.5 flex-1 w-full md:w-1/2">
          <label className="text-[14px] font-bold text-[#13202B] block">기본 주소</label>
          <Input
            {...register("address", {
              onChange: (e) => {
                const cleaned = sanitizeAddress(e.target.value);
                setValue("address", cleaned, { shouldDirty: true });
              },
            })}
            disabled={!isLoggedIn}
            placeholder="기본 주소를 입력해 주세요 (특수문자 제외)"
            className="h-[48px] rounded-[8px] border-[#DCE8ED] bg-white text-[15px] text-[#13202B] focus-visible:border-[#0F8AA8] disabled:bg-[#F0F7FA]"
          />
        </div>

        <div className="space-y-1.5 flex-1 w-full md:w-1/2">
          <label className="text-[14px] font-bold text-[#13202B] block">상세 주소</label>
          <Input
            {...register("detailAddress", {
              onChange: (e) => {
                const cleaned = sanitizeAddress(e.target.value);
                setValue("detailAddress", cleaned, { shouldDirty: true });
              },
            })}
            disabled={!isLoggedIn}
            placeholder="상세 주소(동, 호수 등)를 입력해 주세요"
            className="h-[48px] rounded-[8px] border-[#DCE8ED] bg-white text-[15px] text-[#13202B] focus-visible:border-[#0F8AA8] disabled:bg-[#F0F7FA]"
          />
        </div>
      </div>

      {/* ROW 6: 선호 자치구 설정 */}
      <div className="space-y-1.5 w-full">
        <label className="text-[14px] font-bold text-[#13202B] block">선호 자치구 설정</label>
        <div>
          <AutocompleteInput
            value={preferredDistrict}
            options={districtOptions}
            disabled={isDistrictDisabled}
            onChange={onPreferredDistrictChange}
            onInvalidBlur={onInvalidBlur}
            placeholder="자치구를 선택하거나 입력해 주세요"
            className={!preferredDistrict ? "text-[#64748B]" : "text-[#13202B]"}
          />
        </div>
        {preferredDistrictError && (
          <p className="text-[12px] text-[#C2410C]" role="alert">
            {preferredDistrictError}
          </p>
        )}
        <p className="text-[12px] text-[#6B7280]">
          선호 자치구는 선택하지 않아도 되며, 선택한 자치구를 기준으로 관심 지역을 표시합니다.
        </p>
      </div>
    </>
  );
}
