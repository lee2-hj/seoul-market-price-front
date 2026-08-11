import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

import { getLoginUser, logout } from "@/features/auth/utils/auth";

import styles from "./QnaDetailPage.module.css";

/* 백엔드 서버 주소 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8081";

/* Q&A 상세 응답 타입 */

interface QnaDetailResponse {
  id: number;

  writerLoginId?: string | null;
  writerName?: string | null;

  title: string;

  /* 백엔드 QnaDetailResponse의 질문 본문 */

  questionContent?: string | null;

  /* 기존 프론트와의 호환 */

  content?: string | null;

  /* 답변 */

  answerContent?: string | null;
  answerAdminName?: string | null;

  answer?: string | null;

  /* 답변 상태 */

  answerStatus?: string | null;

  /* 첨부파일 */

  attachPath?: string | null;
  attachName?: string | null;

  attachmentAvailable?: boolean;

  attachmentUrl?: string | null;
  fileUrl?: string | null;

  originalFileName?: string | null;
  fileName?: string | null;

  /* 조회수 */

  viewCount?: number;
  views?: number;

  /* 공개 여부 */

  publicQuestion?: boolean;
  isPublic?: boolean;

  /* 날짜 */

  createdAt?: string | null;
  updatedAt?: string | null;
  answeredAt?: string | null;
}

/* 로그인 사용자 타입 */

interface LoginUser {
  id?: number | string;
  userId?: string;
  loginId?: string;
  memberId?: number | string;
  name?: string;
  username?: string;
  role?: string;
  authority?: string;
  authorities?: string[];
}

/* 로그인 사용자 ID 추출 */

const getLoginUserId = (user: LoginUser | null): string => {
  if (!user) {
    return "";
  }

  if (user.loginId !== undefined && user.loginId !== null) {
    return String(user.loginId);
  }

  if (user.userId !== undefined && user.userId !== null) {
    return String(user.userId);
  }

  return "";
};

/* 게시글 작성자 로그인 ID 추출 */

const getPostWriterId = (post: QnaDetailResponse | null): string => {
  if (!post) {
    return "";
  }

  if (post.writerLoginId !== undefined && post.writerLoginId !== null) {
    return String(post.writerLoginId);
  }

  return "";
};

/* 날짜 표시 */

