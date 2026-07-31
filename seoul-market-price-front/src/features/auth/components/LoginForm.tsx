import { useState } from "react";

import styles from "./LoginForm.module.css";

import { saveLogin } from "../../auth/utils/auth";
import { loginApi, isAuthError } from "@/api/api";

function LoginForm() {
  const [userId, setUserId] = useState("");

  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId || !password) {
      alert("아이디와 비밀번호를 입력해주세요.");

      return;
    }

    try {
      const data = await loginApi(userId, password);

      saveLogin({
        ...data.user,

        accessToken: data.accessToken,
      });

      alert("로그인 성공!");

      // 주소 변경 없음
      // /
      // 그대로 유지

      window.location.reload();
    } catch (error) {
      console.error(error);

      if (isAuthError(error)) {
        alert("아이디 또는 비밀번호가 맞지 않습니다.");
      } else {
        alert("서버 연결 실패");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        type="text"
        placeholder="아이디"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      />

      <input
        type="password"
        placeholder="비밀번호"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button type="submit">로그인</button>
    </form>
  );
}

export default LoginForm;
