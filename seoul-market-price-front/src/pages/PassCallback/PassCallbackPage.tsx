import { useEffect } from "react";

function PassCallbackPage() {
  useEffect(() => {
    const sendPassResult = () => {
      if (!window.opener) {
        console.error("PASS 부모창 없음");
        return;
      }

      window.opener.postMessage(
        {
          type: "PASS_SUCCESS",
        },

        window.location.origin,
      );

      setTimeout(() => {
        window.close();
      }, 300);
    };

    sendPassResult();
  }, []);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <h2>PASS 인증 완료 처리중...</h2>
    </div>
  );
}

export default PassCallbackPage;