const formatDate = (dateString?: string | null): string => {
  if (!dateString) {
    return "-";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* 공개 여부 확인 */

const isPublicPost = (post: QnaDetailResponse): boolean => {
  if (typeof post.publicQuestion === "boolean") {
    return post.publicQuestion;
  }

  if (typeof post.isPublic === "boolean") {
    return post.isPublic;
  }

  return false;
};

/* 조회수 표시 */

const getViewCount = (post: QnaDetailResponse): number => {
  if (typeof post.viewCount === "number") {
    return post.viewCount;
  }

  if (typeof post.views === "number") {
    return post.views;
  }

  return 0;
};

/* 질문 본문 추출 */

const getQuestionContent = (post: QnaDetailResponse): string => {
  if (post.questionContent !== undefined && post.questionContent !== null) {
    return post.questionContent;
  }

  if (post.content !== undefined && post.content !== null) {
    return post.content;
  }

  return "";
};

/* 첨부파일 URL 추출 */

const getAttachmentUrl = (post: QnaDetailResponse): string => {
  return post.attachmentUrl || post.fileUrl || post.attachPath || "";
};

/* 첨부파일 이름 추출 */

const getAttachmentName = (post: QnaDetailResponse): string => {
  return (
    post.originalFileName || post.fileName || post.attachName || "첨부파일"
  );
};

/* QnaDetailPage */

function QnaDetailPage() {
  const navigate = useNavigate();

  const { id } = useParams<{ id: string }>();

  const [post, setPost] = useState<QnaDetailResponse | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  const [loginUser, setLoginUser] = useState<LoginUser | null>(null);

  const [isMyPost, setIsMyPost] = useState(false);

  /* 게시글 상세 조회 */

  useEffect(() => {
    const fetchQnaDetail = async () => {
      if (!id) {
        setErrorMessage("잘못된 게시글 번호입니다.");

        setIsLoading(false);

        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        /* 현재 로그인 사용자 확인 */

        const currentUser = getLoginUser() as LoginUser | null;

        setLoginUser(currentUser);

        /*

          상세 조회 권한은 백엔드에서 판단한다.

          GET /api/qnas/{id}

          QnaController
          -> qnaService.getQna(id, principal.memberId())

          QnaService
          -> qnaQueryRepository.incrementViewCount(id, userId)
          -> qnaQueryRepository.findAccessibleById(id, userId)

          따라서 프론트에서는
          비공개 여부를 가지고 다시 접근을 차단하지 않는다.

          백엔드가 200을 반환하면
          해당 게시글을 정상적으로 표시한다.
        */

        const response = await axios.get<QnaDetailResponse>(
          `${BACKEND_URL}/api/qnas/${id}`,
          {
            withCredentials: true,
          },
        );

        const detail = response.data;

        console.log("[QnaDetailPage] 상세 게시글:", detail);

        /*

          본인 여부는 접근 권한 판단이 아니라
          수정 / 삭제 버튼 표시를 위해서만 사용한다.
        */

        const currentUserId = getLoginUserId(currentUser);

        const writerId = getPostWriterId(detail);

        const mine =
          Boolean(currentUserId) &&
          Boolean(writerId) &&
          currentUserId === writerId;

        console.log("[QnaDetailPage] 현재 사용자 ID:", currentUserId);

        console.log("[QnaDetailPage] 게시글 작성자 ID:", writerId);

        console.log("[QnaDetailPage] 내 글 여부:", mine);

        setIsMyPost(mine);

        /*

          백엔드에서 접근 가능한 게시글을
          정상적으로 반환했으므로 그대로 저장한다.

        */

        setPost(detail);
      } catch (error) {
        console.error("[QnaDetailPage] 게시글 상세 조회 실패:", error);

        if (axios.isAxiosError(error)) {
          const status = error.response?.status;

          /* 로그인되지 않은 경우 */

          if (status === 401) {
            setErrorMessage("로그인이 필요합니다.");

            return;
          }

          /* 권한 없음 */

          if (status === 403) {
            setErrorMessage("이 게시글을 확인할 권한이 없습니다.");

            return;
          }

          /*

            백엔드의 findAccessibleById()에서
            접근할 수 없는 비공개 글도
            결과가 없으면 QnaNotFoundException이 발생한다.

            따라서 404는
            존재하지 않거나 접근할 수 없는 글로 처리한다.
          */

          if (status === 404) {
            setErrorMessage("존재하지 않거나 확인할 수 없는 게시글입니다.");

            return;
          }

          /* 기타 서버 오류 */

          setErrorMessage(
            error.response?.data?.message ||
              "게시글을 불러오는 중 오류가 발생했습니다.",
          );

          return;
        }

        setErrorMessage("게시글을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQnaDetail();
  }, [id]);

  /* 목록으로 이동 */

  const handleBack = () => {
    navigate("/qna");
  };

  /* 수정 */

  const handleEdit = () => {
    if (!post) {
      return;
    }

    if (!isMyPost) {
      alert("수정 권한이 없습니다.");

      return;
    }

    navigate(`/qna/${post.id}/edit`);
  };

  /* 삭제 */

  const handleDelete = async () => {
    if (!post) {
      return;
    }

    if (!isMyPost) {
      alert("삭제 권한이 없습니다.");

      return;
    }

    const confirmed = window.confirm("정말 삭제하시겠습니까?");

    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(`${BACKEND_URL}/api/qnas/${post.id}`, {
        withCredentials: true,
      });

      alert("게시글이 삭제되었습니다.");

      navigate("/qna");
    } catch (error) {
      console.error("[QnaDetailPage] 게시글 삭제 실패:", error);

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 401) {
          alert("로그인이 필요합니다.");

          navigate("/login");

          return;
        }

        if (status === 403) {
          alert("삭제 권한이 없습니다.");

          return;
        }

        alert(error.response?.data?.message || "게시글 삭제에 실패했습니다.");

        return;
      }

      alert("게시글 삭제에 실패했습니다.");
    }
  };

  /* 로그아웃 */

  const handleLogout = () => {
    logout();

    navigate("/login");
  };

  /* 로딩 */

  if (isLoading) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.logo} onClick={() => navigate("/")}>
            싸농
          </div>
        </header>

        <main className={styles.container}>
          <div className={styles.loading}>게시글을 불러오는 중입니다...</div>
        </main>
      </div>
    );
  }

  /* 오류 */

  if (errorMessage || !post) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.logo} onClick={() => navigate("/")}>
            싸농
          </div>

          <div className={styles.headerRight}>
            {loginUser ? (
              <>
                <span className={styles.userName}>
                  {loginUser.name ||
                    loginUser.username ||
                    getLoginUserId(loginUser)}
                  님
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
              <button
                type="button"
                className={styles.loginButton}
                onClick={() => navigate("/login")}
              >
                로그인
              </button>
            )}
          </div>
        </header>

        <main className={styles.container}>
          <section className={styles.errorBox}>
            <h2>게시글을 확인할 수 없습니다.</h2>

            <p>{errorMessage || "게시글 정보가 존재하지 않습니다."}</p>

            <button
              type="button"
              className={styles.backButton}
              onClick={handleBack}
            >
              Q&A 목록으로
            </button>
          </section>
        </main>
      </div>
    );
  }

  /* 첨부파일 */

  const attachmentUrl = getAttachmentUrl(post);

  const attachmentName = getAttachmentName(post);

  const hasAttachment = Boolean(
    post.attachmentAvailable ||
    attachmentUrl ||
    post.originalFileName ||
    post.fileName ||
    post.attachName,
  );

  /* 상세 화면 */

  return (
    <div className={styles.page}>
      {/* 헤더 */}

      <header className={styles.header}>
        <div className={styles.logo} onClick={() => navigate("/")}>
          싸농
        </div>

        <nav className={styles.navigation}>
          <button type="button" onClick={() => navigate("/")}>
            홈
          </button>

          <button type="button" onClick={() => navigate("/qna")}>
            Q&A
          </button>
        </nav>

        <div className={styles.headerRight}>
          {loginUser ? (
            <>
              <span className={styles.userName}>
                {loginUser.name ||
                  loginUser.username ||
                  getLoginUserId(loginUser)}
                님
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
            <button
              type="button"
              className={styles.loginButton}
              onClick={() => navigate("/login")}
            >
              로그인
            </button>
          )}
        </div>
      </header>

      {/* 본문 */}

      <main className={styles.container}>
        <section className={styles.detailSection}>
          {/* 상단 */}

          <div className={styles.detailTop}>
            <div>
              <span className={styles.boardName}>Q&A</span>

              {!isPublicPost(post) && (
                <span className={styles.privateBadge}>비공개</span>
              )}

              {post.answerStatus && (
                <span className={styles.answerBadge}>{post.answerStatus}</span>
              )}
            </div>

            <div className={styles.detailActions}>
              {/* 본인 글일 때만 수정 / 삭제 */}

              {isMyPost && (
                <>
                  <button type="button" onClick={handleEdit}>
                    수정
                  </button>

                  <button type="button" onClick={handleDelete}>
                    삭제
                  </button>
                </>
              )}

              <button type="button" onClick={handleBack}>
                목록
              </button>
            </div>
          </div>

          {/* 제목 */}

          <div className={styles.titleArea}>
            <h1>{post.title}</h1>
          </div>

          {/* 게시글 정보 */}

          <div className={styles.meta}>
            <div>
              <span className={styles.metaLabel}>작성자</span>

              <span>{post.writerName || post.writerLoginId || "-"}</span>
            </div>

            <div>
              <span className={styles.metaLabel}>작성일</span>

              <span>{formatDate(post.createdAt)}</span>
            </div>

            <div>
              <span className={styles.metaLabel}>조회수</span>

              <span>{getViewCount(post)}</span>
            </div>
          </div>

          {/* 질문 본문 */}

          <article className={styles.content}>
            {getQuestionContent(post)}
          </article>

          {/* 첨부파일 */}

          {hasAttachment && (
            <div className={styles.attachment}>
              <span className={styles.attachmentLabel}>첨부파일</span>

              {attachmentUrl ? (
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {attachmentName}
                </a>
              ) : (
                <span>{attachmentName}</span>
              )}
            </div>
          )}

          {/* 답변 */}

          {(post.answer || post.answerContent) && (
            <section className={styles.answerSection}>
              <div className={styles.answerHeader}>
                <h2>답변</h2>

                {post.answeredAt && <span>{formatDate(post.answeredAt)}</span>}
              </div>

              <div className={styles.answerContent}>
                {post.answer || post.answerContent}
              </div>
            </section>
          )}

          {/* 하단 버튼 */}

          <div className={styles.bottomActions}>
            <button
              type="button"
              className={styles.backButton}
              onClick={handleBack}
            >
              목록으로
            </button>

            {isMyPost && (
              <div className={styles.ownerActions}>
                <button type="button" onClick={handleEdit}>
                  수정
                </button>

                <button type="button" onClick={handleDelete}>
                  삭제
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default QnaDetailPage;
