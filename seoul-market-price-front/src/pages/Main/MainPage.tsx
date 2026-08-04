import { useNavigate } from "react-router-dom";
import { logout } from "@/features/auth/utils/auth";
import { logoutApi } from "@/api/api";

function MainPage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // HttpOnly인 refreshToken 쿠키는 서버만 지울 수 있어 로그아웃 API를 먼저 호출한다.
      await logoutApi();
    } catch (error) {
      console.error(error);
    } finally {
      // 로그인 정보 삭제

      logout();

      // Home.tsx 다시 실행
      // / 주소 유지

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
        onClick={() => navigate("/board")}
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
        자주묻는질문
      </button>

      <button
        onClick={handleLogout}
        style={{
          marginTop: "10px",
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
