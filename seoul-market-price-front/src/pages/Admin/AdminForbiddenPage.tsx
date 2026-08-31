import { useNavigate } from "react-router-dom";

export default function AdminForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div className="admin-forbidden">
      <div className="admin-forbidden__card">
        <div className="admin-forbidden__icon" aria-hidden="true">🚫</div>
        <h1 className="admin-forbidden__title">접근 권한이 없습니다</h1>
        <p className="admin-forbidden__desc">
          해당 페이지에 접근할 수 있는 권한이 없습니다.
          <br />
          마스터에게 메뉴 권한을 요청해 주세요.
        </p>
        <button
          className="admin-forbidden__btn"
          onClick={() => navigate("/admin")}
        >
          대시보드로 이동
        </button>
      </div>
    </div>
  );
}
