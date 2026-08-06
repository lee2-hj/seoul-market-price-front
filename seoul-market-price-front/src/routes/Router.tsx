import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import {
  clearAllSignupStorage,
  isFlowPathMatch,
  isPageReload,
} from "@/lib/signupFlow";

import LoginPage from "../pages/Login/LoginPage";
import MainPage from "../pages/Main/MainPage";

import SignupPage from "../pages/Signup/SignupPage";
import SignupSelectPage from "../pages/SignupSelect/SignupSelectPage";
import SignupTermsPage from "../pages/SignupTerms/SignupTermsPage";
import SignupVerifyPage from "../pages/SignupVerify/SignupVerifyPage";
import FindPasswordPage from "../pages/FindPassword/FindPasswordPage";
import FindIdPage from "../pages/FindId/FindIdPage";

import PassCallbackPage from "../pages/PassCallback/PassCallbackPage";

import PublicRoute from "./PublicRoute";
import SignupFlowLayout from "./SignupFlowLayout";
import QnaPage from "@/pages/Qna/QnaPage";
import QnaWritePage from "@/pages/Qna/QnaWritePage";
import QnaDetailPage from "@/pages/Qna/QnaDetailPage";
import QnaEditPage from "@/pages/Qna/QnaEditPage";
import PricePage from "@/pages/Price/PricePage";

function Router() {
  /* =========================
     앱(문서)이 새로고침이 아닌 방식으로 새로 열릴 때마다
     (주소창 직접 입력, 다른 링크로 이동, 새 진입 등)
     이전에 남아있을 수 있는 회원가입 플로우 sessionStorage를
     전부(흐름 메타데이터 + 약관 동의 + PASS 인증 결과) 정리한다.

     지금 머물러 있던 페이지와 다른 URL이 새 문서로 열렸다는 뜻이므로,
     이전 플로우의 잔여값을 그대로 남겨두면 안 된다.
     새로고침일 때는 값을 그대로 유지해야 하므로 건드리지 않는다.

     주소창에 "마지막으로 머물렀던 페이지와 동일한 URL"을 직접
     입력해 새 문서가 열린 경우도 마찬가지로 건드리지 않는다 —
     SignupFlowLayout이 이를 새로고침과 동일하게 취급해 그대로
     머무르게 하는데, 여기서 먼저 지워버리면 그 판단 근거가 되는
     sessionStorage 값이 사라져버린다.
  ========================= */

  useEffect(() => {
    if (!isPageReload() && !isFlowPathMatch(window.location.pathname)) {
      clearAllSignupStorage();
    }
  }, []);

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
            회원가입 방법 선택
            비로그인 사용자만 접근
        ========================= */}
        <Route
          path="/signup/select"
          element={
            <PublicRoute>
              <SignupSelectPage />
            </PublicRoute>
          }
        />
        {/* =========================
            회원가입 약관 동의 → 본인인증 → 회원가입

            /signup/select 를 거쳐 진입한 경우에만 접근 가능
            (SignupFlowLayout 에서 sessionStorage 플래그로 검증)
            비로그인 사용자만 접근
        ========================= */}
        <Route element={<SignupFlowLayout />}>
          <Route
            path="/signup/terms"
            element={
              <PublicRoute>
                <SignupTermsPage />
              </PublicRoute>
            }
          />

          <Route
            path="/signup/verify"
            element={
              <PublicRoute>
                <SignupVerifyPage />
              </PublicRoute>
            }
          />

          <Route
            path="/signup"
            element={
              <PublicRoute>
                <SignupPage />
              </PublicRoute>
            }
          />
        </Route>
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
        {/* 품목별 시세 조회 */}
        <Route path="/price" element={<PricePage />} />
        <Route path="/pass/callback" element={<PassCallbackPage />} />
        /* Q&A 목록 */
        <Route path="/qna" element={<QnaPage />} />
        /* Q&A 글쓰기 */
        <Route path="/qna/write" element={<QnaWritePage />} />
        /* Q&A 상세 */
        <Route path="/qna/:id" element={<QnaDetailPage />} />
        {/* Q&A 수정 */}
        <Route path="/qna/:id/edit" element={<QnaEditPage />} />
        {/* 정의되지 않은 경로(예: /main)로 직접 접근한 경우 "/" 로 리다이렉트한다. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Router;
