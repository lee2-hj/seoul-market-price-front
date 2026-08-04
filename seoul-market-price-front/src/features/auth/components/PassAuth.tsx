import { useRef, useState } from "react";
import axios from "axios";
import * as PortOne from "@portone/browser-sdk/v2";

interface PassAuthResult {
  name: string;
  phoneNumber: string;
}

interface PassAuthProps {
  // 팝업에서 직접 입력/인증하므로 필수는 아니고, 있으면 초기값 힌트로만 쓰인다.
  phone?: string;
  onSuccess: (result: PassAuthResult) => void;
}

/*
  포트원 콘솔에 등록된 공개 식별자이다(비밀값 아님).

  본인인증 결과를 실제로 신뢰하기 위한 API 시크릿은 프론트에 두지 않고
  백엔드(PhoneVerificationController)에서만 사용한다.

*/
const PORTONE_STORE_ID = "store-80402af7-238f-44bf-8b5d-a4f3c415f38d";
const PORTONE_CHANNEL_KEY = "channel-key-2263e63e-bdc1-4ac6-a259-a489538265c0";

function PassAuth({ phone, onSuccess }: PassAuthProps) {
  const [verifying, setVerifying] = useState(false);

  /*
    인증 완료 중복 실행 방지
  */
  const completedRef = useRef(false);

  /*
    PASS 본인인증 요청


    React

      ↓

    포트원 브라우저 SDK (NHN KCP 채널)

      ↓

    identityVerificationId 발급

      ↓

    Spring Boot에 identityVerificationId 전달

      ↓

    Spring Boot가 포트원 서버에 직접 조회해 검증

  */

  const handlePassAuth = async () => {
    if (verifying) {
      return;
    }

    try {
      setVerifying(true);

      completedRef.current = false;

      const identityVerificationId = `identity-verification-${crypto.randomUUID()}`;

      /*
        포트원 브라우저 SDK가 PASS 본인인증 창(팝업/새창)을 띄우고,
        사용자가 인증을 마치거나 취소할 때까지 대기한다.

      */

      const result = await PortOne.requestIdentityVerification({
        storeId: PORTONE_STORE_ID,

        identityVerificationId,

        channelKey: PORTONE_CHANNEL_KEY,

        customer: phone
          ? {
              phoneNumber: phone.replace(/-/g, ""),
            }
          : undefined,
      });

      if (result?.code != null) {
        // 사용자가 취소했거나 PG사에서 인증에 실패한 경우
        alert(result.message ?? "PASS 인증이 취소되었습니다.");

        return;
      }

      /*
        프론트가 알려준 성공 여부를 그대로 믿지 않고, 발급된
        identityVerificationId로 백엔드가 포트원 서버에 직접 조회해
        검증한 결과만 신뢰한다.

      */

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/members/phone-verification/confirm`,

        {
          identityVerificationId,
        },
      );

      if (!response.data?.verified) {
        alert("PASS 휴대폰 인증에 실패했습니다.");

        return;
      }

      if (completedRef.current) {
        return;
      }

      completedRef.current = true;

      alert("PASS 휴대폰 인증 완료");

      onSuccess({
        name: response.data.name,

        phoneNumber: response.data.phoneNumber,
      });
    } catch (error) {
      console.error("PASS 인증 오류", error);

      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "PASS 인증 요청에 실패했습니다.";

      alert(message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <button type="button" onClick={handlePassAuth} disabled={verifying}>
      {verifying ? "인증중..." : "인증하기"}
    </button>
  );
}

export default PassAuth;
