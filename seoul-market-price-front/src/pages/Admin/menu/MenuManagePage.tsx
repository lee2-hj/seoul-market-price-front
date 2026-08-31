import { useState } from "react";
import { useAdminMenuStore } from "@/features/admin/store/useAdminMenuStore";
import type { AdminMenu } from "@/features/admin/types/admin";

const ICON_OPTIONS = [
  { value: "LayoutDashboard", label: "📊 대시보드" },
  { value: "FileText", label: "📋 문서" },
  { value: "Users", label: "👥 사용자" },
  { value: "Menu", label: "☰ 메뉴" },
  { value: "Settings", label: "⚙️ 설정" },
  { value: "BarChart", label: "📈 통계" },
  { value: "ShoppingBag", label: "🛒 쇼핑" },
  { value: "Bell", label: "🔔 알림" },
  { value: "Star", label: "⭐ 즐겨찾기" },
];

// ── 메뉴 추가/수정 모달 ──────────────────────────────────────
function MenuFormModal({
  initialData,
  onClose,
  onSubmit,
}: {
  initialData?: Partial<AdminMenu>;
  onClose: () => void;
  onSubmit: (data: Omit<AdminMenu, "id" | "createdAt" | "order">) => void;
}) {
  const [label, setLabel] = useState(initialData?.label ?? "");
  const [path, setPath] = useState(initialData?.path ?? "/admin/");
  const [icon, setIcon] = useState(initialData?.icon ?? "FileText");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !path.trim()) return;
    onSubmit({ label: label.trim(), path: path.trim(), icon });
    onClose();
  }

  return (
    <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal" role="dialog" aria-modal="true">
        <h2 className="admin-modal__title">
          {initialData ? "메뉴 수정" : "새 메뉴 추가"}
        </h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="admin-form-group">
            <label htmlFor="menu-label">메뉴 이름 *</label>
            <input
              id="menu-label"
              className="admin-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="예: 공지사항 관리"
              required
            />
          </div>
          <div className="admin-form-group">
            <label htmlFor="menu-path">경로 (URL) *</label>
            <input
              id="menu-path"
              className="admin-input"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="예: /admin/notice"
              required
            />
          </div>
          <div className="admin-form-group">
            <label htmlFor="menu-icon">아이콘</label>
            <select
              id="menu-icon"
              className="admin-input"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
            >
              {ICON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="admin-modal__footer">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="admin-btn admin-btn--primary">
              {initialData ? "저장" : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 삭제 확인 모달 ────────────────────────────────────────────
function DeleteConfirmModal({
  menu,
  onClose,
  onConfirm,
}: {
  menu: AdminMenu;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal">
        <h2 className="admin-modal__title">메뉴 삭제</h2>
        <p style={{ color: "var(--admin-text-muted)", margin: "0 0 8px" }}>
          <strong style={{ color: "var(--admin-danger)" }}>"{menu.label}"</strong> 메뉴를 삭제하면
          해당 메뉴에 할당된 모든 ADMIN 권한도 함께 제거됩니다.
        </p>
        <p style={{ color: "var(--admin-text-muted)", margin: 0, fontSize: "0.85rem" }}>
          이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="admin-modal__footer">
          <button className="admin-btn admin-btn--ghost" onClick={onClose}>취소</button>
          <button className="admin-btn admin-btn--danger" onClick={() => { onConfirm(); onClose(); }}>
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────
const PROTECTED_IDS = ["dashboard"]; // 삭제 불가 메뉴

export default function MenuManagePage() {
  const menus = useAdminMenuStore((s) => s.menus);
  const addMenu = useAdminMenuStore((s) => s.addMenu);
  const updateMenu = useAdminMenuStore((s) => s.updateMenu);
  const removeMenu = useAdminMenuStore((s) => s.removeMenu);
  const reorderMenus = useAdminMenuStore((s) => s.reorderMenus);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminMenu | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminMenu | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const sorted = [...menus].sort((a, b) => a.order - b.order);

  // ─── 드래그&드롭 순서 변경 ───────────────────────────────
  function handleDragStart(idx: number) { setDragIdx(idx); }

  function handleDrop(dropIdx: number) {
    if (dragIdx === null || dragIdx === dropIdx) return;
    const next = [...sorted];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(dropIdx, 0, moved);
    reorderMenus(next);
    setDragIdx(null);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 className="admin-page-title" style={{ margin: 0 }}>메뉴 관리</h2>
        <button className="admin-btn admin-btn--primary" onClick={() => setShowAddModal(true)}>
          ＋ 메뉴 추가
        </button>
      </div>

      <div className="admin-card" style={{ marginBottom: 16, padding: "12px 20px" }}>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--admin-text-muted)" }}>
          💡 행을 드래그해 메뉴 순서를 변경할 수 있습니다. 변경된 순서는 즉시 저장됩니다.
        </p>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>순서</th>
              <th>메뉴 이름</th>
              <th>경로 (URL)</th>
              <th>아이콘</th>
              <th>생성일</th>
              <th style={{ width: 120, textAlign: "center" }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((menu, idx) => (
              <tr
                key={menu.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(idx)}
                style={{
                  cursor: "grab",
                  opacity: dragIdx === idx ? 0.4 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                <td style={{ textAlign: "center", color: "var(--admin-text-muted)" }}>
                  ⠿ {menu.order + 1}
                </td>
                <td style={{ fontWeight: 600 }}>{menu.label}</td>
                <td>
                  <code style={{ color: "var(--admin-accent)", fontSize: "0.8rem" }}>
                    {menu.path}
                  </code>
                </td>
                <td>{menu.icon}</td>
                <td style={{ color: "var(--admin-text-muted)", fontSize: "0.8rem" }}>
                  {new Date(menu.createdAt).toLocaleDateString("ko-KR")}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                    <button
                      className="admin-btn admin-btn--ghost"
                      style={{ padding: "5px 10px", fontSize: "0.8rem" }}
                      onClick={() => setEditTarget(menu)}
                    >
                      수정
                    </button>
                    {!PROTECTED_IDS.includes(menu.id) && (
                      <button
                        className="admin-btn admin-btn--danger"
                        style={{ padding: "5px 10px", fontSize: "0.8rem" }}
                        onClick={() => setDeleteTarget(menu)}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 추가 모달 */}
      {showAddModal && (
        <MenuFormModal
          onClose={() => setShowAddModal(false)}
          onSubmit={(data) => addMenu(data)}
        />
      )}

      {/* 수정 모달 */}
      {editTarget && (
        <MenuFormModal
          initialData={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={(data) => updateMenu(editTarget.id, data)}
        />
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <DeleteConfirmModal
          menu={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => removeMenu(deleteTarget.id)}
        />
      )}
    </div>
  );
}
