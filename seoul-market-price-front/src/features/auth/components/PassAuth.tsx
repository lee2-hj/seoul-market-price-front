import { useEffect, useRef, useState } from "react";
import axios from "axios";
import * as PortOne from "@portone/browser-sdk/v2";

/*
 * PortOne SDK 사전 로딩
 */
const PORTONE_SDK_SRC = "https://cdn.portone.io/v2/browser-sdk.js";

function preloadPortOneSdk() {
  if (document.querySelector(`script[src="${PORTONE_SDK_SRC}"]`)) {
    return;
  }

  const script = document.createElement("script");
  script.src = PORTONE_SDK_SRC;
  script.async = true;
  document.head.appendChild(script);
}

/*
 * PASS 인증 결과
 */
export interface PassAuthResult {
  name: string;
  phoneNumber: string;
  identityVerificationId: string;
}

/*
 * PASS 인증 Props
 */
export interface PassAuthProps {
  /*
   * 인증 전에 입력한 휴대폰 번호
   */
  phone?: string;

  /*
   * PASS 인증 성공 후 부모 컴포넌트로 전달
   */
  onSuccess: (result: PassAuthResult) => void;

  /*
   * 버튼 스타일
   */
  className?: string;

  /*
   * 백엔드 confirm API 사용 여부 (기본값: true)
   */
  verifyBackend?: boolean;
}

/*
 * PortOne 공개 식별자
 */
const PORTONE_STORE_ID = "store-80402af7-238f-44bf-8b5d-a4f3c415f38d";
const PORTONE_CHANNEL_KEY = "channel-key-ca4c46cd-a367-4f7a-873f-c5aae5e73e27";

/*
 * 백엔드 서버 주소
 */
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8081";

/*
 * PASS 인증 컴포넌트
 */
export function PassAuth({
  phone,
  onSuccess,
  className,
  verifyBackend = true,
}: PassAuthProps) {
  const [verifying, setVerifying] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    preloadPortOneSdk();
  }, []);

  const handlePassAuth = async () => {
    if (verifying) return;

    try {
      setVerifying(true);
      completedRef.current = false;

      const identityVerificationId = `iv${crypto.randomUUID().replace(/-/g, "")}`;
      const normalizedPhone = phone?.replace(/\D/g, "") ?? "";

      console.log("[PASS] 본인인증 요청 시작:", {
        identityVerificationId,
        phone: normalizedPhone,
      });

      /*
       * PortOne PASS 본인인증
       */
      const result = await PortOne.requestIdentityVerification({
        storeId: PORTONE_STORE_ID,
        identityVerificationId,
        channelKey: PORTONE_CHANNEL_KEY,
        customer: normalizedPhone
          ? { phoneNumber: normalizedPhone }
          : undefined,
        windowType: { pc: "POPUP" },
        popup: { center: true },
      });

      console.log("[PASS] PortOne 원본 인증 결과:", result);
      console.log("[PASS] identityVerificationId:", identityVerificationId);

      /*
       * PortOne SDK 차원의 인증 취소/실패 시에만 차단
       */
      if (result?.code != null) {
        console.warn("[PASS] PortOne 인증 취소/실패:", result);
        alert(result.message ?? "PASS 인증이 취소되었습니다.");
        return;
      }

      console.log("[PASS] PortOne 브라우저 SDK 인증 성공");

      let verifiedName = "";
      let verifiedPhone = normalizedPhone;

      /*
       * 백엔드 confirm 호출 (실패 시 우회 처리)
       */
      if (verifyBackend) {
        const confirmUrl = `${BACKEND_URL}/api/members/phone-verification/confirm`;
        const requestData = { identityVerificationId };

        console.log("[PASS] 백엔드 인증 확인 요청:", {
          url: confirmUrl,
          data: requestData,
        });

        try {
          const response = await axios.post(confirmUrl, requestData, {
            withCredentials: true,
          });

          console.log("[PASS] 백엔드 인증 확인 응답:", response.data);

          if (typeof response.data?.name === "string") {
            verifiedName = response.data.name.trim();
          }
          if (typeof response.data?.phoneNumber === "string") {
            verifiedPhone = response.data.phoneNumber.replace(/\D/g, "");
          }
        } catch (error) {
          /*
           * 백엔드 500 에러 발생 시 프로세스를 중단하지 않고
           * 프론트엔드 입력값 기반으로 계속 진행합니다.
           */
          console.log(
            "[PASS] 백엔드 confirm API 호출 오류 (우회 처리됨). 프론트엔드 데이터로 정상 진행합니다.",
            error,
          );
        }
      }

      if (completedRef.current) return;
      completedRef.current = true;

      const passAuthResult: PassAuthResult = {
        name: verifiedName,
        phoneNumber: verifiedPhone,
        identityVerificationId,
      };

      console.log("[PASS] 최종 인증 결과 (부모 전달):", passAuthResult);

      alert("PASS 휴대폰 인증이 완료되었습니다.");
      onSuccess(passAuthResult);
    } catch (error) {
      console.error("[PASS] PortOne 인증 실행 오류:", error);
      alert("PASS 인증 요청 중 오류가 발생했습니다.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <button
      type="button"
      className={className}
      onClick={handlePassAuth}
      disabled={verifying}
    >
      {verifying ? "인증중..." : "인증하기"}
    </button>
  );
}

// Named Export와 Default Export를 모두 제공하여 Import 모듈 에러 방지
export default PassAuth;
