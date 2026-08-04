import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import styles from "./QnaDetailPage.module.css";

interface QnaPost {
  id: number;
  author: string;
  title: string;
  content: string;
  date: string;
  views: number;
}

/* 초기 Q&A 게시글 */

const INITIAL_QNA_POSTS: QnaPost[] = [
  {
    id: 3,
    author: "싸농이용자",
    title: "가격정보는 얼마나 자주 업데이트되나요?",
    content:
      "싸농에서 제공하는 농수산물 가격정보의 업데이트 주기가 궁금합니다.",
    date: "2026.08.04",
    views: 24,
  },
  {
    id: 2,
    author: "농산물관심",
    title: "자치구별 가격정보는 어디에서 확인하나요?",
    content: "서울 지역별 농수산물 가격을 비교해서 보고 싶습니다.",
    date: "2026.08.03",
    views: 18,
  },
  {
    id: 1,
    author: "사용자",
    title: "Q&A 게시판 이용 방법이 궁금합니다.",
    content: "Q&A 게시판에서 질문을 작성하고 확인하는 방법을 알고 싶습니다.",
    date: "2026.08.01",
    views: 12,
  },
];

/* 게시글 조회 */

const getPosts = (): QnaPost[] => {
  const storedPosts = localStorage.getItem("qnaPosts");

  if (!storedPosts) {
    return INITIAL_QNA_POSTS;
  }

  try {
    const parsedPosts: QnaPost[] = JSON.parse(storedPosts);

    return Array.isArray(parsedPosts) ? parsedPosts : INITIAL_QNA_POSTS;
  } catch {
    return INITIAL_QNA_POSTS;
  }
};

/* 로그인 사용자 이름 조회 */

const getLoginUserName = (): string => {
  const user = localStorage.getItem("user");

  if (!user) {
    return "사용자";
  }

  try {
    const parsedUser = JSON.parse(user);

    return (
      parsedUser.name || parsedUser.userName || parsedUser.userId || "사용자"
    );
  } catch {
    return "사용자";
  }
};

/* Q&A 상세 페이지 */

function QnaDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  /* 게시글 조회 */

  const post = useMemo(() => {
    const posts = getPosts();

    return posts.find((item) => item.id === Number(id));
  }, [id]);

  /* 로그인 상태 */

  const isLoggedIn =
    !!localStorage.getItem("accessToken") || !!localStorage.getItem("user");

  /* 로그아웃 */

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");

    navigate("/");
  };

  /* 게시글이 없는 경우 */

  if (!post) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <h2>게시글을 찾을 수 없습니다.</h2>

          <p>삭제되었거나 존재하지 않는 게시글입니다.</p>

          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate("/qna")}
          >
            Q&A 목록으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* 사용자 영역 */}

      <div className={styles.topUserBar}>
        <div className={styles.topUserInner}>
          <div className={styles.userArea}>
            {isLoggedIn ? (
              <>
                <span className={styles.userName}>{getLoginUserName()}</span>

                <button
                  type="button"
                  className={styles.logoutButton}
                  onClick={handleLogout}
                >
                  로그아웃
                </button>
              </>
            ) : (
              <button
                type="button"
                className={styles.loginLink}
                onClick={() => navigate("/login")}
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Header */}

      <header className={styles.mainHeader}>
        <div className={styles.headerInner}>
          {/* 로고 */}

          <button
            type="button"
            className={styles.logo}
            onClick={() => navigate("/")}
          >
            싸농
          </button>

          {/* 메인 메뉴 */}

          <nav className={styles.mainNav}>
            {/* 홈 */}

            <button
              type="button"
              className={styles.navItem}
              onClick={() => navigate("/")}
            >
              홈
            </button>

            {/* 가격정보 */}

            <div className={styles.navMenu}>
              <button type="button" className={styles.navItem}>
                가격정보
              </button>

              <div className={styles.megaMenu}>
                <div className={styles.megaColumn}>
                  <strong>가격정보</strong>

                  <button type="button" onClick={() => navigate("/price")}>
                    간편가격정보
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/price/detail")}
                  >
                    세부가격정보
                  </button>
                </div>
              </div>
            </div>

            {/* 자치구별 가격정보 */}

            <div className={styles.navMenu}>
              <button type="button" className={styles.navItem}>
                자치구별 가격정보
              </button>

              <div className={styles.megaMenu}>
                <div className={styles.megaColumn}>
                  <strong>자치구별 가격정보</strong>

                  <button
                    type="button"
                    onClick={() => navigate("/region-price")}
                  >
                    서울 지역별 가격
                  </button>
                </div>
              </div>
            </div>

            {/* 스마트 추천 */}

            <button
              type="button"
              className={styles.navItem}
              onClick={() => navigate("/recommendation")}
            >
              스마트 추천
            </button>

            {/* 게시판 */}

            <div className={styles.navMenu}>
              <button type="button" className={styles.navItem}>
                게시판
              </button>

              <div className={styles.megaMenu}>
                <div className={styles.megaColumn}>
                  <strong>게시판</strong>

                  <button type="button" onClick={() => navigate("/board")}>
                    일반게시판
                  </button>

                  <button type="button" onClick={() => navigate("/qna")}>
                    Q&A
                  </button>

                  <button type="button" onClick={() => navigate("/faq")}>
                    자주 묻는 질문
                  </button>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* 본문 */}

      <main className={styles.container}>
        {/* 페이지 제목 */}

        <section className={styles.pageHeader}>
          <div>
            <h1>Q&A</h1>

            <p>궁금한 점이나 서비스 이용 관련 문의를 확인해주세요.</p>
          </div>
        </section>

        {/* 게시글 */}

        <article className={styles.post}>
          <header className={styles.postHeader}>
            <h2>{post.title}</h2>

            <div className={styles.postMeta}>
              <span>
                작성자 <strong>{post.author}</strong>
              </span>

              <span>{post.date}</span>

              <span>
                조회수 <strong>{post.views}</strong>
              </span>
            </div>
          </header>

          {/* 게시글 내용 */}

          <div className={styles.postContent}>{post.content}</div>
        </article>

        {/* 하단 버튼 */}

        <div className={styles.bottomActions}>
          <button
            type="button"
            className={styles.listButton}
            onClick={() => navigate("/qna")}
          >
            목록
          </button>
        </div>
      </main>
    </div>
  );
}

export default QnaDetailPage;
