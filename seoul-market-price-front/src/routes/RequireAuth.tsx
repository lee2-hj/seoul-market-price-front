import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { getLoginUser } from "@/features/auth/utils/auth";

function RequireAuth({ children }: { children: ReactNode }) {
  const user = getLoginUser();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default RequireAuth;
