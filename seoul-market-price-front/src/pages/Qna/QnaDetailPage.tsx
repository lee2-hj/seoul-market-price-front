import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getLoginUser, logout } from "@/features/auth/utils/auth";
import styles from "./QnaDetailPage.module.css";

/* 첨부파일 정보 */

interface QnaAttachment {
  name: string;
  size: number;
}

/* 질의응답 게시글 */

interface QnaPost {
  id: number;

  /* 질문 정보 */

  author: string;
  authorId: string;
  title: string;
  content: string;
  date: string;
  views: number;

  /* 첨부파일 */

  attachments?: QnaAttachment[];

  /* 답변 정보 */

  answer: string;
  answerAuthor?: string;
  answerAuthorId?: string;
  answerDate?: string;
}

/* 로그인 사용자 이름 */

const getLoginUserName = (user: { name: string; userId: string } | null): string => {
  if (!user) {
    return "사용자";
  }

  return user.name || user.userId || "사용자";
};

/* 관리자 여부 (zustand 기준) */

const isAdminUser = (role: string | undefined): boolean => {
  if (!role) {
    return false;
  }

  const normalizedRole = role.toUpperCase();

  return normalizedRole === "ADMIN" || normalizedRole === "ROLE_ADMIN";
};

/* 파일 크기 표시 */

