import { logout } from "@/features/auth/utils/auth";

function MainPage() {
  const handleLogout = () => {
    // 로그인 정보 삭제

    logout();

    alert("로그아웃 되었습니다.");

    // Home.tsx 다시 실행
    // / 주소 유지

    window.location.href = "/";
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
