import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "../pages/Home/home";

import SignupPage from "../pages/Signup/SignupPage";
import FindPasswordPage from "../pages/FindPassword/FindPasswordPage";
import FindIdPage from "../pages/FindId/FindIdPage";

import PassCallbackPage from "../pages/PassCallback/PassCallbackPage";

import PublicRoute from "./PublicRoute";

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* =========================
            메인 페이지
        ========================= */}

        <Route path="/" element={<Home />} />

        {/* =========================
            회원가입
            비로그인 사용자만 접근
        ========================= */}

        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignupPage />
            </PublicRoute>
          }
        />

        {/* =========================
            아이디 찾기
        ========================= */}

        <Route
          path="/find-id"
          element={
            <PublicRoute>
              <FindIdPage />
            </PublicRoute>
          }
        />

        {/* =========================
            비밀번호 찾기
            PASS 인증 사용
        ========================= */}

        <Route
          path="/find-password"
          element={
            <PublicRoute>
              <FindPasswordPage />
            </PublicRoute>
          }
        />

        {/* =========================
            NICE PASS Callback

            PASS 인증창
                ↓
            callback 이동
                ↓
            postMessage 전달

            PublicRoute 적용 X
        ========================= */}

        <Route path="/pass/callback" element={<PassCallbackPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Router;
