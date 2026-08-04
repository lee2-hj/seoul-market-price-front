import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import styles from "./QnaDetailPage.module.css";

interface QnaPost {
  id: number;
  authorId: string;
  author: string;
  title: string;
  content: string;
  date: string;
  views: number;
}

interface LoginUser {
  userId?: string;
  name?: string;
  userName?: string;
  role?: string;
}

/* 초기 Q&A 샘플 데이터 */

const INITIAL_QNA_POSTS: QnaPost[] = [
  {
    id: 3,
    authorId: "park123",
    author: "박채소",
    title: "모바일 화면에서도 확인 가능한가요?",
    content: "웹사이트와 동일하게 모바일 화면에서도 확인가능한가요?",
    date: "2026.08.04",
    views: 24,
  },
  {
    id: 2,
    authorId: "kim123",
    author: "김채소",
    title: "농수산물이 어떤 방법으로 조사 되는지 알 수 있을까요?",
    content: "어떤 데이터를 토대로 조사가 되는건가요?",
    date: "2026.08.03",
    views: 18,
  },
  {
    id: 1,
    authorId: "lee123",
    author: "이채소",
    title: "관심품목 설정은 어디서 하나요",
    content: "내가 사는 지역의 관심품목을 설정하고 싶어요.",
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
    const parsedPosts = JSON.parse(storedPosts);

    if (!Array.isArray(parsedPosts)) {
      return INITIAL_QNA_POSTS;
    }

    return parsedPosts;
  } catch (error) {
    console.error("Q&A 게시글 불러오기 실패:", error);

    return INITIAL_QNA_POSTS;
  }
};

/* 로그인 사용자 가져오기 */

const getLoginUser = (): LoginUser | null => {
  const storedUser = localStorage.getItem("loginUser");

  if (!storedUser) {
    return null;
  }

  try {
    const parsedUser = JSON.parse(storedUser);

    if (!parsedUser || typeof parsedUser !== "object") {
      return null;
    }

    return parsedUser;
  } catch (error) {
    console.error("로그인 사용자 정보 확인 실패:", error);

    return null;
  }
};

/* 로그인 사용자 이름 */

const getLoginUserName = (): string => {
  const user = getLoginUser();

  if (!user) {
    return "사용자";
  }

  return user.name || user.userName || user.userId || "사용자";
};

/* Q&A Detail Page */

function QnaDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  /* 현재 로그인 사용자 */

  const currentUser = useMemo(() => {
    return getLoginUser();
  }, []);

  /* 로그인 상태 */

  const isLoggedIn = !!currentUser;

  /* 로그인 사용자 ID */

  const loginUserId = useMemo(() => {
    return currentUser?.userId || "";
  }, [currentUser]);

  /* 관리자 여부 */

  const isAdmin = useMemo(() => {
    return currentUser?.role?.toUpperCase() === "ADMIN";
  }, [currentUser]);

  /* 게시글 조회 */

  const post = useMemo(() => {
    const posts = getPosts();

    return posts.find((item) => item.id === Number(id));
  }, [id]);

  /* 본인 게시글 여부 */

  const isAuthor = useMemo(() => {
    if (!post || !loginUserId) {
      return false;
    }

    return post.authorId === loginUserId;
  }, [post, loginUserId]);

  /*
    상세 조회 권한

    일반 회원
      → 본인 게시글만 조회 가능

    관리자
      → 모든 게시글 조회 가능
  */

  const canView = isAdmin || isAuthor;

  /*
    수정 권한

    일반 회원
      → 본인 게시글만 수정 가능

    관리자
      → 본인 게시글이면 수정 가능
      → 다른 회원 게시글은 수정 불가
  */

  const canEdit = isAuthor;

  /*
    삭제 권한

    일반 회원
      → 본인 게시글만 삭제 가능

    관리자
      → 모든 게시글 삭제 가능
  */

  const canDelete = isAdmin || isAuthor;

  /* 로그아웃 */

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("loginUser");

    navigate("/");
  };

  /* 게시글 삭제 */

  const handleDelete = () => {
    if (!post) {
      alert("게시글을 찾을 수 없습니다.");
      return;
    }

    /*
      현재 페이지에서 1차 권한 확인
    */

    if (!canDelete) {
      alert("게시글을 삭제할 권한이 없습니다.");
      return;
    }

    const deleteConfirm = window.confirm(
      isAdmin && !isAuthor
        ? "관리자 권한으로 이 게시글을 삭제하시겠습니까?"
        : "정말 이 게시글을 삭제하시겠습니까?",
    );

    if (!deleteConfirm) {
      return;
    }

    /*
      삭제 직전 최신 데이터 다시 조회
    */

    const posts = getPosts();

    const targetPost = posts.find((item) => item.id === post.id);

    if (!targetPost) {
      alert("게시글을 찾을 수 없습니다.");
      return;
    }

    /*
      삭제 직전 로그인 사용자 다시 확인
    */

    const latestUser = getLoginUser();

    if (!latestUser) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    const latestUserId = latestUser.userId || "";

    const latestIsAdmin = latestUser.role?.toUpperCase() === "ADMIN";

    const latestIsAuthor =
      !!latestUserId && targetPost.authorId === latestUserId;

    /*
      최종 삭제 권한 확인

      관리자 OR 작성자
    */

    if (!latestIsAdmin && !latestIsAuthor) {
      alert("게시글을 삭제할 권한이 없습니다.");
      return;
    }

    /*
      게시글 삭제
    */

    const updatedPosts = posts.filter((item) => item.id !== targetPost.id);

    localStorage.setItem("qnaPosts", JSON.stringify(updatedPosts));

    alert(
      latestIsAdmin && !latestIsAuthor
        ? "관리자 권한으로 게시글이 삭제되었습니다."
        : "게시글이 삭제되었습니다.",
    );

    navigate("/qna");
  };

  /* 게시글 수정 */

  const handleEdit = () => {
    if (!post) {
      alert("게시글을 찾을 수 없습니다.");
      return;
    }

    /*
      수정은 본인 게시글만 가능

      관리자라도 다른 회원의 게시글은 수정할 수 없다.
    */

    if (!canEdit) {
      alert("본인이 작성한 게시글만 수정할 수 있습니다.");
      return;
    }

    navigate(`/qna/${post.id}/edit`);
  };

  /* 비로그인 */

  if (!isLoggedIn || !currentUser || !loginUserId) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🔒</div>

          <h2>로그인이 필요합니다.</h2>

          <p>
            Q&A 게시글의 상세 내용은
            <br />
            로그인한 회원만 확인할 수 있습니다.
          </p>

          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate("/login")}
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  /* 게시글 없음 */

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

  /*
    접근 권한 없음

    일반 회원
      → 본인 게시글이 아니면 접근 제한

    관리자
      → 모든 게시글 접근 가능
  */

  if (!canView) {
    return (
      <div className={styles.page}>
        {/* 사용자 영역 */}

        <div className={styles.topUserBar}>
          <div className={styles.topUserInner}>
            <div className={styles.userArea}>
              <span className={styles.userName}>{getLoginUserName()}</span>

              <button
                type="button"
                className={styles.logoutButton}
                onClick={handleLogout}
              >
                로그아웃
              </button>
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
              aria-label="싸농 홈으로 이동"
            >
              싸농
            </button>

            {/* 메인 메뉴 */}

            <nav className={styles.mainNav} aria-label="주요 메뉴">
              {/* 홈 */}

              <button
                type="button"
                className={styles.navItem}
                onClick={() => navigate("/")}
              >
                홈
              </button>

              {/* 가격 상세 정보 */}

              <div className={styles.navMenu}>
                <button type="button" className={styles.navItem}>
                  가격 상세 정보
                </button>

                <div className={styles.megaMenu}>
                  <div className={styles.megaColumn}>
                    <strong>가격정보</strong>

                    <button type="button" onClick={() => navigate("/price")}>
                      품목별 시세 조회
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate("/price/detail")}
                    >
                      가격 추이 그래프
                    </button>

                    <button type="button" onClick={() => navigate("/price")}>
                      급상승 / 급락 품목
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
                    <strong>자치구별 지도 비교</strong>

                    <button
                      type="button"
                      onClick={() => navigate("/region-price")}
                    >
                      자치구간 1:1 비교
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate("/region-price")}
                    >
                      시장 / 마트 유형별 비교
                    </button>
                  </div>
                </div>
              </div>

              {/* 스마트 추천 */}

              <div className={styles.navMenu}>
                <button type="button" className={styles.navItem}>
                  스마트 추천
                </button>

                <div className={styles.megaMenu}>
                  <div className={styles.megaColumn}>
                    <strong>스마트 추천</strong>

                    <button
                      type="button"
                      onClick={() => navigate("/recommendation")}
                    >
                      오늘의 알뜰 장바구니
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate("/recommendation")}
                    >
                      가격 하락 품목 추천
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate("/recommendation")}
                    >
                      이달의 제철 농수산물
                    </button>
                  </div>
                </div>
              </div>

              {/* 고객센터 */}

              <div className={styles.navMenu}>
                <button type="button" className={styles.navItem}>
                  고객센터
                </button>

                <div className={styles.megaMenu}>
                  <div className={styles.megaColumn}>
                    <strong>고객센터</strong>

                    <button type="button" onClick={() => navigate("/board")}>
                      공지사항
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

        {/* 접근 제한 */}

        <main className={styles.container}>
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🔒</div>

            <h2>접근할 수 없는 게시글입니다.</h2>

            <p>
              본인이 작성한 Q&A 게시글만
              <br />
              상세 내용을 확인할 수 있습니다.
            </p>

            <button
              type="button"
              className={styles.backButton}
              onClick={() => navigate("/qna")}
            >
              Q&A 목록으로
            </button>
          </div>
        </main>
      </div>
    );
  }

  /*
    상세 페이지

    여기까지 도달했다면

    일반 회원
      → 본인 게시글

    관리자
      → 모든 게시글

    중 하나이다.
  */

  return (
    <div className={styles.page}>
      {/* 사용자 영역 */}

      <div className={styles.topUserBar}>
        <div className={styles.topUserInner}>
          <div className={styles.userArea}>
            <span className={styles.userName}>{getLoginUserName()}</span>

            {isAdmin && (
              <span
                style={{
                  marginLeft: "8px",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                관리자
              </span>
            )}

            <button
              type="button"
              className={styles.logoutButton}
              onClick={handleLogout}
            >
              로그아웃
            </button>
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
            aria-label="싸농 홈으로 이동"
          >
            싸농
          </button>

          {/* 메인 메뉴 */}

          <nav className={styles.mainNav} aria-label="주요 메뉴">
            {/* 홈 */}

            <button
              type="button"
              className={styles.navItem}
              onClick={() => navigate("/")}
            >
              홈
            </button>

            {/* 가격 상세 정보 */}

            <div className={styles.navMenu}>
              <button type="button" className={styles.navItem}>
                가격 상세 정보
              </button>

              <div className={styles.megaMenu}>
                <div className={styles.megaColumn}>
                  <strong>가격정보</strong>

                  <button type="button" onClick={() => navigate("/price")}>
                    품목별 시세 조회
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/price/detail")}
                  >
                    가격 추이 그래프
                  </button>

                  <button type="button" onClick={() => navigate("/price")}>
                    급상승 / 급락 품목
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
                  <strong>자치구별 지도 비교</strong>

                  <button
                    type="button"
                    onClick={() => navigate("/region-price")}
                  >
                    자치구간 1:1 비교
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/region-price")}
                  >
                    시장 / 마트 유형별 비교
                  </button>
                </div>
              </div>
            </div>

            {/* 스마트 추천 */}

            <div className={styles.navMenu}>
              <button type="button" className={styles.navItem}>
                스마트 추천
              </button>

              <div className={styles.megaMenu}>
                <div className={styles.megaColumn}>
                  <strong>스마트 추천</strong>

                  <button
                    type="button"
                    onClick={() => navigate("/recommendation")}
                  >
                    오늘의 알뜰 장바구니
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/recommendation")}
                  >
                    가격 하락 품목 추천
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/recommendation")}
                  >
                    이달의 제철 농수산물
                  </button>
                </div>
              </div>
            </div>

            {/* 고객센터 */}

            <div className={styles.navMenu}>
              <button type="button" className={styles.navItem}>
                고객센터
              </button>

              <div className={styles.megaMenu}>
                <div className={styles.megaColumn}>
                  <strong>고객센터</strong>

                  <button type="button" onClick={() => navigate("/board")}>
                    공지사항
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

        {/* 관리자 안내 */}

        {isAdmin && !isAuthor && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px 16px",
              borderRadius: "8px",
              background: "#f3f6f2",
              fontSize: "14px",
            }}
          >
            관리자 권한으로 전체 게시글을 확인하고 있습니다.
          </div>
        )}

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
          {/* 목록 */}

          <button
            type="button"
            className={styles.listButton}
            onClick={() => navigate("/qna")}
          >
            목록
          </button>

          {/* 본인 게시글만 수정 */}

          {canEdit && (
            <button
              type="button"
              className={styles.editButton}
              onClick={handleEdit}
            >
              수정
            </button>
          )}

          {/* 관리자 또는 작성자 삭제 */}

          {canDelete && (
            <button
              type="button"
              className={styles.deleteButton}
              onClick={handleDelete}
            >
              삭제
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default QnaDetailPage;
