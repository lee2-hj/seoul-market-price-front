import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AdminMenu, AdminPermission } from "../types/admin";

// ============================================================
// 기본 메뉴 목록 (MASTER가 편집하기 전 초기 상태)
// ============================================================
const DEFAULT_MENUS: AdminMenu[] = [
  {
    id: "dashboard",
    label: "대시보드",
    path: "/admin",
    icon: "LayoutDashboard",
    order: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: "board-manage",
    label: "게시판 관리",
    path: "/admin/board",
    icon: "FileText",
    order: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: "account-manage",
    label: "계정 관리",
    path: "/admin/accounts",
    icon: "Users",
    order: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: "menu-manage",
    label: "메뉴 관리",
    path: "/admin/menus",
    icon: "Menu",
    order: 3,
    createdAt: new Date().toISOString(),
  },
];

// ============================================================
// 스토어 인터페이스
// ============================================================
interface AdminMenuState {
  /** 전체 메뉴 목록 (MASTER가 관리) */
  menus: AdminMenu[];

  /** ADMIN별 허용 메뉴 권한 목록 */
  permissions: AdminPermission[];

  // ──────────────────────────────────────────────────────────
  // 메뉴 CRUD (MASTER 전용)
  // ──────────────────────────────────────────────────────────

  /** 새 메뉴 추가 */
  addMenu: (menu: Omit<AdminMenu, "id" | "createdAt" | "order">) => void;

  /** 메뉴 수정 (id로 찾아 업데이트) */
  updateMenu: (id: string, patch: Partial<Omit<AdminMenu, "id" | "createdAt">>) => void;

  /** 메뉴 삭제 */
  removeMenu: (id: string) => void;

  /** 메뉴 순서 변경 (드래그 결과 전체 배열 교체) */
  reorderMenus: (ordered: AdminMenu[]) => void;

  // ──────────────────────────────────────────────────────────
  // 권한 관리 (MASTER 전용)
  // ──────────────────────────────────────────────────────────

  /** 특정 ADMIN의 허용 메뉴 목록 교체 */
  setAdminPermission: (adminUserId: string, allowedMenuIds: string[]) => void;

  /** 특정 ADMIN의 허용 메뉴 ID 목록 조회 */
  getAdminAllowedMenuIds: (adminUserId: string) => string[];

  /** 특정 ADMIN이 볼 수 있는 메뉴 목록 (order 정렬) */
  getVisibleMenus: (adminUserId: string | null, isMaster: boolean) => AdminMenu[];
}

// ============================================================
// 스토어 생성 (localStorage 영속화)
// ============================================================
export const useAdminMenuStore = create<AdminMenuState>()(
  persist(
    (set, get) => ({
      menus: DEFAULT_MENUS,
      permissions: [],

      // ─── 메뉴 추가 ───────────────────────────────────────
      addMenu: (menu) => {
        const { menus } = get();
        const newMenu: AdminMenu = {
          ...menu,
          id: `menu-${Date.now()}`,
          order: menus.length,
          createdAt: new Date().toISOString(),
        };
        set({ menus: [...menus, newMenu] });
      },

      // ─── 메뉴 수정 ───────────────────────────────────────
      updateMenu: (id, patch) => {
        set((state) => ({
          menus: state.menus.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        }));
      },

      // ─── 메뉴 삭제 ───────────────────────────────────────
      removeMenu: (id) => {
        set((state) => ({
          menus: state.menus
            .filter((m) => m.id !== id)
            .map((m, i) => ({ ...m, order: i })),
          // 삭제된 메뉴를 allowedMenuIds에서도 제거
          permissions: state.permissions.map((p) => ({
            ...p,
            allowedMenuIds: p.allowedMenuIds.filter((mid) => mid !== id),
          })),
        }));
      },

      // ─── 순서 변경 ───────────────────────────────────────
      reorderMenus: (ordered) => {
        set({
          menus: ordered.map((m, i) => ({ ...m, order: i })),
        });
      },

      // ─── 권한 설정 ───────────────────────────────────────
      setAdminPermission: (adminUserId, allowedMenuIds) => {
        set((state) => {
          const existing = state.permissions.find((p) => p.adminUserId === adminUserId);
          if (existing) {
            return {
              permissions: state.permissions.map((p) =>
                p.adminUserId === adminUserId ? { ...p, allowedMenuIds } : p,
              ),
            };
          }
          return {
            permissions: [...state.permissions, { adminUserId, allowedMenuIds }],
          };
        });
      },

      // ─── 허용 메뉴 ID 조회 ───────────────────────────────
      getAdminAllowedMenuIds: (adminUserId) => {
        const permission = get().permissions.find((p) => p.adminUserId === adminUserId);
        return permission?.allowedMenuIds ?? [];
      },

      // ─── 보이는 메뉴 필터 ────────────────────────────────
      getVisibleMenus: (adminUserId, isMaster) => {
        const { menus, permissions } = get();
        const sorted = [...menus].sort((a, b) => a.order - b.order);
        if (isMaster) return sorted;
        if (!adminUserId) return [];
        const allowedIds = new Set(
          permissions.find((p) => p.adminUserId === adminUserId)?.allowedMenuIds ?? [],
        );
        // "메뉴 관리" 메뉴는 ADMIN에게 숨김
        return sorted.filter(
          (m) => allowedIds.has(m.id) && m.id !== "menu-manage",
        );
      },
    }),
    {
      name: "admin-menu-store", // localStorage 키
    },
  ),
);
