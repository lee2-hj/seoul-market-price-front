import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";

import { useAdminPermission } from "@/features/admin/hooks/useAdminPermission";
import { logout } from "@/features/auth/utils/auth";

// ─── 아이콘 매핑 (lucide 대신 SVG 인라인으로 의존성 없이 처리) ─────────────
const ICON_MAP: Record<string, string> = {
  LayoutDashboard: "📊",
  FileText: "📋",
  Users: "👥",
  Menu: "☰",
};

function MenuIcon({ name }: { name: string }) {
  return <span className="admin-menu-icon">{ICON_MAP[name] ?? "📌"}</span>;
}

// ─── 역할 배지 ─────────────────────────────────────────────────────────────
function RoleBadge({ isMaster }: { isMaster: boolean }) {
  return (
    <span
      className={`admin-role-badge ${isMaster ? "admin-role-badge--master" : "admin-role-badge--admin"}`}
    >
      {isMaster ? "MASTER" : "ADMIN"}
    </span>
  );
}

// ─── 레이아웃 ──────────────────────────────────────────────────────────────
export default function AdminLayout() {
  const { user, isMaster, visibleMenus } = useAdminPermission();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="admin-layout">
      {/* ── 사이드바 ─────────────────────────────────────── */}
      <aside className={`admin-sidebar ${sidebarOpen ? "admin-sidebar--open" : "admin-sidebar--closed"}`}>
        {/* 로고 영역 */}
        <div className="admin-sidebar__logo">
          <span className="admin-sidebar__logo-text">
            {sidebarOpen ? "🏢 백오피스" : "🏢"}
          </span>
          <button
            className="admin-sidebar__toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? "사이드바 닫기" : "사이드바 열기"}
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        {/* 계정 정보 */}
        <div className="admin-sidebar__account">
          <div className="admin-sidebar__avatar">
            {user?.name?.[0] ?? "?"}
          </div>
          {sidebarOpen && (
            <div className="admin-sidebar__account-info">
              <span className="admin-sidebar__account-name">{user?.name}</span>
              <RoleBadge isMaster={isMaster} />
            </div>
          )}
        </div>

        {/* 메뉴 목록 */}
        <nav className="admin-sidebar__nav" aria-label="백오피스 메뉴">
          <ul className="admin-sidebar__menu-list">
            {visibleMenus.map((menu) => (
              <li key={menu.id}>
                <NavLink
                  to={menu.path}
                  end={menu.path === "/admin"}
                  className={({ isActive }) =>
                    `admin-sidebar__menu-item ${isActive ? "admin-sidebar__menu-item--active" : ""}`
                  }
                  title={!sidebarOpen ? menu.label : undefined}
                >
                  <MenuIcon name={menu.icon} />
                  {sidebarOpen && (
                    <span className="admin-sidebar__menu-label">{menu.label}</span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* 로그아웃 */}
        <div className="admin-sidebar__footer">
          <button
            className="admin-sidebar__logout-btn"
            onClick={handleLogout}
            title={!sidebarOpen ? "로그아웃" : undefined}
          >
            <span>🚪</span>
            {sidebarOpen && <span>로그아웃</span>}
          </button>
        </div>
      </aside>

      {/* ── 메인 컨텐츠 ──────────────────────────────────── */}
      <main className="admin-main">
        {/* 상단 헤더 바 */}
        <header className="admin-topbar">
          <h1 className="admin-topbar__title">서울 시장 가격 백오피스</h1>
          <div className="admin-topbar__right">
            <RoleBadge isMaster={isMaster} />
            <span className="admin-topbar__user">{user?.name}</span>
          </div>
        </header>

        {/* 페이지 컨텐츠 */}
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
