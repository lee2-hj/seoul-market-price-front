import { useState } from "react";
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
  findPasswordApi,
  checkUserIdApi,
} from "@/api/api";

export default function FindPasswordPage() {
  const navigate = useNavigate();

  // 단계 관리 (1: 아이디 & PASS 본인인증, 2: 새 비밀번호 설정, 3: 변경 완료)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // 1단계 State
  const [userId, setUserId] = useState("");
  const [phone, setPhone] = useState("");
  const [userName, setUserName] = useState("");
  const [isPassVerified, setIsPassVerified] = useState(false);
  const [idNotFoundError, setIdNotFoundError] = useState(false);
  const [checkingId, setCheckingId] = useState(false);

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
  const isSocialAccount =
    userId.trim().toLowerCase().startsWith("kakao_") ||
    userId.trim().toLowerCase().includes("kakao");

  // 1. PASS 인증 성공 핸들러
  const handlePassSuccess = async (result: {
    name: string;
    phoneNumber: string;
  }) => {
    if (!userId.trim()) {
      alert("아이디를 먼저 입력해 주세요.");
      return;
    }

    setPhone(result.phoneNumber);
    setUserName(result.name);
    setIsPassVerified(true);
    setStep1Error("");
  };

  // 2. 아이디 사전 검증 후 다음 단계로 이동
  const handleProceedToStep2 = async () => {
    const trimmedId = userId.trim();
    if (!trimmedId) {
      setStep1Error("아이디를 입력해 주세요.");
      return;
    }
    if (isSocialAccount) {
      setStep1Error(
        "카카오 소셜 계정은 비밀번호가 없습니다. 카카오 로그인을 이용해 주세요."
      );
      return;
    }
    if (!isPassVerified) {
      setStep1Error("PASS 본인인증을 먼저 완료해 주세요.");
      return;
    }

    try {
      setCheckingId(true);
      setStep1Error("");

      // 실제 DB에 등록된 아이디인지 검증
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
          setCheckingId(false);
          return;
        }
      } catch {
        // 아이디 확인 API 예외 시에도 계속 진행
      }

      setStep(2);
    } catch {
      setStep(2);
    } finally {
      setCheckingId(false);
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

      const rawPhone = phone.replace(/-/g, "").trim();
      await findPasswordApi(userId.trim(), rawPhone);

      setStep(3);
    } catch {
      setStep(3);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#fafcf9] flex flex-col justify-center items-center px-4 pt-6 pb-20 sm:px-6 lg:px-8">
      {/* 로고 & 타이틀 */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link to="/" className="inline-block no-underline" style={{ textDecoration: "none" }}>
          <img
            src="/ssanong.svg"
            alt="싸농 로고"
            className="mx-auto block h-[96px] w-auto translate-x-[4%]"
          />
        </Link>
        <h2 className="mt-3 text-[26px] font-black text-[#242b23] tracking-tight">
          비밀번호 찾기
        </h2>
        <p className="mt-1 text-[14px] text-[#667065]">
          PASS 본인인증을 통해 안전하게 비밀번호를 재설정하실 수 있습니다.
        </p>
      </div>

      {/* 메인 카드 */}
      <div className="w-full max-w-[480px] bg-white border border-[#dce4da] rounded-[20px] p-7 sm:p-9 shadow-[0_12px_40px_rgba(45,70,45,0.08)]">
        {/* ========================================================
            STEP 1: 아이디 입력 및 PASS 본인인증
        ======================================================== */}
        {step === 1 && (
          <div className="space-y-5">
            {/* 소셜 계정 경고 안내 */}
            {isSocialAccount && (
              <div className="p-4 bg-[#fff9e6] border border-[#fae29c] rounded-[12px] space-y-1">
                <div className="flex items-center gap-2 text-[#996a00] font-bold text-[13px]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  소셜(카카오) 연동 계정입니다
                </div>
                <p className="text-[12px] text-[#7a5a14] leading-relaxed">
                  카카오 소셜 로그인은 비밀번호가 없습니다. 로그인 페이지에서
                  카카오 로그인을 이용해 주세요.
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
                  입력하신 아이디로 등록된 회원 정보가 없습니다. 회원가입을 먼저 진행해 주세요.
                </p>
                <Link
                  to="/signup/select"
                  className="inline-block mt-2 text-[12px] font-bold text-[#3a8b46] underline"
                >
                  회원가입 페이지로 이동 ➔
                </Link>
              </div>
            )}

            {/* 아이디 입력 */}
            <div className="space-y-1.5">
              <label className="block text-[13px] font-bold text-[#344037]">
                아이디
              </label>
              <input
                type="text"
                placeholder="가입 시 등록한 아이디"
                value={userId}
                disabled={isPassVerified}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setStep1Error("");
                  setIdNotFoundError(false);
                }}
                className="w-full h-[50px] rounded-[10px] border border-[#d5dfd6] bg-white px-4 text-[15px] text-[#2b362d] outline-none focus:border-[#4c9b55] disabled:bg-[#f5f7f5] box-border block"
              />
            </div>

            {/* PASS 본인인증 영역 */}
            {!isPassVerified ? (
              <div className="space-y-2 pt-1">
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

            {/* 에러 메시지 */}
            {step1Error && (
              <div className="flex items-center gap-1.5 text-rose-500 text-[12px] font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {step1Error}
              </div>
            )}

            {/* 다음 단계 버튼 */}
            <button
              type="button"
              onClick={handleProceedToStep2}
              disabled={!isPassVerified || !userId.trim() || checkingId}
              className="w-full h-[52px] mt-4 bg-[#4c9b55] hover:bg-[#438b4b] text-white font-bold text-[16px] rounded-[10px] cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {checkingId ? "아이디 확인 중..." : "다음 단계로"}
              <ArrowRight className="w-4 h-4" />
            </button>
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
                    {isPasswordMatch
                      ? "✔ 비밀번호 일치"
                      : "✕ 비밀번호 불일치"}
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
              disabled={submitting || !isPasswordLengthValid || !isPasswordMatch}
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
