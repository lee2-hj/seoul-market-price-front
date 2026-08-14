import { Link } from "react-router-dom";
import { useState } from "react";

import PassAuth, { type PassAuthResult } from "@/features/auth/components/PassAuth";
import { findIdApi } from "@/api/api";
import styles from "./FindIdPage.module.css";

/* 메인 컴포넌트 */
export default function FindIdPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [passVerified, setPassVerified] = useState(false);
  const [maskedUserIds, setMaskedUserIds] = useState<string[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);

  /* PASS 본인인증 성공 시 백엔드 조회 */
  const handlePassSuccess = async (result: PassAuthResult) => {
    try {
      setIsVerifying(true);
      const data = await findIdApi(
        result.identityVerificationId,
        result.name,
        result.phoneNumber,
      );

      setMaskedUserIds(data.maskedUserIds || []);
      setPassVerified(true);
      setStep(2);
    } catch {
      setMaskedUserIds([]);
      setStep(2);
    } finally {
      setIsVerifying(false);
    }
  };

  /* 초기화 */
  const handleReset = () => {
    setStep(1);
    setPassVerified(false);
    setMaskedUserIds([]);
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        {/* 로고 */}
        <Link to="/" aria-label="싸부 홈으로 이동" className={`${styles.logoLink} no-underline`}>
          <img src="/logo-teal.png" alt="싸부 로고" className={styles.logo} />
        </Link>

        {/* STEP 1: 본인인증 */}
        {step === 1 && (
          <>
            <h1>아이디 찾기</h1>
            <p className={styles.description}>
              PASS 휴대폰 본인인증을 진행하시면<br />
              가입된 아이디를 찾을 수 있습니다.
            </p>

            {!passVerified && !isVerifying && (
              <div style={{ width: "100%", marginTop: "24px" }}>
                <PassAuth
                  onSuccess={handlePassSuccess}
                  className={styles.mainButton}
                />
              </div>
            )}

            {passVerified && <p className={styles.success}>✔ PASS 휴대폰 인증 완료</p>}
            {isVerifying && <p className={styles.loading}>가입된 아이디를 조회하고 있습니다...</p>}
          </>
        )}

        {/* STEP 2: 조회 결과 */}
        {step === 2 && (
          <>
            <h1>{maskedUserIds.length > 0 ? "아이디 확인" : "아이디 찾기 결과"}</h1>
            <p className={styles.description}>
              본인인증이 완료되었습니다.<br />
              가입된 아이디를 확인해 주세요.
            </p>

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
                  <strong style={{ color: "#e53935", display: "block", marginBottom: "6px", fontSize: "15px" }}>
                    미가입 회원입니다.
                  </strong>
                  <span style={{ fontSize: "12px", color: "#666" }}>
                    • 본인인증 정보와 일치하는 가입된 회원 계정을 찾을 수 없습니다.<br />
                    • 하단의 &apos;회원가입하기&apos; 버튼을 눌러 신규 회원가입을 진행해 주세요.<br />
                    • 카카오 / 구글 소셜 연동 계정은 로그인 페이지에서 소셜 로그인을 이용해 주세요.
                  </span>
                </div>
              </div>
            )}

            {/* 버튼 그룹 */}
            <div className={styles.actionGroup}>
              {maskedUserIds.length > 0 ? (
                <>
                  <Link to="/login" className={styles.loginButton}>로그인하기</Link>
                  <Link to="/find-password" className={styles.passwordButton}>비밀번호 찾기</Link>
                </>
              ) : (
                <>
                  <Link to="/signup/select" className={styles.loginButton}>회원가입하기</Link>
                  <button type="button" className={styles.passwordButton} onClick={handleReset}>
                    다시 찾기
                  </button>
                </>
              )}
            </div>

            {maskedUserIds.length > 0 && (
              <button type="button" className={styles.resetButton} onClick={handleReset}>
                다시 찾기
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
