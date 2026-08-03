import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { isLogin } from "@/features/auth/utils/auth";

function RequireAuth({ children }: { children: ReactNode }) {
  if (!isLogin()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default RequireAuth;
