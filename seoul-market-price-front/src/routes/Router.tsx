import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

/* 공통 레이아웃 및 공개·인증 전용 라우트 접근 제어 */
import Layout from "@/components/Layout";
import PrivateRoute from "@/routes/PrivateRoute";
import PublicRoute from "@/routes/PublicRoute";
import SignupFlowLayout from "@/routes/SignupFlowLayout";

/* 인증 상태 복원과 단계형 회원가입 임시 데이터 관리 */
import FindPasswordForm from "@/features/auth/components/FindPasswordForm";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { ensureAuthLoaded } from "@/features/auth/utils/auth";
import {
  clearAllSignupStorage,
  isFlowPathMatch,
  isPageReload,
} from "@/lib/signupFlow";

/* 메인·인증·회원가입·마이페이지 화면 */
import AboutPage from "@/pages/About/AboutPage";
import FindIdPage from "@/pages/FindId/FindIdPage";
import LoginPage from "@/pages/Login/LoginPage";
import MainPage from "@/pages/Main/MainPage";
import MyPage from "@/pages/MyPage/MyPage";
import PassCallbackPage from "@/pages/PassCallback/PassCallbackPage";
import SignupPage from "@/pages/Signup/SignupPage";
import SignupSelectPage from "@/pages/SignupSelect/SignupSelectPage";
import SignupTermsPage from "@/pages/SignupTerms/SignupTermsPage";
import SignupVerifyPage from "@/pages/SignupVerify/SignupVerifyPage";

/* 가격정보 메인·지역 비교·지도·거래 동향 화면 */
import PricePage from "@/pages/Price/PricePage";
import PriceCompareListPage from "@/pages/PriceCompareList/PriceCompareListPage";
import PriceDetailPage from "@/pages/PriceDetail/PriceDetailPage";
import RegionMapPage from "@/pages/RegionMap/RegionMapPage";
import MarketTrendsPage from "@/pages/Trends/MarketTrendsPage";

/* 가격정보 아파트별 정보*/
import PriceCompareAptPage from "../pages/PriceCompareApt/PriceCompareAptPage";

/*아파트별 거래동향 임포트*/
// import MarketTrendsPage from "@/pages/Trends/MarketTrendsPage";

/* 일반 게시판 목록·작성·수정·상세 화면 */
import BoardPage from "@/pages/Board/BoardPage";
import BoardDetailPage from "@/pages/BoardDetail/BoardDetailPage";
import BoardEditPage from "@/pages/BoardEdit/BoardEditPage";
import BoardWritePage from "@/pages/BoardWrite/BoardWritePage";

/* Q&A 목록·작성·수정·상세 및 FAQ 화면 */
import FaqPage from "@/pages/Faq/FaqPage";
import QnaPage from "@/pages/Qna/QnaPage";
import QnaDetailPage from "@/pages/Qna/QnaDetailPage";
import QnaEditPage from "@/pages/Qna/QnaEditPage";
import QnaWritePage from "@/pages/Qna/QnaWritePage";

/* 신고 게시판 목록·작성·수정·상세 화면 */
import ReportPage from "@/pages/Report/ReportPage";
import ReportDetailPage from "@/pages/ReportDetail/ReportDetailPage";
import ReportEditPage from "@/pages/ReportEdit/ReportEditPage";
import ReportWritePage from "@/pages/ReportWrite/ReportWritePage";

