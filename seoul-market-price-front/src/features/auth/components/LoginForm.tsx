import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import styles from "./LoginForm.module.css";

import { saveLogin } from "../../auth/utils/auth";
import { loginApi } from "@/api/api";

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
        백엔드 LoginResponse는 평평한 구조로 내려온다.

        {
          accessToken,
          memberId,
          userId,
          name
        }

        accessToken은 쿠키가 기준(source of truth)이므로
        응답 바디 검증은 userId만으로 충분하다.
      */

      if (!data?.userId) {
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
        userId: data.userId,

        name: data.name,

        // 백엔드 로그인 응답에는 role이 내려오지 않는다.
        role: "",

        accessToken: data.accessToken,
      });

      /*
        주소 유지

        /
        ↓
        Home.tsx 재실행

      */

      navigate("/");
    } catch (error) {
      console.error("로그인 오류", error);

      // 백엔드가 { code, message } 형태로 상태 메시지를 내려주므로
      // 있으면 그 메시지를, 없으면(네트워크 오류 등) 기본 문구를 보여준다.
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "서버 연결 실패";

      alert(message);
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
