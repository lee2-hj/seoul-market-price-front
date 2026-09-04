import { useAdminPermission } from "@/features/admin/hooks/useAdminPermission";
import { useAdminMenuStore } from "@/features/admin/store/useAdminMenuStore";

// ── 간단한 통계 카드 ──────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-card__icon">{icon}</div>
      <div className="admin-stat-card__label">{label}</div>
      <div className="admin-stat-card__value" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, role, visibleMenus } = useAdminPermission();
  const menus = useAdminMenuStore((s) => s.menus);
  const permissions = useAdminMenuStore((s) => s.permissions);

  return (
    <div>
      <h2 className="admin-page-title">대시보드</h2>

      {/* 통계 카드 */}
      <div className="admin-stat-grid">
        <StatCard icon="🔑" label="내 권한" value={role ?? "-"} color="var(--admin-accent)" />
        <StatCard icon="📋" label="전체 메뉴 수" value={menus.length} />
        <StatCard icon="✅" label="내가 접근 가능한 메뉴" value={visibleMenus.length} />
        <StatCard icon="👥" label="권한 설정된 계정 수" value={permissions.length} />
      </div>

      {/* 환영 메시지 */}
      <div className="admin-card">
        <p style={{ margin: 0, color: "var(--admin-text-muted)", lineHeight: 1.8 }}>
          👋 안녕하세요, <strong style={{ color: "var(--admin-text)" }}>{user?.name}</strong>님.<br />
          {role === "MASTER"
            ? "MASTER 계정으로 로그인되어 있습니다. 메뉴 관리 및 계정 권한 할당이 가능합니다."
            : "ADMIN 계정으로 로그인되어 있습니다. 허용된 메뉴에만 접근 가능합니다."}
        </p>
      </div>

      {/* 접근 가능한 메뉴 목록 */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 12 }}>
          접근 가능한 메뉴
        </h3>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>메뉴명</th>
                <th>경로</th>
                <th>순서</th>
              </tr>
            </thead>
            <tbody>
              {visibleMenus.map((menu) => (
                <tr key={menu.id}>
                  <td>{menu.label}</td>
                  <td>
                    <code style={{ color: "var(--admin-accent)", fontSize: "0.8rem" }}>
                      {menu.path}
                    </code>
                  </td>
                  <td>{menu.order + 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
