import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { BoardListItem } from "@/features/board/types/board.types";
import { getBoardPostsApi } from "@/api/api";

// ── 상태 배지 ─────────────────────────────────────────────────
function StatusBadge({ level }: { level: string | null | undefined }) {
  if (!level) return <span style={{ color: "var(--admin-text-muted)" }}>-</span>;
  const colors: Record<string, string> = {
    NOTICE: "#f59e0b",
    IMPORTANT: "#ef4444",
  };
  return (
    <span
      style={{
        background: `${colors[level] ?? "#6366f1"}22`,
        color: colors[level] ?? "#6366f1",
        border: `1px solid ${colors[level] ?? "#6366f1"}44`,
        borderRadius: 20,
        padding: "2px 8px",
        fontSize: "0.72rem",
        fontWeight: 700,
      }}
    >
      {level}
    </span>
  );
}

export default function BoardManagePage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BoardListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    async function fetchPosts() {
      setLoading(true);
      try {
        const res = await getBoardPostsApi({
          page: page + 1, // API는 1-based 페이지
          size: 20,
          keyword: search || undefined,
        });
        const allPosts = [...(res.notices ?? []), ...(res.items ?? [])];
        setPosts(allPosts);
        setTotalPages(res.totalPages ?? 1);
      } catch {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }
    void fetchPosts();
  }, [page, search]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
  }

  return (
    <div>
      <h2 className="admin-page-title">게시판 관리</h2>

      {/* 검색 */}
      <form className="admin-form-row" onSubmit={handleSearch} style={{ marginBottom: 20 }}>
        <div className="admin-form-group" style={{ maxWidth: 360 }}>
          <input
            className="admin-input"
            placeholder="제목 또는 작성자 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="submit" className="admin-btn admin-btn--primary">
          검색
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--ghost"
          onClick={() => { setSearch(""); setPage(0); }}
        >
          초기화
        </button>
      </form>

      {/* 테이블 */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>번호</th>
              <th>제목</th>
              <th style={{ width: 100 }}>작성자</th>
              <th style={{ width: 90, textAlign: "center" }}>공지 레벨</th>
              <th style={{ width: 90, textAlign: "right" }}>조회수</th>
              <th style={{ width: 110 }}>작성일</th>
              <th style={{ width: 100, textAlign: "center" }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--admin-text-muted)" }}>
                  불러오는 중...
                </td>
              </tr>
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--admin-text-muted)" }}>
                  게시글이 없습니다
                </td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr key={post.id}>
                  <td style={{ color: "var(--admin-text-muted)", textAlign: "center" }}>
                    {post.boardId}
                  </td>
                  <td>
                    <button
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--admin-text)",
                        cursor: "pointer",
                        textAlign: "left",
                        fontWeight: 500,
                        padding: 0,
                      }}
                      onClick={() => navigate(`/board/${post.boardId}`)}
                    >
                      {post.title}
                    </button>
                  </td>
                  <td style={{ color: "var(--admin-text-muted)" }}>
                    {post.authorName ?? "-"}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <StatusBadge level={post.noticeLevel} />
                  </td>
                  <td style={{ textAlign: "right", color: "var(--admin-text-muted)" }}>
                    {post.viewCount?.toLocaleString() ?? 0}
                  </td>
                  <td style={{ color: "var(--admin-text-muted)", fontSize: "0.82rem" }}>
                    {post.createdAt
                      ? new Date(post.createdAt).toLocaleDateString("ko-KR")
                      : "-"}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      className="admin-btn admin-btn--ghost"
                      style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                      onClick={() => navigate(`/board/${post.boardId}`)}
                    >
                      보기
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
          <button
            className="admin-btn admin-btn--ghost"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ← 이전
          </button>
          <span style={{ display: "flex", alignItems: "center", color: "var(--admin-text-muted)", fontSize: "0.875rem" }}>
            {page + 1} / {totalPages}
          </span>
          <button
            className="admin-btn admin-btn--ghost"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            다음 →
          </button>
        </div>
      )}
    </div>
  );
}
