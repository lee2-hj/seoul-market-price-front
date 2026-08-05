import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import styles from "./QnaDetailPage.module.css";

/* Q&A 답변 */

interface QnaAnswer {
  authorId: string;
  author: string;
  content: string;
  date: string;
}

/* Q&A 게시글 */

interface QnaPost {
  id: number;
  authorId: string;
  author: string;
  title: string;
  content: string;
  date: string;
  views: number;
  answer?: QnaAnswer | null;
}

/* 로그인 사용자 */

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
    answer: null,
  },
  {
    id: 2,
    authorId: "kim123",
    author: "김채소",
    title: "농수산물이 어떤 방법으로 조사 되는지 알 수 있을까요?",
    content: "어떤 데이터를 토대로 조사가 되는건가요?",
    date: "2026.08.03",
    views: 18,
    answer: null,
  },
  {
    id: 1,
    authorId: "lee123",
    author: "이채소",
    title: "관심품목 설정은 어디서 하나요",
    content: "내가 사는 지역의 관심품목을 설정하고 싶어요.",
    date: "2026.08.01",
    views: 12,
    answer: null,
  },
];

/* 게시글 조회 */

const getPosts = (): QnaPost[] => {
  const storedPosts = localStorage.getItem("qnaPosts");

  if (!storedPosts) {
    return INITIAL_QNA_POSTS;
  }

  try {
    const parsedPosts: unknown = JSON.parse(storedPosts);

    if (!Array.isArray(parsedPosts)) {
      return INITIAL_QNA_POSTS;
    }

    return parsedPosts as QnaPost[];
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
    const parsedUser: unknown = JSON.parse(storedUser);

    if (
      !parsedUser ||
      typeof parsedUser !== "object" ||
      Array.isArray(parsedUser)
    ) {
      return null;
    }

    return parsedUser as LoginUser;
  } catch (error) {
    console.error("로그인 사용자 정보 확인 실패:", error);

    return null;
  }
};

/* 로그인 사용자 이름 */

const getLoginUserName = (user: LoginUser | null): string => {
  if (!user) {
    return "사용자";
  }

  return user.name || user.userName || user.userId || "사용자";
};

/* 관리자 여부 */

const isAdminUser = (user: LoginUser | null): boolean => {
  if (!user?.role) {
    return false;
  }

  const role = user.role.toUpperCase();

  return role === "ADMIN" || role === "ROLE_ADMIN";
};

/* 현재 날짜 */

const getCurrentDate = (): string => {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join(".");
};

/* Q&A 상세 페이지 */

function QnaDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  /* 현재 로그인 사용자 */

  const currentUser = useMemo(() => {
    return getLoginUser();
  }, []);

  /* 로그인 상태 */

  const isLoggedIn = Boolean(currentUser?.userId);

  /* 로그인 사용자 ID */

  const loginUserId = currentUser?.userId || "";

  /* 로그인 사용자 이름 */

  const loginUserName = getLoginUserName(currentUser);

  /* 관리자 여부 */

  const isAdmin = isAdminUser(currentUser);

  /* 게시글 조회 */

  const post = useMemo(() => {
    const posts = getPosts();

    return posts.find((item) => item.id === Number(id));
  }, [id]);

  /* 조회수 표시 상태 */

  /*
    상세 페이지에 처음 진입할 때
    기존 조회수 + 1을 화면에 바로 표시한다.

    useEffect 내부에서 setViewCount()를 호출하지 않기 때문에
    React의 cascading render 경고도 발생하지 않는다.
  */

  const [viewCount] = useState(() => {
    return post ? post.views + 1 : 0;
  });

  /* 현재 화면에서 조회수를 이미 증가시켰는지 확인 */

  const viewedPostIdRef = useRef<number | null>(null);

  /* 게시글 상세 진입 시 조회수 증가 */

  useEffect(() => {
    if (!post) {
      return;
    }

    const postId = post.id;

    if (viewedPostIdRef.current === postId) {
      return;
    }

    viewedPostIdRef.current = postId;

    const posts = getPosts();

    const targetPost = posts.find((item) => item.id === postId);

    if (!targetPost) {
      return;
    }

    const updatedViewCount = targetPost.views + 1;

    const updatedPosts = posts.map((item) => {
      if (item.id !== postId) {
        return item;
      }

      return {
        ...item,
        views: updatedViewCount,
      };
    });

    localStorage.setItem("qnaPosts", JSON.stringify(updatedPosts));
  }, [post]);

  /* 본인 게시글 여부 */

  const isAuthor = useMemo(() => {
    if (!post || !loginUserId) {
      return false;
    }

    return post.authorId === loginUserId;
  }, [post, loginUserId]);

  /* 상세 조회 권한 */

  const canView = isAdmin || isAuthor;

  /* 수정 권한 */

  const canEdit = isAuthor;

  /* 삭제 권한 */

  const canDelete = isAdmin || isAuthor;

  /* 답변 내용 */

  const [answerContent, setAnswerContent] = useState("");

  /* 답변 처리 중 */

  const [answerLoading, setAnswerLoading] = useState(false);

  /* 답변 수정 모드 */

  const [isEditingAnswer, setIsEditingAnswer] = useState(false);

  /* 답변 등록 */

  const handleAnswerSubmit = () => {
    if (!post) {
      alert("게시글을 찾을 수 없습니다.");
      return;
    }

    if (!isAdmin) {
      alert("관리자만 답변을 작성할 수 있습니다.");
      return;
    }

    const content = answerContent.trim();

    if (!content) {
      alert("답변 내용을 입력해주세요.");
      return;
    }

    if (content.length > 5000) {
      alert("답변은 5,000자 이내로 입력해주세요.");
      return;
    }

    const latestUser = getLoginUser();

    if (!isAdminUser(latestUser)) {
      alert("관리자 권한이 필요합니다.");
      return;
    }

    const posts = getPosts();

    const targetPost = posts.find((item) => item.id === post.id);

    if (!targetPost) {
      alert("게시글을 찾을 수 없습니다.");
      return;
    }

    if (targetPost.answer && !isEditingAnswer) {
      alert("이미 답변이 등록되어 있습니다.");
      return;
    }

    try {
      setAnswerLoading(true);

      const newAnswer: QnaAnswer = {
        authorId: latestUser?.userId || "",
        author: getLoginUserName(latestUser),
        content,
        date: getCurrentDate(),
      };

      const updatedPosts = posts.map((item) => {
        if (item.id !== targetPost.id) {
          return item;
        }

        return {
          ...item,
          answer: newAnswer,
        };
      });

      localStorage.setItem("qnaPosts", JSON.stringify(updatedPosts));

      setAnswerContent("");
      setIsEditingAnswer(false);

      alert(
        isEditingAnswer ? "답변이 수정되었습니다." : "답변이 등록되었습니다.",
      );

      window.location.reload();
    } catch (error) {
      console.error("Q&A 답변 등록 실패:", error);

      alert("답변 등록에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setAnswerLoading(false);
    }
  };

  /* 답변 수정 시작 */

  const handleAnswerEdit = () => {
    if (!post?.answer) {
      return;
    }

    if (!isAdmin) {
      alert("관리자만 답변을 수정할 수 있습니다.");
      return;
    }

    setAnswerContent(post.answer.content);
    setIsEditingAnswer(true);

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  };

  /* 답변 수정 취소 */

  const handleAnswerCancel = () => {
    setAnswerContent("");
    setIsEditingAnswer(false);
  };

  /* 답변 삭제 */

  const handleAnswerDelete = () => {
    if (!post?.answer) {
      alert("삭제할 답변이 없습니다.");
      return;
    }

    if (!isAdmin) {
      alert("관리자만 답변을 삭제할 수 있습니다.");
      return;
    }

    const deleteConfirm = window.confirm("등록된 답변을 삭제하시겠습니까?");

    if (!deleteConfirm) {
      return;
    }

    const latestUser = getLoginUser();

    if (!isAdminUser(latestUser)) {
      alert("관리자 권한이 필요합니다.");
      return;
    }

    const posts = getPosts();

    const targetPost = posts.find((item) => item.id === post.id);

    if (!targetPost) {
      alert("게시글을 찾을 수 없습니다.");
      return;
    }

    try {
      const updatedPosts = posts.map((item) => {
        if (item.id !== targetPost.id) {
          return item;
        }

        return {
          ...item,
          answer: null,
        };
      });

      localStorage.setItem("qnaPosts", JSON.stringify(updatedPosts));

      alert("답변이 삭제되었습니다.");

      window.location.reload();
    } catch (error) {
      console.error("Q&A 답변 삭제 실패:", error);

      alert("답변 삭제에 실패했습니다.");
    }
  };

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

    const posts = getPosts();

    const targetPost = posts.find((item) => item.id === post.id);

    if (!targetPost) {
      alert("게시글을 찾을 수 없습니다.");
      return;
    }

    const latestUser = getLoginUser();

    if (!latestUser) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    const latestIsAdmin = isAdminUser(latestUser);
    const latestUserId = latestUser.userId || "";

    const latestIsAuthor =
      Boolean(latestUserId) && targetPost.authorId === latestUserId;

    if (!latestIsAdmin && !latestIsAuthor) {
      alert("게시글을 삭제할 권한이 없습니다.");
      return;
    }

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

  /* 접근 권한 없음 */

  if (!canView) {
    return (
      <div className={styles.page}>
        <div className={styles.topUserBar}>
          <div className={styles.topUserInner}>
            <div className={styles.userArea}>
              <span className={styles.userName}>{loginUserName}</span>

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

        <header className={styles.mainHeader}>
          <div className={styles.headerInner}>
            <button
              type="button"
              className={styles.logo}
              onClick={() => navigate("/")}
              aria-label="싸농 홈으로 이동"
            >
              싸농
            </button>

            <nav className={styles.mainNav} aria-label="주요 메뉴">
              <button
                type="button"
                className={styles.navItem}
                onClick={() => navigate("/")}
              >
                홈
              </button>

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

  /* 상세 페이지 */

  return (
    <div className={styles.page}>
      {/* 사용자 영역 */}

      <div className={styles.topUserBar}>
        <div className={styles.topUserInner}>
          <div className={styles.userArea}>
            <span className={styles.userName}>
              {loginUserName}

              {isAdmin && <span className={styles.adminBadge}>관리자</span>}
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
          <button
            type="button"
            className={styles.logo}
            onClick={() => navigate("/")}
            aria-label="싸농 홈으로 이동"
          >
            싸농
          </button>

          <nav className={styles.mainNav} aria-label="주요 메뉴">
            <button
              type="button"
              className={styles.navItem}
              onClick={() => navigate("/")}
            >
              홈
            </button>

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
          <div className={styles.adminNotice}>
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
                조회수 <strong>{viewCount}</strong>
              </span>
            </div>
          </header>

          {/* 게시글 내용 */}

          <div className={styles.postContent}>{post.content}</div>
        </article>

        {/* 관리자 답변 */}

        <section className={styles.answerSection}>
          <div className={styles.answerHeader}>
            <div>
              <span className={styles.answerLabel}>ANSWER</span>

              <h3>관리자 답변</h3>
            </div>

            {post.answer && (
              <span className={styles.answerStatus}>답변완료</span>
            )}
          </div>

          {/* 답변이 있는 경우 */}

          {post.answer && !isEditingAnswer && (
            <div className={styles.answerBox}>
              <div className={styles.answerMeta}>
                <div className={styles.answerAuthor}>
                  <span className={styles.answerIcon}>A</span>

                  <strong>{post.answer.author}</strong>

                  <span className={styles.answerAdminBadge}>관리자</span>
                </div>

                <span>{post.answer.date}</span>
              </div>

              <div className={styles.answerContent}>{post.answer.content}</div>

              {isAdmin && (
                <div className={styles.answerActions}>
                  <button
                    type="button"
                    className={styles.answerEditButton}
                    onClick={handleAnswerEdit}
                  >
                    답변 수정
                  </button>

                  <button
                    type="button"
                    className={styles.answerDeleteButton}
                    onClick={handleAnswerDelete}
                  >
                    답변 삭제
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 답변이 없는 경우 */}

          {!post.answer && !isAdmin && (
            <div className={styles.noAnswer}>
              <span>💬</span>

              <p>아직 관리자 답변이 등록되지 않았습니다.</p>
            </div>
          )}

          {/* 관리자 답변 작성/수정 */}

          {isAdmin && (!post.answer || isEditingAnswer) && (
            <div className={styles.answerForm}>
              <div className={styles.answerFormTop}>
                <span className={styles.answerFormTitle}>
                  {isEditingAnswer ? "답변 수정" : "답변 작성"}
                </span>

                <span className={styles.answerWriter}>
                  작성자 : {loginUserName}
                </span>
              </div>

              <textarea
                value={answerContent}
                onChange={(event) => setAnswerContent(event.target.value)}
                placeholder="회원의 문의에 대한 답변을 입력해주세요."
                maxLength={5000}
                disabled={answerLoading}
              />

              <div className={styles.answerFieldBottom}>
                <small>답변은 5,000자 이내로 입력해주세요.</small>

                <span>{answerContent.length.toLocaleString()} / 5,000</span>
              </div>

              <div className={styles.answerFormActions}>
                {isEditingAnswer && (
                  <button
                    type="button"
                    className={styles.answerCancelButton}
                    onClick={handleAnswerCancel}
                    disabled={answerLoading}
                  >
                    취소
                  </button>
                )}

                <button
                  type="button"
                  className={styles.answerSubmitButton}
                  onClick={handleAnswerSubmit}
                  disabled={answerLoading}
                >
                  {answerLoading
                    ? "처리 중..."
                    : isEditingAnswer
                      ? "답변 수정"
                      : "답변 등록"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 하단 버튼 */}

        <div className={styles.bottomActions}>
          <button
            type="button"
            className={styles.listButton}
            onClick={() => navigate("/qna")}
          >
            목록
          </button>

          {canEdit && (
            <button
              type="button"
              className={styles.editButton}
              onClick={handleEdit}
            >
              수정
            </button>
          )}

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
