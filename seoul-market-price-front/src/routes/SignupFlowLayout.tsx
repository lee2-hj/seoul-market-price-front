import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import {
  clearSignupFlowStorage,
  isFlowPathMatch,
  isPageReload,
  isSignupFlowActive,
  setSignupFlowPath,
  startSignupFlow,
} from "@/lib/signupFlow";

/* =========================
   회원가입 플로우 가드

   /signup/terms, /signup/verify, /signup 은
   /signup/select 를 거쳐 진입한 경우에만 접근을 허용하고,
   그 외의 방식(주소창 직접 입력, 북마크 등)으로 들어오면
   /signup/select 로 리다이렉트한다.

   단, "새로고침"은 예외적으로 항상 머무른다. 새로고침 여부는
   sessionStorage 값이 아니라 Navigation Timing API로 판단한다
   (sessionStorage 플래그만으로는 새로고침과 직접 접근을 구분할 수
   없고, unload 시점에 지우면 새로고침에도 함께 걸려버린다).

   "주소창에 지금 머물러 있던 페이지와 동일한 URL을 다시 입력"한
   경우도 새로고침과 동일하게 취급한다. 이 경우 문서가 새로 로드되어
   Navigation Timing type이 브라우저에 따라 "reload"가 아닌
   "navigate"로 잡힐 수 있으므로, isPageReload()만으로는 판단할 수
   없어 isFlowPathMatch()로 마지막으로 머물렀던 경로와 비교한다.

   - 플로우 안에서 이동(terms → verify → signup)할 때는 같은
     레이아웃이 유지되므로 sessionStorage 값이 보존된다.
   - 플로우 밖의 다른 경로로 이동(SPA 이동)하면 레이아웃이
     언마운트되며 sessionStorage 값을 모두 제거한다.
   - 탭/창을 닫으면 브라우저가 sessionStorage를 자체적으로
     제거하므로 별도 처리가 필요 없다.
========================= */

function SignupFlowLayout() {
  const { pathname } = useLocation();
  const allowed =
    isPageReload() || isSignupFlowActive() || isFlowPathMatch(pathname);

  useEffect(() => {
    if (!allowed) {
      return;
    }

    // 새로고침(또는 동일 URL 재입력)으로 들어와 플래그가 없던
    // 경우에도, 이후 플로우 내 이동(다음 단계로 navigate)이 계속
    // 허용되도록 플래그를 맞춰둔다.
    startSignupFlow();

    return () => {
      clearSignupFlowStorage();
    };
  }, [allowed]);

  // 플로우 내에서 머무는 경로가 바뀔 때마다(terms → verify → signup)
  // "마지막으로 머물렀던 경로"를 갱신한다. 위 effect와 달리 매 단계
  // 이동마다 실행되어야 하므로 별도 effect로 분리했다 — 같은 effect에
  // 두면 pathname이 바뀔 때마다 cleanup(clearSignupFlowStorage)이
  // 먼저 실행되어 약관 동의/인증 정보까지 함께 지워지게 된다.
  useEffect(() => {
    if (!allowed) {
      return;
    }

    setSignupFlowPath(pathname);
  }, [allowed, pathname]);

  if (!allowed) {
    return <Navigate to="/signup/select" replace />;
  }

  return <Outlet />;
}

export default SignupFlowLayout;
