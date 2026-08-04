import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "../pages/Login/LoginPage";
import MainPage from "../pages/Main/MainPage";

import SignupPage from "../pages/Signup/SignupPage";
import FindPasswordPage from "../pages/FindPassword/FindPasswordPage";
import FindIdPage from "../pages/FindId/FindIdPage";

import PassCallbackPage from "../pages/PassCallback/PassCallbackPage";

/* =========================
   Q&A
========================= */
import QnaPage from "../pages/Qna/QnaPage";
import QnaWritePage from "../pages/Qna/QnaWritePage";
import QnaDetailPage from "../pages/Qna/QnaDetailPage";

import PublicRoute from "./PublicRoute";

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

        {/* =========================
            NICE PASS Callback
        ========================= */}

        <Route path="/pass/callback" element={<PassCallbackPage />} />

        {/* =================================================
            Q&A 게시판
        ================================================= */}

        {/* Q&A 목록
            로그인 여부와 상관없이 누구나 접근 가능
        */}

        <Route path="/qna" element={<QnaPage />} />

        {/* =================================================
            Q&A 게시글 상세
            예:
            /qna/1
            /qna/2
            /qna/3
        ================================================= */}

        <Route path="/qna/:id" element={<QnaDetailPage />} />

        {/* =================================================
            Q&A 글쓰기
            로그인 여부는 QnaWritePage에서 확인
        ================================================= */}

        <Route path="/qna/write" element={<QnaWritePage />} />

        {/* =========================
            정의되지 않은 경로
            "/" 로 이동
        ========================= */}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Router;
