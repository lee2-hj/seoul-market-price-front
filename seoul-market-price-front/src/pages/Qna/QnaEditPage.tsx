import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

/* import styles from "./QnaEditPage.module.css"; */

interface QnaForm {
  title: string;
  content: string;
}

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

/* 로그인 사용자 정보 */

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

/* 로그인 사용자 ID */

const getCurrentUserId = (): string => {
  const user = getLoginUser();

  if (!user) {
    return "";
  }

  return user.userId || "";
};

/* 로그인 사용자 이름 */

const getCurrentUserName = (): string => {
  const user = getLoginUser();

  if (!user) {
    return "사용자";
  }

  return user.name || user.userName || user.userId || "사용자";
};

/* 관리자 여부 */

const isAdminUser = (): boolean => {
  const user = getLoginUser();

  if (!user) {
    return false;
  }

  return user.role === "ADMIN" || user.role === "ROLE_ADMIN";
};

/* Q&A 게시글 조회 */

const getPosts = (): QnaPost[] => {
  const storedPosts = localStorage.getItem("qnaPosts");

  if (!storedPosts) {
    return [];
  }

  try {
    const parsedPosts: QnaPost[] = JSON.parse(storedPosts);

    return Array.isArray(parsedPosts) ? parsedPosts : [];
  } catch (error) {
    console.error("Q&A 게시글 불러오기 실패:", error);

    return [];
  }
};

/* Q&A Edit Page */

function QnaEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  /* 로그인 상태 */

  const isLoggedIn = !!localStorage.getItem("loginUser");

  /* 현재 로그인 사용자 */

  const currentUser = useMemo(() => {
    return getLoginUser();
  }, []);

  /* 현재 로그인 사용자 ID */

  const currentUserId = useMemo(() => {
    return getCurrentUserId();
  }, []);

  /* 관리자 여부 */

  const isAdmin = useMemo(() => {
    return isAdminUser();
  }, []);

  /* 게시글 조회 */

  const post = useMemo(() => {
    const posts = getPosts();

    return posts.find((item) => item.id === Number(id)) ?? null;
  }, [id]);

  /* 작성자 여부 */

  const isAuthor = useMemo(() => {
    if (!post || !currentUserId) {
      return false;
    }

    return post.authorId === currentUserId;
  }, [post, currentUserId]);

  /*
    수정 권한

    현재 정책:
    일반 회원 → 본인 게시글만 수정
    관리자 → 다른 회원 게시글 수정 불가

    관리자가 모든 게시글 수정까지 가능하도록
    변경하고 싶다면 여기서 isAdmin을 포함하면 된다.
  */

  const canEdit = isAuthor;

  /* 작성 Form */

  const [form, setForm] = useState<QnaForm>(() => ({
    title: post?.title ?? "",
    content: post?.content ?? "",
  }));

  /* 로딩 */

  const [loading, setLoading] = useState(false);

  /* 입력값 변경 */

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* 입력값 검사 */

  const validateForm = (): boolean => {
    if (!form.title.trim()) {
      alert("제목을 입력해주세요.");
      return false;
    }

    if (form.title.trim().length > 100) {
      alert("제목은 100자 이내로 입력해주세요.");
      return false;
    }

    if (!form.content.trim()) {
      alert("내용을 입력해주세요.");
      return false;
    }

    if (form.content.trim().length > 5000) {
      alert("내용은 5,000자 이내로 입력해주세요.");
      return false;
    }

    return true;
  };

  /* 게시글 수정 */

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    /* 로그인 확인 */

    if (!isLoggedIn || !currentUser || !currentUserId) {
      alert("로그인 후 이용할 수 있습니다.");
      navigate("/login");
      return;
    }

    /* 게시글 확인 */

    if (!post) {
      alert("게시글을 찾을 수 없습니다.");
      navigate("/qna");
      return;
    }

    /*
      수정 권한 확인

      일반 회원:
      본인 게시글만 수정 가능

      관리자:
      현재 정책상 다른 회원 게시글 수정 불가
    */

    if (!canEdit) {
      if (isAdmin) {
        alert("관리자는 현재 다른 회원의 게시글을 수정할 수 없습니다.");
      } else {
        alert("본인이 작성한 게시글만 수정할 수 있습니다.");
      }

      navigate(`/qna/${post.id}`);
      return;
    }

    /* 입력값 검사 */

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      /* 최신 게시글 다시 조회 */

      const posts = getPosts();

      const targetPost = posts.find((item) => item.id === Number(id));

      /* 게시글이 삭제된 경우 */

      if (!targetPost) {
        alert("게시글을 찾을 수 없습니다.");
        navigate("/qna");
        return;
      }

      /*
        수정 직전 권한 재확인

        localStorage에 있는 최신 데이터를 기준으로
        작성자 ID를 다시 확인한다.
      */

      const targetIsAuthor = targetPost.authorId === currentUserId;

      if (!targetIsAuthor) {
        alert("본인이 작성한 게시글만 수정할 수 있습니다.");
        navigate(`/qna/${targetPost.id}`);
        return;
      }

      /* 게시글 수정 */

      const updatedPosts = posts.map((item) => {
        if (item.id !== targetPost.id) {
          return item;
        }

        return {
          ...item,

          /*
            기존 작성자 정보 유지

            authorId
              → 작성자 식별용 ID

            author
              → 화면에 표시되는 작성자 이름
          */

          authorId: item.authorId,
          author: item.author,

          /* 수정 내용 */

          title: form.title.trim(),
          content: form.content.trim(),

          /* 기존 정보 유지 */

          date: item.date,
          views: item.views,
        };
      });

      /* localStorage 저장 */

      localStorage.setItem("qnaPosts", JSON.stringify(updatedPosts));

      alert("Q&A가 수정되었습니다.");

      /* 상세 페이지 이동 */

      navigate(`/qna/${targetPost.id}`);
    } catch (error) {
      console.error("Q&A 수정 실패:", error);

      alert("Q&A 수정에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  /* 로그아웃 */

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("loginUser");
    localStorage.removeItem("user");

    navigate("/");
  };

  /* 로그인하지 않은 경우 */

  if (!isLoggedIn || !currentUser || !currentUserId) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loginRequired}>
            <div className={styles.loginIcon}>🔒</div>

            <h1>로그인이 필요합니다.</h1>

            <p>
              Q&A 게시글 수정은
              <br />
              로그인한 회원만 이용할 수 있습니다.
            </p>

            <div className={styles.loginButtonArea}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => navigate("/qna")}
              >
                Q&A로 돌아가기
              </button>

              <button
                type="button"
                className={styles.loginButton}
                onClick={() => navigate("/login")}
              >
                로그인하기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* 게시글이 없는 경우 */

  if (!post) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loginRequired}>
            <div className={styles.loginIcon}>❓</div>

            <h1>게시글을 찾을 수 없습니다.</h1>

            <p>삭제되었거나 존재하지 않는 게시글입니다.</p>

            <div className={styles.loginButtonArea}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => navigate("/qna")}
              >
                Q&A 목록으로
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* 다른 사용자가 직접 URL 접근한 경우 */

  if (!isAuthor) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loginRequired}>
            <div className={styles.loginIcon}>🔒</div>

            <h1>수정할 수 없는 게시글입니다.</h1>

            <p>
              {isAdmin ? (
                <>
                  관리자는 다른 회원의 게시글을
                  <br />
                  현재 수정할 수 없습니다.
                </>
              ) : (
                <>
                  본인이 작성한 Q&A 게시글만
                  <br />
                  수정할 수 있습니다.
                </>
              )}
            </p>

            <div className={styles.loginButtonArea}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => navigate(`/qna/${post.id}`)}
              >
                게시글로 돌아가기
              </button>

              <button
                type="button"
                className={styles.loginButton}
                onClick={() => navigate("/qna")}
              >
                Q&A 목록으로
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* 게시글 수정 화면 */

  return (
    <div className={styles.page}>
      {/* 사용자 영역 */}

      <div className={styles.topUserBar}>
        <div className={styles.topUserInner}>
          <div className={styles.userArea}>
            <span className={styles.userName}>
              {getCurrentUserName()}
              {isAdmin && " (관리자)"}
            </span>

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
          <div className={styles.headerText}>
            <span className={styles.pageLabel}>Q&A</span>

            <h1>문의 수정</h1>

            <p>작성하신 문의 내용을 수정해주세요.</p>
          </div>

          <button
            type="button"
            className={styles.listButton}
            onClick={() => navigate(`/qna/${post.id}`)}
            disabled={loading}
          >
            돌아가기
          </button>
        </section>

        {/* 수정 Form */}

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* 작성자 */}

          <div className={styles.formGroup}>
            <label htmlFor="author">작성자</label>

            <input id="author" type="text" value={post.author} disabled />

            <small>작성자는 변경할 수 없습니다.</small>
          </div>

          {/* 제목 */}

          <div className={styles.formGroup}>
            <label htmlFor="title">
              제목 <span>*</span>
            </label>

            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              placeholder="문의 제목을 입력해주세요."
              maxLength={100}
              disabled={loading}
            />

            <small>최대 100자까지 입력할 수 있습니다.</small>
          </div>

          {/* 내용 */}

          <div className={styles.formGroup}>
            <label htmlFor="content">
              내용 <span>*</span>
            </label>

            <textarea
              id="content"
              name="content"
              value={form.content}
              onChange={handleChange}
              placeholder="문의 내용을 입력해주세요."
              rows={12}
              maxLength={5000}
              disabled={loading}
            />

            <small>최대 5,000자까지 입력할 수 있습니다.</small>
          </div>

          {/* 안내 문구 */}

          <div className={styles.notice}>
            <span>💡</span>

            <p>
              본인이 작성한 게시글만 수정할 수 있습니다.
              {isAdmin &&
                " 관리자는 모든 Q&A 게시글을 조회하고 삭제할 수 있습니다."}
            </p>
          </div>

          {/* 버튼 */}

          <div className={styles.buttonArea}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => navigate(`/qna/${post.id}`)}
              disabled={loading}
            >
              취소
            </button>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? "수정 중..." : "수정하기"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default QnaEditPage;
