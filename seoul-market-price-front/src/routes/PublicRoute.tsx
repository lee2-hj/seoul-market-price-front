import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

import { isLogin } from "@/features/auth/utils/auth";

interface PublicRouteProps {
  children: ReactNode;
}

function PublicRoute({ children }: PublicRouteProps) {
  /*
    이미 로그인한 사용자

    회원가입 / 아이디찾기 / 비밀번호찾기
    접근 차단

    → 메인 페이지 이동

  */

  if (isLogin()) {
    return <Navigate to="/" replace />;
  }

  /*
    비로그인 사용자만 접근 가능

  */

  return children;
}

export default PublicRoute;
