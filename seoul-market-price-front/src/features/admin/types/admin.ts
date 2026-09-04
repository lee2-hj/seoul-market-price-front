// ============================================================
// 백오피스 권한 · 메뉴 관련 타입 정의
// ============================================================

/** 백오피스 역할 */
export type AdminRole = "MASTER" | "ADMIN";

/** 사이드바에 표시되는 메뉴 항목 */
export interface AdminMenu {
  /** 메뉴 고유 ID (UUID or 고정 문자열) */
  id: string;
  /** 사이드바에 표시될 이름 */
  label: string;
  /** 이동할 경로 (예: /admin/board) */
  path: string;
  /** lucide-react 아이콘 이름 또는 이모지 문자열 */
  icon: string;
  /** 메뉴 표시 순서 */
  order: number;
  /** 생성일시 (ISO 문자열) */
  createdAt: string;
}

/** 특정 ADMIN 계정에 부여된 메뉴 권한 */
export interface AdminPermission {
  /** 대상 관리자 userId */
  adminUserId: string;
  /** 허용된 메뉴 ID 목록 */
  allowedMenuIds: string[];
}

/** 백오피스 계정 목록용 정보 */
export interface AdminAccount {
  userId: string;
  name: string;
  email?: string;
  role: AdminRole;
}
