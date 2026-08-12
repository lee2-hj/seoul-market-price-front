import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import {
  clearAllSignupStorage,
  isFlowPathMatch,
  isPageReload,
} from "@/lib/signupFlow";

import { ensureAuthLoaded } from "@/features/auth/utils/auth";
import { useAuthStore } from "@/features/auth/store/useAuthStore";

import LoginPage from "../pages/Login/LoginPage";
import MainPage from "../pages/Main/MainPage";

import SignupPage from "../pages/Signup/SignupPage";
import SignupSelectPage from "../pages/SignupSelect/SignupSelectPage";
import SignupTermsPage from "../pages/SignupTerms/SignupTermsPage";
import SignupVerifyPage from "../pages/SignupVerify/SignupVerifyPage";
import FindPasswordForm from "@/features/auth/components/FindPasswordForm";
import FindIdPage from "../pages/FindId/FindIdPage";

import PassCallbackPage from "../pages/PassCallback/PassCallbackPage";

/*
 * 일반게시판 목록 화면
 */
import BoardPage from "../pages/Board/BoardPage";

/*
 * 일반게시판 상세 조회 화면
 */
import BoardDetailPage from "../pages/BoardDetail/BoardDetailPage";

/*
 * 일반게시판 글쓰기 화면
 */
import BoardWritePage from "../pages/BoardWrite/BoardWritePage";

/*
 * 일반게시판 수정 화면
 */
import BoardEditPage from "../pages/BoardEdit/BoardEditPage";
import MyPage from "@/pages/MyPage/MyPage";

import PublicRoute from "./PublicRoute";
import PrivateRoute from "./PrivateRoute";
import SignupFlowLayout from "./SignupFlowLayout";
import QnaPage from "@/pages/Qna/QnaPage";
import QnaWritePage from "@/pages/Qna/QnaWritePage";
import QnaDetailPage from "@/pages/Qna/QnaDetailPage";
import QnaEditPage from "@/pages/Qna/QnaEditPage";
import PricePage from "@/pages/Price/PricePage";

import Layout from "@/components/Layout";
import AboutPage from "@/pages/About/AboutPage";
import ReportPage from "../pages/Report/ReportPage";
import ReportWritePage from "../pages/ReportWrite/ReportWritePage";
import ReportDetailPage from "../pages/ReportDetail/ReportDetailPage";
import FaqPage from "@/pages/Faq/FaqPage";

import MarketTrendsPage from "@/pages/Trends/MarketTrendsPage";

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

  /* =========================
     accessToken이 HttpOnly 쿠키라 프론트에서 로그인 여부를 직접
     판별할 수 없다. 새로고침 등으로 zustand가 비어있는 상태로
     앱이 열리면 /api/members/me로 로그인 여부를 먼저 확인한 뒤
     라우트(PrivateRoute/PublicRoute)를 렌더링해야, 로그인된
     사용자가 잠깐 비로그인으로 오판되는 것을 막을 수 있다.
  ========================= */
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);

  useEffect(() => {
    void ensureAuthLoaded();
  }, []);

  if (!isAuthInitialized) {
    return null;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* =========================
            공통 레이아웃 (Header + Outlet + Footer)
            로그인/회원가입 등 독립 전체화면을 제외한
            모든 화면이 이 레이아웃을 공유한다.
        ========================= */}
        <Route element={<Layout />}>
          {/* =========================
              메인 페이지
              로그인 여부와 상관없이 누구나 접근 가능
          ========================= */}
          <Route path="/" element={<MainPage />} />
          {/* =========================
              소개 페이지 (샘플)
          ========================= */}
          <Route path="/about" element={<AboutPage />} />
          {/* =========================
              일반게시판 목록

              주소:
              /board
          ========================= */}
          <Route path="/board" element={<BoardPage />} />
          {/* =========================
              일반게시판 글쓰기

              주소:
              /board/write

              현재는 화면 확인 단계이므로
              로그인 권한 검사를 적용하지 않는다.
          ========================= */}
          <Route path="/board/write" element={<BoardWritePage />} />
          {/* =========================
              일반게시판 수정

              주소:
              /board/13/edit

              일반 게시글의 기존 제목과 본문을
              Mock Data에서 가져와 입력창에 표시한다.

              현재는 화면 확인 단계이므로
              작성자 권한 검사를 적용하지 않는다.
          ========================= */}
          <Route path="/board/:postId/edit" element={<BoardEditPage />} />
          {/* =========================
              일반게시판 상세 조회

              주소:
              /board/13

              수정 주소인 /board/:postId/edit보다
              아래에 배치한다.
          ========================= */}
          <Route path="/board/:postId" element={<BoardDetailPage />} />
          {/* =========================
              시세 조회
              모든 사용자 접근 가능
          ========================= */}
          <Route path="/price" element={<PricePage />} />
          {/* =========================
              Q&A 목록
              모든 사용자 접근 가능
          ========================= */}
          <Route path="/qna" element={<QnaPage />} />
          {/* =========================
              Q&A 작성
              로그인 사용자만 접근
          ========================= */}
          <Route path="/qna/write" element={<QnaWritePage />} />
          {/* =========================
              Q&A 상세
              모든 사용자 접근 가능
          ========================= */}
          <Route path="/qna/:id" element={<QnaDetailPage />} />
          {/* =========================
              Q&A 수정
              작성자 또는 관리자만 접근
          ========================= */}
          <Route path="/qna/:id/edit" element={<QnaEditPage />} />
          {/* =========================
              신고 게시판 (URL 직접 접근 전용)
              목록/상세: 누구나 열람 가능 (작성: 로그인 필수)
          ========================= */}
          <Route path="/report" element={<ReportPage />} />
          <Route
            path="/report/write"
            element={
              <PrivateRoute>
                <ReportWritePage />
              </PrivateRoute>
            }
          />
          <Route path="/report/:reportId" element={<ReportDetailPage />} />
          {/* =========================
              자주 묻는 질문 (FAQ) 목록
              모든 사용자 접근 가능
          ========================= */}
          <Route path="/faq" element={<FaqPage />} />

          {/* =========================
              부동산 거래동향 대시보드
              모든 사용자 접근 가능
          ========================= */}
          <Route path="/trends" element={<MarketTrendsPage />} />

          {/* =========================
              마이페이지
              로그인 사용자만 접근
              (비로그인 상태로 주소창 직접 접근 시
               알럿 후 로그인 페이지로 이동)
          ========================= */}
          <Route
            path="/mypage"
            element={
              <PrivateRoute>
                <MyPage />
              </PrivateRoute>
            }
          />
        </Route>

        {/* =========================
            로그인
            비로그인 사용자만 접근
            (독립 전체화면 - Layout 미적용)
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
              <FindPasswordForm />
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
