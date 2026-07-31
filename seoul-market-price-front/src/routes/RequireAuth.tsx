import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { isLogin, logout } from "@/features/auth/utils/auth";

function RequireAuth({ children }: { children: ReactNode }) {
  // access_token이 없거나 유효하지 않으면(만료/위조 포함) 로그인 페이지로 리다이렉션
  if (!isLogin()) {
    logout();

    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default RequireAuth;
