import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

/* 공통 레이아웃 및 공개·인증 전용 라우트 접근 제어 */
import Layout from "@/components/Layout";
import PageLoadingFallback from "@/components/PageLoadingFallback";
import PrivateRoute from "@/routes/PrivateRoute";
import PublicRoute from "@/routes/PublicRoute";
import SignupFlowLayout from "@/routes/SignupFlowLayout";

/* 인증 상태 복원(백그라운드)과 단계형 회원가입 임시 데이터 관리 */
import { ensureAuthLoaded } from "@/features/auth/utils/auth";
import {
  clearAllSignupStorage,
  isFlowPathMatch,
  isPageReload,
} from "@/lib/signupFlow";

/* ==========================================================================
   지연 로딩(React.lazy) 페이지 컴포넌트
   초기 진입 시 불필요한 번들 다운로드를 방지하고 해당 라우트 접근 시점에 청크를 로드한다.
========================================================================== */

/* 메인·인증·회원가입·마이페이지 화면 */
const AboutPage = lazy(() => import("@/pages/About/AboutPage"));
const FindIdPage = lazy(() => import("@/pages/FindId/FindIdPage"));
const LoginPage = lazy(() => import("@/pages/Login/LoginPage"));
const MainPage = lazy(() => import("@/pages/Main/MainPage"));
const MyPage = lazy(() => import("@/pages/MyPage/MyPage"));
const PassCallbackPage = lazy(() => import("@/pages/PassCallback/PassCallbackPage"));
const SignupPage = lazy(() => import("@/pages/Signup/SignupPage"));
const SignupSelectPage = lazy(() => import("@/pages/SignupSelect/SignupSelectPage"));
const SignupTermsPage = lazy(() => import("@/pages/SignupTerms/SignupTermsPage"));
const SignupVerifyPage = lazy(() => import("@/pages/SignupVerify/SignupVerifyPage"));
const FindPasswordForm = lazy(() => import("@/features/auth/components/FindPasswordForm"));

/* 가격정보 메인·지역 비교·지도·거래 동향 화면 */
const PricePage = lazy(() => import("@/pages/Price/PricePage"));
const PriceCompareListPage = lazy(() => import("@/pages/PriceCompareList/PriceCompareListPage"));
const PriceDetailPage = lazy(() => import("@/pages/PriceDetail/PriceDetailPage"));
const RegionMapPage = lazy(() => import("@/pages/RegionMap/RegionMapPage"));
const PriceCompareAptPage = lazy(() => import("@/pages/PriceCompareApt/PriceCompareAptPage"));
const MarketTrendsPage = lazy(() => import("@/pages/Trends/MarketTrendsPage"));
const MarketTrendsregionPage = lazy(() => import("@/pages/Trends/MarketTrendsregionPage"));

/* 일반 게시판 목록·작성·수정·상세 화면 */
const BoardPage = lazy(() => import("@/pages/Board/BoardPage"));
const BoardDetailPage = lazy(() => import("@/pages/BoardDetail/BoardDetailPage"));
const BoardEditPage = lazy(() => import("@/pages/BoardEdit/BoardEditPage"));
const BoardWritePage = lazy(() => import("@/pages/BoardWrite/BoardWritePage"));

/* Q&A 목록·작성·수정·상세 및 FAQ 화면 */
const FaqPage = lazy(() => import("@/pages/Faq/FaqPage"));
const QnaPage = lazy(() => import("@/pages/Qna/QnaPage"));
const QnaDetailPage = lazy(() => import("@/pages/Qna/QnaDetailPage"));
const QnaEditPage = lazy(() => import("@/pages/Qna/QnaEditPage"));
const QnaWritePage = lazy(() => import("@/pages/Qna/QnaWritePage"));

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<PageLoadingFallback />}>{element}</Suspense>;
}

