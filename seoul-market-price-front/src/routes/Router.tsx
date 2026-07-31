import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

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

        {/* 정의되지 않은 경로(예: /main)로 직접 접근한 경우
            "/" 로 리다이렉트해 access_token 유효성 검사(Home)를 다시 거치게 한다. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Router;
