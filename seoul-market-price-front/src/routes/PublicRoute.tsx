import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

import PageLoadingFallback from "@/components/PageLoadingFallback";
import { useAuthStore } from "@/features/auth/store/useAuthStore";

interface PublicRouteProps {
  children: ReactNode;
}

function PublicRoute({ children }: PublicRouteProps) {
  /*
    로그인 상태 복원이 아직 끝나지 않았다면 비로그인으로
    단정하지 않고 대기한다. 여기서 바로 판단해버리면, 이미
    로그인된 사용자가 새로고침 시 로그인/회원가입 화면을
    잠깐이라도 볼 수 있게 된다.
  */
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);
  const user = useAuthStore((state) => state.user);

  if (!isAuthInitialized) {
    return <PageLoadingFallback />;
  }

  /*
    이미 로그인한 사용자

    회원가입 / 아이디찾기 / 비밀번호찾기
    접근 차단

    → 메인 페이지 이동

  */
  if (user) {
    return <Navigate to="/" replace />;
  }

  /*
    비로그인 사용자만 접근 가능

  */

  return <>{children}</>;
}

export default PublicRoute;
