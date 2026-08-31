import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

import { useAdminPermission } from "@/features/admin/hooks/useAdminPermission";

interface MasterRouteProps {
  children: ReactNode;
}

/**
 * MASTER 역할을 가진 사용자만 접근할 수 있는 라우트 가드.
 *
 * - 비로그인 → /login 리디렉트
 * - role이 ADMIN/USER → /admin/forbidden 리디렉트
 * - MASTER → children 렌더
 */
function MasterRoute({ children }: MasterRouteProps) {
  const { isMaster, isAdminOrMaster, user } = useAdminPermission();

  if (!user) {
    alert("로그인이 필요합니다");
    return <Navigate to="/login" replace />;
  }

  if (!isAdminOrMaster || !isMaster) {
    return <Navigate to="/admin/forbidden" replace />;
  }

  return children;
}

export default MasterRoute;
