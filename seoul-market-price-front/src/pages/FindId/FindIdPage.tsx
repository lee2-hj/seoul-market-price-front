import { Link } from "react-router-dom";
import { useState } from "react";

import { findIdApi } from "@/api/api";
import PassAuth from "@/features/auth/components/PassAuth";

import styles from "./FindIdPage.module.css";

/* PASS 인증 결과 타입 */

interface PassAuthResult {
  name: string;
  phoneNumber: string;
  identityVerificationId: string;
}

/* 아이디 찾기 페이지 */

function FindIdPage() {
  /* 현재 단계
     1 : 이름 + 휴대폰 번호 입력 / PASS 인증
     2 : 아이디 조회 결과 */

  const [step, setStep] = useState<1 | 2>(1);

  /* 사용자 입력 */

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  /* PASS 인증 여부 */

  const [passVerified, setPassVerified] = useState(false);

  /* 조회된 아이디 목록 (백엔드에서 이미 마스킹됨) */

  const [maskedUserIds, setMaskedUserIds] = useState<string[]>([]);

  /* 아이디 조회 로딩 */

  const [isLoading, setIsLoading] = useState(false);

  /* 아이디 조회

     PASS 인증 완료 후 발급된 identityVerificationId를
     백엔드로 전달한다. 백엔드가 PortOne에서 직접 이름/번호를
     조회하고 일치하는 아이디를 마스킹하여 반환한다.

     POST /api/members/find-id */

  const handleFindId = async (identityVerificationId: string) => {
    if (!identityVerificationId) {
      alert("본인인증 정보를 확인할 수 없습니다.");
      return;
    }

    try {
      setIsLoading(true);

      console.log("[아이디 찾기] 요청 시작");
      console.log("[아이디 찾기] API: /api/members/find-id");
      console.log(
        "[아이디 찾기] identityVerificationId:",
        identityVerificationId,
      );

      const response = await findIdApi(identityVerificationId, name, phone);

      console.log("[아이디 찾기] 백엔드 응답:", response);

      if (response.found && response.maskedUserIds && response.maskedUserIds.length > 0) {
        setMaskedUserIds(response.maskedUserIds);
      } else {
        setMaskedUserIds([]);
      }

      /* 아이디 조회 결과 화면으로 이동 */
      setStep(2);
    } catch (error) {
      console.error("[아이디 찾기] API 오류:", error);

      // 회원 정보가 없거나 500/404 오류가 발생하더라도 Step 1에 멈춰있지 않고
      // Step 2 결과 화면으로 이동하여 "가입된 회원 정보 없음" 결과를 보여줍니다.
      setMaskedUserIds([]);
      setStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  /* PASS 인증 성공

     PASS 인증에서 발급된 identityVerificationId를
     아이디 찾기 API에 전달한다. */

  const handlePassSuccess = (result: PassAuthResult) => {
    if (!result.identityVerificationId) {
      alert("PASS 인증 결과를 확인할 수 없습니다.");
      return;
    }

    /* PASS 인증 결과 저장 (전달된 값이 있을 때만 덮어쓰기) */

    if (result.name?.trim()) {
      setName(result.name.trim());
    }
    if (result.phoneNumber?.replace(/\D/g, "")) {
      setPhone(result.phoneNumber.replace(/\D/g, ""));
    }
    setPassVerified(true);

    /* PASS 인증 완료 후 아이디 조회 */

    void handleFindId(result.identityVerificationId);
  };

  /* 다시 아이디 찾기 */

  const handleReset = () => {
    setStep(1);
    setName("");
    setPhone("");
    setPassVerified(false);
    setMaskedUserIds([]);
    setIsLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        {/* 로고 */}

        <Link to="/" className={styles.logoLink}>
          <img src="/ssanong.svg" alt="싸농 로고" className={styles.logo} />
        </Link>

        {/* STEP 1 */}

        {step === 1 && (
          <>
            <h1>아이디 찾기</h1>

            <p className={styles.description}>
              가입 시 등록한 이름과 휴대폰 번호로
              <br />
              아이디를 확인할 수 있습니다.
            </p>

            {/* 이름 */}

            <div className={styles.fieldGroup}>
              <label htmlFor="name">이름</label>

              <input
                id="name"
                type="text"
                placeholder="이름을 입력해주세요."
                value={name}
                disabled={passVerified || isLoading}
                autoComplete="name"
                onChange={(event) => {
                  setName(event.target.value);
                  setPassVerified(false);
                  setMaskedUserIds([]);
                }}
              />
            </div>

            {/* 휴대폰 번호 */}

            <div className={styles.fieldGroup}>
              <label htmlFor="phone">휴대폰 번호</label>

              <div className={styles.inputGroup}>
                <input
                  id="phone"
                  type="tel"
                  placeholder="휴대폰 번호를 입력해주세요."
                  value={phone}
                  disabled={passVerified || isLoading}
                  autoComplete="tel"
                  onChange={(event) => {
                    setPhone(event.target.value);
                    setPassVerified(false);
                    setMaskedUserIds([]);
                  }}
                />

                {!passVerified && !isLoading && (
                  <PassAuth name={name} phone={phone} onSuccess={handlePassSuccess} />
                )}
              </div>
            </div>

            {/* PASS 인증 완료 */}

            {passVerified && (
              <p className={styles.success}>✔ PASS 휴대폰 인증 완료</p>
            )}

            {/* 아이디 조회 중 */}

            {isLoading && (
              <p className={styles.loading}>
                가입된 아이디를 조회하고 있습니다...
              </p>
            )}
          </>
        )}

        {/* STEP 2 */}

        {step === 2 && (
          <>
            <h1>{maskedUserIds.length > 0 ? "아이디 확인" : "아이디 찾기 결과"}</h1>

            <p className={styles.description}>
              {maskedUserIds.length > 0 ? (
                <>
                  본인인증이 완료되었습니다.
                  <br />
                  가입된 아이디를 확인해주세요.
                </>
              ) : (
                <>
                  본인인증은 완료되었으나,
                  <br />
                  가입된 회원 정보를 찾을 수 없습니다.
                </>
              )}
            </p>

            {/* 조회 결과 */}

            {maskedUserIds.length > 0 ? (
              <div className={styles.result}>
                <span className={styles.resultLabel}>가입된 아이디</span>

                {maskedUserIds.map((id) => (
                  <div key={id} className={styles.userId}>
                    {id}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.result}>
                <span className={styles.resultLabel}>조회 결과</span>

                <div
                  className={styles.userId}
                  style={{
                    fontSize: "14px",
                    color: "#444",
                    lineHeight: "1.6",
                    fontWeight: "normal",
                    textAlign: "left",
                    padding: "10px 0",
                  }}
                >
                  <strong style={{ color: "#e53935", display: "block", marginBottom: "6px" }}>
                    일치하는 회원 정보가 존재하지 않습니다.
                  </strong>
                  <span style={{ fontSize: "12px", color: "#666" }}>
                    • 가입 시 입력한 이름과 휴대폰 번호가 맞는지 확인해 주세요.
                    <br />
                    • 카카오 / 구글 소셜 연동 계정은 로그인 페이지에서 소셜 로그인을 이용해 주세요.
                  </span>
                </div>
              </div>
            )}

            {/* 버튼 영역 */}

            <div className={styles.actionGroup}>
              {maskedUserIds.length > 0 ? (
                <>
                  <Link to="/login" className={styles.loginButton}>
                    로그인하기
                  </Link>

                  <Link to="/find-password" className={styles.passwordButton}>
                    비밀번호 찾기
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/signup/select" className={styles.loginButton}>
                    회원가입하기
                  </Link>

                  <button
                    type="button"
                    className={styles.passwordButton}
                    onClick={handleReset}
                  >
                    다시 찾기
                  </button>
                </>
              )}
            </div>

            {maskedUserIds.length > 0 && (
              <button
                type="button"
                className={styles.resetButton}
                onClick={handleReset}
              >
                다시 찾기
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default FindIdPage;
