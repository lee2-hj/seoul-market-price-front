import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

import { isLogin } from "@/features/auth/utils/auth";

interface PrivateRouteProps {
  children: ReactNode;
}

function PrivateRoute({ children }: PrivateRouteProps) {
  /*
    비로그인 사용자가 주소창에 직접 입력하는 등의 방식으로
    로그인 필요 페이지(예: 마이페이지)에 접근한 경우

    알럿을 띄우고 '확인' 클릭 시 로그인 페이지로 이동시킨다.
  */

  if (!isLogin()) {
    alert("로그인이 필요합니다");
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default PrivateRoute;
