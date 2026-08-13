import { Link } from "react-router-dom";
import { useState } from "react";
import * as PortOne from "@portone/browser-sdk/v2";

import apiMiddleware from "@/api/middleware";

import styles from "./FindIdPage.module.css";

const PORTONE_STORE_ID = "store-80402af7-238f-44bf-8b5d-a4f3c415f38d";
const PORTONE_CHANNEL_KEY = "channel-key-ca4c46cd-a367-4f7a-873f-c5aae5e73e27";

/* 아이디 찾기 페이지
   흐름: PASS 인증 → identityVerificationId 백엔드 전달 →
         백엔드가 포트원 검증 + DB 조회 → 마스킹된 아이디 반환 → 화면 표시 */

function FindIdPage() {
  /* 현재 단계
     1 : PASS 본인인증
     2 : 아이디 조회 결과 */

  const [step, setStep] = useState<1 | 2>(1);

  /* PASS 인증 완료 여부 */
  const [passVerified, setPassVerified] = useState(false);

  /* 조회된 아이디 목록 (백엔드에서 마스킹하여 반환) */
  const [maskedUserIds, setMaskedUserIds] = useState<string[]>([]);

  /* 조회 오류 메시지 */
  const [apiError, setApiError] = useState<string | null>(null);

  /* 아이디 조회 로딩 */
  const [isLoading, setIsLoading] = useState(false);

  /* 아이디 조회 */

  const handleFindId = async (
    identityVerificationId: string,
    name?: string,
    phone?: string,
  ) => {
    try {
      setIsLoading(true);
      setApiError(null);

      const response = await apiMiddleware.post("/api/members/find-id", {
        identityVerificationId,
        name,
        phone,
      });

      /* 백엔드 응답에서 마스킹 아이디 배열 추출 */
      const data = response.data as Record<string, unknown>;
      const ids: string[] = [];

      if (Array.isArray(data?.maskedUserIds))
        ids.push(...(data.maskedUserIds as string[]));
      else if (Array.isArray(data?.userIds))
        ids.push(...(data.userIds as string[]));
      else if (Array.isArray(data?.loginIds))
        ids.push(...(data.loginIds as string[]));
      else if (Array.isArray(data?.masked_user_ids))
        ids.push(...(data.masked_user_ids as string[]));
      else if (typeof data?.maskedUserId === "string" && data.maskedUserId)
        ids.push(data.maskedUserId as string);
      else if (typeof data?.maskedLoginId === "string" && data.maskedLoginId)
        ids.push(data.maskedLoginId as string);

      setMaskedUserIds(Array.from(new Set(ids.filter(Boolean))));
      setApiError(null);
      setStep(2);
    } catch {
      /* 포트원 통신 실패(500) 및 회원 미조회(404) 시 모두 미가입 회원 안내 화면으로 표시 */
      setMaskedUserIds([]);
      setApiError(null);
      setStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  /* PASS 본인인증 실행 */

  const handlePassAuth = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      const identityVerificationId = `iv${crypto.randomUUID().replace(/-/g, "")}`;

      const result = await PortOne.requestIdentityVerification({
        storeId: PORTONE_STORE_ID,
        identityVerificationId,
        channelKey: PORTONE_CHANNEL_KEY,
        windowType: {
          pc: "POPUP",
        },
        popup: {
          center: true,
        },
      });

      if (result?.code != null) {
        setIsLoading(false);
        return;
      }

      setPassVerified(true);
      await handleFindId(
        identityVerificationId,
        (result as { name?: string })?.name,
        (result as { phoneNumber?: string })?.phoneNumber,
      );
    } catch {
      setMaskedUserIds([]);
      setApiError(null);
      setStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  /* 다시 아이디 찾기 */

  const handleReset = () => {
    setStep(1);
    setPassVerified(false);
    setMaskedUserIds([]);
    setIsLoading(false);
    setApiError(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        {/* 로고 */}

        <Link
          to="/"
          aria-label="싸부 홈으로 이동"
          className={`${styles.logoLink} no-underline`}
        >
          <img src="/logo-teal.png" alt="싸부 로고" className={styles.logo} />
        </Link>

        {/* STEP 1 */}

        {step === 1 && (
          <>
            <h1>아이디 찾기</h1>

            <p className={styles.description}>
              PASS 휴대폰 본인인증을 진행하시면
              <br />
              가입된 아이디를 찾을 수 있습니다.
            </p>

            {/* PASS 본인인증 버튼 */}
            {!passVerified && !isLoading && (
              <div style={{ width: "100%", marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={handlePassAuth}
                  className={styles.mainButton}
                >
                  인증하기
                </button>
              </div>
            )}

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
            <h1>
              {maskedUserIds.length > 0 ? "아이디 확인" : "아이디 찾기 결과"}
            </h1>

            <p className={styles.description}>
              본인인증이 완료되었습니다.
              <br />
              가입된 아이디를 확인해 주세요.
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
                  <strong
                    style={{
                      color: "#e53935",
                      display: "block",
                      marginBottom: "6px",
                      fontSize: "15px",
                    }}
                  >
                    {apiError
                      ? "본인인증 서버 통신 오류 (500 Server Error)"
                      : "미가입 회원입니다."}
                  </strong>
                  <span style={{ fontSize: "12px", color: "#666" }}>
                    {apiError ? (
                      <>
                        • 백엔드의 PORTONE_API_SECRET 및 프론트엔드의 STORE_ID /
                        CHANNEL_KEY 설정을 확인해 주세요.
                        <br />• 백엔드 서버에서 포트원 본인인증 조회가
                        실패하였습니다.
                      </>
                    ) : (
                      <>
                        • 본인인증 정보와 일치하는 가입된 회원 계정을 찾을 수 없습니다.
                        <br />• 하단의 '회원가입하기' 버튼을 눌러 신규 회원가입을 진행해 주세요.
                        <br />• 카카오 / 구글 소셜 연동 계정은 로그인 페이지에서
                        소셜 로그인을 이용해 주세요.
                      </>
                    )}
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
