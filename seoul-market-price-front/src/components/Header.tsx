import { Link } from "react-router-dom";
import { getLoginUser, logout } from "@/features/auth/utils/auth";
import styles from "./Header.module.css";

export default function Header() {
  const loginUser = getLoginUser();

  const handleLogout = () => {
    logout();
    alert("로그아웃 되었습니다.");
    window.location.href = "/";
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        {/* Logo */}
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>🥕</span>
          <span className={styles.logoName}>싸.농</span>
          <span className={styles.logoDesc}>싸게 보는 농수산물</span>
        </Link>

        {/* Navigation */}
        <nav className={styles.nav}>
          {/* 홈 */}
          <Link to="/" className={styles.navItem}>
            홈
          </Link>

          {/* 가격 상세 정보 */}
          <div className={styles.navDropdown}>
            <Link to="/price" className={styles.navItem}>
              가격 상세 정보
              <span className={styles.arrow}>▼</span>
            </Link>

            <div className={styles.dropdownMenu}>
              <Link to="/price">품목별 시세 조회</Link>
              <Link to="/price/detail">가격 추이 그래프</Link>
              <Link to="/price/detail">급상승 / 급락 품목</Link>
            </div>
          </div>

          {/* 자치구별 가격정보 */}
          <div className={styles.navDropdown}>
            <Link to="/region-price" className={styles.navItem}>
              자치구별 가격정보
              <span className={styles.arrow}>▼</span>
            </Link>

            <div className={styles.dropdownMenu}>
              <Link to="/region-price">자치구 지도 비교</Link>
              <Link to="/region-price/my-area">자치구간 1:1 비교</Link>
            </div>
          </div>

          {/* 스마트 추천 */}
          <div className={styles.navDropdown}>
            <Link to="/recommendation" className={styles.navItem}>
              스마트 추천
              <span className={styles.arrow}>▼</span>
            </Link>

            <div className={styles.dropdownMenu}>
              <Link to="/recommendation">오늘의 알뜰 품목</Link>
              <Link to="/recommendation">오늘의 가격하락 품목 추천</Link>
              <Link to="/recommendation">이달의 제철 농수산물</Link>
            </div>
          </div>

          {/* 고객센터 */}
          <div className={styles.navDropdown}>
            <span className={styles.navItem}>
              고객센터
              <span className={styles.arrow}>▼</span>
            </span>

            <div className={styles.dropdownMenu}>
              <Link to="/notice">공지사항</Link>
              <Link to="/qna">질의응답</Link>
              <Link to="/faq">자주 묻는 질문</Link>
            </div>
          </div>

          {/* 마이페이지 */}
          <div className={styles.navDropdown}>
            <Link to="/mypage" className={styles.navItem}>
              마이페이지
              <span className={styles.arrow}>▼</span>
            </Link>

            <div className={styles.dropdownMenu}>
              <Link to="/mypage/profile">내 정보 수정</Link>
              <Link to="/mypage/preferences">
                관심품목 &amp; 우리동네 설정
              </Link>
              <Link to="/mypage/alerts">가격 변동 타겟 알림</Link>
            </div>
          </div>
        </nav>

        {/* 사용자 영역 */}
        <div className={styles.userArea}>
          {loginUser ? (
            <>
              <span className={styles.userName}>
                {loginUser.name ?? "사용자"}님
              </span>

              <button
                type="button"
                className={styles.logoutButton}
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link to="/login" className={styles.loginButton}>
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}



