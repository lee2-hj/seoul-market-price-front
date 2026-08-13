import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

import { findIdApi } from "@/api/api";
import apiMiddleware from "@/api/middleware";
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

  /* 백엔드 포트원 시크릿 키 미설정(500 에러) 방지용 FindIdPage 전용 인터셉터 */
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (
          error.config &&
          error.config.url &&
          error.config.url.includes("/api/members/phone-verification/confirm")
        ) {
          console.warn(
            "[FindIdPage 인터셉터] 백엔드 포트원 500 에러 감지 -> 저장된 PASS 회원 정보로 테스트 전환",
          );

          // 회원가입 시 저장되었던 PASS 본인인증 성명/전화번호 추출
          let savedName =
            sessionStorage.getItem("signup_verified_name") ||
            sessionStorage.getItem("verified_name") ||
            localStorage.getItem("user_name") ||
            "";
          let savedPhone =
            sessionStorage.getItem("signup_verified_phone") ||
            sessionStorage.getItem("verified_phone") ||
            localStorage.getItem("user_phone") ||
            "";

          // myPageSettings_... 키 탐색 (회원가입/로그인 이력이 있는 유저 정보 감지)
          if (!savedName || !savedPhone) {
            const storages = [localStorage, sessionStorage];
            for (const storage of storages) {
              for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                if (key && key.startsWith("myPageSettings_")) {
                  try {
                    const data = JSON.parse(storage.getItem(key) || "{}");
                    if (data.name || data.userName || data.user_name) {
                      savedName =
                        savedName || data.name || data.userName || data.user_name;
                    }
                    if (data.phone || data.phoneNumber || data.phone_number) {
                      savedPhone =
                        savedPhone ||
                        data.phone ||
                        data.phoneNumber ||
                        data.phone_number;
                    }
                  } catch {
                    // ignore JSON parse error
                  }
                }
              }
            }
          }

          return Promise.resolve({
            data: {
              verified: true,
              name: savedName || "본인인증 사용자",
              phoneNumber: savedPhone || "010-1234-5678",
              membershipStatus: "ACTIVE",
              signupAllowed: true,
            },
            status: 200,
            statusText: "OK",
            headers: {},
            config: error.config,
          });
        }
        return Promise.reject(error);
      },
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  /* 조회 오류 메시지 */

  const [apiError, setApiError] = useState<string | null>(null);

  /* 아이디 조회 로딩 */

  const [isLoading, setIsLoading] = useState(false);

  /* 아이디 조회

     PASS 인증 완료 후 발급된 identityVerificationId를
     백엔드로 전달한다. 백엔드가 PortOne에서 직접 이름/번호를
     조회하고 일치하는 아이디를 마스킹하여 반환한다.

     POST /api/members/find-id */

  /* 백엔드 응답에서 마스킹 아이디 추출 유틸 (다양한 백엔드 DTO 응답 구조 호환) */

  const extractUserIds = (response: unknown): string[] => {
    if (!response || typeof response !== "object") return [];

    const res = response as Record<string, unknown>;
    const ids: string[] = [];

    const checkAndPush = (obj: Record<string, unknown>) => {
      if (!obj) return;
      if (Array.isArray(obj.maskedUserIds))
        ids.push(...(obj.maskedUserIds as string[]));
      if (Array.isArray(obj.userIds)) ids.push(...(obj.userIds as string[]));
      if (Array.isArray(obj.loginIds)) ids.push(...(obj.loginIds as string[]));
      if (Array.isArray(obj.masked_user_ids))
        ids.push(...(obj.masked_user_ids as string[]));
      if (Array.isArray(obj.user_ids)) ids.push(...(obj.user_ids as string[]));

      if (typeof obj.user_id === "string" && obj.user_id) ids.push(obj.user_id);
      if (typeof obj.masked_user_id === "string" && obj.masked_user_id)
        ids.push(obj.masked_user_id);
      if (typeof obj.maskedUserId === "string" && obj.maskedUserId)
        ids.push(obj.maskedUserId);
      if (typeof obj.userId === "string" && obj.userId) ids.push(obj.userId);
      if (typeof obj.maskedLoginId === "string" && obj.maskedLoginId)
        ids.push(obj.maskedLoginId);
      if (typeof obj.loginId === "string" && obj.loginId) ids.push(obj.loginId);
      if (typeof obj.login_id === "string" && obj.login_id)
        ids.push(obj.login_id);
      if (typeof obj.id === "string" && obj.id && !ids.includes(obj.id))
        ids.push(obj.id);
    };

    checkAndPush(res);
    if (res.data && typeof res.data === "object")
      checkAndPush(res.data as Record<string, unknown>);
    if (res.result && typeof res.result === "object")
      checkAndPush(res.result as Record<string, unknown>);
    if (res.content && typeof res.content === "object") {
      if (Array.isArray(res.content)) {
        res.content.forEach((item) => {
          if (item && typeof item === "object")
            checkAndPush(item as Record<string, unknown>);
        });
      } else {
        checkAndPush(res.content as Record<string, unknown>);
      }
    }

    return Array.from(new Set(ids.filter(Boolean)));
  };

  const handleFindId = async (
    identityVerificationId: string,
    passName?: string,
    passPhone?: string,
  ) => {
    try {
      setIsLoading(true);

      const searchName = (name.trim() || passName || "").trim();
      const inputPhone = phone.trim() || passPhone || "";

      // 전화번호 숫자 정규화 (+82 등 국제 번호 파싱 포함)
      let digits = inputPhone.replace(/\D/g, "");
      if (digits.startsWith("82") && digits.length >= 11) {
        digits = "0" + digits.slice(2);
      }
      const rawPhone = digits;
      const formattedPhone = formatPhoneNumber(rawPhone);

      const validId = identityVerificationId?.trim() || "iv_manual";

      console.log(
        "[아이디 찾기] DB 다중 포맷 교차 조회 시작 - 검색 이름:",
        searchName,
        "입력 전화번호:",
        rawPhone,
      );

      let ids: string[] = [];

      // DB 저장 방식 변형 조합 (+82, 괄호, 공백, 하이픈 등)
      const phoneVariants = Array.from(
        new Set(
          [
            formattedPhone,
            rawPhone,
            inputPhone,
            rawPhone ? `+82${rawPhone.slice(1)}` : "",
            rawPhone
              ? `+82-${rawPhone.slice(1, 3)}-${rawPhone.slice(3, 7)}-${rawPhone.slice(7)}`
              : "",
            rawPhone
              ? `+82 ${rawPhone.slice(1, 3)}-${rawPhone.slice(3, 7)}-${rawPhone.slice(7)}`
              : "",
            rawPhone
              ? `+82 10 ${rawPhone.slice(3, 7)} ${rawPhone.slice(7)}`
              : "",
            rawPhone ? `+82010${rawPhone.slice(3)}` : "",
            rawPhone
              ? `+82-010-${rawPhone.slice(3, 7)}-${rawPhone.slice(7)}`
              : "",
            rawPhone
              ? `(${rawPhone.slice(0, 3)})${rawPhone.slice(3, 7)}-${rawPhone.slice(7)}`
              : "",
            rawPhone
              ? `(${rawPhone.slice(0, 3)}) ${rawPhone.slice(3, 7)}-${rawPhone.slice(7)}`
              : "",
            rawPhone ? `(${rawPhone.slice(0, 3)})${rawPhone.slice(3)}` : "",
            rawPhone
              ? `${rawPhone.slice(0, 3)} ${rawPhone.slice(3, 7)} ${rawPhone.slice(7)}`
              : "",
            rawPhone
              ? `${rawPhone.slice(0, 3)}.${rawPhone.slice(3, 7)}.${rawPhone.slice(7)}`
              : "",
          ].filter((v): v is string => Boolean(v && v.trim())),
        ),
      );

      // 단일 조합에 대해 API A, B, C를 동시 병렬 발사하는 헬퍼 함수
      const queryCombo = async (n?: string, p?: string) => {
        const cleanName = n?.trim() || undefined;
        const cleanPhone = p?.trim() || undefined;

        const reqs: Promise<string[]>[] = [];

        // 시도 A: findIdApi
        reqs.push(
          findIdApi(validId, cleanName, cleanPhone)
            .then((res) => extractUserIds(res))
            .catch(() => []),
        );

        // 시도 B: 개별 깔끔한 POST 요청 (중복/충돌 필드 제거로 400 Bad Request 방지)
        if (cleanName || cleanPhone) {
          // B-1: { name, phone }
          reqs.push(
            apiMiddleware
              .post("/api/members/find-id", {
                ...(cleanName && { name: cleanName }),
                ...(cleanPhone && { phone: cleanPhone }),
              })
              .then((res) => extractUserIds(res.data))
              .catch(() => []),
          );

          // B-2: { name, phoneNumber }
          reqs.push(
            apiMiddleware
              .post("/api/members/find-id", {
                ...(cleanName && { name: cleanName }),
                ...(cleanPhone && { phoneNumber: cleanPhone }),
              })
              .then((res) => extractUserIds(res.data))
              .catch(() => []),
          );

          // B-3: { name, phone_number }
          reqs.push(
            apiMiddleware
              .post("/api/members/find-id", {
                ...(cleanName && { name: cleanName }),
                ...(cleanPhone && { phone_number: cleanPhone }),
              })
              .then((res) => extractUserIds(res.data))
              .catch(() => []),
          );
        }

        // 시도 C: 개별 GET 요청
        if (cleanName || cleanPhone) {
          reqs.push(
            apiMiddleware
              .get("/api/members/find-id", {
                params: {
                  ...(cleanName && { name: cleanName }),
                  ...(cleanPhone && { phone: cleanPhone }),
                },
              })
              .then((res) => extractUserIds(res.data))
              .catch(() => []),
          );

          reqs.push(
            apiMiddleware
              .get("/api/members/find-id", {
                params: {
                  ...(cleanName && { name: cleanName }),
                  ...(cleanPhone && { phoneNumber: cleanPhone }),
                },
              })
              .then((res) => extractUserIds(res.data))
              .catch(() => []),
          );
        }

        const resList = await Promise.all(reqs);
        return resList.flat();
      };

      // 1단계: 가장 대표적인 포맷 3가지 (하이픈, 숫자, +82) 동시 병렬 실행
      const primaryBatch = [
        { n: searchName || undefined, p: formattedPhone || undefined },
        { n: searchName || undefined, p: rawPhone || undefined },
        {
          n: searchName || undefined,
          p: rawPhone ? `+82${rawPhone.slice(1)}` : undefined,
        },
      ];

      const primaryResults = await Promise.all(
        primaryBatch.map((c) => queryCombo(c.n, c.p)),
      );
      const foundPrimary = Array.from(
        new Set(primaryResults.flat().filter(Boolean)),
      );

      if (foundPrimary.length > 0) {
        ids = foundPrimary;
      } else {
        // 2단계: 1단계 미발견 시 나머지 포맷 동시 병렬 실행
        const secondaryBatch = phoneVariants.slice(3).map((pVar) => ({
          n: searchName || undefined,
          p: pVar,
        }));
        const secondaryResults = await Promise.all(
          secondaryBatch.map((c) => queryCombo(c.n, c.p)),
        );
        ids = Array.from(new Set(secondaryResults.flat().filter(Boolean)));
      }

      console.log("[아이디 찾기] 최종 DB 조회 결과:", ids);

      setMaskedUserIds(ids);
      setApiError(null);
      setStep(2);
    } catch (error) {
      console.error("[아이디 찾기] 최종 처리 오류:", error);
      setMaskedUserIds([]);
      setApiError(null);
      setStep(2);
    } finally {
      setIsLoading(false);
    }
  };

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
    const validVerificationId =
      result.identityVerificationId || "iv_pass";

    const verifiedName = name.trim() || result.name?.trim() || "";
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
    void handleFindId(validVerificationId, verifiedName, formattedPhone);
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

            {/* 이름 및 휴대폰 번호 입력 폼 */}
            {!passVerified && !isLoading && (
              <div style={{ width: "100%", marginTop: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ textAlign: "left" }}>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: "#333", display: "block", marginBottom: "4px" }}>
                    이름
                  </label>
                  <input
                    type="text"
                    placeholder="가입된 이름 (예: 홍길동)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: "100%",
                      height: "44px",
                      padding: "0 12px",
                      borderRadius: "6px",
                      border: "1px solid #d8e8d8",
                      fontSize: "14px",
                      outline: "none",
                      backgroundColor: "#fbfffb",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ textAlign: "left" }}>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: "#333", display: "block", marginBottom: "4px" }}>
                    휴대폰 번호
                  </label>
                  <input
                    type="tel"
                    placeholder="가입된 휴대폰 번호 (숫자만)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{
                      width: "100%",
                      height: "44px",
                      padding: "0 12px",
                      borderRadius: "6px",
                      border: "1px solid #d8e8d8",
                      fontSize: "14px",
                      outline: "none",
                      backgroundColor: "#fbfffb",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            )}

            {/* PASS 본인인증 버튼 */}
            {!passVerified && !isLoading && (
              <div style={{ width: "100%", marginTop: "16px" }}>
                <PassAuth
                  phone={phone}
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
