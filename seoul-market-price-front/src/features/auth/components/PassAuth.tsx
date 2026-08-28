import { useEffect, useRef, useState } from "react";
import axios from "axios";
import * as PortOne from "@portone/browser-sdk/v2";

/*
  포트원 SDK는 requestIdentityVerification()이 처음 호출되는(=버튼을
  클릭하는) 시점에야 비로소 CDN에서 실제 SDK 스크립트를 내려받는다.
  그 다운로드+파싱 시간이 그대로 "버튼을 눌렀는데 팝업이 늦게 뜨는"
  체감 지연이 되므로, 컴포넌트가 마운트되는 시점(=인증 버튼이 화면에
  보이는 시점)에 미리 백그라운드로 로드해둔다. SDK 내부의 loadScript()
  도 동일한 URL의 <script> 태그를 찾으면 재사용하므로 중복 요청되지
  않는다.
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

export type MembershipStatus = "NEW" | "ACTIVE" | "WITHDRAWN";

export interface PassAuthResult {
  identityVerificationId: string;
  name: string;
  phoneNumber: string;
  membershipStatus?: MembershipStatus;
  signupAllowed?: boolean;
}

interface PassAuthProps {
  // 팝업에서 직접 입력/인증하므로 필수는 아니고, 있으면 초기값 힌트로만 쓰인다.
  phone?: string;
  onSuccess: (result: PassAuthResult) => void;
  className?: string;
}

/*
  포트원 콘솔에 등록된 공개 식별자이다(비밀값 아님).

  본인인증 결과를 실제로 신뢰하기 위한 API 시크릿은 프론트에 두지 않고
  백엔드(PhoneVerificationController)에서만 사용한다.

*/
const PORTONE_STORE_ID = "store-80402af7-238f-44bf-8b5d-a4f3c415f38d";
const PORTONE_CHANNEL_KEY = "channel-key-ca4c46cd-a367-4f7a-873f-c5aae5e73e27";

function PassAuth({ phone, onSuccess, className }: PassAuthProps) {
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    preloadPortOneSdk();
  }, []);

  /*
    인증 완료 중복 실행 방지
  */
  const completedRef = useRef(false);

  /*
    PASS 본인인증 요청


    React

      ↓

    포트원 브라우저 SDK (KG이니시스 채널, 테스트 모드)

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

      /*
        PG사는 이 값을 자체 주문번호로 그대로 사용하며 길이 제한(40자)이
        있어, prefix를 붙인 UUID 전체 문자열("identity-verification-" +
        36자)을 쓰면 포맷 오류가 발생한다. 하이픈을 제거한 32자 UUID에
        짧은 prefix만 붙여 제한 내로 맞춘다.

      */
      const uuid = crypto.randomUUID?.() ??
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
      const identityVerificationId = `iv${uuid.replace(/-/g, "")}`;

      /*
        이 KG이니시스 본인인증 채널은 PC 환경에서 IFRAME 창 유형을
        지원하지 않는다("PC 환경에서 지원하지 않는 PG사 창 유형(IFRAME)입니다"
        오류 발생). PC는 새 창(팝업) 방식으로 고정하고, 모바일은 앱 전환이
        필요한 인증사가 많아 PG사 기본 동작(리디렉션)을 그대로 따른다.

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

        windowType: {
          pc: "POPUP",
        },

        popup: {
          center: true,
        },
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
        identityVerificationId,
        name: response.data.name,
        phoneNumber: response.data.phoneNumber,
        membershipStatus: response.data.membershipStatus,
        signupAllowed: response.data.signupAllowed,
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

export default PassAuth;
