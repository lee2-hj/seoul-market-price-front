import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "../pages/Home/home";

import SignupPage from "../pages/Signup/SignupPage";
import FindPasswordPage from "../pages/FindPassword/FindPasswordPage";
import FindIdPage from "../pages/FindId/FindIdPage";

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 
            /
            
            로그인 전:
            LoginPage

            로그인 후:
            MainPage
        */}

        <Route path="/" element={<Home />} />

        {/* 회원가입 */}

        <Route path="/signup" element={<SignupPage />} />

        {/* 아이디 찾기 */}

        <Route path="/find-id" element={<FindIdPage />} />

        {/* 비밀번호 찾기 */}

        <Route path="/find-password" element={<FindPasswordPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Router;