function Router() {
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
   * 로그인 상태를 복원한다. 화면 렌더링을 막지 않고 백그라운드에서
   * 진행하며, 로그인 여부에 따라 결과가 달라지는 화면(PrivateRoute,
   * PublicRoute, Header의 로그인 영역 등)은 각자 isInitialized를
   * 구독해 복원이 끝날 때까지 스켈레톤을 보여준다.
   */
  useEffect(() => {
    void ensureAuthLoaded();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* ==================================================================
            공통 레이아웃 화면
            Header, Outlet, Footer를 공유하며 별도 표기가 없으면 공개 화면이다.
        ================================================================== */}
        <Route element={<Layout />}>
          {/* 메인: 서비스 홈과 프로젝트 소개 */}
          <Route path="/" element={withSuspense(<MainPage />)} />
          <Route path="/about" element={withSuspense(<AboutPage />)} />

          {/* --------------------------------------------------------------
              가격정보
              시세 메인, 지역별 목록 비교, 지도 비교, 거래 동향을 제공한다.
          -------------------------------------------------------------- */}
          {/* 가격정보 기본 화면 */}
          <Route path="/price" element={withSuspense(<PricePage />)} />
          {/* 두 지역의 가격정보를 목록으로 비교하는 화면 */}
          <Route
            path="/price/compare-list"
            element={withSuspense(<PriceCompareListPage />)}
          />
          {/* 지역 가격정보를 지도에서 조회하는 화면 */}
          <Route path="/region-map" element={withSuspense(<RegionMapPage />)} />
          {/* 부동산 거래 동향을 조회하는 화면 */}
          <Route path="/trends" element={withSuspense(<MarketTrendsPage />)} />
          {/* 지역별 거래동향 */}
          <Route
            path="/trends/region"
            element={withSuspense(<MarketTrendsregionPage />)}
          />
          {/* 단지별 시세 상세 */}
          <Route
            path="/price/detail"
            element={withSuspense(<PriceDetailPage />)}
          />

          {/* --------------------------------------------------------------
              가격정보 아파트별 정보
          -------------------------------------------------------------- */}
          <Route
            path="/price/compare-apartment"
            element={withSuspense(<PriceCompareAptPage />)}
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
          <Route path="/board" element={withSuspense(<BoardPage />)} />
          {/* 새 게시글 작성 */}
          <Route path="/board/write" element={withSuspense(<BoardWritePage />)} />
          {/* 게시글 수정: 상세 동적 경로보다 먼저 선언해 구조를 명확히 한다. */}
          <Route
            path="/board/:postId/edit"
            element={withSuspense(<BoardEditPage />)}
          />
          {/* 게시글 상세 조회 */}
          <Route
            path="/board/:postId"
            element={withSuspense(<BoardDetailPage />)}
          />

          {/* --------------------------------------------------------------
              Q&A 및 FAQ
              Q&A의 목록·작성·상세·수정 화면과 FAQ 목록을 제공한다.
          -------------------------------------------------------------- */}
          {/* Q&A 목록 */}
          <Route path="/qna" element={withSuspense(<QnaPage />)} />
          {/* Q&A 작성 */}
          <Route path="/qna/write" element={withSuspense(<QnaWritePage />)} />
          {/* Q&A 수정 */}
          <Route
            path="/qna/:id/edit"
            element={withSuspense(<QnaEditPage />)}
          />
          {/* Q&A 상세 조회 */}
          <Route
            path="/qna/:id"
            element={withSuspense(<QnaDetailPage />)}
          />
          {/* 자주 묻는 질문 목록 */}
          <Route path="/faq" element={withSuspense(<FaqPage />)} />

          {/* --------------------------------------------------------------
              마이페이지
              회원 개인정보를 포함하므로 로그인 사용자만 접근할 수 있다.
          -------------------------------------------------------------- */}
          <Route
            path="/mypage"
            element={
              <PrivateRoute>
                {withSuspense(<MyPage />)}
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
              {withSuspense(<LoginPage />)}
            </PublicRoute>
          }
        />
        {/* 회원가입 방식 선택 */}
        <Route
          path="/signup/select"
          element={
            <PublicRoute>
              {withSuspense(<SignupSelectPage />)}
            </PublicRoute>
          }
        />
        {/* 아이디 찾기 */}
        <Route
          path="/find-id"
          element={
            <PublicRoute>
              {withSuspense(<FindIdPage />)}
            </PublicRoute>
          }
        />
        {/* 비밀번호 찾기: PASS 본인인증을 포함한다. */}
        <Route
          path="/find-password"
          element={
            <PublicRoute>
              {withSuspense(<FindPasswordForm />)}
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
                {withSuspense(<SignupTermsPage />)}
              </PublicRoute>
            }
          />
          {/* 2단계: PASS 본인인증 */}
          <Route
            path="/signup/verify"
            element={
              <PublicRoute>
                {withSuspense(<SignupVerifyPage />)}
              </PublicRoute>
            }
          />
          {/* 3단계: 회원정보 입력 및 가입 완료 */}
          <Route
            path="/signup"
            element={
              <PublicRoute>
                {withSuspense(<SignupPage />)}
              </PublicRoute>
            }
          />
        </Route>

        {/* PASS 인증 팝업 콜백: 결과를 부모 창으로 전달하므로 PublicRoute를 적용하지 않는다. */}
        <Route
          path="/pass/callback"
          element={withSuspense(<PassCallbackPage />)}
        />

        {/* 정의되지 않은 모든 경로는 서비스 홈으로 이동한다. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Router;
