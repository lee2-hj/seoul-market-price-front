import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import LoginPage from "../pages/Login/LoginPage";
import MainPage from "../pages/Main/MainPage";

import SignupPage from "../pages/Signup/SignupPage";
import FindPasswordPage from "../pages/FindPassword/FindPasswordPage";
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

import PublicRoute from "./PublicRoute";
import MyPage from "@/pages/MyPage/MyPage";
import QnaPage from "@/pages/Qna/QnaPage";
import QnaWritePage from "@/pages/Qna/QnaWritePage";

/**
 * 애플리케이션의 화면 경로를 관리한다.
 */
function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* =========================
            메인 페이지

            로그인 여부와 관계없이
            누구나 접근할 수 있다.
        ========================= */}

        <Route
          path="/"
          element={<MainPage />}
        />

        {/* =========================
            일반게시판 목록

            주소:
            /board
        ========================= */}

        <Route
          path="/board"
          element={<BoardPage />}
        />

        {/* =========================
            일반게시판 글쓰기

            주소:
            /board/write

            현재는 화면 확인 단계이므로
            로그인 권한 검사를 적용하지 않는다.
        ========================= */}

        <Route
          path="/board/write"
          element={<BoardWritePage />}
        />

        {/* =========================
            일반게시판 수정

            주소:
            /board/13/edit

            일반 게시글의 기존 제목과 본문을
            Mock Data에서 가져와 입력창에 표시한다.

            현재는 화면 확인 단계이므로
            작성자 권한 검사를 적용하지 않는다.
        ========================= */}

        <Route
          path="/board/:postId/edit"
          element={<BoardEditPage />}
        />

        {/* =========================
            일반게시판 상세 조회

            주소:
            /board/13

            수정 주소인 /board/:postId/edit보다
            아래에 배치한다.
        ========================= */}

        <Route
          path="/board/:postId"
          element={<BoardDetailPage />}
        />

        {/* =========================
            QnA 게시판
        ========================= */}

        <Route path="/Qna" element={<QnaPage />} />

        {/* =========================
            QnA 글쓰기
        ========================= */}

        <Route path="/Qna/write" element={<QnaWritePage />} />

        <Route
          path="/mypage"
          element={<MyPage />}
        />

        {/* =========================
            로그인

            비로그인 사용자만 접근할 수 있다.
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

            비로그인 사용자만 접근할 수 있다.
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

            PASS 본인인증을 사용한다.
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

            팝업 화면에서 실행되므로
            PublicRoute를 적용하지 않는다.
        ========================= */}

        <Route
          path="/pass/callback"
          element={<PassCallbackPage />}
        />

        {/* =========================
            존재하지 않는 경로

            공개 메인 페이지로 이동한다.
        ========================= */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default Router;