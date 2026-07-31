import { useEffect } from "react";

import LoginPage from "../Login/LoginPage";
import MainPage from "../Main/MainPage";

import { isLogin, logout } from "@/features/auth/utils/auth";

function Home() {
  const loggedIn = isLogin();

  // access_token이 없거나 유효하지 않으면 남아있는 로그인 정보를 정리한다.
  useEffect(() => {
    if (!loggedIn) {
      logout();
    }
  }, [loggedIn]);

  if (loggedIn) {
    return <MainPage />;
  }

  return <LoginPage />;
}

export default Home;
