import { useState } from "react";
import { useAdminMenuStore } from "@/features/admin/store/useAdminMenuStore";
import type { AdminAccount } from "@/features/admin/types/admin";

// ─── 임시 계정 목록 (백엔드 연동 전 Mock) ────────────────────
// TODO: 실제 백엔드 /api/admin/accounts API 연동으로 교체
const MOCK_ACCOUNTS: AdminAccount[] = [
  { userId: "admin01", name: "김관리", role: "ADMIN", email: "admin01@example.com" },
  { userId: "admin02", name: "이담당", role: "ADMIN", email: "admin02@example.com" },
  { userId: "master01", name: "최마스터", role: "MASTER", email: "master@example.com" },
];

// ── 권한 편집 패널 ────────────────────────────────────────────
function PermissionPanel({
  account,
  onClose,
}: {
  account: AdminAccount;
  onClose: () => void;
}) {
  const menus = useAdminMenuStore((s) => s.menus);
  const getAdminAllowedMenuIds = useAdminMenuStore((s) => s.getAdminAllowedMenuIds);
  const setAdminPermission = useAdminMenuStore((s) => s.setAdminPermission);

  const sorted = [...menus].sort((a, b) => a.order - b.order);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(getAdminAllowedMenuIds(account.userId)),
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSave() {
    setAdminPermission(account.userId, Array.from(selected));
    onClose();
  }

  // MASTER 계정은 항상 전체 권한이므로 편집 불필요
  if (account.role === "MASTER") {
    return (
      <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="admin-modal">
          <h2 className="admin-modal__title">권한 편집 — {account.name}</h2>
          <p style={{ color: "var(--admin-text-muted)", margin: 0 }}>
            MASTER 계정은 모든 메뉴에 자동으로 접근 가능합니다.
          </p>
          <div className="admin-modal__footer">
            <button className="admin-btn admin-btn--ghost" onClick={onClose}>닫기</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal" style={{ maxWidth: 520 }}>
        <h2 className="admin-modal__title">
          메뉴 권한 편집 —{" "}
          <span style={{ color: "var(--admin-accent)" }}>{account.name}</span>
        </h2>
        <p style={{ color: "var(--admin-text-muted)", fontSize: "0.85rem", marginBottom: 16 }}>
          체크한 메뉴만 해당 ADMIN 계정에서 보이고 접근 가능합니다.
        </p>

        <div className="admin-checkbox-list">
          {sorted
            .filter((m) => m.id !== "menu-manage") // 메뉴 관리는 MASTER 전용
            .map((menu) => (
              <label key={menu.id} className="admin-checkbox-item">
                <input
                  type="checkbox"
                  checked={selected.has(menu.id)}
                  onChange={() => toggle(menu.id)}
                />
                <span style={{ flex: 1 }}>{menu.label}</span>
                <code style={{ color: "var(--admin-text-muted)", fontSize: "0.78rem" }}>
                  {menu.path}
                </code>
              </label>
            ))}
        </div>

        <div style={{ marginTop: 12, fontSize: "0.8rem", color: "var(--admin-text-muted)" }}>
          선택됨: {selected.size}개 / 전체 {sorted.length - 1}개
        </div>

        <div className="admin-modal__footer">
          <button className="admin-btn admin-btn--ghost" onClick={onClose}>취소</button>
          <button className="admin-btn admin-btn--primary" onClick={handleSave}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────
export default function AccountManagePage() {
  const getAdminAllowedMenuIds = useAdminMenuStore((s) => s.getAdminAllowedMenuIds);
  const menus = useAdminMenuStore((s) => s.menus);
  const [editTarget, setEditTarget] = useState<AdminAccount | null>(null);

  return (
    <div>
      <h2 className="admin-page-title">계정 관리</h2>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>아이디</th>
              <th>이메일</th>
              <th>권한</th>
              <th>허용 메뉴</th>
              <th style={{ textAlign: "center" }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_ACCOUNTS.map((account) => {
              const allowedIds = getAdminAllowedMenuIds(account.userId);
              const allowedMenus =
                account.role === "MASTER"
                  ? "전체"
                  : allowedIds.length === 0
                    ? "없음"
                    : allowedIds
                        .map((id) => menus.find((m) => m.id === id)?.label ?? id)
                        .join(", ");

              return (
                <tr key={account.userId}>
                  <td style={{ fontWeight: 600 }}>{account.name}</td>
                  <td>
                    <code style={{ color: "var(--admin-text-muted)", fontSize: "0.85rem" }}>
                      {account.userId}
                    </code>
                  </td>
                  <td style={{ color: "var(--admin-text-muted)" }}>{account.email ?? "-"}</td>
                  <td>
                    <span
                      className={`admin-role-badge ${
                        account.role === "MASTER"
                          ? "admin-role-badge--master"
                          : "admin-role-badge--admin"
                      }`}
                    >
                      {account.role}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.82rem", color: "var(--admin-text-muted)", maxWidth: 260 }}>
                    <span
                      style={{
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={allowedMenus}
                    >
                      {allowedMenus}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      className="admin-btn admin-btn--ghost"
                      style={{ padding: "5px 12px", fontSize: "0.82rem" }}
                      onClick={() => setEditTarget(account)}
                    >
                      권한 편집
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="admin-card" style={{ marginTop: 16, padding: "12px 20px" }}>
        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--admin-text-muted)" }}>
          💡 계정 생성/삭제는 백엔드 API 연동 후 활성화됩니다. 현재는 권한 할당만 가능합니다.
        </p>
      </div>

      {editTarget && (
        <PermissionPanel account={editTarget} onClose={() => setEditTarget(null)} />
      )}
    </div>
  );
}
