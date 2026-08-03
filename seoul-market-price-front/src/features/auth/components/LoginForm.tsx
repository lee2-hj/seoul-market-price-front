import { useState } from "react";
import { useNavigate } from "react-router-dom";

import styles from "./LoginForm.module.css";

import { saveLogin } from "../../auth/utils/auth";
import { loginApi, isAuthError } from "@/api/api";

function LoginForm() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState("");

  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    const trimUserId = userId.trim();

    if (!trimUserId || !password) {
      alert("아이디와 비밀번호를 입력해주세요.");

      return;
    }

    try {
      setLoading(true);

      const data = await loginApi(trimUserId, password);

      /*
        백엔드 응답 검증

        예상 형태:

        {
          user:{
            userId,
            name,
            role
          },
          accessToken
        }

      */

      if (!data?.user || !data?.accessToken) {
        throw new Error("로그인 응답 데이터 오류");
      }

      /*
        로그인 정보 저장

        localStorage
              ↓
        Home.tsx
              ↓
        getToken()
              ↓
        MainPage 이동

      */

      saveLogin({
        ...data.user,

        accessToken: data.accessToken,
      });

<<<<<<< HEAD
      alert("로그인 성공!");

      /*
        주소 유지
=======
      // 주소 변경 없음
      // /
      // 그대로 유지
>>>>>>> 6bbe5297d8c32f30031ef523190c3c0ce50f9c16

        /
        ↓
        Home.tsx 재실행

      */

      navigate("/");
    } catch (error) {
      console.error("로그인 오류", error);

      if (isAuthError(error)) {
        alert("아이디 또는 비밀번호가 맞지 않습니다.");
      } else {
        alert("서버 연결 실패");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        type="text"
        placeholder="아이디"
        value={userId}
        disabled={loading}
        onChange={(e) => {
          setUserId(e.target.value);
        }}
      />

      <input
        type="password"
        placeholder="비밀번호"
        value={password}
        disabled={loading}
        onChange={(e) => {
          setPassword(e.target.value);
        }}
      />

      <button type="submit" className={styles.loginButton} disabled={loading}>
        {loading ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}

export default LoginForm;
