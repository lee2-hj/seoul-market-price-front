import { useState } from "react";
import { Link } from "react-router-dom";
import LoginForm from "@/features/auth/components/LoginForm";
import SocialLogin from "@/features/auth/components/SocialLogin";
import styles from "./LoginPage.module.css";

function LoginPage() {
  const [activeItem, setActiveItem] = useState<number | null>(null);
  const categoryItems = ["🍎", "🥬", "🐟", "🛒"];
  const handleIconClick = (index: number) => {
    setActiveItem(activeItem === index ? null : index);
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.container}>
        {/* 브랜드 영역 */}
        <div className={styles.brandBox}>
          {/* 카테고리 아이콘 */}
          <div className={styles.categoryIcons}>
            {categoryItems.map((item, index) => (
              <span
                key={index}
                role="button"
                tabIndex={0}
                className={activeItem === index ? styles.activeIcon : ""}
                onClick={() => handleIconClick(index)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleIconClick(index);
                  }
                }}
              >
                {item}
              </span>
            ))}
          </div>

          {/* 브랜드 문구 */}

          <div className={styles.brandBox}>
            <div className={styles.brandTitle}>싸.농</div>
            <div className={styles.brandSubTitle}>
              <span className={styles.point}>싸</span>게 보는 내 주변{" "}
              <span className={styles.point}>농</span>수산물
            </div>
          </div>
        </div>

        {/* 로그인 카드 */}
        <div className={styles.loginBox}>
          <h2>로그인</h2>
          <LoginForm />
          <SocialLogin mode="login" />

          {/* 회원가입 안내 */}
          <div className={styles.signupGuide}>
            <span>아직 계정이 없으신가요?</span>
            <Link to="/signup">회원가입</Link>
          </div>

          {/* 아이디 / 비밀번호 찾기 */}

          <div className={styles.links}>
            <Link to="/find-id">아이디 찾기</Link>
            <Link to="/find-password">비밀번호 찾기</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
