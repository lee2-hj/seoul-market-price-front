import { useEffect } from "react";

import LoginPage from "../Login/LoginPage";
import MainPage from "../Main/MainPage";

import { isLogin, logout } from "@/features/auth/utils/auth";

function Home() {
<<<<<<< HEAD
  /*
    로그인 토큰 확인

    localStorage
        ↓
    accessToken 확인

  */

  const token = getToken();

  /*
    로그인 상태

  */

  if (token) {
=======
  const loggedIn = isLogin();

  // access_token이 없거나 유효하지 않으면 남아있는 로그인 정보를 정리한다.
  useEffect(() => {
    if (!loggedIn) {
      logout();
    }
  }, [loggedIn]);

  if (loggedIn) {
>>>>>>> 6bbe5297d8c32f30031ef523190c3c0ce50f9c16
    return <MainPage />;
  }

  /*
    비로그인 상태

  */

  return <LoginPage />;
}

export default Home;
