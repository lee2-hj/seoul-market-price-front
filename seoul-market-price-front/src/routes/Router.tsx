import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "../pages/Login/LoginPage";
import MainPage from "../pages/Main/MainPage";

import SignupPage from "../pages/Signup/SignupPage";
import FindPasswordPage from "../pages/FindPassword/FindPasswordPage";
import FindIdPage from "../pages/FindId/FindIdPage";

import PassCallbackPage from "../pages/PassCallback/PassCallbackPage";

/* Q&A */

import QnaPage from "../pages/Qna/QnaPage";
import QnaWritePage from "../pages/Qna/QnaWritePage";
import QnaDetailPage from "../pages/Qna/QnaDetailPage";

import PublicRoute from "./PublicRoute";

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 메인 페이지 */}

        <Route path="/" element={<MainPage />} />

        {/* 로그인 */}

        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* 회원가입 */}

        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignupPage />
            </PublicRoute>
          }
        />

        {/* 아이디 찾기 */}

        <Route
          path="/find-id"
          element={
            <PublicRoute>
              <FindIdPage />
            </PublicRoute>
          }
        />

        {/* 비밀번호 찾기 */}

        <Route
          path="/find-password"
          element={
            <PublicRoute>
              <FindPasswordPage />
            </PublicRoute>
          }
        />

        {/* NICE PASS Callback */}

        <Route path="/pass/callback" element={<PassCallbackPage />} />

        {/* Q&A 목록 */}

        <Route path="/qna" element={<QnaPage />} />

        {/* Q&A 게시글 상세 */}

        <Route path="/qna/:id" element={<QnaDetailPage />} />

        {/* Q&A 글쓰기 */}

        <Route path="/qna/write" element={<QnaWritePage />} />

        {/* 존재하지 않는 경로 */}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Router;