const formatFileSize = (size: number): string => {
  if (!size || size < 1024) {
    return `${size || 0} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

/* 게시글 조회 */

const getStoredPosts = (): QnaPost[] => {
  const storedPosts = localStorage.getItem("qnaPosts");

  if (!storedPosts) {
    return [];
  }

  try {
    const parsedPosts: unknown = JSON.parse(storedPosts);

    if (!Array.isArray(parsedPosts)) {
      return [];
    }

    return parsedPosts.map((post) => {
      const item = post as Partial<QnaPost>;

      return {
        id: item.id ?? 0,
        author: item.author ?? "사용자",
        authorId: item.authorId ?? "",
        title: item.title ?? "",
        content: item.content ?? "",
        date: item.date ?? "",
        views: item.views ?? 0,

        /* 기존 글에 첨부파일이 없는 경우 빈 배열 */

        attachments: Array.isArray(item.attachments) ? item.attachments : [],

        answer: item.answer ?? "",
        answerAuthor: item.answerAuthor,
        answerAuthorId: item.answerAuthorId,
        answerDate: item.answerDate,
      };
    });
  } catch (error) {
    console.error("질의응답 게시글 조회 실패:", error);

    return [];
  }
};

/* Q&A 상세 페이지 */

function QnaDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  /* 로그인 사용자 */

  const currentUser = getLoginUser();

  const currentUserId = currentUser?.userId ?? "";
  const currentUserName = getLoginUserName(currentUser);
  const isAdmin = isAdminUser(currentUser?.role);

  const isLoggedIn = Boolean(currentUser && currentUserId);

  /* 게시글 */

  const [post, setPost] = useState<QnaPost | null>(null);

  const [loading, setLoading] = useState(true);

  /* 게시글 조회 */

  useEffect(() => {
    const loadPost = () => {
      setLoading(true);

      const posts = getStoredPosts();

      const postId = Number(id);

      const foundPost = posts.find((item) => item.id === postId);

      if (!foundPost) {
        setPost(null);
        setLoading(false);

        return;
      }

      /* 로그인 여부 확인 */

      if (!isLoggedIn) {
        alert("로그인 후 질의응답을 확인할 수 있습니다.");

        navigate("/login");

        return;
      }

      /* 본인 글 또는 관리자만 확인 가능 */

      const canView = isAdmin || foundPost.authorId === currentUserId;

      if (!canView) {
        alert("작성자 본인 또는 관리자만 확인할 수 있습니다.");

        navigate("/qna");

        return;
      }

      /*
       * 조회수 증가
       *
       * 현재 페이지 진입 시 한 번 증가시킨다.
       */

      const updatedPosts = posts.map((item) => {
        if (item.id !== foundPost.id) {
          return item;
        }

        return {
          ...item,
          views: (item.views ?? 0) + 1,
        };
      });

      localStorage.setItem("qnaPosts", JSON.stringify(updatedPosts));

      setPost({
        ...foundPost,
        views: (foundPost.views ?? 0) + 1,
      });

      setLoading(false);
    };

    loadPost();
  }, [id, navigate, currentUserId, isAdmin, isLoggedIn]);

  /* 로그아웃 */

  const handleLogout = async () => {
    await logout();

    navigate("/");
  };

  /* 목록으로 */

  const handleGoList = () => {
    navigate("/qna");
  };

  /* 수정 페이지 이동 */

  const handleEdit = () => {
    if (!post) {
      return;
    }

    navigate(`/qna/${post.id}/edit`);
  };
  /* 삭제 */

  const handleDelete = () => {
    if (!post) {
      return;
    }

    const confirmed = window.confirm("이 질의응답 게시글을 삭제하시겠습니까?");

    if (!confirmed) {
      return;
    }

    const posts = getStoredPosts();

    const updatedPosts = posts.filter((item) => item.id !== post.id);

    localStorage.setItem("qnaPosts", JSON.stringify(updatedPosts));

    alert("질의응답이 삭제되었습니다.");

    navigate("/qna");
  };

  /* 로딩 */

  if (loading) {
    return (
      <div className={styles.page}>
        <main className={styles.container}>
          <section className={styles.emptyState}>
            <p>게시글을 불러오는 중입니다.</p>
          </section>
        </main>
      </div>
    );
  }

  /* 게시글 없음 */

  if (!post) {
    return (
      <div className={styles.page}>
        <main className={styles.container}>
          <section className={styles.emptyState}>
            <div className={styles.emptyIcon}>📄</div>

            <h1>게시글을 찾을 수 없습니다.</h1>

            <p>요청하신 질의응답 게시글이 존재하지 않거나 삭제되었습니다.</p>

            <button
              type="button"
              className={styles.listButton}
              onClick={handleGoList}
            >
              목록으로
            </button>
          </section>
        </main>
      </div>
    );
  }

  /* 로그인 상태 */

  return (
    <div className={styles.page}>
      {/* 사용자 영역 */}

      <div className={styles.topUserBar}>
        <div className={styles.topUserInner}>
          <div className={styles.userArea}>
            <span className={styles.userName}>
              {currentUserName}

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

                  <button type="button" onClick={() => navigate("/qna")}>
                    질의응답
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
            <span className={styles.pageLabel}>질의응답</span>

            <h1>문의 내용</h1>

            <p>싸농 서비스에 등록된 질의응답입니다.</p>
          </div>

          <button
            type="button"
            className={styles.listButton}
            onClick={handleGoList}
          >
            목록으로
          </button>
        </section>

        {/* 게시글 */}

        <article className={styles.detailCard}>
          {/* 제목 */}

          <header className={styles.detailHeader}>
            <h2>{post.title}</h2>

            <div className={styles.meta}>
              <span>
                작성자 <strong>{post.author}</strong>
              </span>

              <span>{post.date}</span>

              <span>조회 {post.views}</span>
            </div>
          </header>

          {/* 내용 */}

          <div className={styles.content}>{post.content}</div>

          {/* 첨부파일 */}

          {post.attachments && post.attachments.length > 0 && (
            <section className={styles.attachmentSection}>
              <div className={styles.attachmentHeader}>
                <strong>첨부파일</strong>

                <span>{post.attachments.length}개</span>
              </div>

              <ul className={styles.attachmentList}>
                {post.attachments.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className={styles.attachmentItem}
                  >
                    <div className={styles.attachmentInformation}>
                      <span className={styles.attachmentIcon}>📎</span>

                      <div className={styles.attachmentText}>
                        <span
                          className={styles.attachmentName}
                          title={file.name}
                        >
                          {file.name}
                        </span>

                        <span className={styles.attachmentSize}>
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                    </div>

                    <span className={styles.attachmentStatus}>첨부됨</span>
                  </li>
                ))}
              </ul>

              <p className={styles.attachmentNotice}>
                현재 테스트 단계에서는 첨부파일의 이름과 크기만 표시됩니다.
              </p>
            </section>
          )}

          {/* 답변 */}

          {post.answer && post.answer.trim() !== "" && (
            <section className={styles.answerSection}>
              <div className={styles.answerHeader}>
                <div>
                  <span className={styles.answerLabel}>답변</span>

                  <strong>{post.answerAuthor || "관리자"}</strong>
                </div>

                {post.answerDate && <span>{post.answerDate}</span>}
              </div>

              <div className={styles.answerContent}>{post.answer}</div>
            </section>
          )}

          {/* 미답변 */}

          {!post.answer && (
            <section className={styles.waitingSection}>
              <span className={styles.waitingIcon}>💬</span>

              <div>
                <strong>답변을 준비 중입니다.</strong>

                <p>관리자가 문의 내용을 확인한 후 답변을 등록합니다.</p>
              </div>
            </section>
          )}

          {/* 버튼 */}

          <div className={styles.buttonArea}>
            <button
              type="button"
              className={styles.listButton}
              onClick={handleGoList}
            >
              목록으로
            </button>

            {post.authorId === currentUserId && (
              <>
                <button
                  type="button"
                  className={styles.editButton}
                  onClick={handleEdit}
                >
                  수정
                </button>

                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={handleDelete}
                >
                  삭제
                </button>
              </>
            )}
          </div>
        </article>
      </main>
    </div>
  );
}

export default QnaDetailPage;
