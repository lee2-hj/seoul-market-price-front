import { logout } from "../../features/auth/utils/auth";
import { logoutApi } from "@/api/api";

function MainPage() {
  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      // HttpOnly인 refreshToken 쿠키는 서버만 지울 수 있어 로그아웃 API를 먼저 호출한다.
      await logoutApi();
    } catch (error) {
      console.error(error);
    } finally {
      logout();

      alert("로그아웃 되었습니다.");

      // navigate("/")는 현재 경로가 이미 "/"라 리렌더링을 유발하지 않으므로
      // 전체 새로고침으로 이동해 Home이 로그인 상태를 다시 검사하도록 한다.
      window.location.href = "/";
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        flexDirection: "column",
      }}
    >
      <h1>🥕 싸농 메인페이지</h1>

      <p>로그인 성공!</p>

      <button
        onClick={handleLogout}
        style={{
          marginTop: "20px",
          padding: "10px 25px",
          borderRadius: "8px",
          border: "none",
          background: "#4CAF50",
          color: "white",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        로그아웃
      </button>
    </div>
  );
}

export default MainPage;
