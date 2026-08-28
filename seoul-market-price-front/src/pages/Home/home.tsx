import LoginPage from "../Login/LoginPage";
import MainPage from "../Main/MainPage";

import { isLogin } from "@/features/auth/utils/auth";

function Home() {
  /*
    로그인 상태

  */

  if (isLogin()) {
    return <MainPage />;
  }

  /*
    비로그인 상태

  */

  return <LoginPage />;
}

export default Home;
