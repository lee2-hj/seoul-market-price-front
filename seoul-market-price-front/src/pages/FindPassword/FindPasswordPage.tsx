import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import PassAuth from "@/features/auth/components/PassAuth";
import {
  completePasswordResetApi,
  verifyPasswordResetApi,
  checkUserIdApi,
} from "@/api/api";

function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: string }
      | undefined;
    return data?.message || data?.error || fallback;
  }

  return error instanceof Error && error.message ? error.message : fallback;
}

const formatPhoneNumber = (value: string): string => {
  if (!value) return "";
  const raw = value.replace(/[^0-9]/g, "");
  if (raw.length <= 3) return raw;
  if (raw.length <= 7) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
  if (raw.length <= 10) {
    return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
  }
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
};

export default function FindPasswordPage() {
  const navigate = useNavigate();

  // 단계 관리 (1: 아이디 확인 & PASS 본인인증, 2: 새 비밀번호 설정, 3: 변경 완료)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // 1단계 State
  const [userId, setUserId] = useState("");
  const [isIdVerified, setIsIdVerified] = useState(false);
  const [checkingId, setCheckingId] = useState(false);
  const [idNotFoundError, setIdNotFoundError] = useState(false);

  const [phone, setPhone] = useState("");
  const [userName, setUserName] = useState("");
  const [isPassVerified, setIsPassVerified] = useState(false);
  const [resetToken, setResetToken] = useState("");

  // 2단계 State (새 비밀번호)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 에러 메시지
  const [step1Error, setStep1Error] = useState("");
  const [step2Error, setStep2Error] = useState("");

  // 소셜 로그인 계정 감지
  const getSocialProvider = (id: string) => {
    const lower = id.trim().toLowerCase();
    if (lower.startsWith("google_") || lower.includes("google")) return "구글";
    if (lower.startsWith("kakao_") || lower.includes("kakao")) return "카카오";
    if (lower.startsWith("naver_") || lower.includes("naver")) return "네이버";
    return "";
  };

  const socialProviderName = getSocialProvider(userId);
  const isSocialAccount = Boolean(socialProviderName);

  // 1. [아이디 확인] 버튼 클릭 핸들러
  const handleCheckId = async () => {
    const trimmedId = userId.trim();
    setStep1Error("");
    setIdNotFoundError(false);

    if (!trimmedId) {
      setStep1Error("아이디를 입력해 주세요.");
      return;
    }

    if (isSocialAccount) {
      setStep1Error(
        `${socialProviderName} 소셜 계정은 비밀번호가 없습니다. ${socialProviderName} 로그인을 이용해 주세요.`,
      );
      return;
    }

    try {
      setCheckingId(true);

      // DB에 가입된 아이디인지 조회
      try {
        const idCheckResult = await checkUserIdApi(trimmedId);
        // available이 true이면 미가입 아이디(신규가입 가능)이므로 비밀번호 찾기 불가
        const isAvailable =
          typeof idCheckResult === "object" &&
          idCheckResult !== null &&
          "available" in idCheckResult
            ? (idCheckResult as { available: boolean }).available
            : Boolean(idCheckResult);

        if (isAvailable) {
          setIdNotFoundError(true);
          setIsIdVerified(false);
          return;
        }
      } catch {
        // 아이디 확인 API 예외 시에도 계속 진행 허용
      }

      setIsIdVerified(true);
      setIdNotFoundError(false);
    } catch {
      setIsIdVerified(true);
    } finally {
      setCheckingId(false);
    }
  };

  // 2. PASS 본인인증 성공 핸들러
  const handlePassSuccess = async (result: {
    identityVerificationId: string;
    name: string;
    phoneNumber: string;
  }) => {
    try {
      const response = await verifyPasswordResetApi(
        result.identityVerificationId,
        userId.trim(),
      );

      if (!response.verified || !response.resetToken) {
        throw new Error("본인인증 결과를 확인할 수 없습니다.");
      }

      setPhone(formatPhoneNumber(result.phoneNumber));
      setUserName(result.name);
      setResetToken(response.resetToken);
      setIsPassVerified(true);
      setStep1Error("");
    } catch (error) {
      setIsPassVerified(false);
      setResetToken("");
      setStep1Error(
        getApiErrorMessage(
          error,
          "입력한 아이디와 본인인증 정보가 일치하지 않습니다.",
        ),
      );
    }
  };

  // 3. 새 비밀번호 유효성 검사 (8~16자 & 일치 여부)
  const isPasswordLengthValid =
    newPassword.length >= 8 && newPassword.length <= 16;
  const isPasswordMatch =
    newPassword.length > 0 && newPassword === confirmPassword;

  // 4. 새 비밀번호 변경 제출
  const handleSubmitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordLengthValid) {
      setStep2Error("비밀번호는 8자 이상 16자 이하로 입력해 주세요.");
      return;
    }
    if (!isPasswordMatch) {
      setStep2Error("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    try {
      setSubmitting(true);
      setStep2Error("");

      if (!resetToken) {
        setStep2Error("본인인증이 만료되었습니다. 다시 인증해 주세요.");
        setStep(1);
        return;
      }

      await completePasswordResetApi(resetToken, newPassword, confirmPassword);

      setStep(3);
    } catch (error) {
      setStep2Error(
        getApiErrorMessage(
          error,
          "비밀번호 변경에 실패했습니다. 다시 시도해 주세요.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#fafcf9] flex flex-col justify-center items-center px-4 pt-6 pb-20 sm:px-6 lg:px-8">
      {/* 로고 & 타이틀 */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link
          to="/"
          className="inline-block no-underline"
          style={{ textDecoration: "none" }}
        >
          <img
            src="/logo.png"
            alt="싸부 로고"
            className="mx-auto block h-[140px] sm:h-[155px] w-auto object-contain drop-shadow-sm"
          />
        </Link>
        <h2 className="mt-3 text-[26px] font-black text-[#242b23] tracking-tight">
          비밀번호 찾기
        </h2>
        <p className="mt-1 text-[14px] text-[#667065]">
          싸게 보는 부동산 싸부에서 아이디 확인 후 안전하게 비밀번호를 재설정합니다.
        </p>
      </div>

      {/* 메인 카드 */}
      <div className="w-full max-w-[480px] bg-white border border-[#dce4da] rounded-[20px] p-7 sm:p-9 shadow-[0_12px_40px_rgba(45,70,45,0.08)]">
        {/* ========================================================
            STEP 1: 아이디 먼저 확인 ➔ PASS 본인인증 진행
        ======================================================== */}
        {step === 1 && (
          <div className="space-y-5">
            {/* 소셜 계정 경고 안내 */}
            {isSocialAccount && (
              <div className="p-4 bg-[#fff9e6] border border-[#fae29c] rounded-[12px] space-y-1">
                <div className="flex items-center gap-2 text-[#996a00] font-bold text-[13px]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  소셜({socialProviderName}) 연동 계정입니다
                </div>
                <p className="text-[12px] text-[#7a5a14] leading-relaxed">
                  {socialProviderName} 소셜 로그인은 비밀번호가 없습니다. 로그인
                  페이지에서
                  {socialProviderName} 로그인을 이용해 주세요.
                </p>
                <Link
                  to="/login"
                  className="inline-block mt-2 text-[12px] font-bold text-[#996a00] underline"
                >
                  로그인 페이지로 이동 ➔
                </Link>
              </div>
            )}

            {/* 존재하지 않는 아이디 경고 안내 */}
            {idNotFoundError && !isSocialAccount && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-[12px] space-y-1 text-left">
                <div className="flex items-center gap-2 text-rose-700 font-bold text-[13px]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  가입되지 않은 아이디입니다
                </div>
                <p className="text-[12px] text-rose-600 leading-relaxed">
                  입력하신 아이디로 등록된 회원 정보가 없습니다. 회원가입을 먼저
                  진행해 주세요.
                </p>
                <Link
                  to="/signup/select"
                  className="inline-block mt-2 text-[12px] font-bold text-[#3a8b46] underline"
                >
                  회원가입 페이지로 이동 ➔
                </Link>
              </div>
            )}

            {/* 1단계: 아이디 입력 및 확인 버튼 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-bold text-[#344037]">
                  아이디
                </label>
                {isIdVerified && (
                  <span className="text-[12px] font-bold text-[#3a8b46] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 확인 완료
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="가입 시 등록한 아이디"
                  value={userId}
                  disabled={isIdVerified}
                  onChange={(e) => {
                    setUserId(e.target.value);
                    setStep1Error("");
                    setIdNotFoundError(false);
                    setIsIdVerified(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCheckId();
                    }
                  }}
                  className="flex-1 h-[50px] rounded-[10px] border border-[#d5dfd6] bg-white px-4 text-[15px] text-[#2b362d] outline-none focus:border-[#4c9b55] disabled:bg-[#f5f7f5] box-border block"
                />
                {!isIdVerified ? (
                  <button
                    type="button"
                    onClick={handleCheckId}
                    disabled={checkingId || !userId.trim()}
                    className="w-[96px] h-[50px] bg-[#4c9b55] hover:bg-[#438b4b] text-white font-bold text-[14px] rounded-[10px] cursor-pointer transition-colors shadow-sm disabled:opacity-40 shrink-0"
                  >
                    {checkingId ? "확인 중..." : "아이디 확인"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsIdVerified(false);
                      setIsPassVerified(false);
                      setUserName("");
                      setPhone("");
                      setResetToken("");
                    }}
                    className="w-[88px] h-[50px] border border-[#cfd9d0] bg-white hover:bg-[#f5f8f5] text-[#526055] font-bold text-[14px] rounded-[10px] cursor-pointer transition-colors shrink-0"
                  >
                    다시 입력
                  </button>
                )}
              </div>
            </div>

            {/* 에러 메시지 */}
            {step1Error && (
              <div className="flex items-center gap-1.5 text-rose-500 text-[12px] font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {step1Error}
              </div>
            )}

            {/* 2단계: 아이디 확인 완료 시 PASS 본인인증 영역 노출 */}
            {isIdVerified && (
              <div className="space-y-4 pt-3 border-t border-[#edf2ec]">
                {!isPassVerified ? (
                  <div className="space-y-2">
                    <label className="block text-[13px] font-bold text-[#344037]">
                      본인인증
                    </label>
                    <PassAuth
                      phone={phone}
                      onSuccess={handlePassSuccess}
                      className="w-full h-[50px] bg-[#4c9b55] hover:bg-[#438b4b] text-white font-bold text-[15px] rounded-[10px] cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-sm"
                    />
                    <p className="text-[12px] text-[#718073] text-center">
                      통신사 PASS 앱 또는 문자로 본인인증을 진행합니다.
                    </p>
                  </div>
                ) : (
                  /* PASS 인증 완료 뱃지 */
                  <div className="p-3.5 bg-[#edf7ee] border border-[#cbe8ce] rounded-[10px] flex items-center gap-2.5 text-[#3a8b46] text-[13px] font-bold">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <div>
                      <div>PASS 본인인증이 완료되었습니다.</div>
                      {userName && (
                        <div className="text-[12px] text-[#558b5c] font-normal mt-0.5">
                          인증자: {userName} {phone && `(${phone})`}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 다음 단계 버튼 */}
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!isPassVerified}
                  className="w-full h-[52px] bg-[#4c9b55] hover:bg-[#438b4b] text-white font-bold text-[16px] rounded-[10px] cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  다음 단계로
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            STEP 2: 새 비밀번호 설정 (8~16자 검증 + 눈 아이콘 토글)
        ======================================================== */}
        {step === 2 && (
          <form onSubmit={handleSubmitNewPassword} className="space-y-5">
            <div className="p-4 bg-[#f5f8f5] border border-[#e1e8e2] rounded-[10px] text-[13px] text-[#4d5e50]">
              <strong className="text-[#242b23]">{userId}</strong> 님의 새로운
              비밀번호를 입력해 주세요.
            </div>

            {/* 새 비밀번호 입력 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-bold text-[#344037]">
                  새 비밀번호
                </label>
                <span
                  className={`text-[12px] font-bold ${
                    newPassword.length === 0
                      ? "text-[#8a9388]"
                      : isPasswordLengthValid
                        ? "text-[#3a8b46]"
                        : "text-rose-500"
                  }`}
                >
                  8~16자 입력 ({newPassword.length}/16)
                </span>
              </div>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="새로운 비밀번호 (8자~16자)"
                  maxLength={16}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setStep2Error("");
                  }}
                  className="w-full h-[50px] rounded-[10px] border border-[#d5dfd6] bg-white pl-4 pr-12 text-[15px] text-[#2b362d] outline-none focus:border-[#4c9b55]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8a9388] hover:text-[#4c9b55] cursor-pointer p-1"
                  tabIndex={-1}
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* 새 비밀번호 확인 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-bold text-[#344037]">
                  비밀번호 확인
                </label>
                {confirmPassword.length > 0 && (
                  <span
                    className={`text-[12px] font-bold ${
                      isPasswordMatch ? "text-[#3a8b46]" : "text-rose-500"
                    }`}
                  >
                    {isPasswordMatch ? "✔ 비밀번호 일치" : "✕ 비밀번호 불일치"}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="새로운 비밀번호 재입력"
                  maxLength={16}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setStep2Error("");
                  }}
                  className={`w-full h-[50px] rounded-[10px] border bg-white pl-4 pr-12 text-[15px] text-[#2b362d] outline-none ${
                    confirmPassword.length > 0
                      ? isPasswordMatch
                        ? "border-[#4c9b55]"
                        : "border-rose-400"
                      : "border-[#d5dfd6] focus:border-[#4c9b55]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8a9388] hover:text-[#4c9b55] cursor-pointer p-1"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* 에러 메시지 */}
            {step2Error && (
              <div className="flex items-center gap-1.5 text-rose-500 text-[12px] font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {step2Error}
              </div>
            )}

            {/* 변경 완료 버튼 */}
            <button
              type="submit"
              disabled={
                submitting || !isPasswordLengthValid || !isPasswordMatch
              }
              className="w-full h-[52px] mt-4 bg-[#4c9b55] hover:bg-[#438b4b] text-white font-bold text-[16px] rounded-[10px] cursor-pointer transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "비밀번호 변경 중..." : "비밀번호 변경하기"}
            </button>
          </form>
        )}

        {/* ========================================================
            STEP 3: 비밀번호 변경 완료
        ======================================================== */}
        {step === 3 && (
          <div className="text-center space-y-5 py-4">
            <div className="w-16 h-16 bg-[#edf7ee] text-[#4c9b55] rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-[20px] font-black text-[#242b23]">
                비밀번호 변경 완료!
              </h3>
              <p className="text-[14px] text-[#667065]">
                비밀번호가 성공적으로 변경되었습니다.
                <br />
                새로운 비밀번호로 로그인해 주세요.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="w-full h-[52px] bg-[#4c9b55] hover:bg-[#438b4b] text-white font-bold text-[16px] rounded-[10px] cursor-pointer transition-colors shadow-sm mt-4"
            >
              로그인하러 가기
            </button>
          </div>
        )}

        {/* 하단 링크 (로그인 / 아이디 찾기) */}
        {step !== 3 && (
          <div className="flex items-center justify-center gap-5 pt-6 mt-6 border-t border-[#edf2ec] text-[14px] text-[#718073]">
            <Link
              to="/login"
              className="text-[#718073] hover:text-[#4c9b55] no-underline transition-colors font-medium"
              style={{ textDecoration: "none" }}
            >
              로그인으로 돌아가기
            </Link>
            <span className="text-[#d0d7cf]">|</span>
            <Link
              to="/find-id"
              className="text-[#718073] hover:text-[#4c9b55] no-underline transition-colors font-medium"
              style={{ textDecoration: "none" }}
            >
              아이디 찾기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
