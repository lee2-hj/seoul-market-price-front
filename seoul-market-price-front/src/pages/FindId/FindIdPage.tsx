import { Link } from "react-router-dom";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import * as PortOne from "@portone/browser-sdk/v2";

import apiMiddleware from "@/api/middleware";
import styles from "./FindIdPage.module.css";

const PORTONE_STORE_ID = "store-80402af7-238f-44bf-8b5d-a4f3c415f38d";
const PORTONE_CHANNEL_KEY = "channel-key-ca4c46cd-a367-4f7a-873f-c5aae5e73e27";

interface FindIdParams {
  identityVerificationId: string;
  name?: string;
  phone?: string;
}

/* API 연동 함수: 아이디 찾기 */
async function findIdApi({ identityVerificationId, name, phone }: FindIdParams): Promise<string[]> {
  const response = await apiMiddleware.post("/api/members/find-id", {
    identityVerificationId,
    name,
    phone,
  });

  const data = response.data as Record<string, unknown>;
  const ids: string[] = [];

  if (Array.isArray(data?.maskedUserIds)) ids.push(...(data.maskedUserIds as string[]));
  else if (Array.isArray(data?.userIds)) ids.push(...(data.userIds as string[]));
  else if (Array.isArray(data?.loginIds)) ids.push(...(data.loginIds as string[]));
  else if (typeof data?.maskedUserId === "string" && data.maskedUserId) ids.push(data.maskedUserId);
  else if (typeof data?.maskedLoginId === "string" && data.maskedLoginId) ids.push(data.maskedLoginId);

  return Array.from(new Set(ids.filter(Boolean)));
}

/* 메인 컴포넌트 */
export default function FindIdPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [passVerified, setPassVerified] = useState(false);
  const [maskedUserIds, setMaskedUserIds] = useState<string[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);

  /* React Query: 아이디 찾기 뮤테이션 */
  const findIdMutation = useMutation({
    mutationFn: findIdApi,
    onSuccess: (ids) => {
      setMaskedUserIds(ids);
      setStep(2);
    },
    onError: () => {
      setMaskedUserIds([]);
      setStep(2);
    },
  });

  const isLoading = isVerifying || findIdMutation.isPending;

  /* PASS 본인인증 실행 */
  const handlePassAuth = async () => {
    if (isLoading) return;

    try {
      setIsVerifying(true);
      const identityVerificationId = `iv${crypto.randomUUID().replace(/-/g, "")}`;

      const result = await PortOne.requestIdentityVerification({
        storeId: PORTONE_STORE_ID,
        identityVerificationId,
        channelKey: PORTONE_CHANNEL_KEY,
        windowType: { pc: "POPUP" },
        popup: { center: true },
      });

      if (result?.code != null) {
        setIsVerifying(false);
        return;
      }

      setPassVerified(true);
      setIsVerifying(false);

      findIdMutation.mutate({
        identityVerificationId,
        name: (result as { name?: string })?.name,
        phone: (result as { phoneNumber?: string })?.phoneNumber,
      });
    } catch {
      setIsVerifying(false);
      setMaskedUserIds([]);
      setStep(2);
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

            {!passVerified && !isLoading && (
              <div style={{ width: "100%", marginTop: "24px" }}>
                <button type="button" onClick={handlePassAuth} className={styles.mainButton}>
                  인증하기
                </button>
              </div>
            )}

            {passVerified && <p className={styles.success}>✔ PASS 휴대폰 인증 완료</p>}
            {isLoading && <p className={styles.loading}>가입된 아이디를 조회하고 있습니다...</p>}
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
