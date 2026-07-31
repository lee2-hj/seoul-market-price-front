import LoginPage from "../Login/LoginPage";
import MainPage from "../Main/MainPage";

import { getToken } from "@/features/auth/utils/auth";

function Home() {
  const token = getToken();

  if (token) {
    return <MainPage />;
  }

  return <LoginPage />;
}

export default Home;
