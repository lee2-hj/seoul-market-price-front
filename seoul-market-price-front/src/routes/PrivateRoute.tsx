import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

import PageLoadingFallback from "@/components/PageLoadingFallback";
import { useAuthStore } from "@/features/auth/store/useAuthStore";

interface PrivateRouteProps {
  children: ReactNode;
}

function PrivateRoute({ children }: PrivateRouteProps) {
  /*
    로그인 상태 복원(ensureAuthLoaded)이 아직 끝나지 않았다면
    비로그인으로 단정하지 않고 대기한다. 여기서 바로 false로
    판단해버리면, 실제로는 로그인된 사용자가 새로고침 시
    "로그인이 필요합니다" alert과 함께 로그인 페이지로
    잘못 튕겨나가게 된다.
  */
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);
  const user = useAuthStore((state) => state.user);

  if (!isAuthInitialized) {
    return <PageLoadingFallback />;
  }

  /*
    비로그인 사용자가 주소창에 직접 입력하는 등의 방식으로
    로그인 필요 페이지(예: 마이페이지)에 접근한 경우

    알럿을 띄우고 '확인' 클릭 시 로그인 페이지로 이동시킨다.
  */
  if (!user) {
    alert("로그인이 필요합니다");
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default PrivateRoute;
