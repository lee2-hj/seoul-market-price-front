import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { useAdminMenuStore } from "@/features/admin/store/useAdminMenuStore";
import type { AdminRole } from "@/features/admin/types/admin";

// ============================================================
// 현재 로그인된 사용자의 백오피스 권한을 조회하는 훅
// ============================================================

export function useAdminPermission() {
  const user = useAuthStore((s) => s.user);
  const getVisibleMenus = useAdminMenuStore((s) => s.getVisibleMenus);
  const getAdminAllowedMenuIds = useAdminMenuStore((s) => s.getAdminAllowedMenuIds);

  const role = (user?.role ?? "").toUpperCase();
  const isMaster = role === "MASTER" || role === "ROLE_MASTER";
  const isAdmin = role === "ADMIN" || role === "ROLE_ADMIN";
  const isAdminOrMaster = isMaster || isAdmin;

  /** 현재 사용자에게 보여야 하는 메뉴 목록 */
  const visibleMenus = isAdminOrMaster
    ? getVisibleMenus(user?.userId ?? null, isMaster)
    : [];

  /** 현재 사용자에게 허용된 메뉴 ID 목록 (MASTER는 항상 전체) */
  const allowedMenuIds = isMaster
    ? null // null = 전체 허용
    : getAdminAllowedMenuIds(user?.userId ?? "");

  /** 특정 경로가 현재 사용자에게 허용되어 있는지 확인 */
  const isPathAllowed = (path: string): boolean => {
    if (!isAdminOrMaster) return false;
    if (isMaster) return true;
    return visibleMenus.some((m) => m.path === path);
  };

  return {
    user,
    role: (isMaster ? "MASTER" : isAdmin ? "ADMIN" : null) as AdminRole | null,
    isMaster,
    isAdmin,
    isAdminOrMaster,
    visibleMenus,
    allowedMenuIds,
    isPathAllowed,
  };
}
