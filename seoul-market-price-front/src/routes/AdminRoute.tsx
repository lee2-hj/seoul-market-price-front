import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import { useAdminPermission } from "@/features/admin/hooks/useAdminPermission";

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * ADMIN 또는 MASTER 역할을 가진 사용자만 접근할 수 있는 라우트 가드.
 *
 * - 비로그인 → /login 리디렉트
 * - role이 USER → / 리디렉트
 * - ADMIN이지만 해당 경로에 권한이 없음 → /admin/forbidden 리디렉트
 * - ADMIN/MASTER이고 경로 허용 → children 렌더
 */
function AdminRoute({ children }: AdminRouteProps) {
  const { isAdminOrMaster, isPathAllowed, user } = useAdminPermission();
  const location = useLocation();

  if (!user) {
    alert("로그인이 필요합니다");
    return <Navigate to="/login" replace />;
  }

  if (!isAdminOrMaster) {
    return <Navigate to="/" replace />;
  }

  if (!isPathAllowed(location.pathname)) {
    return <Navigate to="/admin/forbidden" replace />;
  }

  return children;
}

export default AdminRoute;
