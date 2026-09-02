import { GoogleIcon, KakaoIcon } from "../utils/myProfileUtils";

export interface ProfileSocialBannerProps {
  socialProvider: string;
}

export default function ProfileSocialBanner({ socialProvider }: ProfileSocialBannerProps) {
  return (
    <div className="w-full bg-[#F0F7FA] border border-[#DCE8ED] rounded-[12px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 box-border shadow-xs">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {socialProvider === "카카오" ? (
            <KakaoIcon className="w-5 h-5 shrink-0 rounded-[4px]" />
          ) : (
            <GoogleIcon className="w-5 h-5 shrink-0" />
          )}
          <strong className="text-[15px] font-black text-[#123047]">
            {socialProvider || "소셜"} 연동 계정으로 로그인 중입니다
          </strong>
        </div>

        <p className="text-[12px] text-[#6B7280]">
          소셜 연동 계정은 아이디 및 비밀번호 수정이 제공되지 않습니다.
        </p>
      </div>
    </div>
  );
}
