import LoginPage from "../Login/LoginPage";
import MainPage from "../Main/MainPage";

import { getToken } from "@/features/auth/utils/auth";

function Home() {
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
    return <MainPage />;
  }

  /*
    비로그인 상태

  */

  return <LoginPage />;
}

export default Home;
