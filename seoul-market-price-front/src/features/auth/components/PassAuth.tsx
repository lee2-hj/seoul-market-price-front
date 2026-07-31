import { useEffect, useRef, useState } from "react";
import axios from "axios";

interface PassAuthProps {
  phone: string;
  onSuccess: () => void;
}

type PassMessage =
  | {
      type: "PASS_SUCCESS";
    }
  | {
      type: "PASS_FAIL";
    };

function PassAuth({ phone, onSuccess }: PassAuthProps) {
  const [sending, setSending] = useState(false);

  /*
    PASS 인증 팝업 관리
  */
  const popupRef = useRef<Window | null>(null);

  /*
    인증 완료 중복 실행 방지
  */
  const completedRef = useRef(false);

  /*
    PASS Callback 수신


    PASS 인증창

        ↓

    /pass/callback

        ↓

    window.postMessage()

        ↓

    여기서 성공 처리

  */

  useEffect(() => {
    const receiveMessage = (event: MessageEvent<PassMessage>) => {
      /*
        보안 검증

        현재 개발환경:
        localhost:3000

        배포 후:
        실제 서비스 도메인 변경

      */

      if (event.origin !== window.location.origin) {
        return;
      }

      const messageType = event.data?.type;

      /*
        PASS 성공

      */

      if (messageType === "PASS_SUCCESS") {
        // 중복 실행 방지
        if (completedRef.current) {
          return;
        }

        completedRef.current = true;

        setSending(false);

        onSuccess();

        alert("PASS 휴대폰 인증 완료");

        popupRef.current?.close();

        popupRef.current = null;

        return;
      }

      /*
        PASS 실패

      */

      if (messageType === "PASS_FAIL") {
        setSending(false);

        alert("PASS 인증 실패");

        popupRef.current?.close();

        popupRef.current = null;
      }
    };

    window.addEventListener("message", receiveMessage);

    return () => {
      window.removeEventListener("message", receiveMessage);
    };
  }, [onSuccess]);

  /*
    PASS 인증 요청


    React

      ↓

    Spring Boot

      ↓

    NICE PASS

      ↓

    PASS URL 반환

  */

  const handlePassAuth = async () => {
    if (!phone) {
      alert("휴대폰 번호를 입력해주세요.");

      return;
    }

    try {
      setSending(true);

      completedRef.current = false;

      /*
        기존 팝업 제거

      */

      popupRef.current?.close();

      /*
        팝업 먼저 생성

        브라우저 팝업 차단 방지

      */

      const popup = window.open(
        "",
        "PASS_AUTH",
        `
        width=450,
        height=700,
        top=100,
        left=500
        `,
      );

      if (!popup) {
        throw new Error("팝업 차단");
      }

      popupRef.current = popup;

      /*
        PASS URL 요청

      */

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/pass/request`,

        {
          phone,
        },
      );

      const { passUrl } = response.data;

      if (!passUrl) {
        throw new Error("PASS URL 없음");
      }

      /*
        PASS 인증 페이지 이동

      */

      popup.location.href = passUrl;
    } catch (error) {
      console.error("PASS 요청 오류", error);

      popupRef.current?.close();

      popupRef.current = null;

      alert("PASS 인증 요청 실패");

      setSending(false);
    }
  };

  return (
    <button type="button" onClick={handlePassAuth} disabled={sending}>
      {sending ? "인증중..." : "인증하기"}
    </button>
  );
}

export default PassAuth;
