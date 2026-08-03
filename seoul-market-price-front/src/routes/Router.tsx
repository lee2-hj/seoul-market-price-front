import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

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

<<<<<<< HEAD
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
=======
        <Route path="/find-password" element={<FindPasswordPage />} />

        {/* 정의되지 않은 경로(예: /main)로 직접 접근한 경우
            "/" 로 리다이렉트해 access_token 유효성 검사(Home)를 다시 거치게 한다. */}
        <Route path="*" element={<Navigate to="/" replace />} />
>>>>>>> 6bbe5297d8c32f30031ef523190c3c0ce50f9c16
      </Routes>
    </BrowserRouter>
  );
}

export default Router;
