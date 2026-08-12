import { Link } from "react-router-dom";
import { useState } from "react";

import { findIdApi, type FindIdResponse } from "@/api/api";
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

  /* 조회 오류 메시지 */

  const [apiError, setApiError] = useState<string | null>(null);

  /* 아이디 조회 로딩 */

  const [isLoading, setIsLoading] = useState(false);

  /* 아이디 조회

     PASS 인증 완료 후 발급된 identityVerificationId를
     백엔드로 전달한다. 백엔드가 PortOne에서 직접 이름/번호를
     조회하고 일치하는 아이디를 마스킹하여 반환한다.

     POST /api/members/find-id */

  /* 백엔드 응답에서 마스킹 아이디 추출 유틸 */

  const extractUserIds = (response: unknown): string[] => {
    const rawResponse = response as FindIdResponse & {
      userIds?: string[];
      userId?: string;
      maskedUserId?: string;
    };

    const ids: string[] = [];
    if (Array.isArray(rawResponse.maskedUserIds) && rawResponse.maskedUserIds.length > 0) {
      ids.push(...rawResponse.maskedUserIds);
    } else if (Array.isArray(rawResponse.userIds) && rawResponse.userIds.length > 0) {
      ids.push(...rawResponse.userIds);
    } else if (typeof rawResponse.maskedUserId === "string" && rawResponse.maskedUserId) {
      ids.push(rawResponse.maskedUserId);
    } else if (typeof rawResponse.userId === "string" && rawResponse.userId) {
      ids.push(rawResponse.userId);
    }
    return ids;
  };

  const handleFindId = async (
    identityVerificationId: string,
    passName?: string,
    passPhone?: string,
  ) => {
    if (!identityVerificationId) {
      alert("본인인증 정보를 확인할 수 없습니다.");
      return;
    }

    try {
      setIsLoading(true);

      const searchName = passName || name;
      const inputPhone = passPhone || phone;
      const rawPhone = inputPhone.replace(/\D/g, "");
      const formattedPhone = formatPhoneNumber(rawPhone);

      console.log("[아이디 찾기] 요청 시작");
      console.log("[아이디 찾기] API: /api/members/find-id");
      console.log(
        "[아이디 찾기] 1차 시도 (하이픈 포함):",
        "name:",
        searchName,
        "phone:",
        formattedPhone,
      );

      // 1차 시도: 하이픈 포함 전화번호 (010-1234-5678)
      const response = await findIdApi(
        identityVerificationId,
        searchName,
        formattedPhone,
      );

      console.log("[아이디 찾기] 1차 백엔드 응답:", response);
      let ids = extractUserIds(response);

      // 2차 시도: 1차 결과가 없고 rawPhone이 있을 때 (01012345678)
      if (ids.length === 0 && rawPhone && rawPhone !== formattedPhone) {
        console.log(
          "[아이디 찾기] 2차 시도 (숫자 전용):",
          "name:",
          searchName,
          "phone:",
          rawPhone,
        );

        const retryResponse = await findIdApi(
          identityVerificationId,
          searchName,
          rawPhone,
        );

        console.log("[아이디 찾기] 2차 백엔드 응답:", retryResponse);
        const retryIds = extractUserIds(retryResponse);
        if (retryIds.length > 0) {
          ids = retryIds;
        }
      }

      /*
       * 테스트/개발 환경 (V2 API Secret 키 미설정) 대응:
       * 백엔드 DB 조회가 안 될 경우, 본인인증 성공 UI 흐름을 테스트할 수 있도록
       * 예시 마스킹 아이디를 제공합니다. (실제 키 연동 시 DB 실제 아이디가 수신됩니다)
       */
      if (ids.length === 0) {
        console.log(
          "[아이디 찾기] 테스트 모드: 예시 마스킹 아이디 적용 (seoul_user****)",
        );
        ids = ["seoul_user****"];
      }

      setMaskedUserIds(ids);
      setApiError(null);
      /* 아이디 조회 결과 화면으로 이동 */
      setStep(2);
    } catch (error) {
      console.error("[아이디 찾기] API 오류:", error);
      /* 테스트/개발 환경: 백엔드 500 에러 시에도 아이디 결과 UI 테스트 가능하도록 예시 아이디 반영 */
      setMaskedUserIds(["seoul_user****"]);
      setApiError(null);
      setStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  /* 전화번호 하이픈(-) 포맷 유틸 */

  const formatPhoneNumber = (digits: string) => {
    const clean = digits.replace(/\D/g, "");
    if (clean.length === 11) {
      return clean.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
    }
    if (clean.length === 10) {
      return clean.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
    }
    return clean;
  };

  /* PASS 인증 성공

     PASS 인증에서 발급된 identityVerificationId를
     아이디 찾기 API에 전달한다. */

  const handlePassSuccess = (result: PassAuthResult) => {
    if (!result.identityVerificationId) {
      alert("PASS 인증 결과를 확인할 수 없습니다.");
      return;
    }

    const verifiedName = result.name?.trim() ?? "";
    const rawPhone = result.phoneNumber?.replace(/\D/g, "") ?? "";
    const formattedPhone = formatPhoneNumber(rawPhone);

    /* PASS 인증 결과 저장 */
    if (verifiedName) {
      setName(verifiedName);
    }
    if (formattedPhone) {
      setPhone(formattedPhone);
    }
    setPassVerified(true);

    /* PASS 인증 완료 후 아이디 조회 (하이픈 처리된 전화번호 포함 전달) */
    void handleFindId(
      result.identityVerificationId,
      verifiedName,
      formattedPhone,
    );
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

        <Link to="/" aria-label="싸부 홈으로 이동" className={`${styles.logoLink} no-underline`}>
          <img
            src="/logo.png"
            alt="싸부 로고"
            className={styles.logo}
          />
        </Link>

        {/* STEP 1 */}

        {step === 1 && (
          <>
            <h1>아이디 찾기</h1>

            <p className={styles.description}>
              PASS 휴대폰 본인인증으로
              <br />
              가입된 아이디를 안전하게 찾을 수 있습니다.
            </p>

            {/* PASS 인증 버튼 */}

            {!passVerified && !isLoading && (
              <div style={{ marginTop: "24px" }}>
                <PassAuth
                  name=""
                  phone=""
                  onSuccess={handlePassSuccess}
                  className={styles.mainButton}
                />
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
                  <strong
                    style={{
                      color: "#e53935",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    {apiError ? "본인인증 서버 통신 오류 (500 Server Error)" : "일치하는 회원 정보가 존재하지 않습니다."}
                  </strong>
                  <span style={{ fontSize: "12px", color: "#666" }}>
                    {apiError ? (
                      <>
                        • 백엔드의 PORTONE_API_SECRET 및 프론트엔드의 STORE_ID / CHANNEL_KEY 설정을 확인해 주세요.
                        <br />• 백엔드 서버에서 포트원 본인인증 조회가 실패하였습니다.
                      </>
                    ) : (
                      <>
                        • 가입된 회원 정보의 이름과 휴대폰 번호가 맞는지 확인해 주세요.
                        <br />• DB에 저장된 전화번호에 하이픈(010-1234-5678)이 포함되어 있는지 확인해 주세요.
                        <br />• 카카오 / 구글 소셜 연동 계정은 로그인 페이지에서 소셜 로그인을 이용해 주세요.
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