function Router() {
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);

  /**
   * 새로고침이 아닌 새 문서 탐색으로 회원가입 경로를 벗어났을 때만
   * 약관 동의, PASS 인증 결과 등 회원가입 임시 데이터를 정리한다.
   * 새로고침과 회원가입 단계 간 이동에서는 기존 입력 상태를 유지한다.
   */
  useEffect(() => {
    if (!isPageReload() && !isFlowPathMatch(window.location.pathname)) {
      clearAllSignupStorage();
    }
  }, []);

  /**
   * accessToken이 HttpOnly 쿠키에 있으므로 앱 시작 시 회원 API를 통해
   * 로그인 상태를 복원한다. 복원이 끝나기 전에 보호 라우트가 사용자를
   * 비로그인 상태로 잘못 판단하지 않도록 초기화를 먼저 완료한다.
   */
  useEffect(() => {
    void ensureAuthLoaded();
  }, []);

  if (!isAuthInitialized) {
    // 인증 상태 확인 중에는 라우트와 화면을 렌더링하지 않는다.
    return null;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* ==================================================================
            공통 레이아웃 화면
            Header, Outlet, Footer를 공유하며 별도 표기가 없으면 공개 화면이다.
        ================================================================== */}
        <Route element={<Layout />}>
          {/* 메인: 서비스 홈과 프로젝트 소개 */}
          <Route path="/" element={<MainPage />} />
          <Route path="/about" element={<AboutPage />} />

          {/* --------------------------------------------------------------
              가격정보
              시세 메인, 지역별 목록 비교, 지도 비교, 거래 동향을 제공한다.
          -------------------------------------------------------------- */}
          {/* 가격정보 기본 화면 */}
          <Route path="/price" element={<PricePage />} />
          {/* 두 지역의 가격정보를 목록으로 비교하는 화면 */}
          <Route
            path="/price/compare-list"
            element={<PriceCompareListPage />}
          />
          {/* 지역 가격정보를 지도에서 조회하는 화면 */}
          <Route path="/region-map" element={<RegionMapPage />} />
          {/* 부동산 거래 동향을 조회하는 화면 */}
          <Route path="/trends" element={<MarketTrendsPage />} />
          {/* 아파트별 거래동향 */}
          <Route
            path="/trends"
            element={<Navigate to="/trends/apartment" replace />}
          />

          {/* 단지별 시세 상세 */}
          <Route path="/price/detail" element={<PriceDetailPage />} />

          {/* --------------------------------------------------------------
              가격정보 아파트별 정보
          -------------------------------------------------------------- */}
          <Route
            path="/price/compare-apartment"
            element={<PriceCompareAptPage />}
          />
          <Route
            path="/price/compare-apt"
            element={<Navigate to="/price/compare-apartment" replace />}
          />

          {/* --------------------------------------------------------------
              일반 게시판
              목록·작성·상세·수정 화면이며 현재 별도 라우트 권한 제한은 없다.
          -------------------------------------------------------------- */}
          {/* 게시글 목록 */}
          <Route path="/board" element={<BoardPage />} />
          {/* 새 게시글 작성 */}
          <Route path="/board/write" element={<BoardWritePage />} />
          {/* 게시글 수정: 상세 동적 경로보다 먼저 선언해 구조를 명확히 한다. */}
          <Route path="/board/:postId/edit" element={<BoardEditPage />} />
          {/* 게시글 상세 조회 */}
          <Route path="/board/:postId" element={<BoardDetailPage />} />

          {/* --------------------------------------------------------------
              Q&A 및 FAQ
              Q&A의 목록·작성·상세·수정 화면과 FAQ 목록을 제공한다.
          -------------------------------------------------------------- */}
          {/* Q&A 목록 */}
          <Route path="/qna" element={<QnaPage />} />
          {/* Q&A 작성 */}
          <Route path="/qna/write" element={<QnaWritePage />} />
          {/* Q&A 수정 */}
          <Route path="/qna/:id/edit" element={<QnaEditPage />} />
          {/* Q&A 상세 조회 */}
          <Route path="/qna/:id" element={<QnaDetailPage />} />
          {/* 자주 묻는 질문 목록 */}
          <Route path="/faq" element={<FaqPage />} />

          {/* --------------------------------------------------------------
              신고 게시판
              목록·상세는 공개하고 작성·수정은 로그인 사용자만 허용한다.
          -------------------------------------------------------------- */}
          {/* 신고 목록 */}
          <Route path="/report" element={<ReportPage />} />
          {/* 신고 작성: 로그인 사용자 전용 */}
          <Route
            path="/report/write"
            element={
              <PrivateRoute>
                <ReportWritePage />
              </PrivateRoute>
            }
          />
          {/* 신고 수정: 로그인 사용자 전용 */}
          <Route
            path="/report/:reportId/edit"
            element={
              <PrivateRoute>
                <ReportEditPage />
              </PrivateRoute>
            }
          />
          {/* 신고 상세 조회 */}
          <Route path="/report/:reportId" element={<ReportDetailPage />} />

          {/* --------------------------------------------------------------
              마이페이지
              회원 개인정보를 포함하므로 로그인 사용자만 접근할 수 있다.
          -------------------------------------------------------------- */}
          <Route
            path="/mypage"
            element={
              <PrivateRoute>
                <MyPage />
              </PrivateRoute>
            }
          />
        </Route>

        {/* ==================================================================
            비로그인 사용자 전용 화면
            공통 Layout을 사용하지 않으며 로그인 사용자는 PublicRoute에서 차단한다.
        ================================================================== */}
        {/* 로그인 */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        {/* 회원가입 방식 선택 */}
        <Route
          path="/signup/select"
          element={
            <PublicRoute>
              <SignupSelectPage />
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
        {/* 비밀번호 찾기: PASS 본인인증을 포함한다. */}
        <Route
          path="/find-password"
          element={
            <PublicRoute>
              <FindPasswordForm />
            </PublicRoute>
          }
        />

        {/* ==================================================================
            단계형 회원가입 화면
            SignupFlowLayout이 선택 → 약관 → 인증 → 가입 순서를 검증하고,
            PublicRoute가 비로그인 사용자에게만 접근을 허용한다.
        ================================================================== */}
        <Route element={<SignupFlowLayout />}>
          {/* 1단계: 약관 동의 */}
          <Route
            path="/signup/terms"
            element={
              <PublicRoute>
                <SignupTermsPage />
              </PublicRoute>
            }
          />
          {/* 2단계: PASS 본인인증 */}
          <Route
            path="/signup/verify"
            element={
              <PublicRoute>
                <SignupVerifyPage />
              </PublicRoute>
            }
          />
          {/* 3단계: 회원정보 입력 및 가입 완료 */}
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <SignupPage />
              </PublicRoute>
            }
          />
        </Route>

        {/* PASS 인증 팝업 콜백: 결과를 부모 창으로 전달하므로 PublicRoute를 적용하지 않는다. */}
        <Route path="/pass/callback" element={<PassCallbackPage />} />

        {/* 정의되지 않은 모든 경로는 서비스 홈으로 이동한다. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Router;
