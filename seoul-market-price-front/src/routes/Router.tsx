import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "../pages/Login/LoginPage";
import MainPage from "../pages/Main/MainPage";

import SignupPage from "../pages/Signup/SignupPage";
import FindPasswordPage from "../pages/FindPassword/FindPasswordPage";
import FindIdPage from "../pages/FindId/FindIdPage";

import PassCallbackPage from "../pages/PassCallback/PassCallbackPage";

import PublicRoute from "./PublicRoute";
import BoardFaq from "@/pages/Board/board_faq";

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* =========================
            메인 페이지
            로그인 여부와 상관없이 누구나 접근 가능
        ========================= */}

        <Route path="/" element={<MainPage />} />

        {/* =========================
            로그인
            비로그인 사용자만 접근
        ========================= */}

        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

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

        <Route
          path="/board_faq"
          element={
            <PublicRoute>
              <BoardFaq />
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

        {/* 정의되지 않은 경로(예: /main)로 직접 접근한 경우 "/" 로 리다이렉트한다. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Router;
